import { Award, CheckCircle2, Sigma, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGrades } from '../api/hooks';
import type { Activity } from '../api/types';
import { ActivityDetail } from '../components/ActivityDetail';
import { ScoresChart, TrendChart } from '../components/Charts';
import { Button, Card, EmptyState, Skeleton } from '../components/ui';
import { tintColor } from '../lib/colors';
import { courseIcon } from '../lib/courseIcon';
import { courseTitle, formatScore, formatShortDate } from '../lib/format';
import { tintFor } from '../lib/tint';
import styles from './Grades.module.css';

const isGraded = (a: Activity) => !a.isCalculated && (a.isAutoZero || (a.status === 'GRADED' && a.score !== null));
const pctOf = (a: Activity) => (Number(a.pointsPossible) > 0 ? Math.min(100, (Number(a.score) / Number(a.pointsPossible)) * 100) : null);

export function GradesPage() {
  const { data, isPending, error, refetch } = useGrades();
  const [params, setParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const all = data ?? [];

  const courses = useMemo(() => {
    const map = new Map<string, { id: string; title: string; items: Activity[] }>();
    for (const a of all) {
      const c = map.get(a.courseId) ?? { id: a.courseId, title: courseTitle(a.courseName), items: [] };
      c.items.push(a); map.set(a.courseId, c);
    }
    return [...map.values()].sort((x, y) => x.title.localeCompare(y.title, 'es'));
  }, [all]);
  const courseId = params.get('materia') && courses.some((c) => c.id === params.get('materia')) ? params.get('materia')! : courses[0]?.id ?? '';
  const course = courses.find((c) => c.id === courseId);

  const graded = (course?.items ?? []).filter(isGraded).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const ungraded = (course?.items ?? []).filter((a) => !a.isCalculated && !isGraded(a));
  const calculated = (course?.items ?? []).filter((a) => a.isCalculated);
  const bars = graded.filter((a) => pctOf(a) !== null).map((a) => ({ id: a.id, name: a.effectiveName ?? a.name, pct: pctOf(a)!, score: formatScore(a.score), max: formatScore(a.pointsPossible) }));
  const trend = graded.filter((a) => pctOf(a) !== null && (a.gradedAt ?? a.dueAt)).map((a) => ({ date: a.gradedAt ?? a.dueAt!, label: formatShortDate(a.gradedAt ?? a.dueAt!), pct: pctOf(a)!, name: a.effectiveName ?? a.name }))
    .sort((x, y) => Date.parse(x.date) - Date.parse(y.date));
  const points = graded.reduce((acc, a) => ({ got: acc.got + (Number(a.score) || 0), max: acc.max + (Number(a.pointsPossible) || 0) }), { got: 0, max: 0 });
  const best = bars.slice().sort((x, y) => y.pct - x.pct)[0];
  const tint = course ? tintFor(course.id) : tintFor('');
  const color = tintColor(tint.index);
  const Icon = courseIcon(course?.title ?? '');

  return (
    <div>
      <header className={styles.head}>
        <h1 className={styles.title}>Calificaciones</h1>
        <p className={styles.lede}>Tus notas publicadas, materia por materia, como gráficas. Toca una barra para abrir la evaluación. Academic Hub no calcula promedios oficiales ni CUM.</p>
      </header>

      {isPending && <div className={styles.stack}><Skeleton height={72} radius={20} /><Skeleton height={380} radius={24} /></div>}
      {error && <Card><EmptyState tone="danger" icon={<TriangleAlert />} title="No pudimos cargar tus calificaciones"
        action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}>{error.message}</EmptyState></Card>}
      {data && courses.length === 0 && <Card><EmptyState icon={<CheckCircle2 />} title="Todavía no hay columnas de calificación">Aparecerán cuando se importen tus materias.</EmptyState></Card>}

      {course && (
        <>
          {/* Selector de materia: fichas con icono, una por materia */}
          <div className={styles.courseTabs} role="tablist" aria-label="Materia">
            {courses.map((c) => {
              const t = tintFor(c.id); const I = courseIcon(c.title); const g = c.items.filter(isGraded).length; const d = c.items.filter((a) => !a.isCalculated).length;
              return (
                <button key={c.id} type="button" role="tab" aria-selected={c.id === courseId} className={styles.courseTab} style={{ ['--c' as string]: t.fg, ['--cbg' as string]: t.bg }}
                  onClick={() => setParams({ materia: c.id }, { replace: true })}>
                  {c.id === courseId && <motion.span layoutId="grades-tab" className={styles.courseTabBg} transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                  <span className={styles.courseTabIcon}><I size={18} aria-hidden="true" /></span>
                  <span className={styles.courseTabText}>{c.title}<small><span className="tabular">{g}</span> de <span className="tabular">{d}</span> con nota</small></span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={course.id} className={styles.stack} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
              <section className={styles.hero} style={{ ['--c' as string]: tint.fg, ['--cbg' as string]: tint.bg }} aria-label={course.title}>
                <span className={styles.heroIcon}><Icon size={28} aria-hidden="true" /></span>
                <div className={styles.heroText}>
                  <h2>{course.title}</h2>
                  <p>{graded.length === 0 ? 'Sin notas publicadas todavía.' : <><span className="tabular">{graded.length}</span> {graded.length === 1 ? 'nota publicada' : 'notas publicadas'}{points.max > 0 && <> · <span className="tabular">{formatScore(points.got)} / {formatScore(points.max)}</span> puntos acumulados <em>(suma no oficial)</em></>}</>}</p>
                </div>
                {best && <span className={styles.heroBest}><Award size={16} aria-hidden="true" />Mejor: {Math.round(best.pct)} % · {best.name}</span>}
              </section>

              {bars.length > 0 ? (
                <div className={styles.charts}>
                  <Card aria-label="Notas por evaluación" className={styles.chartCard}>
                    <h3 className={styles.chartTitle}><Sigma size={16} aria-hidden="true" />Porcentaje obtenido por evaluación</h3>
                    <ScoresChart data={bars} color={color} onSelect={setSelectedId} />
                  </Card>
                  <Card aria-label="Tendencia" className={styles.chartCard}>
                    <h3 className={styles.chartTitle}><Award size={16} aria-hidden="true" />Cómo van tus notas en el tiempo</h3>
                    {trend.length > 1 ? <TrendChart data={trend} color={color} /> : <p className={styles.note}>Con dos o más notas fechadas verás la tendencia aquí.</p>}
                  </Card>
                </div>
              ) : <Card><EmptyState icon={<CheckCircle2 />} title="Todavía no hay notas publicadas">Las notas aparecerán aquí cuando tus docentes las publiquen.</EmptyState></Card>}

              {(ungraded.length > 0 || calculated.length > 0) && (
                <div className={styles.pending}>
                  {ungraded.length > 0 && (
                    <div>
                      <h3 className={styles.pendingTitle}>Sin calificar <span className="tabular">{ungraded.length}</span></h3>
                      <div className={styles.chips}>{ungraded.map((a) => <button key={a.id} type="button" className={styles.chip} onClick={() => setSelectedId(a.id)}>{a.effectiveName ?? a.name}{a.pointsPossible && <small>/{formatScore(a.pointsPossible)}</small>}</button>)}</div>
                    </div>
                  )}
                  {calculated.length > 0 && (
                    <div>
                      <h3 className={styles.pendingTitle}>Columnas calculadas <span className="tabular">{calculated.length}</span></h3>
                      <div className={styles.chips}>{calculated.map((a) => <button key={a.id} type="button" className={`${styles.chip} ${styles.chipCalc}`} onClick={() => setSelectedId(a.id)}>{a.effectiveName ?? a.name}{a.score !== null && <strong>{formatScore(a.score)}</strong>}</button>)}</div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
      <ActivityDetail activityId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
