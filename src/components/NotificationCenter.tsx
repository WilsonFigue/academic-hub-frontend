import { ArrowRight, BellOff, BellRing, CheckCheck, Settings2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDismissNotifications, useMarkNotificationsRead, useNotifications } from '../api/hooks';
import type { AppNotification } from '../api/types';
import { KIND_META } from '../lib/notificationKinds';
import { groupByDay, parseBody, prettyTitle, shortAgo } from '../lib/notificationText';
import { tintFor } from '../lib/tint';
import { useReducedMotion } from '../lib/motion';
import styles from './NotificationCenter.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

/**
 * Una notificación: icono del tipo, título, detalle y la materia como etiqueta de su color. Lo no leído lleva una barra de color a la izquierda.
 * Arriba a la derecha va la hora corta; al pasar el cursor se convierte en el botón de quitar.
 */
export function NotificationItem({ item, index = 0, onOpen, onDismiss }: { item: AppNotification; index?: number; onOpen: (item: AppNotification) => void; onDismiss: (item: AppNotification) => void }) {
  const reduce = useReducedMotion();
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  const { lead, course, tags } = useMemo(() => parseBody(item.body), [item.body]);
  const unread = !item.readAt;
  return (
    <motion.li layout={!reduce} className={cx(styles.item, unread && styles.unread)} style={{ ['--k' as string]: meta.color, ['--course' as string]: tintFor(item.courseId).fg }}
      initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, x: 24, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04, ease }}>
      <button type="button" className={styles.open} onClick={() => onOpen(item)} aria-label={`${unread ? 'Sin leer. ' : ''}${prettyTitle(item.title)}`}>
        <span className={styles.icon} aria-hidden="true"><Icon size={18} /></span>
        <span className={styles.content}>
          <b className={styles.title}>{prettyTitle(item.title)}</b>
          {lead && <span className={styles.lead}>{lead}</span>}
          {(course || tags.length > 0) && (
            <span className={styles.chips}>
              {course && <span className={styles.course}><i aria-hidden="true" />{course}</span>}
              {tags.map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}
            </span>
          )}
        </span>
      </button>
      <span className={styles.side}>
        <time className={styles.time} dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString('es-SV')}>{shortAgo(item.createdAt)}</time>
        {unread && <i className={styles.dot} aria-hidden="true" />}
        <button type="button" className={styles.dismiss} onClick={() => onDismiss(item)} aria-label={`Quitar: ${prettyTitle(item.title)}`}><X size={14} aria-hidden="true" /></button>
      </span>
    </motion.li>
  );
}

/** Avisos agrupados por día (Hoy, Ayer, fecha). Lo usan el panel de la campana y la página de notificaciones. */
export function NotificationGroups({ items, onOpen, onDismiss }: { items: AppNotification[]; onOpen: (item: AppNotification) => void; onDismiss: (item: AppNotification) => void }) {
  const groups = useMemo(() => groupByDay(items), [items]);
  let index = 0;
  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <section key={group.key} className={styles.group} aria-label={group.label}>
          <h3 className={styles.groupLabel}>{group.label}<span>{group.items.length}</span></h3>
          <ul className={styles.list}>
            <AnimatePresence initial={false}>
              {group.items.map((item) => <NotificationItem key={item.id} item={item} index={index++} onOpen={onOpen} onDismiss={onDismiss} />)}
            </AnimatePresence>
          </ul>
        </section>
      ))}
    </div>
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
              <h2>Notificaciones{unread > 0 && <span className={styles.count}>{unread} {unread === 1 ? 'nueva' : 'nuevas'}</span>}</h2>
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
              <div className={styles.scroll}>
                <NotificationGroups items={items.slice(0, 15)} onOpen={(n) => { setShown(false); open(n); }} onDismiss={(n) => dismiss.mutate({ ids: [n.id] })} />
              </div>
            )}
            <footer className={styles.foot}><Link to="/notifications">Ver todas y ajustar avisos<ArrowRight size={15} aria-hidden="true" /></Link></footer>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
