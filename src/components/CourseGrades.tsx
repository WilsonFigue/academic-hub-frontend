import { ArrowDownWideNarrow, BarChart3, CalendarArrowDown, CalendarArrowUp, ChartSpline, Medal, TrendingDown, Trophy } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { Activity } from '../api/types';
import { useReducedMotion } from '../lib/motion';
import { LOW_THRESHOLD, averagePct, pctOf } from '../lib/dashFilters';
import { formatScore } from '../lib/format';
import { ActivityCard } from './CourseActivities';
import { FilterMenu, SegTabs } from './FilterKit';
import styles from './CourseGrades.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');
const bandVar = (pct: number) => (pct < LOW_THRESHOLD ? 'var(--bad)' : pct < 80 ? 'var(--warn)' : 'var(--ok)');
type Band = 'all' | 'good' | 'mid' | 'low';
type Sort = 'recent' | 'oldest' | 'best' | 'worst';
const bandOf = (pct: number): Exclude<Band, 'all'> => (pct < LOW_THRESHOLD ? 'low' : pct < 80 ? 'mid' : 'good');
const BANDS: Array<{ id: Exclude<Band, 'all'>; label: string; color: string }> = [
  { id: 'good', label: 'Buenas', color: 'var(--ok)' }, { id: 'mid', label: 'Regulares', color: 'var(--warn)' }, { id: 'low', label: 'Bajas', color: 'var(--bad)' },
];

/** Anillo grande con el promedio de la materia. */
function AverageRing({ value }: { value: number | null }) {
  const reduce = useReducedMotion();
  const R = 54; const C = 2 * Math.PI * R;
  const color = value === null ? 'var(--control)' : bandVar(value);
  return (
    <div className={styles.ring}>
      <svg viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r={R} fill="none" stroke="color-mix(in srgb, var(--text) 8%, transparent)" strokeWidth="14" />
        <motion.circle cx="70" cy="70" r={R} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" transform="rotate(-90 70 70)" strokeDasharray={C}
          initial={reduce ? false : { strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - (value ?? 0) / 100) }} transition={{ duration: 1.2, delay: 0.2, ease }} />
      </svg>
      <div><strong className="tabular">{value === null ? '—' : `${Math.round(value)}%`}</strong><span>promedio</span></div>
    </div>
  );
}

/** Curva de notas: línea suave con área, puntos por rango y la misma interacción que las columnas. */
function LineTrend({ items, hover, band, reduce, onHover, onSelect }: {
  items: Activity[]; hover: string | null; band: Band; reduce: boolean; onHover: (id: string | null) => void; onSelect: (activity: Activity) => void;
}) {
  const n = items.length;
  const pts = items.map((a, i) => ({ a, p: pctOf(a) ?? 0, x: ((i + 0.5) / n) * 100 }));
  const y = (p: number) => 100 - Math.min(100, Math.max(0, p));
  const line = pts.map((q, i) => {
    if (i === 0) return `M ${q.x} ${y(q.p)}`;
    const m = (pts[i - 1]!.x + q.x) / 2;
    return `C ${m} ${y(pts[i - 1]!.p)} ${m} ${y(q.p)} ${q.x} ${y(q.p)}`;
  }).join(' ');
  const area = `${line} L ${pts[n - 1]!.x} 100 L ${pts[0]!.x} 100 Z`;
  return (
    <div className={styles.plot}>
      <motion.svg className={styles.curve} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"
        initial={reduce ? false : { clipPath: 'inset(-8% 100% -8% 0)' }} animate={{ clipPath: 'inset(-8% -2% -8% 0)' }} transition={{ duration: 1.3, ease }}>
        <defs>
          <linearGradient id="grades-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path d={area} fill="url(#grades-area)" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.6 }} />
        <motion.path d={line} fill="none" stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </motion.svg>
      {pts.map(({ a, p, x }, i) => {
        const dim = (band !== 'all' && bandOf(p) !== band) || (hover !== null && hover !== a.id);
        return (
          <button key={a.id} type="button" className={cx(styles.dot, dim && styles.colDim, hover === a.id && styles.dotOn)} style={{ left: `${x}%`, top: `${y(p)}%`, ['--b' as string]: bandVar(p) }}
            onClick={() => onSelect(a)} onPointerEnter={() => onHover(a.id)} onFocus={() => onHover(a.id)} onBlur={() => onHover(null)}
            aria-label={`${a.effectiveName ?? a.name}: ${Math.round(p)} por ciento`}>
            <motion.i initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.3 + i * (1 / n) * 0.9 }} />
            <span aria-hidden="true">{Math.round(p)}%</span>
          </button>
        );
      })}
    </div>
  );
}

