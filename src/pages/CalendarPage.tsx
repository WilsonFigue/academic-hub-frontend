import * as Tooltip from '@radix-ui/react-tooltip';
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Megaphone, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCalendar } from '../api/hooks';
import type { CalendarItem } from '../api/types';
import { ActivityDetail } from '../components/ActivityDetail';
import { PageHeader, Segmented } from '../components/Filters';
import { Badge, Button, Card, EmptyState, Skeleton } from '../components/ui';
import { activityKind, addDays, capitalize, categoryLabel, courseTitle, dayFromKey, dayKey, formatLongDay, formatTime } from '../lib/format';
import { activityStatus } from '../lib/status';
import { tintFor } from '../lib/tint';
import styles from './CalendarPage.module.css';

type View = 'month' | 'week' | 'agenda';
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const monthTitle = new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', month: 'long', year: 'numeric' });
const shortDay = new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', weekday: 'short' });
const rangeDay = new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', day: 'numeric', month: 'short' });

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

function itemStatus(item: CalendarItem) {
  if (item.type === 'event') return { label: 'Evento', tone: 'neutral' as const };
  return activityStatus({ isCalculated: false, isExempt: false, isAutoZero: Boolean(item.isAutoZero), status: item.status, isSubmitted: item.isSubmitted, dueAt: item.startAt });
}

function kindLabel(item: CalendarItem) {
  return item.type === 'event' ? 'Evento' : categoryLabel(item.categoryKey) ?? activityKind(item.kind);
}

