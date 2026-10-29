import {
  ArrowRight, ArrowUpRight, BellRing, CalendarClock, CalendarRange, CheckCircle2, Clock, FilePlus2, GraduationCap, Layers, Library, Megaphone, PencilLine, RefreshCw, Send, Sparkles, TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useChanges } from '../api/hooks';
import type { Change, ChangeKind } from '../api/types';
import { ActivityDetail } from '../components/ActivityDetail';
import { describeChange } from '../components/ChangeList';
import { FilterMenu, SegTabs } from '../components/FilterKit';
import { Button, Card, EmptyState, Skeleton } from '../components/ui';
import { courseIcon } from '../lib/courseIcon';
import { courseTitle, dayFromKey, dayKey, formatLongDay, formatRelative, formatTime } from '../lib/format';
import { useReducedMotion } from '../lib/motion';
import { tintFor } from '../lib/tint';
import styles from './Updates.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');
const DAY = 86_400_000;

type Group = 'all' | 'grades' | 'dates' | 'activities' | 'announcements';
type Period = 'all' | '7' | '30';
const GROUPS: Array<{ value: Group; label: string; icon: LucideIcon; color?: string; kinds: ChangeKind[] }> = [
  { value: 'all', label: 'Todo', icon: Layers, kinds: [] },
  { value: 'grades', label: 'Notas', icon: CheckCircle2, color: 'var(--ok)', kinds: ['grade_new', 'grade_changed'] },
  { value: 'dates', label: 'Fechas', icon: CalendarClock, color: 'var(--st-pending)', kinds: ['due_changed'] },
  { value: 'activities', label: 'Actividades', icon: FilePlus2, color: 'var(--sky)', kinds: ['activity_new', 'activity_renamed', 'points_changed', 'submission_changed', 'course_new', 'term_new'] },
  { value: 'announcements', label: 'Anuncios', icon: Megaphone, color: 'var(--teal)', kinds: ['announcement_new'] },
];
const KIND: Record<ChangeKind, { label: string; icon: LucideIcon; color: string }> = {
  grade_new: { label: 'Nota nueva', icon: CheckCircle2, color: 'var(--ok)' },
  grade_changed: { label: 'Nota modificada', icon: RefreshCw, color: 'var(--warn)' },
  due_changed: { label: 'Fecha cambiada', icon: CalendarClock, color: 'var(--st-pending)' },
  activity_new: { label: 'Actividad nueva', icon: FilePlus2, color: 'var(--sky)' },
  activity_renamed: { label: 'Renombrada', icon: PencilLine, color: 'var(--sky)' },
  points_changed: { label: 'Puntaje cambiado', icon: PencilLine, color: 'var(--sky)' },
  submission_changed: { label: 'Entrega', icon: Send, color: 'var(--sky)' },
  course_new: { label: 'Materia nueva', icon: GraduationCap, color: 'var(--accent)' },
  term_new: { label: 'Período nuevo', icon: CalendarRange, color: 'var(--accent)' },
  announcement_new: { label: 'Anuncio', icon: Megaphone, color: 'var(--teal)' },
};

/** En pantallas angostas la barra de tipos pasa a solo iconos para que quepa sin partirse. */
function useCompact() {
  const query = '(max-width: 900px)';
  return useSyncExternalStore((cb) => { const m = window.matchMedia(query); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); }, () => window.matchMedia(query).matches, () => false);
}

/** "Hoy", "Ayer" o "Hace N días" para un día calendario. */
function relativeDay(key: string): string {
  const days = Math.round((dayFromKey(dayKey(new Date())).getTime() - dayFromKey(key).getTime()) / DAY);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}
const shortDay = new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', weekday: 'short' });
const monthLong = new Intl.DateTimeFormat('es-SV', { timeZone: 'UTC', month: 'long' });

