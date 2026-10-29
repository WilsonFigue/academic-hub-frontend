import {
  ArrowDownAZ, ArrowDownWideNarrow, ArrowUpRight, BookText, CalendarClock, CalendarOff, ChevronRight, Columns3, PanelLeftClose, PanelLeftOpen, PanelRightOpen, CircleCheck, ClipboardCheck, Clock, FileCheck2, Layers, Library, MessageSquareText, MessagesSquare, PenLine,
  RotateCcw, Search, Send, Shapes, Sparkles, TriangleAlert, X, type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, Reorder, motion, useDragControls } from 'motion/react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useActivities, useBoardLayout, useSaveBoardLayout, type BoardLayout } from '../api/hooks';
import type { Activity } from '../api/types';
import { ActivityDetail } from '../components/ActivityDetail';
import { Highlight, normalize } from '../components/Filters';
import { FilterMenu, SegTabs, ToggleMenu } from '../components/FilterKit';
import { Button, Card, EmptyState, Skeleton } from '../components/ui';
import { courseIcon } from '../lib/courseIcon';
import { STATUS_INFO, pctOf, statusKeyOf, type StatusKey } from '../lib/dashFilters';
import { TIMEZONE, addDays, categoryLabel, courseTitle, dayKey, daysUntil, formatDueRelative, formatRelative, formatScore, formatTime } from '../lib/format';
import { useReducedMotion } from '../lib/motion';
import { activityStatus } from '../lib/status';
import { tintFor } from '../lib/tint';
import styles from './Activities.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const WIDE = '(min-width: 1101px)';
/** Minimizar a un lado solo aplica con el tablero en rejilla; en pantallas angostas se desliza de lado. */
function useWide() {
  return useSyncExternalStore((cb) => { const m = window.matchMedia(WIDE); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); }, () => window.matchMedia(WIDE).matches, () => true);
}
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');
const WEEK_MS = 7 * 86_400_000;
const LIMIT = 5;
const weekday = new Intl.DateTimeFormat('es-SV', { timeZone: TIMEZONE, weekday: 'short' });
const weekdayLong = new Intl.DateTimeFormat('es-SV', { timeZone: TIMEZONE, weekday: 'long', day: 'numeric', month: 'long' });
const dayNum = new Intl.DateTimeFormat('es-SV', { timeZone: TIMEZONE, day: 'numeric' });
const month = new Intl.DateTimeFormat('es-SV', { timeZone: TIMEZONE, month: 'short' });

const COLUMNS: Array<{ id: StatusKey; label: string; hint: string; icon: LucideIcon; empty: string }> = [
  { id: 'pending', label: 'Por entregar', hint: 'Con fecha por delante', icon: Clock, empty: 'No tienes nada pendiente.' },
  { id: 'overdue', label: 'Vencidas', hint: 'Pasó la fecha sin nota o con cero', icon: TriangleAlert, empty: 'Ninguna vencida. Vas al día.' },
  { id: 'submitted', label: 'Entregadas', hint: 'Esperando la nota del docente', icon: Send, empty: 'Nada esperando nota.' },
  { id: 'graded', label: 'Calificadas', hint: 'Con nota publicada', icon: CircleCheck, empty: 'Aún no hay notas.' },
  { id: 'nodate', label: 'Sin fecha', hint: 'Blackboard no les puso vencimiento', icon: CalendarOff, empty: 'Todo tiene fecha.' },
];
const colorOf = (key: StatusKey) => (key === 'pending' ? 'var(--st-pending)' : STATUS_INFO[key].color);

function kindIcon(activity: Activity): LucideIcon {
  const category = categoryLabel(activity.categoryKey, activity.categoryTitle);
  if (category === 'Examen') return FileCheck2;
  if (category === 'Prueba') return ClipboardCheck;
  if (category === 'Debate' || activity.kind === 'resource/x-bb-forumlink') return MessagesSquare;
  if (category === 'Diario') return BookText;
  return PenLine;
}
const kindLabel = (a: Activity) => categoryLabel(a.categoryKey, a.categoryTitle) ?? 'Actividad';
const bandVar = (pct: number) => (pct < 60 ? 'var(--bad)' : pct < 80 ? 'var(--warn)' : 'var(--ok)');

