import { Bell, BellOff, BellRing, Check, CheckCheck, ChevronDown, Loader2, Settings2, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { useDismissNotifications, useMarkNotificationsRead, useNotificationPreferences, useNotifications, useSetNotificationPreferences, useTelegram, useTelegramEnabled, useTelegramLink, useTelegramTest, useTelegramUnlink } from '../api/hooks';
import type { NotificationKind } from '../api/types';
import { NotificationItem, useOpenNotification } from '../components/NotificationCenter';
import { browserAlertsAllowed } from '../components/NotificationToaster';
import { Button, Card, Skeleton } from '../components/ui';
import { KIND_GROUPS, KIND_META } from '../lib/notificationKinds';
import { useReducedMotion } from '../lib/motion';
import styles from './Notifications.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

/** Logo de Telegram: avioncito blanco sobre círculo azul. */
function TelegramLogo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs><linearGradient id="tg-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#37aee2" /><stop offset="1" stopColor="#1e96c8" /></linearGradient></defs>
      <circle cx="24" cy="24" r="24" fill="url(#tg-grad)" />
      <path fill="#ffffff" d="M10.6 23.4l19.9-7.7c.9-.4 1.8.2 1.5 1.6l-3.4 16c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L16.1 25.2l-5-1.6c-1.1-.3-1.1-1.1.2-1.6z" />
    </svg>
  );
}

type Dot = 'on' | 'off' | 'wait';
/** Un canal de aviso (Telegram, navegador): icono, nombre, estado con punto de color y sus acciones. */
function Channel({ icon, title, status, dot, children }: { icon: ReactNode; title: string; status: string; dot: Dot; children?: ReactNode }) {
  return (
    <div className={styles.channel}>
      <span className={styles.channelIcon} aria-hidden="true">{icon}</span>
      <div className={styles.channelText}>
        <b>{title}</b>
        <small><i className={cx(styles.dot, styles[`dot-${dot}`])} aria-hidden="true" />{status}</small>
      </div>
      {children && <div className={styles.channelActions}>{children}</div>}
    </div>
  );
}

/** Conectar Telegram: genera el enlace al bot, espera a que la persona pulse «Iniciar» y luego permite probar, pausar o desconectar. */
function TelegramConnect() {
  const [waiting, setWaiting] = useState(false);
  const [note, setNote] = useState('');
  const { data } = useTelegram(waiting);
  const link = useTelegramLink();
  const unlink = useTelegramUnlink();
  const test = useTelegramTest();
  const enabled = useTelegramEnabled();
  useEffect(() => { if (waiting && data?.linked) { setWaiting(false); setNote('¡Conectado! Ya te llegarán los avisos.'); } }, [waiting, data?.linked]);
  if (!data?.configured) return null;

  const connect = () => link.mutate(undefined, { onSuccess: ({ url }) => { setWaiting(true); setNote(''); window.open(url, '_blank', 'noopener'); } });
  const who = data.username ? ` · ${data.username.startsWith('@') ? data.username : `@${data.username}`}` : '';
  const status = note || (waiting ? 'Abre Telegram y pulsa «Iniciar»…'
    : data.linked ? (data.enabled ? `Conectado${who}` : `En pausa${who}`) : 'Recibe tus avisos en el chat');
  const dot: Dot = waiting ? 'wait' : data.linked && data.enabled ? 'on' : 'off';
  return (
    <Channel icon={waiting ? <span className={styles.spinWrap}><TelegramLogo /><Loader2 size={16} className={styles.spin} /></span> : <TelegramLogo />} title="Telegram" status={status} dot={dot}>
      {!data.linked && !waiting && <button type="button" className={styles.primary} onClick={connect} disabled={link.isPending}>Conectar</button>}
      {waiting && <button type="button" className={styles.ghost} onClick={connect}>Abrir otra vez</button>}
      {data.linked && (
        <>
          <button type="button" className={styles.ghost} disabled={test.isPending}
            onClick={() => test.mutate(undefined, { onSuccess: () => setNote('Mensaje de prueba enviado'), onError: () => setNote('No se pudo enviar la prueba') })}>Probar</button>
          <button type="button" className={styles.ghost} onClick={() => enabled.mutate(!data.enabled)}>{data.enabled ? 'Pausar' : 'Reanudar'}</button>
          <button type="button" className={styles.ghost} onClick={() => { unlink.mutate(undefined); setNote(''); }}>Desconectar</button>
        </>
      )}
    </Channel>
  );
}

/** Avisos del sistema cuando Academic Hub está abierto en otra pestaña. */
function BrowserAlerts() {
  const supported = typeof Notification !== 'undefined';
  const [permission, setPermission] = useState<NotificationPermission>(supported ? Notification.permission : 'denied');
  const allowed = supported && browserAlertsAllowed();
  const ask = async () => { if (supported) setPermission(await Notification.requestPermission()); };
  const status = !supported ? 'Tu navegador no los admite'
    : permission === 'granted' ? 'Activados en este navegador'
      : permission === 'denied' ? 'Bloqueados: permítelos en el candado' : 'Avisos aunque estés en otra pestaña';
  return (
    <Channel icon={<span className={cx(styles.bellIcon, allowed && styles.bellOn)}>{allowed ? <BellRing size={22} /> : <BellOff size={22} />}</span>} title="Navegador" status={status} dot={allowed ? 'on' : 'off'}>
      {supported && permission === 'default' && <button type="button" className={styles.primary} onClick={() => { void ask(); }}>Activar</button>}
    </Channel>
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
      </header>

      <section className={styles.channels} aria-label="Dónde recibir los avisos">
        <TelegramConnect />
        <BrowserAlerts />
      </section>

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
