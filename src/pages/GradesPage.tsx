import {
  ArrowDownWideNarrow, ArrowUpRight, Award, CalendarArrowDown, CalendarArrowUp, CheckCircle2, ClipboardList, Medal, Sigma, Sparkles, TrendingDown, TrendingUp, Trophy, TriangleAlert,
} from 'lucide-react';
import { AnimatePresence, animate, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGrades } from '../api/hooks';
import type { Activity } from '../api/types';
import { ActivityDetail } from '../components/ActivityDetail';
import { ScoresChart, TrendChart } from '../components/Charts';
import { ActivityCard } from '../components/CourseActivities';
import { FilterMenu } from '../components/FilterKit';
import { Button, Card, EmptyState, Skeleton } from '../components/ui';
import { tintColor } from '../lib/colors';
import { courseIcon } from '../lib/courseIcon';
import { courseTitle, formatScore, formatShortDate } from '../lib/format';
import { useReducedMotion } from '../lib/motion';
import { tintFor } from '../lib/tint';
import styles from './Grades.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');
const isGraded = (a: Activity) => !a.isCalculated && a.countsInGrade !== false && (a.isAutoZero || (a.status === 'GRADED' && a.score !== null));
const pctOf = (a: Activity) => (Number(a.pointsPossible) > 0 ? Math.min(100, (Number(a.score) / Number(a.pointsPossible)) * 100) : null);
const bandVar = (pct: number) => (pct < 60 ? 'var(--bad)' : pct < 80 ? 'var(--warn)' : 'var(--ok)');

type Sort = 'recent' | 'oldest' | 'best' | 'worst';

/** Número que cuenta hasta su valor al entrar o cambiar de materia. */
function Count({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const last = useRef(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { setShown(value); last.current = value; return; }
    const controls = animate(last.current, value, { duration: 0.8, ease, onUpdate: (v) => { last.current = v; setShown(v); } });
    return () => controls.stop();
  }, [value, reduce]);
  return <>{decimals > 0 ? shown.toFixed(decimals) : Math.round(shown)}</>;
}

/** Anillo de los puntos acumulados sobre los posibles de lo ya calificado (suma no oficial). */
function PointsRing({ pct, color }: { pct: number | null; color: string }) {
  const reduce = useReducedMotion();
  const R = 38; const C = 2 * Math.PI * R;
  return (
    <span className={styles.ring} aria-hidden="true">
      <svg viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={R} fill="none" stroke="color-mix(in srgb, var(--text) 8%, transparent)" strokeWidth="9" />
        <motion.circle cx="45" cy="45" r={R} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" transform="rotate(-90 45 45)" strokeDasharray={C}
          initial={reduce ? false : { strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - (pct ?? 0) / 100) }} transition={{ duration: 1.1, delay: 0.25, ease }} />
      </svg>
      <strong className="tabular">{pct === null ? '—' : <><Count value={pct} />%</>}</strong>
    </span>
  );
}

function Kpi({ icon: Icon, label, value, note, color, index, onClick, wide }: {
  icon: typeof Award; label: string; value: React.ReactNode; note?: React.ReactNode; color: string; index: number; onClick?: () => void; wide?: boolean;
}) {
  const reduce = useReducedMotion();
  const body = (
    <>
      <span className={styles.kpiIcon}><Icon size={20} aria-hidden="true" /></span>
      <span className={styles.kpiText}><small>{label}</small><strong>{value}</strong>{note && <em>{note}</em>}</span>
      {onClick && <ArrowUpRight className={styles.kpiGo} size={16} aria-hidden="true" />}
    </>
  );
  return (
    <motion.li className={wide ? styles.kpiWide : undefined} initial={reduce ? false : { opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, delay: 0.12 + index * 0.06, ease }}>
      {onClick
        ? <button type="button" className={styles.kpi} style={{ ['--k' as string]: color }} onClick={onClick}>{body}</button>
        : <div className={styles.kpi} style={{ ['--k' as string]: color }}>{body}</div>}
    </motion.li>
  );
}

