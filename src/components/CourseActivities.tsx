import {
  ArrowDownAZ, ArrowUpRight, BookText, CalendarOff, CircleCheck, ClipboardCheck, Clock, Layers, ListFilter, ArrowDownWideNarrow, CalendarArrowDown, CalendarArrowUp, Shapes, Trophy, FileCheck2, MessageSquareText, MessagesSquare, PenLine, Search, Send, Sparkles, TriangleAlert, X,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { Activity } from '../api/types';
import { useReducedMotion } from '../lib/motion';
import { LOW_THRESHOLD, STATUS_INFO, STATUS_ORDER, averagePct, matchesStatus, pctOf, statusKeyOf, type DashStatus, type StatusKey } from '../lib/dashFilters';
import { TIMEZONE, categoryLabel, daysUntil, formatDueRelative, formatRelative, formatScore, formatTime } from '../lib/format';
import { activityStatus } from '../lib/status';
import { Highlight, normalize } from './Filters';
import { FilterMenu, SegTabs } from './FilterKit';
import styles from './CourseActivities.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');
const day = new Intl.DateTimeFormat('es-SV', { timeZone: TIMEZONE, day: 'numeric' });
const month = new Intl.DateTimeFormat('es-SV', { timeZone: TIMEZONE, month: 'short' });
const weekday = new Intl.DateTimeFormat('es-SV', { timeZone: TIMEZONE, weekday: 'short' });

const STATUS_ICON: Record<StatusKey, LucideIcon> = { pending: Clock, overdue: TriangleAlert, submitted: Send, graded: CircleCheck, nodate: CalendarOff };
const GROUP_HINT: Record<StatusKey, string> = {
  pending: 'Lo próximo que tienes que entregar',
  overdue: 'Pasó la fecha: sin entrega o con cero automático',
  submitted: 'Ya la enviaste; falta la nota del docente',
  graded: 'Con nota publicada',
  nodate: 'Blackboard no les puso fecha de entrega',
};

/** Icono según el tipo de actividad (categoría de Blackboard o tipo de recurso). */
function kindIcon(activity: Activity): LucideIcon {
  const category = categoryLabel(activity.categoryKey, activity.categoryTitle);
  if (category === 'Examen') return FileCheck2;
  if (category === 'Prueba') return ClipboardCheck;
  if (category === 'Debate' || activity.kind === 'resource/x-bb-forumlink') return MessagesSquare;
  if (category === 'Diario') return BookText;
  return PenLine;
}

const bandVar = (pct: number) => (pct < LOW_THRESHOLD ? 'var(--bad)' : pct < 80 ? 'var(--warn)' : 'var(--ok)');
const bandName = (pct: number) => (pct < LOW_THRESHOLD ? 'Nota baja' : pct < 80 ? 'Regular' : 'Buena nota');

