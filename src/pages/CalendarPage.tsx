import * as Tooltip from '@radix-ui/react-tooltip';
import {
  ArrowDown, ArrowUpRight, BookText, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, CircleCheck, ClipboardCheck, ClipboardList, Clock, FileCheck2, Layers, ListTodo, Megaphone, MessagesSquare, PenLine, Send, Sparkles, TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCalendar } from '../api/hooks';
import type { CalendarItem } from '../api/types';
import { ActivityDetail } from '../components/ActivityDetail';
import { SegTabs } from '../components/FilterKit';
import { Button, Card, EmptyState, Skeleton } from '../components/ui';
import { courseIcon } from '../lib/courseIcon';
import { addDays, capitalize, categoryLabel, courseTitle, dayFromKey, dayKey, daysUntil, formatLongDay, formatTime, activityKind } from '../lib/format';
import { useReducedMotion } from '../lib/motion';
import { activityStatus } from '../lib/status';
import { tintFor } from '../lib/tint';
import styles from './CalendarPage.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

type View = 'month' | 'week' | 'agenda';
type Key = 'pending' | 'overdue' | 'submitted' | 'graded' | 'event';
type Estado = 'all' | Exclude<Key, 'event'>;
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const monthTitle = new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', month: 'long', year: 'numeric' });
const monthName = new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', month: 'short' });
const shortDay = new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', weekday: 'short' });
const longWeekday = new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', weekday: 'long' });
const rangeDay = new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', day: 'numeric', month: 'short' });

const COLOR: Record<Key, string> = { pending: 'var(--st-pending)', overdue: 'var(--bad)', submitted: 'var(--sky)', graded: 'var(--ok)', event: 'var(--teal)' };
const SINGULAR: Record<Key, string> = { pending: 'por entregar', overdue: 'vencida', submitted: 'entregada', graded: 'calificada', event: 'evento' };
const LABEL: Record<Key, string> = { pending: 'Por entregar', overdue: 'Vencidas', submitted: 'Entregadas', graded: 'Calificadas', event: 'Eventos' };
const ICON: Record<Key, LucideIcon> = { pending: Clock, overdue: TriangleAlert, submitted: Send, graded: CircleCheck, event: Megaphone };

/** En pantallas angostas la barra de estados pasa a solo iconos para que quepa sin partirse. */
function useCompact() {
  const query = '(max-width: 900px)';
  return useSyncExternalStore((cb) => { const m = window.matchMedia(query); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); }, () => window.matchMedia(query).matches, () => false);
}

function weekStart(key: string): string {
  const weekday = (dayFromKey(key).getUTCDay() + 6) % 7;
  return addDays(key, -weekday);
}

