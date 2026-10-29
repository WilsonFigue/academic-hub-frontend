import { BookOpenCheck, Download, Loader2, Maximize2, Minimize2, TriangleAlert, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { guidePdfUrl } from '../api/hooks';
import { useReducedMotion } from '../lib/motion';
import styles from './FileViewer.module.css';

const EXPANDED_KEY = 'ah-viewer-expanded';
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');
const readExpanded = () => { try { return window.localStorage.getItem(EXPANDED_KEY) === '1'; } catch { return false; } };

/** PDF de la guía de estudio dentro del visor de la web (el mismo diseño que el de archivos), con descarga. */
export function GuidePdfViewer({ open, activityId, title, onClose }: { open: boolean; activityId: string; title: string; onClose: () => void }) {
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = useState(readExpanded);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setReady(false); setFailed(false);
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  const toggle = () => setExpanded((value) => {
    const next = !value;
    try { window.localStorage.setItem(EXPANDED_KEY, next ? '1' : '0'); } catch { /* sin almacenamiento */ }
    return next;
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div className={cx(styles.overlay, expanded && styles.overlayExpanded)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
          <motion.div className={cx(styles.panel, expanded && styles.panelExpanded)} role="dialog" aria-modal="true" aria-labelledby="guide-pdf-title"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.98, transition: { duration: 0.16 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
            <header className={styles.head} style={{ ['--k' as string]: 'var(--ok)' }}>
              <span className={styles.disc} aria-hidden="true"><BookOpenCheck size={26} /></span>
              <div className={styles.headText}>
                <h2 id="guide-pdf-title">Guía de estudio</h2>
                <p>{title} · PDF</p>
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.iconAction} onClick={toggle} aria-pressed={expanded} data-tip={expanded ? 'Reducir' : 'Pantalla completa'} aria-label={expanded ? 'Reducir la ventana' : 'Ver en pantalla completa'}>
                  {expanded ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
                </button>
                <a className={styles.action} href={guidePdfUrl(activityId, true)} download><Download size={16} aria-hidden="true" />Descargar PDF</a>
                <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Cerrar"><X size={20} aria-hidden="true" /></button>
              </div>
            </header>
            <div className={cx(styles.body, styles.bodyFrame)}>
              <div className={styles.frameBox}>
                {!ready && !failed && (
                  <div className={styles.loading} role="status">
                    <span className={styles.spinner}><Loader2 size={30} aria-hidden="true" /></span>
                    <strong>Preparando el PDF…</strong>
                    <p>La primera vez tarda unos segundos; después queda guardado y se abre al instante.</p>
                  </div>
                )}
                {failed && (
                  <div className={styles.loading} role="alert">
                    <span className={styles.spinner}><TriangleAlert size={30} aria-hidden="true" /></span>
                    <strong>No pudimos generar el PDF</strong>
                    <p>Puedes leer la guía directamente en esta página.</p>
                    <button type="button" className={styles.action} onClick={() => { setFailed(false); setReady(false); setAttempt((n) => n + 1); }}>Reintentar</button>
                  </div>
                )}
                <iframe key={attempt} className={cx(styles.frame, ready && styles.frameOn)} src={`${guidePdfUrl(activityId)}#navpanes=0&view=FitH`} title="Guía de estudio en PDF"
                  onLoad={(event) => {
                    // Si el servidor respondió con un error (JSON) en lugar del PDF, se avisa.
                    let type = '';
                    try { type = event.currentTarget.contentDocument?.contentType ?? ''; } catch { /* mismo origen: no debería fallar */ }
                    if (type.includes('json') || type.includes('html')) { setFailed(true); return; }
                    setReady(true);
                  }} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
