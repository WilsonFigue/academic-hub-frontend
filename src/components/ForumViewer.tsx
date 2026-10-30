import { MessagesSquare, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../lib/motion';
import { ForumBlock } from './ForumBlock';
import styles from './FileViewer.module.css';

export interface ForumTarget { courseId: string; id: string; title: string; lmsUrl?: string | null }

/** Foro abierto desde el contenido de la materia: lo que pide, sus fechas y el botón para sugerir una respuesta. */
export function ForumViewer({ target, onClose }: { target: ForumTarget | null; onClose: () => void }) {
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!target) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [target, onClose]);

  return (
    <AnimatePresence>
      {target && (
        <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
          <motion.div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="forum-title"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
            <header className={styles.head} style={{ ['--k' as string]: 'var(--mint)' }}>
              <span className={styles.disc} aria-hidden="true"><MessagesSquare size={26} /></span>
              <div className={styles.headText}><h2 id="forum-title">{target.title}</h2><p>Foro</p></div>
              <div className={styles.actions}>
                <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Cerrar"><X size={20} aria-hidden="true" /></button>
              </div>
            </header>
            <div className={styles.forumBody}>
              <ForumBlock key={target.id} base={`/courses/${target.courseId}/content/${target.id}`} expanded />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