/** Tarjeta de actividad: hoja de fecha, tipo, estado con su color y, si ya hay nota, un medidor. */
export function ActivityCard({ activity, index, query, variant, onSelect }: {
  activity: Activity; index: number; query: string; variant: 'plan' | 'grade'; onSelect: (activity: Activity) => void;
}) {
  const reduce = useReducedMotion();
  const key = statusKeyOf(activity);
  const info = STATUS_INFO[key];
  const status = activityStatus(activity);
  const Icon = kindIcon(activity);
  const StatusIcon = STATUS_ICON[key];
  const due = activity.dueAt ? new Date(activity.dueAt) : null;
  const left = due && key === 'pending' ? daysUntil(activity.dueAt!) : null;
  const pct = activity.score !== null || activity.isAutoZero ? pctOf(activity) : null;
  const name = activity.effectiveName ?? activity.name;
  const category = activity.isCalculated ? 'Columna calculada' : categoryLabel(activity.categoryKey, activity.categoryTitle) ?? 'Actividad';

  return (
    <motion.li layout="position" className={styles.item}
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.14 } }}
      transition={{ duration: 0.4, delay: Math.min(index, 9) * 0.045, ease }}>
      <button type="button" className={cx(styles.card, variant === 'grade' && styles.cardGrade)} style={{ ['--s' as string]: info.color }} onClick={() => onSelect(activity)}
        aria-label={`${name}, ${status.label}${due ? `, vence ${due.toLocaleString('es-SV', { timeZone: TIMEZONE })}` : ''}`}>
        <span className={cx(styles.leaf, left !== null && left <= 3 && styles.leafSoon)} aria-hidden="true">
          {due ? (<><b className="tabular">{day.format(due)}</b><i>{month.format(due).replace('.', '')}</i></>) : <i>Sin<br />fecha</i>}
        </span>
        <span className={styles.body}>
          <span className={styles.title}><Highlight text={name} query={query} /></span>
          <span className={styles.meta}>
            <span className={styles.kind}><Icon size={14} aria-hidden="true" />{category}</span>
            {due && <span>{weekday.format(due).replace('.', '')} {formatTime(activity.dueAt)}</span>}
            {due && key !== 'graded' && <span className={cx(styles.rel, left !== null && left <= 3 && styles.relSoon)}>{formatDueRelative(activity.dueAt)}</span>}
            {key === 'graded' && activity.gradedAt && <span>calificada {formatRelative(activity.gradedAt)}</span>}
            {key === 'submitted' && activity.submittedAt && <span>entregada {formatRelative(activity.submittedAt)}</span>}
            {activity.hasFeedback && <span className={styles.feedback}><MessageSquareText size={14} aria-hidden="true" />con comentarios</span>}
            {activity.dueSource === 'todo' && <span>fecha personal</span>}
          </span>
          {variant === 'grade' && pct !== null && (
            <span className={styles.bar} aria-hidden="true">
              <motion.i style={{ background: bandVar(pct) }} initial={reduce ? false : { width: 0 }} animate={{ width: `${Math.max(pct, 1.5)}%` }} transition={{ duration: 0.9, delay: 0.15 + Math.min(index, 9) * 0.045, ease }} />
            </span>
          )}
        </span>
        <span className={styles.end}>
          {pct !== null ? (
            <span className={styles.score} style={{ ['--b' as string]: bandVar(pct) }}>
              <strong className="tabular">{formatScore(activity.score ?? 0)}{activity.pointsPossible !== null && <small> / {formatScore(activity.pointsPossible)}</small>}</strong>
              {variant === 'plan' && <span className={styles.mini} aria-hidden="true"><i style={{ width: `${Math.max(pct, 3)}%` }} /></span>}
              {variant === 'grade' && <em>{key === 'overdue' ? 'Cero automático' : bandName(pct)}</em>}
            </span>
          ) : null}
          {(variant === 'plan' || pct === null) && <span className={styles.pill}><StatusIcon size={14} aria-hidden="true" />{status.label}</span>}
        </span>
        <ArrowUpRight className={styles.go} size={18} aria-hidden="true" />
      </button>
    </motion.li>
  );
}

function Search_({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className={styles.search}>
      <Search size={16} aria-hidden="true" />
      <span className="visually-hidden">Buscar actividad</span>
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Buscar actividad" autoComplete="off" spellCheck={false} />
      {value && <button type="button" className={styles.clear} onClick={() => onChange('')} aria-label="Borrar búsqueda"><X size={14} aria-hidden="true" /></button>}
    </label>
  );
}

type Sort = 'auto' | 'new' | 'old' | 'name' | 'grade';
const SORTS = [
  { value: 'auto' as const, label: 'Lo próximo primero', icon: ArrowDownWideNarrow, hint: 'Las vencidas y calificadas, de la más reciente' },
  { value: 'new' as const, label: 'Fecha: más reciente', icon: CalendarArrowDown },
  { value: 'old' as const, label: 'Fecha: más antigua', icon: CalendarArrowUp },
  { value: 'name' as const, label: 'Nombre A–Z', icon: ArrowDownAZ },
  { value: 'grade' as const, label: 'Nota: mayor primero', icon: Trophy },
];
const dateOf = (a: Activity) => (a.dueAt ? Date.parse(a.dueAt) : null);
const labelOf = (a: Activity) => (a.isCalculated ? 'Columna calculada' : categoryLabel(a.categoryKey, a.categoryTitle) ?? 'Actividad');

