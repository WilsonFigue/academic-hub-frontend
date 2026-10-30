import { BellRing, BellOff, CheckCheck, Settings2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDismissNotifications, useMarkNotificationsRead, useNotifications } from '../api/hooks';
import type { AppNotification } from '../api/types';
import { formatRelative } from '../lib/format';
import { KIND_META } from '../lib/notificationKinds';
import { useReducedMotion } from '../lib/motion';
import styles from './NotificationCenter.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

/** Una notificación: icono del tipo, título, detalle y hora. Al pulsarla se abre lo que anuncia y queda leída. */
export function NotificationItem({ item, index = 0, onOpen, onDismiss }: { item: AppNotification; index?: number; onOpen: (item: AppNotification) => void; onDismiss: (item: AppNotification) => void }) {
  const reduce = useReducedMotion();
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  return (
    <motion.li layout={!reduce} className={cx(styles.item, !item.readAt && styles.unread)} style={{ ['--k' as string]: meta.color }}
      initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, x: 24, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04, ease }}>
      <button type="button" className={styles.open} onClick={() => onOpen(item)}>
        <span className={styles.icon} aria-hidden="true"><Icon size={18} /></span>
        <span className={styles.text}>
          <b>{item.title}</b>
          {item.body && <small>{item.body}</small>}
          <em>{meta.label} · {formatRelative(item.createdAt)}</em>
        </span>
        {!item.readAt && <i className={styles.dot} aria-label="Sin leer" />}
      </button>
      <button type="button" className={styles.dismiss} onClick={() => onDismiss(item)} aria-label={`Quitar: ${item.title}`}><X size={14} aria-hidden="true" /></button>
    </motion.li>
  );
}

/** Abre un aviso: lo marca leído y navega a su enlace interno. */
export function useOpenNotification() {
  const navigate = useNavigate();
  const read = useMarkNotificationsRead();
  return (item: AppNotification) => {
    if (!item.readAt) read.mutate({ ids: [item.id] });
    if (item.link && item.link.startsWith('/')) navigate(item.link);
  };
}

/** Campana de la barra superior: contador real de avisos sin leer y panel con la bandeja. */
export function NotificationBell() {
  const reduce = useReducedMotion();
  const location = useLocation();
  const { data } = useNotifications();
  const read = useMarkNotificationsRead();
  const dismiss = useDismissNotifications();
  const open = useOpenNotification();
  const [shown, setShown] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const unread = data?.unread ?? 0;
  const items = (data?.notifications ?? []).filter((n) => !onlyUnread || !n.readAt);
  const badge = unread > 9 ? '9+' : String(unread);

  useEffect(() => { setShown(false); }, [location.pathname]);
  useEffect(() => {
    if (!shown) return;
    const onDown = (event: PointerEvent) => { if (root.current && !root.current.contains(event.target as Node)) setShown(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setShown(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [shown]);

  return (
    <div className={styles.root} ref={root}>
      <button type="button" className={styles.bell} onClick={() => setShown((v) => !v)} aria-haspopup="dialog" aria-expanded={shown}
        aria-label={unread > 0 ? `Notificaciones: ${unread} sin leer` : 'Notificaciones'}>
        <BellRing size={20} aria-hidden="true" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span key={unread} className={styles.badge} aria-hidden="true" initial={reduce ? false : { scale: 0.4 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 22 }}>{badge}</motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {shown && (
          <motion.section className={styles.panel} role="dialog" aria-label="Notificaciones" initial={reduce ? false : { opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.22, ease }}>
            <header className={styles.head}>
              <h2>Notificaciones{unread > 0 && <span className={styles.count}>{unread} nuevas</span>}</h2>
              <div className={styles.actions}>
                <button type="button" onClick={() => read.mutate({ all: true })} disabled={unread === 0} aria-label="Marcar todo como leído" title="Marcar todo como leído"><CheckCheck size={17} aria-hidden="true" /></button>
                <Link to="/notifications" aria-label="Preferencias de notificaciones" title="Preferencias"><Settings2 size={17} aria-hidden="true" /></Link>
              </div>
            </header>
            <div className={styles.tabs} role="tablist" aria-label="Filtro">
              <button type="button" role="tab" aria-selected={!onlyUnread} className={cx(styles.tab, !onlyUnread && styles.tabOn)} onClick={() => setOnlyUnread(false)}>Todas</button>
              <button type="button" role="tab" aria-selected={onlyUnread} className={cx(styles.tab, onlyUnread && styles.tabOn)} onClick={() => setOnlyUnread(true)}>Sin leer{unread > 0 ? ` · ${unread}` : ''}</button>
            </div>
            {items.length === 0 ? (
              <div className={styles.empty}>
                <span><BellOff size={22} aria-hidden="true" /></span>
                <b>{onlyUnread ? 'Nada sin leer' : 'Todo al día'}</b>
                <small>Aquí verás tus entregas por vencer, guías listas, notas y actividades nuevas.</small>
              </div>
            ) : (
              <ul className={styles.list}>
                <AnimatePresence initial={false}>
                  {items.slice(0, 12).map((item, i) => <NotificationItem key={item.id} item={item} index={i} onOpen={(n) => { setShown(false); open(n); }} onDismiss={(n) => dismiss.mutate({ ids: [n.id] })} />)}
                </AnimatePresence>
              </ul>
            )}
            <footer className={styles.foot}><Link to="/notifications">Ver todas y ajustar avisos</Link></footer>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
