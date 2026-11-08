import { Download, RefreshCw, Share, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import styles from './PwaPrompt.module.css';

const DISMISS_KEY = 'ah.pwa.installDismissed';
const UPDATE_CHECK_MS = 60 * 60 * 1000;

/** Evento no estándar de Chromium: guarda la instalación hasta que el estudiante la pida. */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const readDismissed = (): boolean => { try { return window.localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; } };
const writeDismissed = () => { try { window.localStorage.setItem(DISMISS_KEY, '1'); } catch { /* sin almacenamiento */ } };

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
/** Safari de iPhone/iPad no tiene botón de instalar: hay que explicar el gesto. */
const isIosSafari = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);

/**
 * Registra el service worker y muestra, abajo, una tarjeta cuando hay algo que decidir:
 * una versión nueva lista para cargar, o la posibilidad de instalar la app (en iPhone, cómo hacerlo).
 */
export function PwaPrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Las pestañas que se quedan abiertas días también se enteran de las versiones nuevas.
      if (registration) window.setInterval(() => { void registration.update().catch(() => {}); }, UPDATE_CHECK_MS);
    },
  });
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent); };
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  const dismiss = () => { writeDismissed(); setDismissed(true); };
  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);
    if (outcome === 'dismissed') dismiss();
  };

  if (needRefresh) {
    return (
      <div className={styles.stack} role="status">
        <div className={styles.card}>
          <span className={styles.icon}><RefreshCw size={18} aria-hidden /></span>
          <div className={styles.text}><b>Hay una versión nueva</b><small>Actualiza para ver lo último.</small></div>
          <button type="button" className={styles.action} onClick={() => void updateServiceWorker(true)}>Actualizar</button>
        </div>
      </div>
    );
  }

  if (dismissed || installed || isStandalone()) return null;

  if (installEvent) {
    return (
      <div className={styles.stack} role="status">
        <div className={styles.card}>
          <span className={styles.icon}><Download size={18} aria-hidden /></span>
          <div className={styles.text}><b>Instala Academic Hub</b><small>Ábrelo como una app, desde tu pantalla de inicio.</small></div>
          <button type="button" className={styles.action} onClick={() => void install()}>Instalar</button>
          <button type="button" className={styles.close} onClick={dismiss} aria-label="Ahora no"><X size={16} aria-hidden /></button>
        </div>
      </div>
    );
  }

  if (isIosSafari()) {
    return (
      <div className={styles.stack} role="status">
        <div className={styles.card}>
          <span className={styles.icon}><Share size={18} aria-hidden /></span>
          <div className={styles.text}><b>Instala Academic Hub</b><small>Toca Compartir y elige «Añadir a pantalla de inicio».</small></div>
          <button type="button" className={styles.close} onClick={dismiss} aria-label="Entendido"><X size={16} aria-hidden /></button>
        </div>
      </div>
    );
  }

  return null;
}