/** Pestaña Actividades: estados en una barra con píldora, menús de tipo y orden, grupos por estado y tarjetas que abren el detalle. */
export function CourseActivities({ activities, status, onStatus, onSelect }: {
  activities: Activity[]; status: DashStatus; onStatus: (status: DashStatus) => void; onSelect: (activity: Activity) => void;
}) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [sort, setSort] = useState<Sort>('auto');
  const needle = normalize(query.trim());
  const base = useMemo(() => activities.filter((a) => (kind === 'all' || labelOf(a) === kind) && (!needle || normalize(a.effectiveName ?? a.name).includes(needle))), [activities, kind, needle]);
  const kinds = useMemo(() => {
    const map = new Map<string, { n: number; icon: LucideIcon }>();
    activities.forEach((a) => { const k = labelOf(a); map.set(k, { n: (map.get(k)?.n ?? 0) + 1, icon: map.get(k)?.icon ?? kindIcon(a) }); });
    return [...map.entries()];
  }, [activities]);
  const shown = base.filter((a) => matchesStatus(a, status));
  const counts = (s: DashStatus) => base.filter((a) => matchesStatus(a, s)).length;
  const groups = STATUS_ORDER.map((key) => ({ key, items: shown.filter((a) => statusKeyOf(a) === key) })).filter((g) => g.items.length > 0);
  groups.forEach((g) => {
    g.items.sort((a, b) => {
      if (sort === 'name') return (a.effectiveName ?? a.name).localeCompare(b.effectiveName ?? b.name, 'es');
      if (sort === 'grade') return (pctOf(b) ?? -1) - (pctOf(a) ?? -1);
      const x = dateOf(a) ?? Infinity; const y = dateOf(b) ?? Infinity;
      const recentFirst = sort === 'new' || (sort === 'auto' && (g.key === 'graded' || g.key === 'overdue'));
      return recentFirst ? (y === Infinity ? 0 : y) - (x === Infinity ? 0 : x) : x - y;
    });
  });
  const extra = status === 'nodate' || status === 'low' ? status : 'none';
  const filtered = status !== 'all' || kind !== 'all' || needle !== '';
  const reset = () => { setQuery(''); setKind('all'); onStatus('all'); };
  let n = 0;

  return (
    <div>
      <div className={styles.tools}>
        <SegTabs<DashStatus> label="Estado" iconOnly value={status} onChange={(v) => onStatus(v === status ? 'all' : v)} options={[
          { value: 'all', label: 'Todas', icon: Layers, count: base.length },
          { value: 'pending', label: 'Por entregar', icon: Clock, color: 'var(--st-pending)', count: counts('pending') },
          { value: 'overdue', label: 'Vencidas', icon: TriangleAlert, color: 'var(--bad)', count: counts('overdue') },
          { value: 'submitted', label: 'Entregadas', icon: Send, color: 'var(--sky)', count: counts('submitted') },
          { value: 'graded', label: 'Calificadas', icon: CircleCheck, color: 'var(--ok)', count: counts('graded') },
        ]} />
        <div className={styles.menus}>
          <FilterMenu<string> label="Tipo" icon={Shapes} value={kind} onChange={setKind} neutral="all" options={[
            { value: 'all', label: 'Todos los tipos', icon: Layers, count: activities.length },
            ...kinds.map(([label, k]) => ({ value: label, label, icon: k.icon, count: k.n })),
          ]} />
          <FilterMenu<string> label="Más filtros" icon={ListFilter} value={extra} neutral="none" onChange={(v) => onStatus(v === 'none' ? 'all' : (v as DashStatus))} options={[
            { value: 'none', label: 'Ninguno' },
            { value: 'low', label: 'Notas bajas', icon: TriangleAlert, color: 'var(--bad)', count: counts('low'), hint: 'Calificadas por debajo del 60 %' },
            { value: 'nodate', label: 'Sin fecha', icon: CalendarOff, color: 'var(--muted)', count: counts('nodate') },
          ]} />
          <FilterMenu<Sort> label="Ordenar" icon={ArrowDownWideNarrow} value={sort} onChange={setSort} options={SORTS} />
        </div>
        <Search_ value={query} onChange={setQuery} />
      </div>
      {filtered && (
        <div className={styles.active} aria-live="polite">
          <span>{shown.length} de {activities.length} {activities.length === 1 ? 'actividad' : 'actividades'}</span>
          <button type="button" onClick={reset}>Quitar filtros</button>
        </div>
      )}

      {shown.length === 0 ? (
        <motion.div className={styles.empty} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
          <span><Sparkles size={26} aria-hidden="true" /></span>
          <strong>{needle ? 'Ninguna actividad coincide' : 'Aquí no hay actividades'}</strong>
          <p>{needle ? 'Prueba con otra palabra.' : 'Con estos filtros no hay nada por ahora.'}</p>
          {filtered && <button type="button" onClick={reset}>Quitar filtros</button>}
        </motion.div>
      ) : groups.map((group) => {
        const info = STATUS_INFO[group.key];
        return (
          <section key={group.key} className={styles.group} style={{ ['--s' as string]: info.color }}>
            <motion.header className={styles.groupHead} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease }}>
              <i className={styles.groupDot} />
              <h3>{info.label}</h3><b className="tabular">{group.items.length}</b>
              <span>{GROUP_HINT[group.key]}</span>
            </motion.header>
            <ul className={styles.list}>
              <AnimatePresence mode="popLayout">
                {group.items.map((activity) => <ActivityCard key={activity.id} activity={activity} index={n++} query={query} variant="plan" onSelect={onSelect} />)}
              </AnimatePresence>
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export { averagePct };