/** Pestaña Calificaciones: resumen con anillo y columnas, filtro por rango, orden y tarjetas con barra de nota. */
export function CourseGrades({ activities, onSelect }: { activities: Activity[]; onSelect: (activity: Activity) => void }) {
  const reduce = useReducedMotion();
  const [band, setBand] = useState<Band>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [hover, setHover] = useState<string | null>(null);
  const [mode, setMode] = useState<'line' | 'bars'>('line');

  const calculated = activities.filter((a) => a.isCalculated && a.score !== null);
  const rows = useMemo(() => activities.filter((a) => !a.isCalculated && a.countsInGrade !== false && (a.score !== null || a.isAutoZero)), [activities]);
  const byDate = useMemo(() => rows.slice().sort((a, b) => (a.dueAt ? Date.parse(a.dueAt) : 0) - (b.dueAt ? Date.parse(b.dueAt) : 0)), [rows]);
  const avg = averagePct(rows);
  const counts = { good: 0, mid: 0, low: 0 };
  rows.forEach((a) => { const p = pctOf(a); if (p !== null) counts[bandOf(p)] += 1; });
  const withPct = rows.map((a) => ({ a, p: pctOf(a) })).filter((x): x is { a: Activity; p: number } => x.p !== null);
  const best = withPct.slice().sort((x, y) => y.p - x.p)[0];
  const worst = withPct.slice().sort((x, y) => x.p - y.p)[0];

  const list = byDate.filter((a) => { const p = pctOf(a); return band === 'all' || (p !== null && bandOf(p) === band); });
  const score = (a: Activity) => pctOf(a) ?? 0;
  const shown = sort === 'recent' ? list.slice().reverse() : sort === 'oldest' ? list : list.slice().sort((x, y) => (sort === 'best' ? score(y) - score(x) : score(x) - score(y)));
  const hovered = withPct.find((x) => x.a.id === hover);

  return (
    <div>
      <div className={styles.summary}>
        <AverageRing value={avg} />
        <div className={styles.facts}>
          <div className={styles.split} role="group" aria-label="Filtrar por rango de nota">
            {BANDS.map((b) => (
              <button key={b.id} type="button" className={cx(styles.band, band === b.id && styles.bandOn)} style={{ ['--b' as string]: b.color }} aria-pressed={band === b.id} onClick={() => setBand(band === b.id ? 'all' : b.id)} disabled={counts[b.id] === 0}>
                <strong className="tabular">{counts[b.id]}</strong><span>{b.label}</span>
                <i style={{ ['--w' as string]: `${rows.length ? (counts[b.id] / rows.length) * 100 : 0}%` }} />
              </button>
            ))}
          </div>
          <div className={styles.extremes}>
            {best && <button type="button" onClick={() => onSelect(best.a)} style={{ ['--b' as string]: 'var(--ok)' }}><Medal size={18} aria-hidden="true" /><span>Mejor nota<b>{best.a.effectiveName ?? best.a.name}</b></span><strong className="tabular">{Math.round(best.p)}%</strong></button>}
            {worst && worst !== best && <button type="button" onClick={() => onSelect(worst.a)} style={{ ['--b' as string]: bandVar(worst.p) }}><TrendingDown size={18} aria-hidden="true" /><span>Nota más baja<b>{worst.a.effectiveName ?? worst.a.name}</b></span><strong className="tabular">{Math.round(worst.p)}%</strong></button>}
          </div>
        </div>
      </div>

      {byDate.length > 1 && (
        <div className={styles.chart}>
          <div className={styles.chartHead}>
            <div className={styles.chartTitle}>
              <h3>Cómo te ha ido, nota por nota</h3>
              <SegTabs<'line' | 'bars'> label="Tipo de gráfico" iconOnly value={mode} onChange={setMode} options={[
                { value: 'line', label: 'Líneas', icon: ChartSpline },
                { value: 'bars', label: 'Barras', icon: BarChart3 },
              ]} />
            </div>
            <AnimatePresence mode="wait">
              <motion.span key={hovered?.a.id ?? 'hint'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}>
                {hovered ? <><b>{hovered.a.effectiveName ?? hovered.a.name}</b> · {formatScore(hovered.a.score ?? 0)} / {formatScore(hovered.a.pointsPossible)}</> : `Toca ${mode === 'line' ? 'un punto' : 'una columna'} para ver el detalle`}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className={cx(styles.cols, mode === 'line' && styles.colsLine)} onPointerLeave={() => setHover(null)}>
            <span className={styles.line} style={{ bottom: `${LOW_THRESHOLD}%` }}><i>{LOW_THRESHOLD}%</i></span>
            <span className={styles.line} style={{ bottom: '80%' }}><i>80%</i></span>
            {mode === 'line' ? <LineTrend items={byDate} hover={hover} band={band} reduce={reduce} onHover={setHover} onSelect={onSelect} /> : byDate.map((a, i) => {
              const p = pctOf(a) ?? 0;
              const dim = (band !== 'all' && bandOf(p) !== band) || (hover !== null && hover !== a.id);
              return (
                <button key={a.id} type="button" className={cx(styles.col, dim && styles.colDim)} onClick={() => onSelect(a)} onPointerEnter={() => setHover(a.id)} onFocus={() => setHover(a.id)} onBlur={() => setHover(null)}
                  aria-label={`${a.effectiveName ?? a.name}: ${Math.round(p)} por ciento`}>
                  <motion.i style={{ background: `linear-gradient(180deg, ${bandVar(p)}, color-mix(in srgb, ${bandVar(p)} 62%, white))` }}
                    initial={reduce ? false : { height: 0 }} animate={{ height: `${Math.max(p, 3)}%` }} transition={{ duration: 0.8, delay: i * 0.05, ease }} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {calculated.length > 0 && (
        <div className={styles.calc}>
          {calculated.map((a) => (
            <button key={a.id} type="button" onClick={() => onSelect(a)}>
              <span>{a.effectiveName ?? a.name}</span><strong className="tabular">{formatScore(a.score)}{a.pointsPossible !== null && <small> / {formatScore(a.pointsPossible)}</small>}</strong>
            </button>
          ))}
        </div>
      )}

      <div className={styles.listHead}>
        <h3>Todas tus notas <b className="tabular">{shown.length}</b></h3>
        <FilterMenu<Sort> label="Ordenar" icon={ArrowDownWideNarrow} value={sort} onChange={setSort} neutral="recent" options={[
          { value: 'recent', label: 'Más recientes primero', icon: CalendarArrowDown },
          { value: 'oldest', label: 'Más antiguas primero', icon: CalendarArrowUp },
          { value: 'best', label: 'Mejor nota primero', icon: Trophy, color: 'var(--ok)' },
          { value: 'worst', label: 'Menor nota primero', icon: TrendingDown, color: 'var(--bad)' },
        ]} />
      </div>
      <ul className={styles.list}>
        <AnimatePresence mode="popLayout">
          {shown.map((activity, index) => <ActivityCard key={activity.id} activity={activity} index={index} query="" variant="grade" onSelect={onSelect} />)}
        </AnimatePresence>
      </ul>
    </div>
  );
}
