import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useCalendar } from '../api/hooks';
import type { Activity, CalendarItem } from '../api/types';
import { courseIcon } from '../lib/courseIcon';
import { matchesStatus, type DashStatus } from '../lib/dashFilters';
import { addDays, capitalize, courseTitle, dayFromKey, dayKey, formatTime } from '../lib/format';
import { tintFor } from '../lib/tint';
import { Skeleton } from './ui';
import styles from './CalendarCard.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const DAY_MS = 86_400_000;
const MIN_OFFSET = -28;
const MAX_OFFSET = 120;
const weekdayShort = new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', weekday: 'short' });
const monthShort = new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', month: 'short' });
const dayMonth = new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', day: 'numeric', month: 'short' });
const monthTitle = new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', month: 'long', year: 'numeric' });
const MINI_WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

/** Lunes de la semana de un día calendario. */
const weekStartKey = (key: string) => addDays(key, -((dayFromKey(key).getUTCDay() + 6) % 7));

/** Días visibles por página: 5 en escritorio, 4 en tablet vertical (≤768), 3 en móvil (≤581). */
const readPerPage = () => (typeof window === 'undefined' ? 5 : window.matchMedia('(max-width: 581px)').matches ? 3 : window.matchMedia('(max-width: 768px)').matches ? 4 : 5);
function useDaysPerPage() {
  const [n, setN] = useState(readPerPage);
  useEffect(() => {
    const queries = [window.matchMedia('(max-width: 581px)'), window.matchMedia('(max-width: 768px)')];
    const on = () => setN(readPerPage());
    queries.forEach((q) => q.addEventListener('change', on));
    return () => queries.forEach((q) => q.removeEventListener('change', on));
  }, []);
  return n;
}

/**
 * Calendario del Inicio: un mini-mes navegable (con puntos del color de cada materia) y, a su lado, N "hojas" de día
 * con franja de color y argollas. Las flechas avanzan N días; tocar un día del mini-mes salta a él. Datos reales del
 * calendario y respeta los filtros globales (estado y materia).
 */
