import { AlarmClock, CheckCircle2, CircleDashed, Clock3, Flame, Send, TriangleAlert, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useActivities } from '../api/hooks';
import type { Activity } from '../api/types';
import { ActivityDetail } from '../components/ActivityDetail';
import { Button, Card, EmptyState, Skeleton } from '../components/ui';
import { courseIcon } from '../lib/courseIcon';
import { activityKind, categoryLabel, courseTitle, daysUntil, formatDateTime, formatDueRelative, formatScore } from '../lib/format';
import { statusGroup, type StatusGroup } from '../lib/status';
import { tintFor } from '../lib/tint';
import styles from './Activities.module.css';

type Column = Exclude<StatusGroup, 'calculated'>;
const COLUMNS: Array<{ id: Column; label: string; hint: string; icon: LucideIcon; tone: string | undefined }> = [
  { id: 'pending', label: 'Por entregar', hint: 'con fecha futura', icon: AlarmClock, tone: styles.colViolet },
  { id: 'overdue', label: 'Vencidas', hint: 'fecha pasada sin nota', icon: Flame, tone: styles.colCoral },
  { id: 'submitted', label: 'Entregadas', hint: 'esperando nota', icon: Send, tone: styles.colSky },
  { id: 'graded', label: 'Calificadas', hint: 'con nota publicada', icon: CheckCircle2, tone: styles.colMint },
  { id: 'nodate', label: 'Sin fecha', hint: 'publicadas sin vencimiento', icon: CircleDashed, tone: styles.colGrey },
];
const WEEK_MS = 7 * 86_400_000;

/** Anillo de tiempo restante (una semana = anillo completo). Solo para pendientes con fecha. */
function TimeRing({ dueAt, color }: { dueAt: string; color: string }) {
  const remaining = Math.max(0, Date.parse(dueAt) - Date.now());
  const fraction = Math.min(1, remaining / WEEK_MS);
  const r = 15; const c = 2 * Math.PI * r;
  const days = daysUntil(dueAt);
  return (
    <span className={styles.ring} aria-hidden="true">
      <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r={r} fill="none" stroke="var(--pill-neutral-bg)" strokeWidth="5" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - fraction)} transform="rotate(-90 20 20)" /></svg>
      <strong className="tabular">{days}</strong>
    </span>
  );
}

function ActivityCard({ activity, column, onOpen, index }: { activity: Activity; column: Column; onOpen: (a: Activity) => void; index: number }) {
  const reduce = useReducedMotion();
  const tint = tintFor(activity.courseId);
  const Icon = courseIcon(courseTitle(activity.courseName));
  const soon = column === 'pending' && activity.dueAt && daysUntil(activity.dueAt) <= 2;
  return (
    <motion.li layout initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: Math.min(index, 6) * 0.04 }}>
      <button type="button" className={`${styles.card} ${soon ? styles.cardSoon : ''}`} style={{ ['--c' as string]: tint.fg, ['--cbg' as string]: tint.bg }} onClick={() => onOpen(activity)}>
        <span className={styles.cardCourse}><Icon size={13} aria-hidden="true" />{courseTitle(activity.courseName)}</span>
        <span className={styles.cardTitle}>{activity.effectiveName ?? activity.name}</span>
        <span className={styles.cardFoot}>
          <span className={styles.cardKind}>{categoryLabel(activity.categoryKey, activity.categoryTitle) ?? activityKind(activity.kind)}</span>
          {column === 'graded' && activity.score !== null && <span className={styles.cardScore}>{formatScore(activity.score)}{activity.pointsPossible !== null && <small>/{formatScore(activity.pointsPossible)}</small>}</span>}
          {column === 'pending' && activity.dueAt && <TimeRing dueAt={activity.dueAt} color={soon ? 'var(--pink)' : tint.fg} />}
          {(column === 'overdue' || column === 'submitted') && activity.dueAt && <span className={styles.cardWhen}><Clock3 size={12} aria-hidden="true" />{formatDueRelative(activity.dueAt)}</span>}
        </span>
        {column === 'pending' && activity.dueAt && <span className={styles.cardDue}>{formatDateTime(activity.dueAt)}</span>}
      </button>
    </motion.li>
  );
}