function BoardCard({ activity, column, index, query, onOpen }: { activity: Activity; column: StatusKey; index: number; query: string; onOpen: (a: Activity) => void }) {
  const reduce = useReducedMotion();
  const tint = tintFor(activity.courseId);
  const CourseIcon = courseIcon(courseTitle(activity.courseName));
  const KindIcon = kindIcon(activity);
  const due = activity.dueAt ? new Date(activity.dueAt) : null;
  const left = due && column === 'pending' ? daysUntil(activity.dueAt!) : null;
  const soon = left !== null && left <= 2;
  const pct = column === 'graded' || column === 'overdue' ? pctOf(activity) : null;
  const fraction = due && column === 'pending' ? Math.min(1, Math.max(0.04, (due.getTime() - Date.now()) / WEEK_MS)) : 0;
  const name = activity.effectiveName ?? activity.name;
  return (
    <motion.li layout="position" className={styles.item}
      initial={reduce ? false : { opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.14 } }}
      transition={{ duration: 0.4, delay: Math.min(index, 7) * 0.04, ease }}>
      <button type="button" className={cx(styles.card, soon && styles.cardSoon)} style={{ ['--c' as string]: tint.fg, ['--cbg' as string]: tint.bg, ['--s' as string]: colorOf(column) }} onClick={() => onOpen(activity)}
        aria-label={`${name}, ${courseTitle(activity.courseName)}, ${activityStatus(activity).label}`}>
        <span className={styles.top}>
          <span className={styles.course}><CourseIcon size={13} aria-hidden="true" />{courseTitle(activity.courseName)}</span>
          {due && <span className={cx(styles.when, soon && styles.whenSoon)}>{column === 'pending' ? formatDueRelative(activity.dueAt) : `${dayNum.format(due)} ${month.format(due).replace('.', '')}`}</span>}
        </span>
        <span className={styles.title}><Highlight text={name} query={query} /></span>
        <span className={styles.meta}>
          <span className={styles.kind}><KindIcon size={14} aria-hidden="true" />{kindLabel(activity)}</span>
          {due && column === 'pending' && <span>{weekday.format(due).replace('.', '')} {formatTime(activity.dueAt)}</span>}
          {column === 'overdue' && due && <span>{formatDueRelative(activity.dueAt)}</span>}
          {column === 'submitted' && (activity.submittedAt ? <span>entregada {formatRelative(activity.submittedAt)}</span> : due && <span>{formatDueRelative(activity.dueAt)}</span>)}
          {column === 'graded' && activity.gradedAt && <span>{formatRelative(activity.gradedAt)}</span>}
          {activity.hasFeedback && <span className={styles.feedback}><MessageSquareText size={13} aria-hidden="true" />comentarios</span>}
        </span>
        {column === 'pending' && due && (
          <span className={styles.time} aria-hidden="true">
            <motion.i initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: fraction }} transition={{ duration: 0.9, delay: 0.2 + Math.min(index, 7) * 0.04, ease }} />
          </span>
        )}
        {pct !== null && (
          <span className={styles.score} style={{ ['--b' as string]: bandVar(pct) }}>
            <strong className="tabular">{formatScore(activity.score ?? 0)}{activity.pointsPossible !== null && <small> / {formatScore(activity.pointsPossible)}</small>}</strong>
            <span className={styles.mini} aria-hidden="true"><motion.i initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: Math.max(pct, 2) / 100 }} transition={{ duration: 0.9, delay: 0.25, ease }} /></span>
            <em className="tabular">{Math.round(pct)}%</em>
          </span>
        )}
        <ArrowUpRight className={styles.go} size={16} aria-hidden="true" />
      </button>
    </motion.li>
  );
}