export function CalendarCard({ onOpen, byId, status, courseId, scope }: { onOpen: (id: string) => void; byId: Map<string, Activity>; status: DashStatus; courseId: string; scope?: ReactNode }) {
  const perPage = useDaysPerPage();
  const reduce = useReducedMotion();
  const [offset, setOffset] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setSettled(true), 1400); return () => window.clearTimeout(timer); }, []);
  const today = dayKey(new Date());
  const from = useMemo(() => dayFromKey(addDays(today, MIN_OFFSET - 1)).toISOString(), [today]);
  const to = useMemo(() => dayFromKey(addDays(today, MAX_OFFSET + 2)).toISOString(), [today]);
  const { data, isPending } = useCalendar(from, to);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of data ?? []) {
      if (courseId && item.courseId !== courseId) continue;
      if (status !== 'all') {
        if (item.type !== 'activity') continue;
        const activity = byId.get(item.id);
        if (!activity || !matchesStatus(activity, status)) continue;
      }
      const key = dayKey(item.startAt);
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    for (const list of map.values()) list.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
    return map;
  }, [data, byId, status, courseId]);

  const days = Array.from({ length: perPage }, (_, i) => addDays(today, offset + i));
  const first = days[0]!; const last = days[days.length - 1]!;
  const count = days.reduce((n, key) => n + (byDay.get(key)?.length ?? 0), 0);
  const clamp = (value: number) => Math.min(MAX_OFFSET - perPage, Math.max(MIN_OFFSET, value));
  const go = (d: 1 | -1) => { setDir(d); setOffset((o) => clamp(o + d * perPage)); setMonthKey(null); };
  const pick = (key: string) => {
    const diff = Math.round((dayFromKey(key).getTime() - dayFromKey(today).getTime()) / DAY_MS);
    setDir(diff >= offset ? 1 : -1); setOffset(clamp(diff)); setMonthKey(null);
  };

  // Mini-mes: sigue a la ventana de días salvo que se navegue por meses.
  const miniFirst = monthKey ?? `${first.slice(0, 7)}-01`;
  const cells = Array.from({ length: 42 }, (_, i) => addDays(weekStartKey(miniFirst), i));
  const minMonth = `${addDays(today, MIN_OFFSET).slice(0, 7)}-01`;
  const maxMonth = `${addDays(today, MAX_OFFSET).slice(0, 7)}-01`;
  const shiftMonth = (d: 1 | -1) => {
    const [y, m] = miniFirst.split('-').map(Number) as [number, number];
    setMonthKey(dayKey(new Date(Date.UTC(y, m - 1 + d, 1, 12))));
  };

  return (
    <>
      <div className={styles.head}>
        <div>
          <div className={styles.titleRow}><h2 id="cal-title" className={styles.title}>Calendario</h2>{scope}</div>
          <p className={styles.sub} aria-live="polite">
            {dayMonth.format(dayFromKey(first)).replace('.', '')} – {dayMonth.format(dayFromKey(last)).replace('.', '')} · {count === 0 ? 'sin entregas ni eventos' : `${count} ${count === 1 ? 'elemento' : 'elementos'}`}
          </p>
        </div>
        <div className={styles.pager}>
          {offset !== 0 && <button type="button" className={styles.todayBtn} onClick={() => { setDir(offset > 0 ? -1 : 1); setOffset(0); setMonthKey(null); }}>Hoy</button>}
          <button type="button" className={styles.navBtn} onClick={() => go(-1)} disabled={offset <= MIN_OFFSET} aria-label={`${perPage} días anteriores`}><ChevronLeft size={18} aria-hidden="true" /></button>
          <button type="button" className={styles.navBtn} onClick={() => go(1)} disabled={offset + perPage >= MAX_OFFSET} aria-label={`${perPage} días siguientes`}><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.mini}>
          <div className={styles.miniHead}>
            <strong>{capitalize(monthTitle.format(dayFromKey(miniFirst)))}</strong>
            <div className={styles.miniBtns}>
              <button type="button" className={styles.miniNav} onClick={() => shiftMonth(-1)} disabled={miniFirst <= minMonth} aria-label="Mes anterior"><ChevronLeft size={15} aria-hidden="true" /></button>
              <button type="button" className={styles.miniNav} onClick={() => shiftMonth(1)} disabled={miniFirst >= maxMonth} aria-label="Mes siguiente"><ChevronRight size={15} aria-hidden="true" /></button>
            </div>
          </div>
          <div className={styles.miniWeek} aria-hidden="true">{MINI_WEEK.map((d, i) => <span key={i}>{d}</span>)}</div>
          <div className={styles.miniGrid} role="grid" aria-label="Mes" key={miniFirst}>
            {cells.map((key, cellIndex) => {
              const list = byDay.get(key) ?? [];
              const inWin = key >= first && key <= last;
              const n = Number(key.slice(8));
              return (
                <button key={key} type="button" role="gridcell" className={cx(styles.miniDay, key.slice(0, 7) !== miniFirst.slice(0, 7) && styles.miniOut, inWin && styles.miniWin, key === first && styles.miniWinStart, key === last && styles.miniWinEnd, key === today && styles.miniToday)}
                  style={{ ['--i' as string]: cellIndex }} onClick={() => pick(key)} aria-label={`${n} de ${monthShort.format(dayFromKey(key)).replace('.', '')}${list.length ? `, ${list.length} ${list.length === 1 ? 'elemento' : 'elementos'}` : ''}`}>
                  <span>{n}</span>
                  <i className={styles.miniDots} aria-hidden="true">{list.slice(0, 3).map((item) => <b key={item.id} style={{ background: item.courseId ? tintFor(item.courseId).fg : 'var(--faint)' }} />)}</i>
                </button>
              );
            })}
          </div>
        </div>

        {isPending ? <Skeleton height={280} radius={18} /> : (
          <div className={styles.pages} style={{ ['--cols' as string]: perPage }} key={offset}>
            {days.map((key, i) => {
              const list = byDay.get(key) ?? [];
              const dow = dayFromKey(key).getUTCDay();
              return (
                <motion.div key={key} className={cx(styles.page, key === today && styles.pageToday, (dow === 0 || dow === 6) && styles.pageWeekend, key < today && styles.pagePast)}
                  initial={reduce ? false : { opacity: 0, x: dir * 28, rotate: dir * 1.2 }} animate={{ opacity: 1, x: 0, rotate: 0 }} transition={{ duration: 0.36, delay: i * 0.05, ease }}
                  whileHover={reduce ? undefined : { y: -4, transition: { type: 'spring', stiffness: 420, damping: 26 } }}>
                  <div className={styles.pageTop}>
                    <span>{key === today ? 'Hoy' : weekdayShort.format(dayFromKey(key)).replace('.', '')}</span>
                    <small>{monthShort.format(dayFromKey(key)).replace('.', '')}</small>
                    {list.length > 0 && <b className={styles.pageCount}>{list.length}</b>}
                  </div>
                  <strong className={cx(styles.pageNum, 'tabular')}>{Number(key.slice(8))}</strong>
                  <div className={styles.pageItems}>
                    <AnimatePresence mode="popLayout">{list.length === 0 ? <motion.span key="free" className={styles.pageFree} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}>Libre</motion.span> : list.slice(0, 3).map((item, j) => {
                      const tint = tintFor(item.courseId);
                      const course = item.courseName ? courseTitle(item.courseName) : '';
                      const Icon = courseIcon(course);
                      const delay = settled ? j * 0.04 : 0.2 + i * 0.05 + j * 0.07;
                      const inner = (
                        <>
                          <span className={styles.chipTime}><Clock3 size={11} aria-hidden="true" />{formatTime(item.startAt)}</span>
                          <span className={styles.chipTitle}>{item.title}</span>
                          {course && <span className={styles.chipCourse}><Icon size={13} aria-hidden="true" /><em>{course}</em></span>}
                        </>
                      );
                      const motionProps = { initial: reduce ? false : { opacity: 0, y: 12, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, scale: 0.92, transition: { duration: 0.16 } }, layout: !reduce, transition: { duration: 0.38, delay, ease, layout: { duration: 0.3, ease } } } as const;
                      const label = `${item.title}${course ? ` · ${course}` : ''} · ${formatTime(item.startAt)}`;
                      return item.type === 'activity'
                        ? <motion.button key={item.id} type="button" className={styles.chip} title={label} style={{ ['--c' as string]: tint.fg, ['--cbg' as string]: tint.bg }} onClick={() => onOpen(item.id)}
                            whileHover={reduce ? undefined : { y: -2 }} whileTap={{ scale: 0.98 }} {...motionProps}>{inner}</motion.button>
                        : <motion.span key={item.id} className={cx(styles.chip, styles.chipEvent)} title={label} {...motionProps}>{inner}</motion.span>;
                    })}</AnimatePresence>
                    {list.length > 3 && <Link to={`/calendar?vista=week&fecha=${key}`} className={styles.pageMore}>+{list.length - 3} más</Link>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <Link to="/calendar" className={styles.footLink}><CalendarDays size={15} aria-hidden="true" />Abrir el calendario completo</Link>
    </>
  );
}