function monthGrid(anchor: string): string[] {
  const [year, month] = anchor.split('-').map(Number) as [number, number];
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  const start = weekStart(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function keyOf(item: CalendarItem): Key {
  if (item.type === 'event') return 'event';
  if (item.isAutoZero) return 'overdue';
  if (item.status === 'GRADED') return 'graded';
  if (item.isSubmitted) return 'submitted';
  return Date.parse(item.startAt) < Date.now() ? 'overdue' : 'pending';
}

function itemStatus(item: CalendarItem) {
  if (item.type === 'event') return { label: 'Evento', tone: 'neutral' as const };
  return activityStatus({ isCalculated: false, isExempt: false, isAutoZero: Boolean(item.isAutoZero), status: item.status, isSubmitted: item.isSubmitted, dueAt: item.startAt });
}

const kindLabel = (item: CalendarItem) => (item.type === 'event' ? 'Evento' : categoryLabel(item.categoryKey) ?? activityKind(item.kind));

function kindIcon(item: CalendarItem): LucideIcon {
  if (item.type === 'event') return Megaphone;
  const category = categoryLabel(item.categoryKey);
  if (category === 'Examen') return FileCheck2;
  if (category === 'Prueba') return ClipboardCheck;
  if (category === 'Debate') return MessagesSquare;
  if (category === 'Diario') return BookText;
  return PenLine;
}

/** "Hoy", "Mañana", "En 3 días" o "Hace 2 días" para un día calendario. */
function relativeDay(key: string): string {
  const days = Math.round((dayFromKey(key).getTime() - dayFromKey(dayKey(new Date())).getTime()) / 86_400_000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  if (days === -1) return 'Ayer';
  return days > 0 ? `En ${days} días` : `Hace ${-days} días`;
}

/** Pastilla de un elemento dentro de una celda, con tooltip con los datos completos. */
function Chip({ item, onOpen }: { item: CalendarItem; onOpen: (item: CalendarItem) => void }) {
  const tint = tintFor(item.courseId);
  const key = keyOf(item);
  const Icon = kindIcon(item);
  const status = itemStatus(item);
  return (
    <Tooltip.Root delayDuration={150}>
      <Tooltip.Trigger asChild>
        <button type="button" className={cx(styles.chip, item.type === 'event' && styles.chipEvent)} style={{ ['--c' as string]: tint.fg, ['--cbg' as string]: tint.bg, ['--s' as string]: COLOR[key] }}
          onClick={(event) => { event.stopPropagation(); onOpen(item); }}>
          <Icon size={11} aria-hidden="true" />
          <span>{item.title}</span>
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="top" sideOffset={6} className={styles.tooltip}>
          <strong>{item.title}</strong>
          <span>{item.courseName ? courseTitle(item.courseName) : 'Sin materia'} · {kindLabel(item)} · {formatTime(item.startAt)}</span>
          <span className={styles.tooltipStatus} style={{ ['--s' as string]: COLOR[key] }}>{status.label}</span>
          <Tooltip.Arrow className={styles.tooltipArrow} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** Tarjeta de un elemento: hora, título, materia, tipo, estado y cuenta regresiva. Las entregas abren su detalle. */
function ItemCard({ item, index, onOpen }: { item: CalendarItem; index: number; onOpen: (item: CalendarItem) => void }) {
  const reduce = useReducedMotion();
  const tint = tintFor(item.courseId);
  const key = keyOf(item);
  const status = itemStatus(item);
  const Icon = kindIcon(item);
  const StatusIcon = ICON[key];
  const CourseIcon = item.courseName ? courseIcon(courseTitle(item.courseName)) : Layers;
  const left = key === 'pending' ? daysUntil(item.startAt) : null;
  const body = (
    <>
      <span className={styles.time}><strong className="tabular">{formatTime(item.startAt)}</strong></span>
      <span className={styles.itemBody}>
        <span className={styles.itemTitle}>{item.title}</span>
        <span className={styles.itemMeta}>
          {item.courseName && <span className={styles.itemCourse}><CourseIcon size={12} aria-hidden="true" />{courseTitle(item.courseName)}</span>}
          <span className={styles.itemKind}><Icon size={13} aria-hidden="true" />{kindLabel(item)}</span>
        </span>
      </span>
      <span className={styles.itemEnd}>
        <span className={styles.pill}><StatusIcon size={13} aria-hidden="true" />{status.label}</span>
        {left !== null && <em className={cx(left <= 2 && styles.soon)}>{left === 0 ? 'vence hoy' : left === 1 ? 'vence mañana' : `en ${left} días`}</em>}
      </span>
      {item.type === 'activity' && <ArrowUpRight className={styles.go} size={16} aria-hidden="true" />}
    </>
  );
  const props = {
    className: cx(styles.item, item.type === 'event' && styles.itemEvent),
    style: { ['--c' as string]: tint.fg, ['--cbg' as string]: tint.bg, ['--s' as string]: COLOR[key] },
  };
  return (
    <motion.li initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, delay: Math.min(index, 8) * 0.045, ease }}>
      {item.type === 'activity'
        ? <button type="button" {...props} onClick={() => onOpen(item)}>{body}</button>
        : <div {...props}>{body}</div>}
    </motion.li>
  );
}

/** Interruptores con icono (varios a la vez): cada uno muestra u oculta una materia o un tipo. */
function Toggles({ label, items }: { label: string; items: Array<{ id: string; label: string; icon: LucideIcon; color: string; count: number; on: boolean; onToggle: () => void }> }) {
  return (
    <div className={styles.toggles} role="group" aria-label={label}>
      {items.map((item) => (
        <button key={item.id} type="button" className={cx(styles.toggle, item.on && styles.toggleOn)} style={{ ['--s' as string]: item.color }} aria-pressed={item.on}
          aria-label={`${item.label}, ${item.count}`} data-tip={`${item.on ? 'Ocultar' : 'Mostrar'} ${item.label}`} onClick={item.onToggle}>
          <item.icon size={19} aria-hidden="true" />
          <b className="tabular">{item.count}</b>
        </button>
      ))}
    </div>
  );
}

export function CalendarPage() {
  const [params, setParams] = useSearchParams();
  const reduce = useReducedMotion();
  const today = dayKey(new Date());
  const view = (params.get('vista') as View | null) ?? 'month';
  const anchor = params.get('fecha') && /^\d{4}-\d{2}-\d{2}$/.test(params.get('fecha')!) ? params.get('fecha')! : today;
  const [selectedDay, setSelectedDay] = useState<string>(anchor);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [hiddenCourses, setHiddenCourses] = useState<Set<string>>(new Set());
  const [types, setTypes] = useState<{ activity: boolean; event: boolean }>({ activity: true, event: true });
  const [estado, setEstado] = useState<Estado>('all');
  const [dir, setDir] = useState<1 | -1>(1);
  const gridRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  // Botón flotante: aparece al elegir un día si el panel del día no está a la vista (pantallas donde queda debajo del mes).
  const [picked, setPicked] = useState(false);
  const [panelSeen, setPanelSeen] = useState(true);
  const compact = useCompact();

  const setParam = (changes: Record<string, string | null>) => setParams((current) => {
    const next = new URLSearchParams(current);
    for (const [key, value] of Object.entries(changes)) { if (value) next.set(key, value); else next.delete(key); }
    return next;
  }, { replace: true });

  const days = useMemo(() => {
    if (view === 'month') return monthGrid(anchor);
    if (view === 'week') { const start = weekStart(anchor); return Array.from({ length: 7 }, (_, i) => addDays(start, i)); }
    return Array.from({ length: 31 }, (_, i) => addDays(anchor, i));
  }, [view, anchor]);

  const from = new Date(dayFromKey(days[0]!).getTime() - 36 * 3_600_000).toISOString();
  const to = new Date(dayFromKey(days[days.length - 1]!).getTime() + 36 * 3_600_000).toISOString();
  const { data, isPending, error, refetch, isFetching } = useCalendar(from, to);
  useEffect(() => {
    const node = panelRef.current;
    if (!node || view !== 'month' || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => { if (entry) setPanelSeen(entry.intersectionRatio > 0.35); }, { threshold: [0, 0.35, 0.6, 1] });
    observer.observe(node);
    return () => observer.disconnect();
  }, [view, data]);
  useEffect(() => { if (panelSeen) setPicked(false); }, [panelSeen]);

  const courses = useMemo(() => [...new Map((data ?? []).filter((i) => i.courseId).map((i) => [i.courseId!, courseTitle(i.courseName ?? '')])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'es')), [data]);
  const inWindow = useMemo(() => (data ?? []).filter((i) => { const k = dayKey(i.startAt); return k >= days[0]! && k <= days[days.length - 1]!; }), [data, days]);
  // Base: materias y tipos elegidos. Con un estado activo los eventos (sin estado) se ocultan.
  const base = useMemo(() => inWindow.filter((i) => types[i.type] && !(i.courseId && hiddenCourses.has(i.courseId))), [inWindow, types, hiddenCourses]);
  const visible = useMemo(() => base.filter((i) => estado === 'all' || keyOf(i) === estado), [base, estado]);
  const countOf = (key: Key) => base.filter((i) => keyOf(i) === key).length;
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of visible) map.set(dayKey(item.startAt), [...(map.get(dayKey(item.startAt)) ?? []), item]);
    for (const list of map.values()) list.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
    return map;
  }, [visible]);

  const go = (next: string, direction: 1 | -1) => { setDir(direction); setParam({ fecha: next === today ? null : next }); setSelectedDay(next); };
  const move = (direction: -1 | 1) => {
    if (view === 'month') {
      const [year, month] = anchor.split('-').map(Number) as [number, number];
      go(dayKey(new Date(Date.UTC(year, month - 1 + direction, 1, 12))), direction);
    } else go(addDays(anchor, direction * (view === 'week' ? 7 : 31)), direction);
  };
  const toggleCourse = (id: string) => setHiddenCourses((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const title = view === 'month' ? capitalize(monthTitle.format(dayFromKey(anchor)))
    : `${rangeDay.format(dayFromKey(days[0]!))} – ${rangeDay.format(dayFromKey(days[days.length - 1]!))}`;
  const currentMonth = anchor.slice(0, 7);
  const selectedItems = byDay.get(selectedDay) ?? [];
  const openItem = (item: CalendarItem) => { setSelectedDay(dayKey(item.startAt)); if (item.type === 'activity') setActivityId(item.id); };
  const filtersOn = hiddenCourses.size > 0 || !types.activity || !types.event || estado !== 'all';
  const resetFilters = () => { setHiddenCourses(new Set()); setTypes({ activity: true, event: true }); setEstado('all'); };
  // Lo siguiente con fecha después del día elegido (para un día libre).
  const upcoming = useMemo(() => visible.filter((i) => dayKey(i.startAt) > selectedDay).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))[0], [visible, selectedDay]);

  const onCellKey = (event: React.KeyboardEvent, key: string) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowDown' ? 7 : event.key === 'ArrowUp' ? -7 : 0;
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedDay(key); setPicked(true); return; }
    if (!step) return;
    event.preventDefault();
    const next = addDays(key, step);
    if (!days.includes(next)) return;
    setSelectedDay(next);
    gridRef.current?.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus();
  };

  const stateOptions = [
    { value: 'all' as const, label: 'Todo', icon: Layers, count: base.length },
    ...(['pending', 'overdue', 'submitted', 'graded'] as const).map((k) => ({ value: k, label: LABEL[k], icon: ICON[k], color: COLOR[k], count: countOf(k) })),
  ];

  return (
    <Tooltip.Provider>
      <header className={styles.head}>
        <motion.div initial={reduce ? false : { opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease }}>
          <span className={styles.eyebrow}><CalendarDays size={14} aria-hidden="true" />Tus fechas</span>
          <h1 className={styles.heading}>Calendario</h1>
          <p className={styles.lede}>Entregas y eventos de tus materias, en hora de El Salvador. Cada punto de color es el estado de la actividad.</p>
        </motion.div>
        <motion.div className={styles.todayCard} initial={reduce ? false : { opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1, ease }}>
          <span className={styles.todayLeaf}><i>{capitalize(monthName.format(dayFromKey(today)).replace('.', ''))}</i><b className="tabular">{Number(today.slice(8))}</b></span>
          <span className={styles.todayText}><small>Hoy</small><strong>{capitalize(longWeekday.format(dayFromKey(today)))}</strong></span>
        </motion.div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.nav}>
          <button type="button" className={styles.navButton} onClick={() => move(-1)} aria-label="Anterior"><ChevronLeft size={19} aria-hidden="true" /></button>
          <button type="button" className={styles.navButton} onClick={() => move(1)} aria-label="Siguiente"><ChevronRight size={19} aria-hidden="true" /></button>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2 key={title} className={styles.period} aria-live="polite" initial={reduce ? false : { opacity: 0, x: 18 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 * dir, transition: { duration: 0.1 } }} transition={{ duration: 0.25, ease }}>{title}</motion.h2>
          </AnimatePresence>
          <button type="button" className={styles.todayBtn} disabled={anchor === today && selectedDay === today} onClick={() => go(today, anchor < today ? 1 : -1)}>Hoy</button>
        </div>
        <SegTabs<View> label="Vista del calendario" value={view} onChange={(value) => { setParam({ vista: value === 'month' ? null : value }); }} options={[
          { value: 'month', label: 'Mes', icon: CalendarDays },
          { value: 'week', label: 'Semana', icon: CalendarRange },
          { value: 'agenda', label: 'Agenda', icon: ListTodo },
        ]} />
      </div>

      {data && (
        <div className={styles.filters}>
          <SegTabs<Estado> label="Estado" iconOnly={compact} value={estado} onChange={(v) => setEstado(v === estado ? 'all' : v)} options={stateOptions} />
          <div className={styles.toggleRow}>
            <Toggles label="Materias visibles" items={courses.map(([id, name]) => ({
              id, label: name, icon: courseIcon(name), color: tintFor(id).fg, count: inWindow.filter((i) => i.courseId === id).length, on: !hiddenCourses.has(id), onToggle: () => toggleCourse(id),
            }))} />
            <Toggles label="Tipo" items={[
              { id: 'activity', label: 'Entregas', icon: ClipboardList, color: 'var(--accent)', count: inWindow.filter((i) => i.type === 'activity').length, on: types.activity, onToggle: () => setTypes((t) => ({ ...t, activity: !t.activity })) },
              { id: 'event', label: 'Eventos', icon: Megaphone, color: COLOR.event, count: inWindow.filter((i) => i.type === 'event').length, on: types.event, onToggle: () => setTypes((t) => ({ ...t, event: !t.event })) },
            ]} />
            {filtersOn && <button type="button" className={styles.reset} onClick={resetFilters}>Quitar filtros</button>}
          </div>
        </div>
      )}

      {error && <Card><EmptyState tone="danger" icon={<TriangleAlert />} title="No pudimos cargar el calendario"
        action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}>{error.message}</EmptyState></Card>}
      {isPending && !data && <Skeleton height={520} radius={28} />}

      {data && (
        <div className={styles.stage} style={{ opacity: isFetching ? 0.8 : 1 }}>
          {view === 'month' && (
            <div className={styles.layout}>
              <motion.section key={currentMonth} className={styles.monthCard} initial={reduce ? false : { opacity: 0, x: 26 * dir }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease }} aria-label={`Calendario de ${title}`}>
                <div className={styles.weekdays} aria-hidden="true">{WEEKDAYS.map((day, i) => <span key={day} className={cx(i >= 5 && styles.weekend)}>{day}</span>)}</div>
                <div ref={gridRef} className={styles.grid} role="grid" aria-label={`Días de ${title}`}>
                  {days.map((key, i) => {
                    const items = byDay.get(key) ?? [];
                    const outside = key.slice(0, 7) !== currentMonth;
                    const weekend = i % 7 >= 5;
                    const selected = selectedDay === key;
                    const label = `${formatLongDay(dayFromKey(key))}: ${items.length === 0 ? 'sin vencimientos' : `${items.length} ${items.length === 1 ? 'elemento' : 'elementos'}`}`;
                    return (
                      <motion.div key={key} role="gridcell" aria-label={label} aria-selected={selected} tabIndex={selected || (!days.includes(selectedDay) && key === today) ? 0 : -1} data-day={key}
                        className={cx(styles.cell, outside && styles.outside, weekend && styles.weekendCell, key === today && styles.today, items.length > 0 && styles.busy)}
                        style={{ ['--load' as string]: `${Math.min(items.length, 4) * 5}%` }}
                        initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: Math.floor(i / 7) * 0.04, ease }}
                        onClick={() => { setSelectedDay(key); setPicked(true); }} onKeyDown={(e) => onCellKey(e, key)}>
                        {selected && <motion.span layoutId="cal-selected" className={styles.ring} transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                        <span className={styles.dayNumber}>{Number(key.slice(8))}</span>
                        {items.length > 0 && <span className={styles.badge} aria-hidden="true">{items.length}</span>}
                        <span className={styles.chipList}>
                          {items.slice(0, 3).map((item) => <Chip key={item.id} item={item} onOpen={openItem} />)}
                          {items.length > 3 && <span className={styles.more}>+{items.length - 3} más</span>}
                        </span>
                        <span className={styles.dots} aria-hidden="true">{items.slice(0, 4).map((item) => <span key={item.id} className={styles.dot} style={{ background: COLOR[keyOf(item)] }} />)}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>

              <aside ref={panelRef} className={styles.side} aria-labelledby="day-title">
                <div className={cx(styles.sideHead, selectedDay === today && styles.sideHeadToday)}>
                  <span className={cx(styles.leaf, selectedDay === today && styles.leafToday)} aria-hidden="true">
                    <i>{shortDay.format(dayFromKey(selectedDay)).replace('.', '')}</i><b className="tabular">{Number(selectedDay.slice(8))}</b>
                  </span>
                  <div className={styles.sideTitle}>
                    <h2 id="day-title">{relativeDay(selectedDay)}</h2>
                    <p>{formatLongDay(dayFromKey(selectedDay))}</p>
                    <span className={styles.sideCount}>{selectedItems.length === 0 ? 'Sin vencimientos' : `${selectedItems.length} ${selectedItems.length === 1 ? 'elemento' : 'elementos'}`}</span>
                  </div>
                  <div className={styles.dayNav}>
                    <button type="button" onClick={() => setSelectedDay(addDays(selectedDay, -1))} aria-label="Día anterior"><ChevronLeft size={17} aria-hidden="true" /></button>
                    <button type="button" onClick={() => setSelectedDay(addDays(selectedDay, 1))} aria-label="Día siguiente"><ChevronRight size={17} aria-hidden="true" /></button>
                  </div>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div key={selectedDay} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ duration: 0.25, ease }}>
                    {selectedItems.length > 0 ? (
                      <ul className={styles.items}>{selectedItems.map((item, i) => <ItemCard key={item.id} item={item} index={i} onOpen={openItem} />)}</ul>
                    ) : (
                      <div className={styles.free}>
                        <div className={styles.freeText}>
                          <span><Sparkles size={20} aria-hidden="true" /></span>
                          <div><strong>Día libre</strong><p>Nada vence ni ocurre este día.</p></div>
                        </div>
                        {upcoming && (
                          <button type="button" onClick={() => { const k = dayKey(upcoming.startAt); setSelectedDay(k); if (k.slice(0, 7) !== currentMonth) go(k, 1); }}>
                            <span>Siguiente con fecha · {rangeDay.format(dayFromKey(dayKey(upcoming.startAt)))}</span>
                            <b>{upcoming.title}</b>
                            <ArrowUpRight size={15} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
                <div className={styles.summary} aria-label="Resumen del mes">
                  <p>Resumen de {view === 'month' ? 'este mes' : 'este rango'}</p>
                  {base.length > 0 ? (
                    <>
                      <div className={styles.meter} role="img" aria-label={`${base.length} elementos por estado`}>
                        {(['pending', 'overdue', 'submitted', 'graded', 'event'] as const).map((k) => countOf(k) > 0 && (
                          <motion.i key={k} style={{ background: COLOR[k] }} initial={reduce ? false : { flexGrow: 0 }} animate={{ flexGrow: countOf(k) }} transition={{ duration: 0.7, ease }} />
                        ))}
                      </div>
                      <div className={styles.legend}>
                        {(['pending', 'overdue', 'submitted', 'graded', 'event'] as const).map((k) => {
                          const Icon = ICON[k];
                          const n = countOf(k);
                          if (n === 0) return null;
                          const filterable = k !== 'event';
                          return (
                            <button key={k} type="button" disabled={!filterable} className={cx(estado === k && styles.legendOn)} style={{ ['--s' as string]: COLOR[k] }}
                              onClick={() => filterable && setEstado(estado === k ? 'all' : (k as Estado))} aria-pressed={filterable ? estado === k : undefined}>
                              <Icon size={13} aria-hidden="true" />{n} {n === 1 ? SINGULAR[k] : LABEL[k].toLowerCase()}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : <span className={styles.summaryEmpty}>Sin elementos en este mes</span>}
                </div>
              </aside>
            </div>
          )}

          {view === 'week' && (
            <motion.div key={days[0]} className={styles.week} style={{ ['--wcols' as string]: days.map((k) => ((byDay.get(k)?.length ?? 0) > 0 ? '1.45fr' : '0.72fr')).map((v) => `minmax(0, ${v})`).join(' ') }} initial={reduce ? false : { opacity: 0, x: 26 * dir }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease }}>
              {days.map((key, i) => {
                const items = byDay.get(key) ?? [];
                return (
                  <motion.section key={key} className={cx(styles.weekDay, key === today && styles.weekDayToday, i >= 5 && styles.weekendCell)} aria-label={formatLongDay(dayFromKey(key))}
                    initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05, ease }}>
                    <header className={styles.weekHead}>
                      <span className={cx(styles.leaf, key === today && styles.leafToday)} aria-hidden="true"><i>{shortDay.format(dayFromKey(key)).replace('.', '')}</i><b className="tabular">{Number(key.slice(8))}</b></span>
                      <span className={styles.weekRel}>{relativeDay(key)}{items.length > 0 && <small>{items.length} {items.length === 1 ? 'elemento' : 'elementos'}</small>}</span>
                    </header>
                    {items.length > 0
                      ? <ul className={styles.items}>{items.map((item, n) => <ItemCard key={item.id} item={item} index={n + i} onOpen={openItem} />)}</ul>
                      : <p className={styles.weekEmpty}>Libre</p>}
                  </motion.section>
                );
              })}
            </motion.div>
          )}

          {view === 'agenda' && (
            <motion.div key={days[0]} className={styles.agenda} initial={reduce ? false : { opacity: 0, x: 26 * dir }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease }}>
              {days.some((key) => byDay.has(key)) ? days.filter((key) => byDay.has(key)).map((key, i) => (
                <section key={key} className={styles.agendaDay} aria-label={formatLongDay(dayFromKey(key))}>
                  <motion.div className={cx(styles.agendaDate, key === today && styles.agendaToday)} initial={reduce ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.04, ease }}>
                    <span className={cx(styles.leaf, key === today && styles.leafToday)} aria-hidden="true"><i>{shortDay.format(dayFromKey(key)).replace('.', '')}</i><b className="tabular">{Number(key.slice(8))}</b></span>
                    <span className={styles.agendaRel}>{relativeDay(key)}<small>{rangeDay.format(dayFromKey(key))}</small></span>
                  </motion.div>
                  <ul className={styles.items}>{byDay.get(key)!.map((item, n) => <ItemCard key={item.id} item={item} index={n + i} onOpen={openItem} />)}</ul>
                </section>
              )) : <EmptyState icon={<CalendarDays />} title="Sin vencimientos en este rango">{filtersOn ? 'Con estos filtros no hay nada en los próximos 31 días.' : 'No hay actividades ni eventos en los próximos 31 días.'}</EmptyState>}
            </motion.div>
          )}
        </div>
      )}
      <AnimatePresence>
        {view === 'month' && picked && !panelSeen && (
          <motion.button type="button" className={styles.fab} initial={reduce ? false : { opacity: 0, y: 24, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.92, transition: { duration: 0.15 } }} transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            onClick={() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            <span className={styles.fabLeaf} aria-hidden="true">{Number(selectedDay.slice(8))}</span>
            <span className={styles.fabText}><small>{relativeDay(selectedDay)}</small><strong>{selectedItems.length === 0 ? 'Día libre' : `Ver ${selectedItems.length} ${selectedItems.length === 1 ? 'elemento' : 'elementos'}`}</strong></span>
            <ArrowDown size={18} aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>
      <ActivityDetail activityId={activityId} onClose={() => setActivityId(null)} />
    </Tooltip.Provider>
  );
}
