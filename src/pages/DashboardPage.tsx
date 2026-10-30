import { AlarmClock, BadgeCheck, CheckCircle2, CircleDashed, Flame, Send, Sigma, Trophy, TriangleAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useActivities, useDashboard } from '../api/hooks';
import type { Activity } from '../api/types';
import { ActivityDetail } from '../components/ActivityDetail';
import { CalendarCard } from '../components/CalendarCard';
import { GradesColumns, StatusDonut, bandOf, type Band, type DonutPart, type GradePoint } from '../components/Charts';
import { CourseDial } from '../components/CourseDial';
import { ScopeTag } from '../components/ScopeTag';
import { CourseTabs } from '../components/CourseTabs';
import { TermRibbon } from '../components/TermRibbon';
import { Button, Card, EmptyState, Skeleton } from '../components/ui';
import { tintColor } from '../lib/colors';
import { LOW_THRESHOLD, matchesStatus, pctOf, type DashStatus } from '../lib/dashFilters';
import { capitalize, courseTitle, formatLongDay, formatScore, greeting } from '../lib/format';
import { statusGroup, type StatusGroup } from '../lib/status';
import { tintFor } from '../lib/tint';
import styles from './Dashboard.module.css';
import page from './Page.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const gradeDate = new Intl.DateTimeFormat('es-SV', { timeZone: 'America/El_Salvador', day: 'numeric', month: 'short' });
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

const BANDS: Array<{ key: Band; label: string }> = [{ key: 'ok', label: '80 %+' }, { key: 'warn', label: '60–79' }, { key: 'bad', label: `menos de ${LOW_THRESHOLD}` }];

function useNarrow() {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 581px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 581px)');
    const on = () => setNarrow(query.matches);
    query.addEventListener('change', on);
    return () => query.removeEventListener('change', on);
  }, []);
  return narrow;
}

/** Celda de la rejilla: la primera entra al cargar; las demás suben suavemente cuando aparecen en pantalla. */
function Cell({ className, delay, eager, children }: { className?: string; delay: number; eager?: boolean; children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={cx(styles.cell, className)}>{children}</div>;
  if (eager) {
    return (
      <motion.div className={cx(styles.cell, className)} initial={{ opacity: 0, y: 24, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, delay, ease }}>
        {children}
      </motion.div>
    );
  }
  return (
    <motion.div className={cx(styles.cell, className)} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.06 }} transition={{ duration: 0.75, ease }}>
      {children}
    </motion.div>
  );
}

