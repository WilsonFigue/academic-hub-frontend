import { Bell, BellOff, BellRing, Check, CheckCheck, ChevronDown, Settings2, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useDismissNotifications, useMarkNotificationsRead, useNotificationPreferences, useNotifications, useSetNotificationPreferences } from '../api/hooks';
import type { NotificationKind } from '../api/types';
import { NotificationItem, useOpenNotification } from '../components/NotificationCenter';
import { browserAlertsAllowed } from '../components/NotificationToaster';
import { Button, Card, Skeleton } from '../components/ui';
import { KIND_GROUPS, KIND_META } from '../lib/notificationKinds';
import { useReducedMotion } from '../lib/motion';
import styles from './Notifications.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

/** Franja corta junto al título: avisos del sistema cuando la app está en otra pestaña. */
function BrowserAlerts() {
  const supported = typeof Notification !== 'undefined';
  const [permission, setPermission] = useState<NotificationPermission>(supported ? Notification.permission : 'denied');
  const allowed = supported && browserAlertsAllowed();
  const ask = async () => { if (supported) setPermission(await Notification.requestPermission()); };
  const text = !supported ? 'Tu navegador no admite avisos del sistema'
    : permission === 'granted' ? 'Avisos del navegador activados'
      : permission === 'denied' ? 'Avisos del navegador bloqueados (permítelos en el candado)'
        : 'Recibe avisos aunque estés en otra pestaña';
  return (
    <div className={cx(styles.alerts, allowed && styles.alertsOn)}>
      <span className={styles.alertsIcon} aria-hidden="true">{allowed ? <BellRing size={16} /> : <BellOff size={16} />}</span>
      <span className={styles.alertsText}>{text}</span>
      {supported && permission === 'default' && <button type="button" className={styles.alertsButton} onClick={() => { void ask(); }}>Activar</button>}
    </div>
  );
}

/** Qué tipos de aviso llegan. Plegado por defecto: etiquetas que se encienden y apagan con un toque. */
function Preferences() {
  const { data } = useNotificationPreferences();
  const save = useSetNotificationPreferences();
  const muted = new Set<NotificationKind>(data?.muted ?? []);
  const total = Object.keys(KIND_META).length;
  const toggle = (kind: NotificationKind, on: boolean) => {
    const next = new Set(muted);
    if (on) next.delete(kind); else next.add(kind);
    save.mutate([...next]);
  };
  return (
    <details className={styles.prefs}>
      <summary>
        <Settings2 size={16} aria-hidden="true" />
        <b>Qué quieres que te avise</b>
        <em>{total - muted.size} de {total} activos</em>
        <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
      </summary>
      <div className={styles.groups}>
        {KIND_GROUPS.map((group) => (
          <section key={group.title} className={styles.group} aria-label={group.title}>
            <h3>{group.title}</h3>
            <div className={styles.chips}>
              {group.kinds.map((kind) => {
                const meta = KIND_META[kind];
                const Icon = meta.icon;
                return (
                  <button key={kind} type="button" role="switch" aria-checked={!muted.has(kind)} className={styles.chip} style={{ ['--k' as string]: meta.color }} title={meta.hint} onClick={() => toggle(kind, muted.has(kind))}>
                    <span className={styles.chipIcon} aria-hidden="true"><Icon size={16} /></span><span className={styles.chipLabel}>{meta.label}</span><span className={styles.track} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </details>
  );
}

export function NotificationsPage() {
  const reduce = useReducedMotion();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const { data, isPending, isError, refetch } = useNotifications({ limit: 100 });
  const read = useMarkNotificationsRead();
  const dismiss = useDismissNotifications();
  const open = useOpenNotification();
  const all = data?.notifications ?? [];
  const items = onlyUnread ? all.filter((n) => !n.readAt) : all;
  const unread = data?.unread ?? 0;
  const readIds = all.filter((n) => n.readAt).map((n) => n.id);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <motion.div initial={reduce ? false : { opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease }}>
          <span className={styles.eyebrow}><Bell size={14} aria-hidden="true" />Avisos</span>
          <h1 className={styles.heading}>Notificaciones</h1>
          <p className={styles.lede}>Entregas por vencer, guías y tareas listas, actividades nuevas, notas y anuncios.</p>
        </motion.div>
        <BrowserAlerts />
      </header>

      <Card padded={false} className={styles.panel}>
        <div className={styles.toolbar}>
          <div className={styles.tabs} role="tablist" aria-label="Filtro">
            <button type="button" role="tab" aria-selected={!onlyUnread} className={cx(styles.tab, !onlyUnread && styles.tabOn)} onClick={() => setOnlyUnread(false)}>Todas</button>
            <button type="button" role="tab" aria-selected={onlyUnread} className={cx(styles.tab, onlyUnread && styles.tabOn)} onClick={() => setOnlyUnread(true)}>Sin leer{unread > 0 ? ` · ${unread}` : ''}</button>
          </div>
          <div className={styles.tools}>
            <Button variant="ghost" disabled={unread === 0} onClick={() => read.mutate({ all: true })}><CheckCheck size={16} aria-hidden="true" />Marcar todo leído</Button>
            <Button variant="ghost" disabled={readIds.length === 0} onClick={() => dismiss.mutate({ ids: readIds.slice(0, 100) })}><Trash2 size={16} aria-hidden="true" />Quitar leídas</Button>
          </div>
        </div>

        {isPending ? (
          <div className={styles.skeleton}>{[0, 1, 2].map((i) => <Skeleton key={i} height={58} radius={16} />)}</div>
        ) : isError ? (
          <div className={styles.empty}>
            <span aria-hidden="true"><BellOff size={20} /></span>
            <div><b>No pudimos cargar tus notificaciones</b><small>Revisa tu conexión e inténtalo de nuevo.</small></div>
            <Button variant="secondary" onClick={() => { void refetch(); }}>Reintentar</Button>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <span aria-hidden="true"><BellOff size={20} /></span>
            <div><b>{onlyUnread ? 'No tienes nada sin leer' : 'Todo al día'}</b><small>Aquí aparecerán tus entregas por vencer, guías listas y notas nuevas.</small></div>
          </div>
        ) : (
          <ul className={styles.list}>
            <AnimatePresence initial={false}>
              {items.map((item, i) => <NotificationItem key={item.id} item={item} index={i} onOpen={open} onDismiss={(n) => dismiss.mutate({ ids: [n.id] })} />)}
            </AnimatePresence>
          </ul>
        )}

        <Preferences />
      </Card>
    </div>
  );
}
