import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useMarkNotificationsRead, useNotifications } from '../api/hooks';
import type { AppNotification } from '../api/types';
import { KIND_META } from '../lib/notificationKinds';
import { parseBody, prettyBody, prettyTitle } from '../lib/notificationText';
import { tintFor } from '../lib/tint';
import { useReducedMotion } from '../lib/motion';
import { useOpenNotification } from './NotificationCenter';
import styles from './NotificationToaster.module.css';

const SEEN_KEY = 'ah.notifications.lastSeen';
const SHOW_MS = 8000;
const ease = [0.22, 1, 0.36, 1] as const;

const readSeen = (): number | null => { try { const v = window.localStorage.getItem(SEEN_KEY); return v ? Number(v) : null; } catch { return null; } };
const writeSeen = (at: number) => { try { window.localStorage.setItem(SEEN_KEY, String(at)); } catch { /* sin almacenamiento */ } };

/** ¿El navegador puede avisar fuera de la pestaña y el estudiante lo permitió? */
export const browserAlertsAllowed = () => typeof Notification !== 'undefined' && Notification.permission === 'granted';

/**
 * Avisa de lo que llegó mientras la app está abierta: una tarjeta que sube desde abajo y, si el estudiante lo permitió y la
 * pestaña está en segundo plano, una notificación del navegador. Al abrir la app solo avisa de lo posterior a la última vez.
 */
export function NotificationToaster() {
  const reduce = useReducedMotion();
  const { data } = useNotifications();
  const read = useMarkNotificationsRead();
  const open = useOpenNotification();
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const shown = useRef(new Set<string>());

  useEffect(() => {
    if (!data) return;
    const newest = data.notifications.reduce((max, n) => Math.max(max, Date.parse(n.createdAt)), 0);
    const since = readSeen();
    if (since === null) { writeSeen(newest || Date.now()); return; }
    const fresh = data.notifications.filter((n) => !n.readAt && Date.parse(n.createdAt) > since && !shown.current.has(n.id)).slice(0, 3);
    if (newest > since) writeSeen(newest);
    if (fresh.length === 0) return;
    for (const n of fresh) shown.current.add(n.id);
    setToasts((current) => [...fresh.reverse(), ...current].slice(0, 3));
    if (browserAlertsAllowed() && document.visibilityState === 'hidden') {
      for (const n of fresh) {
        try {
          const alert = new Notification(prettyTitle(n.title), { body: prettyBody(n.body) ?? undefined, tag: n.id, icon: '/favicon.svg' });
          alert.onclick = () => { window.focus(); open(n); alert.close(); };
        } catch { /* el navegador no deja avisar */ }
      }
    }
  }, [data, open]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const id = window.setTimeout(() => setToasts((current) => current.slice(0, -1)), SHOW_MS);
    return () => window.clearTimeout(id);
  }, [toasts]);

  const close = (id: string) => setToasts((current) => current.filter((n) => n.id !== id));

  return (
    <div className={styles.stack} role="region" aria-label="Avisos nuevos" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((n) => {
          const meta = KIND_META[n.kind];
          const Icon = meta.icon;
          const { lead, course, tags } = parseBody(n.body);
          return (
            <motion.div key={n.id} layout={!reduce} className={styles.toast} style={{ ['--k' as string]: meta.color, ['--course' as string]: tintFor(n.courseId).fg }}
              initial={reduce ? false : { opacity: 0, y: 28, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40, scale: 0.96 }} transition={{ duration: 0.34, ease }}>
              <button type="button" className={styles.body} onClick={() => { close(n.id); open(n); }}>
                <span className={styles.icon} aria-hidden="true"><Icon size={18} /></span>
                <span className={styles.text}>
                  <em className={styles.kind}>{meta.label}</em>
                  <b>{prettyTitle(n.title)}</b>
                  {lead && <small>{lead}</small>}
                  {(course || tags.length > 0) && (
                    <span className={styles.chips}>
                      {course && <span className={styles.course}><i aria-hidden="true" />{course}</span>}
                      {tags.map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}
                    </span>
                  )}
                </span>
              </button>
              <button type="button" className={styles.close} onClick={() => { close(n.id); read.mutate({ ids: [n.id] }); }} aria-label="Cerrar aviso"><X size={15} aria-hidden="true" /></button>
              <i className={styles.bar} style={{ animationDuration: `${SHOW_MS}ms` }} aria-hidden="true" />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