/** Franja de los próximos 7 días: cada punto es una actividad con el color de su estado. */
function WeekStrip({ items, day, onDay }: { items: Activity[]; day: string | null; onDay: (key: string | null) => void }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<string | null>(null);
  const today = dayKey(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const byDay = new Map<string, Activity[]>();
  items.forEach((a) => { if (a.dueAt) { const k = dayKey(a.dueAt); byDay.set(k, [...(byDay.get(k) ?? []), a]); } });
  const focus = hover ?? day;
  const list = focus ? byDay.get(focus) ?? [] : [];
  const total = days.reduce((n, k) => n + (byDay.get(k)?.length ?? 0), 0);
  return (
    <section className={styles.week} aria-label="Próximos siete días">
      <div className={styles.weekHead}>
        <h2><CalendarClock size={18} aria-hidden="true" />Tu semana</h2>
        <span>{total === 0 ? 'No hay entregas en los próximos 7 días' : `${total} ${total === 1 ? 'actividad con fecha' : 'actividades con fecha'} en los próximos 7 días`}</span>
        {day && <button type="button" onClick={() => onDay(null)}><X size={13} aria-hidden="true" />Quitar día</button>}
      </div>
      <div className={styles.days} onPointerLeave={() => setHover(null)}>
        {days.map((key, i) => {
          const here = byDay.get(key) ?? [];
          const date = new Date(`${key}T12:00:00`);
          const busy = here.length;
          return (
            <motion.button key={key} type="button" className={cx(styles.day, i === 0 && styles.dayToday, day === key && styles.dayOn, busy === 0 && styles.dayEmpty)}
              aria-pressed={day === key} disabled={busy === 0} aria-label={`${weekdayLong.format(date)}: ${busy} ${busy === 1 ? 'actividad' : 'actividades'}`}
              onClick={() => onDay(day === key ? null : key)} onPointerEnter={() => setHover(key)} onFocus={() => setHover(key)} onBlur={() => setHover(null)}
              initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 + i * 0.05, ease }}>
              <small>{i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : weekday.format(date).replace('.', '')}</small>
              <strong className="tabular">{dayNum.format(date)}</strong>
              <span className={styles.dots}>
                {here.slice(0, 4).map((a) => <i key={a.id} style={{ background: colorOf(statusKeyOf(a)) }} />)}
                {busy > 4 && <b>+{busy - 4}</b>}
              </span>
            </motion.button>
          );
        })}
      </div>
      <div className={styles.caption} aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.span key={focus ?? 'none'} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ duration: 0.2, ease }}>
            {focus && list.length > 0
              ? <><b>{weekdayLong.format(new Date(`${focus}T12:00:00`))}</b>{list.map((a) => a.effectiveName ?? a.name).join(' · ')}</>
              : <em>Toca un día para ver solo lo que vence ese día.</em>}
          </motion.span>
        </AnimatePresence>
      </div>
    </section>
  );
}

