import { BellRing, CalendarClock, CheckCircle2, FilePlus2, Megaphone, PencilLine, RefreshCw, TriangleAlert, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useChanges } from '../api/hooks';
import type { Change, ChangeKind } from '../api/types';
import { ActivityDetail } from '../components/ActivityDetail';
import { describeChange } from '../components/ChangeList';
import { PageHeader } from '../components/Filters';
import { Button, Card, EmptyState, Skeleton } from '../components/ui';
import { courseTitle, dayFromKey, dayKey, formatLongDay, formatTime } from '../lib/format';
import { tintFor } from '../lib/tint';
import styles from './Updates.module.css';

type Group = 'all' | 'activities' | 'dates' | 'grades' | 'announcements';
const GROUPS: Array<{ value: Group; label: string; icon: LucideIcon; kinds: ChangeKind[] }> = [
  { value: 'all', label: 'Todo', icon: BellRing, kinds: [] },
  { value: 'grades', label: 'Notas', icon: CheckCircle2, kinds: ['grade_new', 'grade_changed'] },
  { value: 'dates', label: 'Fechas', icon: CalendarClock, kinds: ['due_changed'] },
  { value: 'activities', label: 'Actividades', icon: FilePlus2, kinds: ['activity_new', 'activity_renamed', 'points_changed', 'submission_changed', 'course_new', 'term_new'] },
  { value: 'announcements', label: 'Anuncios', icon: Megaphone, kinds: ['announcement_new'] },
];
const KIND_ICON: Partial<Record<ChangeKind, LucideIcon>> = {
  grade_new: CheckCircle2, grade_changed: RefreshCw, due_changed: CalendarClock, activity_new: FilePlus2, activity_renamed: PencilLine,
  points_changed: PencilLine, announcement_new: Megaphone,
};

export function UpdatesPage() {
  const { data, isPending, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useChanges();
  const [params, setParams] = useSearchParams();
  const [activityId, setActivityId] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const group = (params.get('tipo') as Group | null) ?? 'all';
  const courseId = params.get('materia') ?? '';
  const changes = useMemo(() => data?.pages.flatMap((p) => p.changes) ?? [], [data]);
  const courses = useMemo(() => [...new Map(changes.filter((c) => c.courseId).map((c) => [c.courseId!, courseTitle(c.courseName ?? '')])).entries()], [changes]);
  const kinds = GROUPS.find((g) => g.value === group)?.kinds ?? [];
  const shown = changes.filter((c) => (kinds.length === 0 || kinds.includes(c.kind)) && (!courseId || c.courseId === courseId));
  const counts = GROUPS.map((g) => ({ ...g, count: g.kinds.length === 0 ? changes.length : changes.filter((c) => g.kinds.includes(c.kind)).length }));
  const set = (key: string, value: string) => setParams((cur) => { const n = new URLSearchParams(cur); if (value) n.set(key, value); else n.delete(key); return n; }, { replace: true });

  const days = new Map<string, Change[]>();
  for (const change of shown) days.set(dayKey(change.detectedAt), [...(days.get(dayKey(change.detectedAt)) ?? []), change]);
  const today = dayKey(new Date());

  return (
    <div>
      <PageHeader title="Novedades" lede="Lo que cambió en tu campus virtual entre una importación y otra: notas, fechas, actividades y anuncios." />

      <div className={styles.filters}>
        <div className={styles.chips} role="group" aria-label="Tipo de novedad">
          {counts.map(({ value, label, icon: Icon, count }) => (
            <button key={value} type="button" className={styles.chip} aria-pressed={group === value} onClick={() => set('tipo', value === 'all' ? '' : value)}>
              <Icon size={15} aria-hidden="true" />{label}<span className="tabular">{count}</span>
            </button>
          ))}
        </div>
        {courses.length > 1 && (
          <div className={styles.chips} role="group" aria-label="Materia">
            <button type="button" className={styles.chipCourse} aria-pressed={!courseId} onClick={() => set('materia', '')}>Todas</button>
            {courses.map(([id, title]) => (
              <button key={id} type="button" className={styles.chipCourse} aria-pressed={courseId === id} onClick={() => set('materia', courseId === id ? '' : id)}
                style={{ ['--c' as string]: tintFor(id).fg, ['--cbg' as string]: tintFor(id).bg }}><span className={styles.swatch} aria-hidden="true" />{title}</button>
            ))}
          </div>
        )}
      </div>

      {isPending && <Skeleton height={320} radius={20} />}
      {error && <Card><EmptyState tone="danger" icon={<TriangleAlert />} title="No pudimos cargar tus novedades"
        action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}>{error.message}</EmptyState></Card>}
      {data && changes.length === 0 && (
        <Card><EmptyState icon={<BellRing />} title="Aún no hay novedades">La primera importación sirve como punto de partida. Cuando vuelvas a importar tus datos, aquí verás lo que cambió.</EmptyState></Card>
      )}
      {data && changes.length > 0 && shown.length === 0 && <Card><EmptyState icon={<BellRing />} title="Nada con estos filtros">Prueba con otro tipo o materia.</EmptyState></Card>}

      <div className={styles.feed}>
        {[...days.entries()].map(([key, list], dayIndex) => (
          <section key={key} className={styles.day} aria-label={formatLongDay(dayFromKey(key))}>
            <h2 className={styles.dayTitle}><span className={styles.dayDot} />{key === today ? 'Hoy · ' : ''}{formatLongDay(dayFromKey(key))}</h2>
            <ul className={styles.items}>
              {list.map((change, index) => {
                const { title, detail } = describeChange(change);
                const Icon = KIND_ICON[change.kind] ?? RefreshCw;
                const tint = tintFor(change.courseId);
                return (
                  <motion.li key={change.id} className={styles.item} initial={reduce ? false : { opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(dayIndex * 3 + index, 12) * 0.04 }}>
                    <span className={styles.icon} style={{ background: tint.bg, color: tint.fg }}><Icon size={18} aria-hidden="true" /></span>
                    <div className={styles.body}>
                      <p className={styles.title}>{title}</p>
                      <p className={styles.meta}>{change.courseName && <span style={{ color: tint.fg, fontWeight: 600 }}>{courseTitle(change.courseName)}</span>}<span>{formatTime(change.detectedAt)}</span></p>
                      {detail && <p className={styles.detail}>{detail}</p>}
                    </div>
                    {change.activityId ? <button type="button" className={styles.action} onClick={() => setActivityId(change.activityId!)}>Abrir</button>
                      : change.courseId ? <Link to={`/courses/${change.courseId}`} className={styles.action}>Materia</Link> : null}
                  </motion.li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      {hasNextPage && <div className={styles.more}><Button variant="secondary" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>Cargar más</Button></div>}
      <ActivityDetail activityId={activityId} onClose={() => setActivityId(null)} />
    </div>
  );
}