/** Pastilla de un elemento dentro de una celda, con tooltip con los datos completos. */
function Chip({ item, onOpen }: { item: CalendarItem; onOpen: (item: CalendarItem) => void }) {
  const tint = tintFor(item.courseId);
  const status = itemStatus(item);
  return (
    <Tooltip.Root delayDuration={150}>
      <Tooltip.Trigger asChild>
        <button type="button" className={`${styles.chip} ${item.type === 'event' ? styles.chipEvent : ''}`} style={{ ['--c' as string]: tint.fg, ['--cbg' as string]: tint.bg }}
          onClick={(event) => { event.stopPropagation(); onOpen(item); }}>
          {item.type === 'event' ? <Megaphone size={11} aria-hidden="true" /> : <ClipboardList size={11} aria-hidden="true" />}
          <span>{item.title}</span>
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="top" sideOffset={6} className={styles.tooltip}>
          <strong>{item.title}</strong>
          <span>{item.courseName ? courseTitle(item.courseName) : 'Sin materia'} · {kindLabel(item)} · {formatTime(item.startAt)}</span>
          <span className={styles.tooltipStatus}>{status.label}</span>
          <Tooltip.Arrow className={styles.tooltipArrow} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function EventRow({ item, onOpen }: { item: CalendarItem; onOpen: (item: CalendarItem) => void }) {
  const tint = tintFor(item.courseId);
  const status = itemStatus(item);
  const body = (
    <>
      <span className={styles.eventTime}><strong className="tabular">{formatTime(item.startAt)}</strong></span>
      <span className={styles.eventBar} style={{ background: tint.fg }} aria-hidden="true" />
      <span style={{ minWidth: 0 }}>
        <span className={styles.eventTitle}>{item.title}</span>
        <span className={styles.eventMeta}>
          {item.courseName && <span style={{ color: tint.fg, fontWeight: 600 }}>{courseTitle(item.courseName)}</span>}
          <span>{kindLabel(item)}</span>
          <Badge tone={status.tone}>{status.label}</Badge>
        </span>
      </span>
    </>
  );
  return item.type === 'activity'
    ? <button type="button" className={styles.event} onClick={() => onOpen(item)}>{body}</button>
    : <div className={styles.event}>{body}</div>;
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

  const courses = useMemo(() => [...new Map((data ?? []).filter((i) => i.courseId).map((i) => [i.courseId!, courseTitle(i.courseName ?? '')])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'es')), [data]);
  const visible = useMemo(() => (data ?? []).filter((i) => types[i.type] && !(i.courseId && hiddenCourses.has(i.courseId))), [data, types, hiddenCourses]);
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of visible) map.set(dayKey(item.startAt), [...(map.get(dayKey(item.startAt)) ?? []), item]);
    for (const list of map.values()) list.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
    return map;
  }, [visible]);

  const move = (direction: -1 | 1) => {
    let next: string;
    if (view === 'month') {
      const [year, month] = anchor.split('-').map(Number) as [number, number];
      next = dayKey(new Date(Date.UTC(year, month - 1 + direction, 1, 12)));
    } else next = addDays(anchor, direction * (view === 'week' ? 7 : 31));
    setParam({ fecha: next });
    setSelectedDay(next);
  };
  const toggleCourse = (id: string) => setHiddenCourses((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const title = view === 'month' ? capitalize(monthTitle.format(dayFromKey(anchor)))
    : `${rangeDay.format(dayFromKey(days[0]!))} – ${rangeDay.format(dayFromKey(days[days.length - 1]!))}`;
  const currentMonth = anchor.slice(0, 7);
  const selectedItems = byDay.get(selectedDay) ?? [];
  const openItem = (item: CalendarItem) => { setSelectedDay(dayKey(item.startAt)); if (item.type === 'activity') setActivityId(item.id); };
  const inRange = visible.filter((i) => { const k = dayKey(i.startAt); return k >= days[0]! && k <= days[days.length - 1]!; });

  return (
    <Tooltip.Provider>
      <PageHeader title="Calendario" lede="Entregas y eventos de tus materias, en hora de El Salvador. Toca una materia para ocultarla o mostrarla." />

      <div className={styles.toolbar}>
        <div className={styles.nav}>
          <button type="button" className={styles.navButton} onClick={() => move(-1)} aria-label="Anterior"><ChevronLeft size={18} aria-hidden="true" /></button>
          <button type="button" className={styles.navButton} onClick={() => move(1)} aria-label="Siguiente"><ChevronRight size={18} aria-hidden="true" /></button>
          <h2 className={styles.period} aria-live="polite">{title}</h2>
          {anchor !== today && <Button variant="ghost" onClick={() => { setParam({ fecha: null }); setSelectedDay(today); }}>Hoy</Button>}
        </div>
        <Segmented<View> label="Vista del calendario" value={view} onChange={(value) => setParam({ vista: value === 'month' ? null : value })}
          options={[{ value: 'month', label: 'Mes' }, { value: 'week', label: 'Semana' }, { value: 'agenda', label: 'Agenda' }]} />
      </div>

      {data && (
        <div className={styles.filters}>
          <div className={styles.chips} role="group" aria-label="Materias visibles">
            {courses.map(([id, name]) => {
              const tint = tintFor(id);
              const count = inRange.filter((i) => i.courseId === id).length;
              return (
                <button key={id} type="button" className={styles.courseChip} aria-pressed={!hiddenCourses.has(id)} onClick={() => toggleCourse(id)}
                  style={{ ['--c' as string]: tint.fg, ['--cbg' as string]: tint.bg }}>
                  <span className={styles.swatch} aria-hidden="true" />{name}<span className={`${styles.count} tabular`}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className={styles.chips} role="group" aria-label="Tipo">
            <button type="button" className={styles.typeChip} aria-pressed={types.activity} onClick={() => setTypes((t) => ({ ...t, activity: !t.activity }))}><ClipboardList size={14} aria-hidden="true" />Entregas</button>
            <button type="button" className={styles.typeChip} aria-pressed={types.event} onClick={() => setTypes((t) => ({ ...t, event: !t.event }))}><Megaphone size={14} aria-hidden="true" />Eventos</button>
          </div>
        </div>
      )}

      {error && <Card><EmptyState tone="danger" icon={<TriangleAlert />} title="No pudimos cargar el calendario"
        action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}>{error.message}</EmptyState></Card>}
      {isPending && !data && <Skeleton height={520} radius={20} />}

      {data && (
        <motion.div key={view} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          style={{ opacity: isFetching ? 0.75 : 1, transition: 'opacity 150ms' }}>
          {view === 'month' && (
            <div className={styles.layout}>
              <Card padded={false} className={styles.monthCard}>
                <div className={styles.weekdays} aria-hidden="true">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
                <div className={styles.grid} role="grid" aria-label={`Calendario de ${title}`}>
                  {days.map((key) => {
                    const items = byDay.get(key) ?? [];
                    const outside = key.slice(0, 7) !== currentMonth;
                    const label = `${formatLongDay(dayFromKey(key))}: ${items.length === 0 ? 'sin vencimientos' : `${items.length} ${items.length === 1 ? 'elemento' : 'elementos'}`}`;
                    return (
                      <div key={key} role="gridcell" aria-label={label} aria-selected={selectedDay === key} tabIndex={0}
                        className={[styles.cell, outside && styles.outside, key === today && styles.today, selectedDay === key && styles.cellSelected].filter(Boolean).join(' ')}
                        onClick={() => setSelectedDay(key)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDay(key); } }}>
                        <span className={styles.dayNumber}>{Number(key.slice(8))}</span>
                        <span className={styles.chipList}>
                          {items.slice(0, 3).map((item) => <Chip key={item.id} item={item} onOpen={openItem} />)}
                          {items.length > 3 && <span className={styles.more}>+{items.length - 3} más</span>}
                        </span>
                        <span className={styles.dots} aria-hidden="true">{items.slice(0, 4).map((item) => <span key={item.id} className={styles.dot} style={{ background: tintFor(item.courseId).fg }} />)}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
              <Card aria-labelledby="day-title" className={styles.side}>
                <h2 id="day-title" className={styles.dayPanelTitle}>{selectedDay === today ? 'Hoy · ' : ''}{formatLongDay(dayFromKey(selectedDay))}</h2>
                <AnimatePresence mode="wait">
                  <motion.div key={selectedDay} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    {selectedItems.length > 0
                      ? <ul className={styles.events}>{selectedItems.map((item) => <li key={item.id}><EventRow item={item} onOpen={openItem} /></li>)}</ul>
                      : <EmptyState icon={<CalendarDays />} title="Día libre">No hay vencimientos ni eventos registrados para este día.</EmptyState>}
                  </motion.div>
                </AnimatePresence>
                <p className={styles.rangeNote}><strong className="tabular">{inRange.length}</strong> {inRange.length === 1 ? 'elemento' : 'elementos'} en {view === 'month' ? 'este mes' : 'este rango'}</p>
              </Card>
            </div>
          )}

          {view === 'week' && (
            <div className={styles.week}>
              {days.map((key) => {
                const items = byDay.get(key) ?? [];
                return (
                  <section key={key} className={`${styles.weekDay} ${key === today ? styles.weekDayToday : ''}`} aria-label={formatLongDay(dayFromKey(key))}>
                    <p className={styles.weekDayHead}><span>{shortDay.format(dayFromKey(key)).replace('.', '')}</span><strong className="tabular">{Number(key.slice(8))}</strong></p>
                    {items.length > 0 ? (
                      <ul className={styles.weekItems}>
                        {items.map((item) => {
                          const tint = tintFor(item.courseId);
                          const inner = <><time>{formatTime(item.startAt)}</time><span>{item.title}</span><small>{item.courseName ? courseTitle(item.courseName) : kindLabel(item)}</small></>;
                          return (
                            <li key={item.id}>
                              {item.type === 'activity'
                                ? <button type="button" className={styles.weekItem} style={{ ['--c' as string]: tint.fg, ['--cbg' as string]: tint.bg }} onClick={() => openItem(item)}>{inner}</button>
                                : <div className={`${styles.weekItem} ${styles.weekItemEvent}`} style={{ ['--c' as string]: tint.fg, ['--cbg' as string]: tint.bg }}>{inner}</div>}
                            </li>
                          );
                        })}
                      </ul>
                    ) : <p className={styles.weekDayEmpty}>Libre</p>}
                  </section>
                );
              })}
            </div>
          )}

          {view === 'agenda' && (
            <Card>
              {days.some((key) => byDay.has(key)) ? days.filter((key) => byDay.has(key)).map((key) => (
                <section key={key} className={styles.agendaDay} aria-label={formatLongDay(dayFromKey(key))}>
                  <div className={`${styles.agendaDate} ${key === today ? styles.agendaToday : ''}`}>
                    <span>{shortDay.format(dayFromKey(key)).replace('.', '')}</span><strong className="tabular">{Number(key.slice(8))}</strong><small>{rangeDay.format(dayFromKey(key)).split(' ').pop()}</small>
                  </div>
                  <ul className={styles.events}>{byDay.get(key)!.map((item) => <li key={item.id}><EventRow item={item} onOpen={openItem} /></li>)}</ul>
                </section>
              )) : <EmptyState icon={<CalendarDays />} title="Sin vencimientos en este rango">No hay actividades ni eventos en los próximos 31 días.</EmptyState>}
            </Card>
          )}
        </motion.div>
      )}
      <ActivityDetail activityId={activityId} onClose={() => setActivityId(null)} />
    </Tooltip.Provider>
  );
}