function ChangeCard({ change, index, onOpen }: { change: Change; index: number; onOpen: (id: string) => void }) {
  const reduce = useReducedMotion();
  const { title, detail } = describeChange(change);
  const meta = KIND[change.kind];
  const Icon = meta.icon;
  const tint = tintFor(change.courseId);
  const CourseIcon = change.courseName ? courseIcon(courseTitle(change.courseName)) : Layers;
  const fresh = Date.now() - Date.parse(change.detectedAt) < DAY;
  const parts = detail?.includes(' → ') ? detail.split(' → ') : null;
  return (
    <motion.li layout="position" className={styles.item} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
      transition={{ duration: 0.4, delay: Math.min(index, 9) * 0.045, ease }}>
      <div className={styles.card} style={{ ['--s' as string]: meta.color, ['--c' as string]: tint.fg, ['--cbg' as string]: tint.bg }}>
        <span className={styles.disc} aria-hidden="true"><Icon size={21} /></span>
        <div className={styles.body}>
          <p className={styles.tags}>
            <span className={styles.kind}>{meta.label}</span>
            {fresh && <span className={styles.fresh}><Sparkles size={11} aria-hidden="true" />Nuevo</span>}
            <time dateTime={change.detectedAt}>{formatTime(change.detectedAt)} · {formatRelative(change.detectedAt)}</time>
          </p>
          <p className={styles.title}>{title}</p>
          {parts ? (
            <p className={styles.shift}><span className={styles.from}>{parts[0]}</span><ArrowRight size={15} aria-hidden="true" /><span className={styles.to}>{parts[1]}</span></p>
          ) : detail ? <p className={styles.detail}>{detail}</p> : null}
          {change.courseName && <p className={styles.course}><span><CourseIcon size={12} aria-hidden="true" />{courseTitle(change.courseName)}</span></p>}
        </div>
        {change.activityId
          ? <button type="button" className={styles.action} onClick={() => onOpen(change.activityId!)}>Abrir<ArrowUpRight size={15} aria-hidden="true" /></button>
          : change.courseId ? <Link to={`/courses/${change.courseId}`} className={styles.action}>Materia<ArrowUpRight size={15} aria-hidden="true" /></Link> : null}
      </div>
    </motion.li>
  );
}