/** Esqueleto con la misma estructura del Inicio (título, pestañas, ciclo, calendario, pastel y notas). */
function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando tu día" className={styles.page}>
      <Skeleton width={300} height={40} radius={12} />
      <div>
        <div className={styles.skTabs}>{[88, 150, 130, 140].map((w, i) => <Skeleton key={i} width={w} height={40} radius={16} />)}</div>
        <div className={styles.skCard}>
          <Skeleton width={220} height={30} radius={10} />
          <Skeleton width={340} height={16} radius={8} />
          <div className={styles.skTrack}><Skeleton height={12} radius={6} /></div>
          <div className={styles.skChips}>{[120, 130, 120].map((w, i) => <Skeleton key={i} width={w} height={30} radius={15} />)}</div>
        </div>
      </div>
      <div className={styles.skCard}>
        <Skeleton width={160} height={26} radius={10} />
        <div className={styles.skCalendar}>
          <Skeleton height={300} radius={20} />
          <div className={styles.skPages}>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={300} radius={18} />)}</div>
        </div>
      </div>
      <div className={styles.grid}>
        <div className={cx(styles.cell, styles.est)}><div className={styles.skCard}><Skeleton width={200} height={26} radius={10} /><div className={styles.skDonut}><Skeleton width={190} height={190} radius={95} /></div><Skeleton height={14} radius={7} /><Skeleton height={14} radius={7} /></div></div>
        <div className={cx(styles.cell, styles.not)}><div className={styles.skCard}><Skeleton width={160} height={26} radius={10} /><div className={styles.skBars}>{[70, 90, 60, 85, 95, 75].map((h, i) => <Skeleton key={i} height={`${h}%`} radius={10} />)}</div></div></div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data, isPending, error, refetch, isFetching } = useDashboard();
  const activities = useActivities();
  const location = useLocation();
  const reduce = useReducedMotion();
  const narrow = useNarrow();
  const [selected, setSelected] = useState<string | null>(null);
  // Filtros globales: los comparten las insignias, el pastel, la línea del ciclo, el calendario y las notas.
  const [status, setStatus] = useState<DashStatus>('all');
  const [courseId, setCourseId] = useState('');
  const [band, setBand] = useState<Band | null>(null);
  // Vista previa: pasar el mouse por un filtro muestra ya su resultado sin elegirlo.
  const [hoverCourse, setHoverCourse] = useState<string | null>(null);
  const [hoverStatus, setHoverStatus] = useState<DashStatus | null>(null);
  const timers = useRef<{ course?: number; status?: number }>({});
  const previewCourse = useCallback((id: string | null) => {
    window.clearTimeout(timers.current.course);
    timers.current.course = window.setTimeout(() => setHoverCourse(id), id === null ? 90 : 200);
  }, []);
  const previewStatus = useCallback((value: DashStatus | null) => {
    window.clearTimeout(timers.current.status);
    timers.current.status = window.setTimeout(() => setHoverStatus(value), value === null ? 90 : 200);
  }, []);
  useEffect(() => () => { window.clearTimeout(timers.current.course); window.clearTimeout(timers.current.status); }, []);
  /** Elegir (clic) cancela cualquier vista previa pendiente y fija el filtro de una vez. */
  const chooseCourse = (id: string) => { window.clearTimeout(timers.current.course); setHoverCourse(null); setCourseId(id); };
  const viewCourse = hoverCourse ?? courseId;
  const viewStatus = hoverStatus ?? status;
  const passwordChanged = (location.state as { passwordChanged?: boolean } | null)?.passwordChanged;

  const all = useMemo(() => (activities.data ?? []).filter((a) => !a.isCalculated), [activities.data]);
  const byId = useMemo(() => new Map(all.map((a) => [a.id, a])), [all]);
  const base = useMemo(() => (viewCourse ? all.filter((a) => a.courseId === viewCourse) : all), [all, viewCourse]);

  const count = (group: StatusGroup) => base.filter((a) => matchesStatus(a, group as DashStatus)).length;
  const gradedBase = useMemo(() => base.filter((a) => statusGroup(a) === 'graded' && a.countsInGrade !== false && pctOf(a) !== null && (a.score !== null || a.isAutoZero))
    .sort((x, y) => (Date.parse(y.gradedAt ?? y.dueAt ?? '') || 0) - (Date.parse(x.gradedAt ?? x.dueAt ?? '') || 0)), [base]);
  const low = gradedBase.filter((a) => (pctOf(a) ?? 100) < LOW_THRESHOLD).length;
  const gradedShown = viewStatus === 'low' ? gradedBase.filter((a) => (pctOf(a) ?? 100) < LOW_THRESHOLD) : gradedBase;
  const gradePoints: GradePoint[] = gradedShown.slice(0, narrow ? 6 : 10).reverse().map((a: Activity) => ({
    id: a.id, name: a.effectiveName ?? a.name, course: courseTitle(a.courseName), courseColor: tintColor(tintFor(a.courseId).index), pct: pctOf(a) ?? 0,
    score: formatScore(a.score ?? 0), max: formatScore(a.pointsPossible), label: a.gradedAt ?? a.dueAt ? gradeDate.format(new Date((a.gradedAt ?? a.dueAt)!)).replace('.', '') : '', auto: a.isAutoZero,
  }));
  const bandCounts: Record<Band, number> = { ok: 0, warn: 0, bad: 0 };
  for (const point of gradePoints) bandCounts[bandOf(point.pct)] += 1;
    const average = gradedBase.length ? Math.round(gradedBase.reduce((sum, a) => sum + (pctOf(a) ?? 0), 0) / gradedBase.length) : null;
  const best = gradedBase.length ? Math.round(Math.max(...gradedBase.map((a) => pctOf(a) ?? 0))) : null;

  if (isPending) return <Loading />;
  if (error || !data) return <Card><EmptyState tone="danger" icon={<TriangleAlert />} title="No pudimos cargar tu día" action={<Button variant="secondary" onClick={() => refetch()} loading={isFetching}>Reintentar</Button>}>{error?.message}</EmptyState></Card>;

  const account = data.universityAccounts[0];
  const rawName = account?.givenName?.split(/\s+/)[0] ?? null;
  const firstName = rawName ? capitalize(rawName.toLocaleLowerCase('es')) : null;
  const currentTerms = data.terms.current.length > 0 ? data.terms.current : data.terms.all.slice(0, 1);
  const ribbonTerm = currentTerms.find((t) => t.startAt && t.endAt);
  const loaded = Boolean(activities.data);
  const course = viewCourse ? data.courses.find((c) => c.id === viewCourse) : undefined;
  const counts: Record<Exclude<DashStatus, 'all'>, number> = {
    pending: loaded ? count('pending') : data.summary.pending, overdue: count('overdue'), submitted: count('submitted'),
    graded: loaded ? count('graded') : data.summary.graded, low, nodate: count('nodate'),
  };
  const pieParts: DonutPart[] = [
    { key: 'graded', name: 'Calificadas', value: counts.graded, token: '--ok', icon: BadgeCheck },
    { key: 'submitted', name: 'Esperando nota', value: counts.submitted, token: '--sky', icon: Send },
    { key: 'pending', name: 'Por entregar', value: counts.pending, token: '--st-pending', icon: AlarmClock },
    { key: 'overdue', name: 'Vencidas', value: counts.overdue, token: '--bad', icon: Flame },
    { key: 'nodate', name: 'Sin fecha', value: counts.nodate, token: '--control', icon: CircleDashed },
  ];
  const toggleStatus = (key: string) => { window.clearTimeout(timers.current.status); setHoverStatus(null); setStatus((current) => (current === key ? 'all' : (key as DashStatus))); };
  const hasFilter = status !== 'all' || courseId !== '';
  const enter = (delay: number) => ({ initial: reduce ? false : { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay, ease } });

  return (
    <div className={styles.page}>
      {passwordChanged && <div className={`${page.notice} ${page.noticeSuccess}`} role="status"><CheckCircle2 size={20} aria-hidden="true" />Contraseña guardada. Tu cuenta ya está lista.</div>}
      {account?.linkStatus === 'needs_reauth' && <div className={`${page.notice} ${page.noticeWarning}`} role="status"><TriangleAlert size={20} aria-hidden="true" />Tu cuenta universitaria necesita reautenticarse. Los datos mostrados son de la última importación.</div>}

      <motion.header className={styles.today} {...enter(0)}>
        <div>
          <h1 className={styles.todayTitle}>{greeting()}{firstName ? `, ${firstName}` : ''}.</h1>
          <p className={styles.todayDate}>{formatLongDay(new Date())}</p>
        </div>
      </motion.header>

      {ribbonTerm && (
        <motion.div className={styles.deck} {...enter(0.08)}>
          <CourseTabs courses={data.courses} value={courseId} onChange={chooseCourse} onPreview={previewCourse} />
          <TermRibbon term={ribbonTerm} activities={all} onOpen={setSelected} status={status} preview={hoverStatus} onStatus={toggleStatus as (s: DashStatus) => void} onPreview={previewStatus} courseId={viewCourse} />
        </motion.div>
      )}

      <div className={styles.grid}>
        <Cell className={styles.cal} delay={0.16} eager>
          <Card padded={false} className={styles.card} aria-labelledby="cal-title"><CalendarCard onOpen={setSelected} byId={byId} status={viewStatus} courseId={viewCourse} scope={<ScopeTag course={course} status={viewStatus} />} /></Card>
        </Cell>

        <Cell className={styles.est} delay={0.22}>
          <Card padded={false} className={styles.card} aria-labelledby="est-title">
            <div className={styles.cardHead}>
              <div><div className={styles.titleRow}><h2 id="est-title" className={styles.cardTitle}>Estado de tus evaluables</h2><ScopeTag course={course} /></div><p className={styles.cardSub}>Toca un estado para filtrar.</p></div>
            </div>
            {loaded ? <StatusDonut parts={pieParts} total={base.length} centerLabel="evaluables" selected={viewStatus === 'all' || viewStatus === 'low' ? null : viewStatus} onSelect={toggleStatus} /> : <Skeleton height={220} radius={16} />}
          </Card>
        </Cell>

        <Cell className={styles.not} delay={0.28}>
          <Card padded={false} className={styles.card} aria-labelledby="not-title">
            <div className={styles.cardHead}>
              <div><div className={styles.titleRow}><h2 id="not-title" className={styles.cardTitle}>Últimas notas</h2><ScopeTag course={course} status={viewStatus === 'low' || viewStatus === 'graded' ? viewStatus : undefined} /></div><p className={styles.cardSub}>{viewStatus === 'low' ? 'Solo las notas bajas.' : `Las ${narrow ? 6 : 10} más recientes. Toca una columna para abrirla.`}</p></div>
              <div className={styles.stats}>
                {average !== null && <motion.span className={styles.stat} title="Promedio simple de las notas publicadas. No es un promedio oficial ni el CUM." initial={reduce ? false : { opacity: 0, y: 10, scale: 0.9 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.15, ease }}><Sigma size={14} aria-hidden="true" />Promedio simple <b>{average} %</b><i>no oficial</i></motion.span>}
                {best !== null && <motion.span className={cx(styles.stat, styles.statBest)} initial={reduce ? false : { opacity: 0, y: 10, scale: 0.9 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.25, ease }}><Trophy size={14} aria-hidden="true" />Mejor <b>{best} %</b></motion.span>}
              </div>
            </div>
            <div className={styles.bands} role="group" aria-label="Resaltar por rango de nota">
              {BANDS.map((item) => (
                <button key={item.key} type="button" className={cx(styles.bandBtn, styles[`band_${item.key}`])} aria-pressed={band === item.key} onClick={() => setBand((current) => (current === item.key ? null : item.key))}>
                  <i />{item.label}<span className="tabular">{bandCounts[item.key]}</span>
                </button>
              ))}
            </div>
            {!loaded ? <Skeleton height={250} radius={16} /> : gradePoints.length > 0 ? <div className={styles.swap}><GradesColumns fill data={gradePoints} band={band} onSelect={setSelected} /></div>
              : <EmptyState icon={<CheckCircle2 />} title={hasFilter ? 'Sin notas con estos filtros' : 'Todavía no hay calificaciones publicadas'}>{hasFilter ? 'Prueba quitando algún filtro.' : 'Las notas aparecerán aquí cuando tus docentes las publiquen.'}</EmptyState>}
          </Card>
        </Cell>
      </div>

      <CourseDial courses={data.courses} value={courseId} onChange={chooseCourse} />
      <ActivityDetail activityId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
