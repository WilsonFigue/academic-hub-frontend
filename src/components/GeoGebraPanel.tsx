import { Download, ExternalLink, Loader2, Plus, RotateCcw, Shapes, TriangleAlert } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import styles from './GeoGebraPanel.module.css';

/** API mínima de GeoGebra que usamos (https://wiki.geogebra.org/en/Reference:GeoGebra_Apps_API). */
interface GgbApi {
  evalCommand(command: string): boolean;
  newConstruction?(): void;
  getBase64(callback: (base64: string) => void): void;
  setSize?(width: number, height: number): void;
  remove?(): void;
}
declare global {
  interface Window {
    GGBApplet?: new (params: Record<string, unknown>, html5NoWebSimple?: boolean) => { inject: (id: string) => void };
  }
}

const SCRIPT = 'https://www.geogebra.org/apps/deployggb.js';
let loading: Promise<void> | null = null;
/** Se carga solo cuando el estudiante lo pide: antes de eso no se hace ninguna petición a GeoGebra. */
function loadGeoGebra(): Promise<void> {
  if (window.GGBApplet) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT; script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { loading = null; script.remove(); reject(new Error('No se pudo cargar GeoGebra.')); };
    document.head.appendChild(script);
  });
  return loading;
}

/** Comandos de ejemplo con datos genéricos (no con los de la actividad): sirven para ver cómo se escribe cada cosa. */
const EXAMPLES: Array<{ label: string; command: string }> = [
  { label: 'Punto', command: 'P=(1,2)' },
  { label: 'Circunferencia (centro y radio)', command: 'c=Circle((0,0),3)' },
  { label: 'Circunferencia por tres puntos', command: 'd=Circle((1,0),(0,2),(-1,0))' },
  { label: 'Distancia entre dos puntos', command: 'Distance((0,0),(3,4))' },
];

/** GeoGebra incrustado junto a la guía: se abre a pedido, sin cuenta, y el estudiante puede descargar su construcción (.ggb). */
export function GeoGebraPanel() {
  const id = `ggb-${useId().replace(/:/g, '')}`;
  const holder = useRef<HTMLDivElement>(null);
  const api = useRef<GgbApi | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  useEffect(() => () => { try { api.current?.remove?.(); } catch { /* ya no existe */ } }, []);
  useEffect(() => {
    if (state !== 'ready') return;
    const onResize = () => { const width = holder.current?.clientWidth; if (width) api.current?.setSize?.(width, height(width)); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [state]);

  const height = (width: number) => (width < 600 ? 460 : 580);

  async function open() {
    setState('loading');
    try {
      await loadGeoGebra();
      const width = holder.current?.clientWidth ?? 900;
      const applet = new window.GGBApplet!({
        appName: 'classic', width, height: height(width), showToolBar: true, showAlgebraInput: true, showMenuBar: false,
        enableRightClick: true, enableShiftDragZoom: true, language: 'es', borderColor: null, showFullscreenButton: true,
        appletOnLoad: (ggb: GgbApi) => { api.current = ggb; setState('ready'); },
      }, true);
      applet.inject(id);
    } catch {
      setState('error');
    }
  }

  function download() {
    api.current?.getBase64((base64) => {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.geogebra.file' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'mi-construccion.ggb'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    });
  }

  return (
    <div className={styles.panel}>
      {state !== 'ready' && (
        <div className={styles.intro}>
          <span className={styles.icon} aria-hidden="true"><Shapes size={22} /></span>
          <span className={styles.text}>
            <b>GeoGebra, aquí mismo</b>
            <small>Grafica, construye y comprueba tu trabajo sin salir de la guía. No necesitas cuenta. Se carga desde geogebra.org solo cuando lo abres.</small>
          </span>
          <button type="button" className={styles.open} onClick={open} disabled={state === 'loading'}>
            {state === 'loading' ? <Loader2 size={16} className={styles.spin} aria-hidden="true" /> : <Shapes size={16} aria-hidden="true" />}
            {state === 'loading' ? 'Abriendo…' : state === 'error' ? 'Reintentar' : 'Abrir GeoGebra'}
          </button>
        </div>
      )}
      {state === 'error' && <p className={styles.error} role="alert"><TriangleAlert size={15} aria-hidden="true" />No se pudo cargar GeoGebra (¿sin internet?). Puedes usarlo en <a href="https://www.geogebra.org/classic" target="_blank" rel="noopener noreferrer">geogebra.org/classic<ExternalLink size={12} aria-hidden="true" /></a>.</p>}

      <div className={styles.stage} data-ready={state === 'ready'}>
        <div id={id} ref={holder} className={styles.applet} />
      </div>

      {state === 'ready' && (
        <>
          <div className={styles.actions}>
            <button type="button" onClick={download}><Download size={15} aria-hidden="true" />Descargar mi archivo .ggb</button>
            <button type="button" onClick={() => api.current?.newConstruction?.()}><RotateCcw size={15} aria-hidden="true" />Empezar de cero</button>
          </div>
          <details className={styles.examples}>
            <summary>Comandos de ejemplo (con datos genéricos)</summary>
            <ul>
              {EXAMPLES.map((example) => (
                <li key={example.command}>
                  <code>{example.command}</code><span>{example.label}</span>
                  <button type="button" aria-label={`Probar: ${example.label}`} onClick={() => api.current?.evalCommand(example.command)}><Plus size={14} aria-hidden="true" />Probar</button>
                </li>
              ))}
            </ul>
            <p>Estos ejemplos usan números inventados. Para tu actividad, escribe tus propios puntos en la barra de entrada.</p>
          </details>
        </>
      )}
    </div>
  );
}