export function UpdatesPage() {
  const { data, isPending, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useChanges();
  const [params, setParams] = useSearchParams();
  const [activityId, setActivityId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('all');
  const reduce = useReducedMotion();
  const compact = useCompact();
  const group = (params.get('tipo') as Group | null) ?? 'all';
  const courseId = params.get('materia') ?? '';
  const changes = useMemo(() => data?.pages.flatMap((p) => p.changes) ?? [], [data]);
  const courses = useMemo(() => {
    const map = new Map<string, { name: string; n: number }>();
    changes.filter((c) => c.courseId).forEach((c) => map.set(c.courseId!, { name: courseTitle(c.courseName ?? ''), n: (map.get(c.courseId!)?.n ?? 0) + 1 }));
    return [...map.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [changes]);
  const since = period === 'all' ? 0 : Date.now() - Number(period) * DAY;
  const inPeriod = changes.filter((c) => Date.parse(c.detectedAt) >= since);
  const base = inPeriod.filter((c) => !courseId || c.courseId === courseId);
  const kinds = GROUPS.find((g) => g.value === group)?.kinds ?? [];
  const shown = base.filter((c) => kinds.length === 0 || kinds.includes(c.kind));
  const counts = (g: (typeof GROUPS)[number]) => (g.kinds.length === 0 ? base.length : base.filter((c) => g.kinds.includes(c.kind)).length);
  const set = (key: string, value: string) => setParams((cur) => { const n = new URLSearchParams(cur); if (value) n.set(key, value); else n.delete(key); return n; }, { replace: true });
  const filtered = group !== 'all' || Boolean(courseId) || period !== 'all';
  const reset = () => { setParams({}, { replace: true }); setPeriod('all'); };

  const days = new Map<string, Change[]>();
  for (const change of shown) days.set(dayKey(change.detectedAt), [...(days.get(dayKey(change.detectedAt)) ?? []), change]);
  const week = changes.filter((c) => Date.now() - Date.parse(c.detectedAt) < 7 * DAY).length;
  const today = dayKey(new Date());
  let n = 0;

  const courseOptions = [
    { value: 'all', label: 'Todas las materias', icon: Layers, count: inPeriod.length },
    ...courses.map(([id, c]) => ({ value: id, label: c.name, icon: courseIcon(c.name), color: tintFor(id).fg, count: inPeriod.filter((x) => x.courseId === id).length })),
  ];

  return (
    <div>
      <header className={styles.head}>
        <motion.div initial={reduce ? false : { opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease }}>
          <span className={styles.eyebrow}><BellRing size={14} aria-hidden="true" />Lo que cambió</span>
          <h1 className={styles.heading}>Novedades</h1>
          <p className={styles.lede}>Lo que cambió en tu campus virtual entre una importación y otra: notas, fechas, actividades y anuncios.</p>
        </motion.div>
        {data && changes.length > 0 && (
          <motion.div className={styles.pulse} initial={reduce ? false : { opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1, ease }}>
            <span className={styles.pulseIcon}><Clock size={22} aria-hidden="true" /></span>
            <span className={styles.pulseText}><small>Últimos 7 días</small><strong><span className="tabular">{week}</span> {week === 1 ? 'novedad' : 'novedades'}</strong></span>
          </motion.div>
        )}
      </header>

      {data && changes.length > 0 && (
        <div className={styles.filters}>
          <SegTabs<Group> label="Tipo de novedad" iconOnly={compact} value={group} onChange={(v) => set('tipo', v === 'all' || v === group ? '' : v)}
            options={GROUPS.map((g) => ({ value: g.value, label: g.label, icon: g.icon, color: g.color, count: counts(g) }))} />
          <div className={styles.menus}>
            {courses.length > 1 && (courses.length <= 6
              ? <SegTabs<string> label="Materia" iconOnly value={courseId || 'all'} onChange={(v) => set('materia', v === 'all' || v === courseId ? '' : v)} options={courseOptions} />
              : <FilterMenu<string> label="Materia" icon={Library} compact value={courseId || 'all'} neutral="all" onChange={(v) => set('materia', v === 'all' ? '' : v)} options={courseOptions} />)}
            <FilterMenu<Period> label="Período" icon={CalendarRange} compact tipEnd value={period} neutral="all" onChange={setPeriod} options={[
              { value: 'all', label: 'Todo el historial', icon: Layers, count: changes.length },
              { value: '7', label: 'Últimos 7 días', icon: Clock, count: changes.filter((c) => Date.now() - Date.parse(c.detectedAt) < 7 * DAY).length },
              { value: '30', label: 'Últimos 30 días', icon: CalendarClock, count: changes.filter((c) => Date.now() - Date.parse(c.detectedAt) < 30 * DAY).length },
            ]} />
            {filtered && <button type="button" className={styles.reset} onClick={reset}>Quitar filtros</button>}
          </div>
        </div>
      )}

      {isPending && <div className={styles.skeleton}><Skeleton height={110} radius={24} /><Skeleton height={110} radius={24} /><Skeleton height={110} radius={24} /></div>}
      {error && <Card><EmptyState tone="danger" icon={<TriangleAlert />} title="No pudimos cargar tus novedades"
        action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}>{error.message}</EmptyState></Card>}
      {data && changes.length === 0 && (
        <Card><EmptyState icon={<BellRing />} title="Aún no hay novedades">La primera importación sirve como punto de partida. Cuando vuelvas a importar tus datos, aquí verás lo que cambió.</EmptyState></Card>
      )}
      {data && changes.length > 0 && shown.length === 0 && (
        <Card><EmptyState icon={<BellRing />} title="Nada con estos filtros" action={<Button variant="secondary" onClick={reset}>Quitar filtros</Button>}>Prueba con otro tipo, materia o período.</EmptyState></Card>
      )}

      <div className={styles.feed}>
        {[...days.entries()].map(([key, list], dayIndex) => (
          <section key={key} className={styles.day} aria-label={formatLongDay(dayFromKey(key))}>
            <motion.div className={cx(styles.dayHead, key === today && styles.dayToday)} initial={reduce ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: Math.min(dayIndex, 6) * 0.05, ease }}>
              <span className={styles.leaf} aria-hidden="true"><i>{shortDay.format(dayFromKey(key)).replace('.', '')}</i><b className="tabular">{Number(key.slice(8))}</b></span>
              <span className={styles.dayText}>
                <strong>{relativeDay(key)}</strong>
                <small>{Number(key.slice(8))} de {monthLong.format(dayFromKey(key))}</small>
              </span>
              <b className={cx(styles.dayCount, 'tabular')}>{list.length}</b>
            </motion.div>
            <ul className={styles.items}>
              <AnimatePresence mode="popLayout">
                {list.map((change) => <ChangeCard key={change.id} change={change} index={n++} onOpen={setActivityId} />)}
              </AnimatePresence>
            </ul>
          </section>
        ))}
      </div>
      {hasNextPage && <div className={styles.more}><Button variant="secondary" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>Cargar más</Button></div>}
      <ActivityDetail activityId={activityId} onClose={() => setActivityId(null)} />
    </div>
  );
}