/** Panel lateral con todas las actividades de una columna. */
function ColumnSheet({ column, items, query, onClose, onOpen }: { column: StatusKey | null; items: Activity[]; query: string; onClose: () => void; onOpen: (a: Activity) => void }) {
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const meta = COLUMNS.find((c) => c.id === column);
  useEffect(() => {
    if (!column) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [column, onClose]);
  const Icon = meta?.icon ?? Clock;
  return (
    <AnimatePresence>
      {column && meta && (
        <>
          <motion.div className={styles.overlay} onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} />
          <motion.aside className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="sheet-title" style={{ ['--s' as string]: colorOf(column) }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 56 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, x: 56, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}>
            <header className={styles.sheetHead}>
              <span className={styles.columnIcon}><Icon size={22} aria-hidden="true" /></span>
              <div className={styles.sheetTitle}><h2 id="sheet-title">{meta.label}</h2><p>{items.length} {items.length === 1 ? 'actividad' : 'actividades'} · {meta.hint}</p></div>
              <button ref={closeRef} type="button" className={styles.sheetClose} onClick={onClose} aria-label="Cerrar lista"><X size={20} aria-hidden="true" /></button>
            </header>
            <ul className={styles.sheetList}>
              {items.map((a, i) => <BoardCard key={a.id} activity={a} column={column} index={i} query={query} onOpen={onOpen} />)}
            </ul>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

type Sort = 'auto' | 'course' | 'name';
const SORTS = [
  { value: 'auto' as const, label: 'Por fecha', icon: ArrowDownWideNarrow, hint: 'Lo próximo primero; en calificadas, lo más reciente' },
  { value: 'course' as const, label: 'Por materia', icon: Library },
  { value: 'name' as const, label: 'Nombre A–Z', icon: ArrowDownAZ },
];

/** Distribución del tablero: orden, columnas minimizadas a un lado y columnas cerradas. */
type Layout = { order: StatusKey[]; minimized: Set<StatusKey>; hidden: Set<StatusKey> };
const DEFAULT_ORDER = COLUMNS.map((c) => c.id);
const isKey = (value: string): value is StatusKey => DEFAULT_ORDER.includes(value as StatusKey);
function layoutFrom(saved: BoardLayout | null | undefined): Layout {
  const order = (saved?.order ?? []).filter(isKey).filter((k, i, all) => all.indexOf(k) === i);
  DEFAULT_ORDER.forEach((k) => { if (!order.includes(k)) order.push(k); });
  return { order, minimized: new Set((saved?.minimized ?? []).filter(isKey)), hidden: new Set((saved?.hidden ?? []).filter(isKey)) };
}
const layoutDto = (layout: Layout): BoardLayout => ({ order: layout.order, minimized: [...layout.minimized], hidden: [...layout.hidden] });
const isDefault = (layout: Layout) => layout.order.every((k, i) => k === DEFAULT_ORDER[i]) && layout.minimized.size === 0 && layout.hidden.size === 0;

/** Una columna del tablero: se arrastra por la cabecera, se minimiza a un lado o se cierra. */
function BoardColumn({ meta, list, index, min, wide, filtered, query, reduce, onSheet, onMin, onClose, onMove, onOpen }: {
  meta: (typeof COLUMNS)[number]; list: Activity[]; index: number; min: boolean; wide: boolean; filtered: boolean; query: string; reduce: boolean;
  onSheet: () => void; onMin: () => void; onClose: () => void; onMove: (delta: -1 | 1) => void; onOpen: (a: Activity) => void;
}) {
  const controls = useDragControls();
  const { id, label, hint, icon: Icon, empty } = meta;
  const grab = wide ? { onPointerDown: (event: React.PointerEvent) => controls.start(event) } : {};
  const key = (event: React.KeyboardEvent) => {
    if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    onMove(event.key === 'ArrowLeft' ? -1 : 1);
  };
  return (
    <Reorder.Item as="section" value={id} dragListener={false} dragControls={controls} layout="position" className={cx(styles.column, min && styles.columnMin)}
      style={{ ['--s' as string]: colorOf(id) }} aria-label={label}
      initial={reduce ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 + index * 0.07, ease }}
      whileDrag={{ scale: 1.02, zIndex: 20, boxShadow: '0 28px 60px rgb(20 26 36 / 0.22)' }}>
      {min ? (
        <button type="button" className={styles.strip} {...grab} onClick={onMin} onKeyDown={key} aria-expanded="false" aria-label={`Expandir columna ${label}: ${list.length}`}>
          <span className={styles.columnIcon}><Icon size={20} aria-hidden="true" /><b className="tabular">{list.length}</b></span>
          <span className={styles.stripTitle}>{label}</span>
          <span className={styles.stripOpen}><PanelLeftOpen size={17} aria-hidden="true" /></span>
        </button>
      ) : (
        <>
          <div className={cx(styles.columnHead, wide && styles.grab)} {...grab}>
            <button type="button" className={styles.headMain} onClick={onSheet} onKeyDown={key} disabled={list.length === 0} aria-label={`Ver las ${list.length} de ${label}`}>
              <span className={styles.columnIcon}><Icon size={20} aria-hidden="true" /><b className="tabular">{list.length}</b></span>
              <span className={styles.columnTitle}>{label}<small>{hint}</small></span>
            </button>
            <div className={styles.actions}>
              {wide && <button type="button" className={styles.minBtn} onClick={onMin} aria-expanded="true" aria-label={`Minimizar columna ${label}`} data-tip="Minimizar"><PanelLeftClose size={15} aria-hidden="true" /></button>}
              <button type="button" className={styles.minBtn} onClick={onClose} aria-label={`Cerrar columna ${label}`} data-tip="Cerrar"><X size={15} aria-hidden="true" /></button>
            </div>
          </div>
          {list.length === 0 ? (
            <div className={styles.columnEmpty}><Icon size={22} aria-hidden="true" /><p>{filtered ? 'Nada con estos filtros.' : empty}</p></div>
          ) : (
            <>
              <ul className={styles.cards}>
                <AnimatePresence mode="popLayout">
                  {list.slice(0, LIMIT).map((a, i) => <BoardCard key={a.id} activity={a} column={id} index={i} query={query} onOpen={onOpen} />)}
                </AnimatePresence>
              </ul>
              {list.length > LIMIT && (
                <button type="button" className={styles.more} onClick={onSheet}>
                  <PanelRightOpen size={16} aria-hidden="true" />Ver las {list.length}<span>+{list.length - LIMIT} más</span>
                </button>
              )}
            </>
          )}
        </>
      )}
    </Reorder.Item>
  );
}

export function ActivitiesPage() {
  const { data, isPending, error, refetch } = useActivities();
  const reduce = useReducedMotion();
  const wide = useWide();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<Activity | null>(null);
  const [kind, setKind] = useState('all');
  const [sort, setSort] = useState<Sort>('auto');
  const [day, setDay] = useState<string | null>(null);
  const [sheet, setSheet] = useState<StatusKey | null>(null);
  // Distribución del tablero: se lee de tu cuenta, se edita en local y se guarda con un pequeño retardo.
  const saved = useBoardLayout();
  const save = useSaveBoardLayout();
  const [local, setLocal] = useState<Layout | null>(null);
  const [note, setNote] = useState('');
  const timer = useRef<number | undefined>(undefined);
  const layout = local ?? layoutFrom(saved.data);
  const commit = (next: Layout) => {
    setLocal(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => save.mutate(layoutDto(next), {
      onSuccess: () => { setNote('Distribución guardada'); window.setTimeout(() => setNote(''), 2400); },
      onError: () => setNote('No se pudo guardar la distribución'),
    }), 500);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const toggleIn = (set: Set<StatusKey>, key: StatusKey) => { const n = new Set(set); if (n.has(key)) n.delete(key); else n.add(key); return n; };
  const shownOrder = layout.order.filter((k) => !layout.hidden.has(k));
  const move = (key: StatusKey, delta: -1 | 1) => {
    const at = shownOrder.indexOf(key); const to = at + delta;
    if (to < 0 || to >= shownOrder.length) return;
    const next = shownOrder.slice(); [next[at], next[to]] = [next[to]!, next[at]!];
    commit({ ...layout, order: [...next, ...layout.order.filter((k) => layout.hidden.has(k))] });
  };
  const courseId = params.get('materia') ?? '';
  const rawQuery = params.get('q') ?? '';
  const needle = normalize(rawQuery.trim());

  const all = useMemo(() => (data ?? []).filter((a) => !a.isCalculated), [data]);
  const courses = useMemo(() => {
    const map = new Map<string, { name: string; n: number }>();
    all.forEach((a) => map.set(a.courseId, { name: courseTitle(a.courseName), n: (map.get(a.courseId)?.n ?? 0) + 1 }));
    return [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, 'es'));
  }, [all]);
  const kinds = useMemo(() => {
    const map = new Map<string, { n: number; icon: LucideIcon }>();
    all.forEach((a) => { const k = kindLabel(a); map.set(k, { n: (map.get(k)?.n ?? 0) + 1, icon: map.get(k)?.icon ?? kindIcon(a) }); });
    return [...map.entries()];
  }, [all]);

  const base = all.filter((a) => (!courseId || a.courseId === courseId) && (kind === 'all' || kindLabel(a) === kind) && (!needle || normalize(a.effectiveName ?? a.name).includes(needle)));
  const shown = base.filter((a) => !day || (a.dueAt && dayKey(a.dueAt) === day));
  const byColumn = new Map<StatusKey, Activity[]>();
  shown.forEach((a) => { const k = statusKeyOf(a); byColumn.set(k, [...(byColumn.get(k) ?? []), a]); });
  for (const [key, list] of byColumn) {
    list.sort((a, b) => {
      if (sort === 'name') return (a.effectiveName ?? a.name).localeCompare(b.effectiveName ?? b.name, 'es');
      if (sort === 'course') return courseTitle(a.courseName).localeCompare(courseTitle(b.courseName), 'es') || (Date.parse(a.dueAt ?? '') || Infinity) - (Date.parse(b.dueAt ?? '') || Infinity);
      const x = Date.parse(a.dueAt ?? '') || Infinity; const y = Date.parse(b.dueAt ?? '') || Infinity;
      if (key === 'graded' || key === 'overdue') return (y === Infinity ? 0 : y) - (x === Infinity ? 0 : x);
      return x - y;
    });
  }
  const next = all.filter((a) => statusKeyOf(a) === 'pending' && a.dueAt && Date.parse(a.dueAt) >= Date.now()).sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!))[0];
  const filtered = Boolean(courseId) || kind !== 'all' || Boolean(needle) || day !== null;
  const setCourse = (id: string) => setParams((cur) => { const n = new URLSearchParams(cur); if (id) n.set('materia', id); else n.delete('materia'); return n; }, { replace: true });
  const clearQuery = () => setParams((cur) => { const n = new URLSearchParams(cur); n.delete('q'); return n; }, { replace: true });
  const reset = () => { setParams({}, { replace: true }); setKind('all'); setDay(null); };
  const cols = shownOrder.map((k) => (wide && layout.minimized.has(k) ? '70px' : `minmax(0, ${(byColumn.get(k)?.length ?? 0) === 0 ? 0.95 : 1}fr)`)).join(' ');
  const NextIcon = next ? kindIcon(next) : Clock;

  return (
    <div>
      <header className={styles.head}>
        <motion.div initial={reduce ? false : { opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease }}>
          <span className={styles.eyebrow}><Layers size={14} aria-hidden="true" />Todas tus materias</span>
          <h1 className={styles.heading}>Tablero de actividades</h1>
          <p className={styles.lede}>Cada columna es un estado real de tus evaluables. Arrastra una columna por su cabecera para reordenarla, minimízala o ciérrala: tu distribución se guarda en tu cuenta.</p>
        </motion.div>
        {next && (
          <motion.button type="button" className={styles.next} onClick={() => setSelected(next)} style={{ ['--c' as string]: tintFor(next.courseId).fg, ['--cbg' as string]: tintFor(next.courseId).bg }}
            initial={reduce ? false : { opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.15, ease }}>
            <span className={styles.nextIcon}><NextIcon size={22} aria-hidden="true" /></span>
            <span className={styles.nextText}>
              <small>Siguiente entrega · {formatDueRelative(next.dueAt)}</small>
              <strong>{next.effectiveName ?? next.name}</strong>
              <em>{courseTitle(next.courseName)} · {formatTime(next.dueAt)}</em>
            </span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </motion.button>
        )}
      </header>

      {data && all.length > 0 && <WeekStrip items={base} day={day} onDay={setDay} />}

      {data && all.length > 0 && (
        <div className={styles.tools}>
          <div className={styles.menus}>
            {courses.length > 1 && (courses.length <= 6
              ? <SegTabs<string> label="Materia" iconOnly value={courseId || 'all'} onChange={(v) => setCourse(v === courseId ? '' : v === 'all' ? '' : v)} options={[
                { value: 'all', label: 'Todas las materias', icon: Layers, count: all.length },
                ...courses.map(([id, c]) => ({ value: id, label: c.name, icon: courseIcon(c.name), color: tintFor(id).fg, count: c.n })),
              ]} />
              : <FilterMenu<string> label="Materia" icon={Library} compact value={courseId || 'all'} neutral="all" onChange={(v) => setCourse(v === 'all' ? '' : v)} options={[
                { value: 'all', label: 'Todas las materias', icon: Layers, count: all.length },
                ...courses.map(([id, c]) => ({ value: id, label: c.name, icon: courseIcon(c.name), color: tintFor(id).fg, count: c.n })),
              ]} />)}
            <FilterMenu<string> label="Tipo" icon={Shapes} compact value={kind} neutral="all" onChange={setKind} options={[
              { value: 'all', label: 'Todos los tipos', icon: Layers, count: all.length },
              ...kinds.map(([label, k]) => ({ value: label, label, icon: k.icon, count: k.n })),
            ]} />
            <FilterMenu<Sort> label="Ordenar" icon={ArrowDownWideNarrow} compact value={sort} onChange={setSort} neutral="auto" options={SORTS} />
            <ToggleMenu<StatusKey> label="Columnas" icon={Columns3} compact badge={layout.hidden.size > 0 ? `${COLUMNS.length - layout.hidden.size}/${COLUMNS.length}` : undefined} summary={layout.hidden.size === 0 ? 'Todas visibles' : `${COLUMNS.length - layout.hidden.size} de ${COLUMNS.length}`} active={layout.hidden.size > 0}
              options={layout.order.map((k) => { const meta = COLUMNS.find((c) => c.id === k)!; return { value: k, label: meta.label, icon: meta.icon, color: colorOf(k), count: byColumn.get(k)?.length ?? 0, on: !layout.hidden.has(k) }; })}
              onToggle={(k) => commit({ ...layout, hidden: toggleIn(layout.hidden, k) })}
              action={{ label: 'Restablecer orden y columnas', icon: RotateCcw, disabled: isDefault(layout), onRun: () => commit(layoutFrom(null)) }} />
          </div>
          <span className={styles.note} role="status" aria-live="polite">{note}</span>
          <label className={styles.search}>
            <Search size={16} aria-hidden="true" />
            <span className="visually-hidden">Buscar actividad</span>
            <input type="search" value={rawQuery} onChange={(e) => setParams((cur) => { const n = new URLSearchParams(cur); if (e.target.value) n.set('q', e.target.value); else n.delete('q'); return n; }, { replace: true })}
              placeholder="Buscar actividad" autoComplete="off" spellCheck={false} />
            {rawQuery && <button type="button" className={styles.clear} onClick={clearQuery} aria-label="Borrar búsqueda"><X size={14} aria-hidden="true" /></button>}
          </label>
        </div>
      )}
      {filtered && data && (
        <div className={styles.active} aria-live="polite">
          <span>{shown.length} de {all.length} {all.length === 1 ? 'actividad' : 'actividades'}</span>
          <button type="button" onClick={reset}>Quitar filtros</button>
        </div>
      )}

      {(isPending || saved.isPending) && <div className={styles.board}>{COLUMNS.map((c) => <Skeleton key={c.id} height={320} radius={24} />)}</div>}
      {error && <Card><EmptyState tone="danger" icon={<TriangleAlert />} title="No pudimos cargar tus actividades"
        action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}>{error.message}</EmptyState></Card>}

      {data && all.length === 0 && <Card><EmptyState icon={<Sparkles />} title="Sin actividades todavía">Cuando importes tus materias, tus evaluables aparecerán aquí.</EmptyState></Card>}

      {data && !saved.isPending && all.length > 0 && (shownOrder.length === 0 ? (
        <div className={styles.allClosed}>
          <Columns3 size={26} aria-hidden="true" />
          <strong>Cerraste todas las columnas</strong>
          <p>Vuelve a mostrarlas cuando quieras.</p>
          <button type="button" onClick={() => commit(layoutFrom(null))}>Restablecer columnas</button>
        </div>
      ) : (
        <Reorder.Group as="div" axis="x" values={shownOrder} className={styles.board} style={{ ['--cols' as string]: cols }}
          onReorder={(next: StatusKey[]) => commit({ ...layout, order: [...next, ...layout.order.filter((k) => layout.hidden.has(k))] })}>
          {shownOrder.map((id, ci) => (
            <BoardColumn key={id} meta={COLUMNS.find((c) => c.id === id)!} list={byColumn.get(id) ?? []} index={ci} min={wide && layout.minimized.has(id)} wide={wide} filtered={filtered} query={rawQuery} reduce={reduce}
              onSheet={() => setSheet(id)} onOpen={setSelected} onMove={(delta) => move(id, delta)}
              onMin={() => commit({ ...layout, minimized: toggleIn(layout.minimized, id) })}
              onClose={() => commit({ ...layout, hidden: toggleIn(layout.hidden, id) })} />
          ))}
        </Reorder.Group>
      ))}
      <ColumnSheet column={sheet} items={sheet ? byColumn.get(sheet) ?? [] : []} query={rawQuery} onClose={() => setSheet(null)} onOpen={(a) => { setSheet(null); setSelected(a); }} />
      <ActivityDetail activityId={selected?.id ?? null} onClose={() => setSelected(null)} />
    </div>
  );
}