export function GradesPage() {
  const { data, isPending, error, refetch } = useGrades();
  const [params, setParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('recent');
  const reduce = useReducedMotion();
  const pendingRef = useRef<HTMLDivElement>(null);
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
  const worst = bars.slice().sort((x, y) => x.pct - y.pct)[0];
  const pointsPct = points.max > 0 ? (points.got / points.max) * 100 : null;
  const tint = course ? tintFor(course.id) : tintFor('');
  const color = tintColor(tint.index);
  const Icon = courseIcon(course?.title ?? '');
  const bandCount = bars.reduce((acc, b) => { acc[b.pct < 60 ? 'bad' : b.pct < 80 ? 'warn' : 'ok'] += 1; return acc; }, { ok: 0, warn: 0, bad: 0 });
  const delta = trend.length > 1 ? trend[trend.length - 1]!.pct - trend[0]!.pct : null;

  const rows = useMemo(() => {
    const dated = graded.slice().sort((a, b) => (Date.parse(a.gradedAt ?? a.dueAt ?? '') || 0) - (Date.parse(b.gradedAt ?? b.dueAt ?? '') || 0));
    if (sort === 'oldest') return dated;
    if (sort === 'recent') return dated.reverse();
    const score = (a: Activity) => pctOf(a) ?? 0;
    return dated.sort((x, y) => (sort === 'best' ? score(y) - score(x) : score(x) - score(y)));
  }, [graded, sort]);

  const onTabsKey = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const at = courses.findIndex((c) => c.id === courseId);
    const next = courses[(at + (event.key === 'ArrowRight' ? 1 : -1) + courses.length) % courses.length];
    if (next) { setParams({ materia: next.id }, { replace: true }); (event.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-id="${next.id}"]`)?.focus(); }
  };

  return (
    <div>
      <header className={styles.head}>
        <motion.div initial={reduce ? false : { opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease }}>
          <span className={styles.eyebrow}><Award size={14} aria-hidden="true" />Tus notas publicadas</span>
          <h1 className={styles.title}>Calificaciones</h1>
          <p className={styles.lede}>Materia por materia, como gráficas. Toca una barra, un punto o una tarjeta para abrir la evaluación. Academic Hub no calcula promedios oficiales ni CUM.</p>
        </motion.div>
      </header>

      {isPending && <div className={styles.stack}><Skeleton height={72} radius={24} /><Skeleton height={380} radius={28} /></div>}
      {error && <Card><EmptyState tone="danger" icon={<TriangleAlert />} title="No pudimos cargar tus calificaciones"
        action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}>{error.message}</EmptyState></Card>}
      {data && courses.length === 0 && <Card><EmptyState icon={<CheckCircle2 />} title="Todavía no hay columnas de calificación">Aparecerán cuando se importen tus materias.</EmptyState></Card>}

      {course && (
        <>
          {/* Selector de materia: una ficha por materia con su avance de notas */}
          <div className={styles.courseTabs} role="tablist" aria-label="Materia" onKeyDown={onTabsKey}>
            {courses.map((c, i) => {
              const t = tintFor(c.id); const I = courseIcon(c.title); const g = c.items.filter(isGraded).length; const d = c.items.filter((a) => !a.isCalculated).length;
              const on = c.id === courseId;
              return (
                <motion.button key={c.id} type="button" role="tab" data-id={c.id} aria-selected={on} tabIndex={on ? 0 : -1} className={styles.courseTab} style={{ ['--c' as string]: t.fg, ['--cbg' as string]: t.bg }}
                  initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 + i * 0.05, ease }}
                  onClick={() => setParams({ materia: c.id }, { replace: true })}>
                  {on && <motion.span layoutId="grades-tab" className={styles.courseTabBg} transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                  <span className={styles.courseTabIcon}><I size={19} aria-hidden="true" /></span>
                  <span className={styles.courseTabText}>
                    {c.title}
                    <small><span className="tabular">{g}</span> de <span className="tabular">{d}</span> con nota</small>
                    <i aria-hidden="true"><b style={{ width: `${d > 0 ? (g / d) * 100 : 0}%` }} /></i>
                  </span>
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={course.id} className={styles.stack} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }} transition={{ duration: 0.3, ease }}>
              <section className={styles.hero} style={{ ['--c' as string]: tint.fg, ['--cbg' as string]: tint.bg }} aria-label={course.title}>
                <Icon className={styles.mark} size={220} strokeWidth={1} aria-hidden="true" />
                <div className={styles.heroTop}>
                  <motion.span className={styles.heroIcon} aria-hidden="true" initial={reduce ? false : { scale: 0.4, rotate: -24, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.1 }}><Icon size={32} /></motion.span>
                  <div className={styles.heroText}>
                    <h2>{course.title}</h2>
                    <p>{graded.length === 0 ? 'Sin notas publicadas todavía.' : <><span className="tabular">{graded.length}</span> {graded.length === 1 ? 'nota publicada' : 'notas publicadas'} de <span className="tabular">{graded.length + ungraded.length}</span> evaluaciones</>}</p>
                  </div>
                  {pointsPct !== null && <PointsRing pct={pointsPct} color={color} />}
                </div>
                <ul className={styles.kpis}>
                  <Kpi index={0} icon={ClipboardList} color={color} label="Puntos acumulados" value={<><span className="tabular"><Count value={points.got} decimals={Number.isInteger(points.got) ? 0 : 1} /></span><small> / {formatScore(points.max)}</small></>} note="suma no oficial" />
                  {best && <Kpi index={1} icon={Medal} color="var(--ok)" label="Mejor nota" value={<span className="tabular">{Math.round(best.pct)} %</span>} note={best.name} onClick={() => setSelectedId(best.id)} />}
                  {worst && worst.id !== best?.id && <Kpi index={2} icon={TrendingDown} color={bandVar(worst.pct)} label="Nota más baja" value={<span className="tabular">{Math.round(worst.pct)} %</span>} note={worst.name} onClick={() => setSelectedId(worst.id)} />}
                  <Kpi index={3} icon={Sparkles} color="var(--st-pending)" label="Sin calificar" value={<span className="tabular"><Count value={ungraded.length} /></span>} note={ungraded.length > 0 ? 'ver cuáles' : 'todo al día'}
                    onClick={ungraded.length > 0 ? () => pendingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) : undefined} />
                </ul>
              </section>

              {bars.length > 0 ? (
                <div className={styles.charts}>
                  <motion.section aria-label="Notas por evaluación" className={styles.chartCard} initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25, ease }}>
                    <header className={styles.chartHead}>
                      <span className={styles.chartIcon}><Sigma size={18} aria-hidden="true" /></span>
                      <div><h3>Porcentaje obtenido por evaluación</h3><p>La línea roja marca el 60 %.</p></div>
                    </header>
                    <ScoresChart data={bars} color={color} onSelect={setSelectedId} />
                    <div className={styles.chartFoot}>
                      {([['ok', 'buenas', bandCount.ok], ['warn', 'regulares', bandCount.warn], ['bad', 'bajas', bandCount.bad]] as const).map(([k, name, n]) => n > 0 && (
                        <span key={k} style={{ ['--s' as string]: `var(--${k})` }}><i /><b className="tabular">{n}</b> {n === 1 ? name.replace(/s$/, '') : name}</span>
                      ))}
                    </div>
                  </motion.section>
                  <motion.section aria-label="Tendencia" className={styles.chartCard} initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.33, ease }}>
                    <header className={styles.chartHead}>
                      <span className={styles.chartIcon}><Award size={18} aria-hidden="true" /></span>
                      <div><h3>Cómo van tus notas en el tiempo</h3><p>Cada punto es una nota, por fecha de calificación.</p></div>
                    </header>
                    {trend.length > 1 ? <TrendChart data={trend} color={color} /> : <p className={styles.note}>Con dos o más notas fechadas verás la tendencia aquí.</p>}
                    {trend.length > 1 && delta !== null && (
                      <div className={styles.chartFoot}>
                        <span style={{ ['--s' as string]: 'var(--muted)' }}>Primera <b className="tabular">{Math.round(trend[0]!.pct)} %</b></span>
                        <span style={{ ['--s' as string]: 'var(--muted)' }}>Última <b className="tabular">{Math.round(trend[trend.length - 1]!.pct)} %</b></span>
                        <span style={{ ['--s' as string]: delta < 0 ? 'var(--bad)' : 'var(--ok)' }}>
                          {delta < 0 ? <TrendingDown size={14} aria-hidden="true" /> : <TrendingUp size={14} aria-hidden="true" />}
                          {delta === 0 ? 'Sin cambio' : `${delta > 0 ? '+' : ''}${Math.round(delta)} pts desde la primera`}
                        </span>
                      </div>
                    )}
                  </motion.section>
                </div>
              ) : <Card><EmptyState icon={<CheckCircle2 />} title="Todavía no hay notas publicadas">Las notas aparecerán aquí cuando tus docentes las publiquen.</EmptyState></Card>}

              {rows.length > 0 && (
                <section className={styles.rowsBox} aria-label="Todas tus notas">
                  <div className={styles.rowsHead}>
                    <h3>Todas tus notas <b className="tabular">{rows.length}</b></h3>
                    <FilterMenu<Sort> label="Ordenar" icon={ArrowDownWideNarrow} compact tipEnd value={sort} onChange={setSort} neutral="recent" options={[
                      { value: 'recent', label: 'Más recientes primero', icon: CalendarArrowDown },
                      { value: 'oldest', label: 'Más antiguas primero', icon: CalendarArrowUp },
                      { value: 'best', label: 'Mejor nota primero', icon: Trophy, color: 'var(--ok)' },
                      { value: 'worst', label: 'Menor nota primero', icon: TrendingDown, color: 'var(--bad)' },
                    ]} />
                  </div>
                  <ul className={styles.rows}>
                    <AnimatePresence mode="popLayout">
                      {rows.map((a, i) => <ActivityCard key={a.id} activity={a} index={i} query="" variant="grade" onSelect={(x) => setSelectedId(x.id)} />)}
                    </AnimatePresence>
                  </ul>
                </section>
              )}

              {(ungraded.length > 0 || calculated.length > 0) && (
                <div ref={pendingRef} className={styles.pending}>
                  {ungraded.length > 0 && (
                    <motion.div className={styles.pendingCard} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1, ease }}>
                      <h3 className={styles.pendingTitle}><span><Sparkles size={16} aria-hidden="true" /></span>Sin calificar <b className="tabular">{ungraded.length}</b></h3>
                      <div className={styles.chips}>{ungraded.map((a) => <button key={a.id} type="button" className={styles.chip} onClick={() => setSelectedId(a.id)}>{a.effectiveName ?? a.name}{a.pointsPossible && <small>/{formatScore(a.pointsPossible)}</small>}</button>)}</div>
                    </motion.div>
                  )}
                  {calculated.length > 0 && (
                    <motion.div className={styles.pendingCard} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.16, ease }}>
                      <h3 className={styles.pendingTitle}><span><Sigma size={16} aria-hidden="true" /></span>Columnas calculadas <b className="tabular">{calculated.length}</b></h3>
                      <p className={styles.pendingNote}>Las calcula Blackboard con una fórmula del docente; no son una nota final oficial.</p>
                      <div className={styles.chips}>{calculated.map((a) => <button key={a.id} type="button" className={cx(styles.chip, styles.chipCalc)} onClick={() => setSelectedId(a.id)}>{a.effectiveName ?? a.name}{a.score !== null && <strong>{formatScore(a.score)}</strong>}</button>)}</div>
                    </motion.div>
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