export function ActivitiesPage() {
  const { data, isPending, error, refetch } = useActivities();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<Activity | null>(null);
  const courseId = params.get('materia') ?? '';
  const query = (params.get('q') ?? '').toLocaleLowerCase('es');

  const all = useMemo(() => (data ?? []).filter((a) => !a.isCalculated), [data]);
  const courses = useMemo(() => [...new Map(all.map((a) => [a.courseId, courseTitle(a.courseName)])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'es')), [all]);
  const shown = all.filter((a) => (!courseId || a.courseId === courseId) && (!query || (a.effectiveName ?? a.name).toLocaleLowerCase('es').includes(query)));
  const byColumn = new Map<Column, Activity[]>();
  for (const activity of shown) {
    const group = statusGroup(activity);
    if (group === 'calculated') continue;
    byColumn.set(group, [...(byColumn.get(group) ?? []), activity]);
  }
  for (const [key, list] of byColumn) {
    list.sort((a, b) => key === 'graded' ? (Date.parse(b.gradedAt ?? b.dueAt ?? '') || 0) - (Date.parse(a.gradedAt ?? a.dueAt ?? '') || 0)
      : (a.dueAt ? Date.parse(a.dueAt) : Infinity) - (b.dueAt ? Date.parse(b.dueAt) : Infinity));
  }
  const setCourse = (id: string) => setParams((cur) => { const n = new URLSearchParams(cur); if (id) n.set('materia', id); else n.delete('materia'); n.delete('q'); return n; }, { replace: true });

  return (
    <div>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Tablero de actividades</h1>
          <p className={styles.lede}>Cada columna es un estado real de tus evaluables. Toca una tarjeta para ver su detalle. Busca con <kbd>Ctrl K</kbd>.</p>
        </div>
        {courses.length > 1 && (
          <div className={styles.courses} role="group" aria-label="Materia">
            <button type="button" className={styles.courseChip} aria-pressed={!courseId} onClick={() => setCourse('')}>Todas</button>
            {courses.map(([id, name]) => { const Icon = courseIcon(name); const t = tintFor(id); return (
              <button key={id} type="button" className={styles.courseChip} aria-pressed={courseId === id} onClick={() => setCourse(courseId === id ? '' : id)} style={{ ['--c' as string]: t.fg, ['--cbg' as string]: t.bg }}>
                <Icon size={14} aria-hidden="true" />{name}
              </button>); })}
          </div>
        )}
      </header>
      {query && <p className={styles.queryNote}>Mostrando resultados para “{params.get('q')}”. <button type="button" onClick={() => setCourse(courseId)}>Quitar</button></p>}

      {isPending && <div className={styles.board}>{COLUMNS.map((c) => <Skeleton key={c.id} height={320} radius={20} />)}</div>}
      {error && <Card><EmptyState tone="danger" icon={<TriangleAlert />} title="No pudimos cargar tus actividades"
        action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}>{error.message}</EmptyState></Card>}

      {data && (
        <div className={styles.board}>
          {COLUMNS.map(({ id, label, hint, icon: Icon, tone }) => {
            const list = byColumn.get(id) ?? [];
            return (
              <section key={id} className={`${styles.column} ${tone}`} aria-label={label}>
                <header className={styles.columnHead}>
                  <span className={styles.columnIcon}><Icon size={16} aria-hidden="true" /></span>
                  <span className={styles.columnTitle}>{label}<small>{hint}</small></span>
                  <span className={`${styles.columnCount} tabular`}>{list.length}</span>
                </header>
                {list.length === 0 ? <p className={styles.columnEmpty}>Nada aquí</p> : (
                  <ul className={styles.cards}>{list.map((a, i) => <ActivityCard key={a.id} activity={a} column={id} onOpen={setSelected} index={i} />)}</ul>
                )}
              </section>
            );
          })}
        </div>
      )}
      <ActivityDetail activityId={selected?.id ?? null} onClose={() => setSelected(null)} />
    </div>
  );
}
