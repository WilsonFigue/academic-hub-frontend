import { CircleDashed, type LucideIcon } from 'lucide-react';
import { animate, motion, useInView } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import { useEffect, useRef, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, Cell, LabelList, Legend, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LOW_THRESHOLD } from '../lib/dashFilters';
import { cssColor } from '../lib/colors';
import { TIMEZONE } from '../lib/format';
import styles from './Charts.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const TIP = { contentStyle: { borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)', fontSize: 13, padding: '10px 14px' }, cursor: { fill: 'rgb(20 26 36 / 0.05)' } };
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

/** Altura que escala con el breakpoint (la página define --chart-scale: 1,3 en 4K, 0,9 en móvil). */
const sized = (px: number) => ({ height: `calc(${px}px * var(--chart-scale, 1))` });

export type Band = 'ok' | 'warn' | 'bad';
export const bandOf = (pct: number): Band => (pct < LOW_THRESHOLD ? 'bad' : pct < 80 ? 'warn' : 'ok');

/** Banda semántica de una nota en porcentaje. */
export function bandColor(pct: number): string {
  return cssColor(`--${bandOf(pct)}`);
}

export function bandLabel(pct: number): string {
  return pct < LOW_THRESHOLD ? 'Nota baja' : pct < 80 ? 'Regular' : 'Buena nota';
}

/** Número que se desliza hasta su nuevo valor (arranca en 0 la primera vez). */
function AnimatedNumber({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const last = useRef(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { setShown(value); last.current = value; return; }
    const controls = animate(last.current, value, { duration: 0.55, ease, onUpdate: (v) => { last.current = v; setShown(Math.round(v)); } });
    return () => controls.stop();
  }, [value, reduce]);
  return <>{shown}</>;
}

/** Carga por semana apilada por materia (vencimientos reales). */
export function WorkloadChart({ data, series, fill }: { data: Array<Record<string, number | string>>; series: Array<{ key: string; name: string; color: string }>; fill?: boolean }) {
  return (
    <div className={fill ? styles.chartFill : styles.chart} style={fill ? undefined : sized(230)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: -18 }} barCategoryGap="28%">
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 12, fill: cssColor('--muted') }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: cssColor('--faint') }} width={34} />
          <Tooltip {...TIP} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
          {series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.name} stackId="w" fill={s.color} radius={i === series.length - 1 ? [8, 8, 0, 0] : 0} isAnimationActive animationDuration={800} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type DonutPart = { key: string; name: string; value: number; token: string; icon: LucideIcon };

// Geometría del anillo (viewBox 200 × 200): cada rebanada es un arco de círculo con extremos redondeados.
const R = 74;
const W = 26;
const C = 2 * Math.PI * R;
const GAP = 4;
const MIN_ARC = 5;

/**
 * Pastel (anillo) propio en SVG. Cada rebanada dibuja su arco al entrar en pantalla y se transforma con suavidad cuando
 * cambian los filtros; pasar el mouse (o enfocar su fila) la engrosa y atenúa el resto; el centro cuenta hacia el nuevo
 * valor; un clic la elige como filtro (`selected` / `onSelect`).
 */
export function StatusDonut({ parts, total, centerLabel, selected, onSelect }: {
  parts: DonutPart[]; total: number; centerLabel: string; selected?: string | null; onSelect?: (key: string) => void;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const [hover, setHover] = useState<string | null>(null);
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    if (!inView) return;
    const timer = window.setTimeout(() => setIntro(false), 1300);
    return () => window.clearTimeout(timer);
  }, [inView]);

  const sum = parts.reduce((s, p) => s + p.value, 0);
  const focus = hover ?? selected ?? null;
  const current = focus ? parts.find((p) => p.key === focus) ?? null : null;
  const pct = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);
  let acc = 0;
  const arcs = parts.map((part) => {
    const frac = sum > 0 ? part.value / sum : 0;
    const start = acc;
    acc += frac;
    const single = frac > 0.999;
    return { part, frac, single, len: single ? C : Math.max(MIN_ARC, frac * C - GAP), pos: single ? 0 : start * C + GAP / 2 };
  });
  const drawn = arcs.filter((a) => a.frac > 0).length;

  return (
    <div className={styles.donutBox} ref={ref}>
      <div className={styles.donutWrap}>
        <div className={styles.donut} onMouseLeave={() => setHover(null)}>
          <svg viewBox="0 0 200 200" className={styles.donutSvg} aria-hidden="true">
            <circle cx="100" cy="100" r={R} fill="none" stroke={cssColor('--panel-row')} strokeWidth={W} />
            <g transform="rotate(-90 100 100)">
              {arcs.map(({ part, frac, single, len, pos }, index) => {
                const on = focus === part.key;
                const dim = focus !== null && !on;
                const visible = frac > 0;
                return (
                  <motion.circle key={part.key} cx="100" cy="100" r={R} fill="none" stroke={cssColor(part.token)} strokeLinecap="butt"
                    initial={reduce ? false : { strokeDasharray: `0.01 ${C}`, strokeDashoffset: -pos, strokeWidth: W, opacity: 0 }}
                    animate={{ strokeDasharray: `${inView || reduce ? len : 0.01} ${C}`, strokeDashoffset: -pos, strokeWidth: visible ? (on ? W + 8 : W) : 0, opacity: visible ? (dim ? 0.25 : 1) : 0 }}
                    transition={{ duration: intro ? 0.9 : 0.5, ease, delay: intro && inView ? 0.1 + index * 0.09 : 0 }}
                    style={{ cursor: onSelect && visible ? 'pointer' : 'default', pointerEvents: visible ? 'stroke' : 'none' }}
                    onMouseEnter={() => visible && setHover(part.key)} onClick={() => visible && onSelect?.(part.key)} />
                );
              })}
            </g>
          </svg>
          <div className={styles.donutCenter} aria-live="polite">
            <strong className="tabular"><AnimatedNumber value={current ? current.value : total} /></strong>
            <span>{current ? `${current.name} · ${pct(current.value)} %` : drawn === 0 ? 'sin evaluables' : centerLabel}</span>
          </div>
        </div>
        <ul className={styles.legend}>
          {parts.map((part, index) => {
            const Icon = part.icon;
            return (
              <motion.li key={part.key} initial={reduce ? false : { opacity: 0, x: -16 }} animate={inView || reduce ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }} transition={{ duration: 0.45, ease, delay: 0.2 + index * 0.07 }}>
                <button type="button" className={cx(styles.legendRow, focus === part.key && styles.legendActive, selected === part.key && styles.legendSelected)}
                  style={{ ['--c' as string]: `var(${part.token})` }} aria-pressed={selected === part.key} disabled={!onSelect}
                  onMouseEnter={() => part.value > 0 && setHover(part.key)} onMouseLeave={() => setHover(null)}
                  onFocus={() => part.value > 0 && setHover(part.key)} onBlur={() => setHover(null)} onClick={() => onSelect?.(part.key)}>
                  <span className={styles.legendIcon}><Icon size={15} aria-hidden="true" /></span>
                  <span className={styles.legendName}>{part.name}</span>
                  <strong className="tabular">{part.value}</strong>
                  <span className={styles.legendPct}>{pct(part.value)}%</span>
                  <span className={styles.legendBar} aria-hidden="true"><span style={{ width: `${pct(part.value)}%` }} /></span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export interface GradePoint { id: string; name: string; course: string; courseColor: string; pct: number; score: string; max: string; label: string; auto?: boolean }

function GradeTip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: GradePoint }> }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  const color = bandColor(p.pct);
  return (
    <div className={styles.tip}>
      <strong>{p.name}</strong>
      <span className={styles.tipCourse}><i style={{ background: p.courseColor }} />{p.course} · {p.label}</span>
      <span className={styles.tipScore} style={{ color }}>{p.score} / {p.max} · {Math.round(p.pct)} % · {p.auto ? 'Cero por vencimiento' : bandLabel(p.pct)}</span>
    </div>
  );
}

/**
 * Notas como columnas cronológicas (la más reciente a la derecha). Degradado por banda (verde 80 %+, ámbar 60–79,
 * rojo bajo 60), zona roja bajo el umbral, un punto con el color de la materia bajo cada fecha. La gráfica se dibuja
 * cuando entra en pantalla; pasar el mouse atenúa el resto; `band` resalta un rango; clic abre la evaluación.
 */
export function GradesColumns({ data, onSelect, fill, band = null }: { data: GradePoint[]; onSelect?: (id: string) => void; fill?: boolean; band?: Band | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const [hover, setHover] = useState<string | null>(null);
  const byId = new Map(data.map((d) => [d.id, d]));
  const colors = { ok: cssColor('--ok'), warn: cssColor('--warn'), bad: cssColor('--bad') };
  const muted = (entry: GradePoint) => (band !== null && bandOf(entry.pct) !== band) || (hover !== null && hover !== entry.id);
  const tick = (props: { x?: number | string; y?: number | string; payload?: { value?: string | number } }) => {
    const point = byId.get(String(props.payload?.value));
    if (!point) return <g />;
    return (
      <g transform={`translate(${Number(props.x)},${Number(props.y)})`} style={{ opacity: muted(point) ? 0.45 : 1, transition: 'opacity 160ms' }}>
        <text y={16} textAnchor="middle" fontSize={11} fontWeight={hover === point.id ? 800 : 500} fill={cssColor(hover === point.id ? '--text' : '--muted')}>{point.label}</text>
        <circle cy={31} r={hover === point.id ? 5.5 : 4.5} fill={point.courseColor} style={{ transition: 'r 160ms' }} />
      </g>
    );
  };
  return (
    <div ref={ref} className={fill ? styles.chartFill : styles.chart} style={fill ? undefined : sized(270)}>
      {inView && (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
            <defs>
              {(['ok', 'warn', 'bad'] as const).map((b) => (
                <linearGradient key={b} id={`grade-${b}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors[b]} stopOpacity={1} />
                  <stop offset="100%" stopColor={colors[b]} stopOpacity={0.5} />
                </linearGradient>
              ))}
            </defs>
            <XAxis dataKey="id" tick={tick} tickLine={false} axisLine={false} height={48} interval={0} />
            <YAxis domain={[0, 100]} ticks={[0, 60, 80, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11, fill: cssColor('--faint') }} />
            <Tooltip content={<GradeTip />} cursor={{ fill: 'rgb(20 26 36 / 0.045)', radius: 12 }} />
            <ReferenceArea y1={0} y2={LOW_THRESHOLD} fill={colors.bad} fillOpacity={0.06} />
            <ReferenceLine y={LOW_THRESHOLD} stroke={colors.bad} strokeDasharray="5 5" strokeOpacity={0.7} />
            <ReferenceLine y={80} stroke={colors.ok} strokeDasharray="5 5" strokeOpacity={0.5} />
            <Bar dataKey="pct" radius={[12, 12, 5, 5]} maxBarSize={46} minPointSize={5} isAnimationActive animationDuration={1000} animationBegin={120} animationEasing="ease-out" cursor={onSelect ? 'pointer' : undefined}
              onMouseEnter={(_, index) => setHover(data[index]?.id ?? null)} onMouseLeave={() => setHover(null)}
              onClick={(entry) => { const p = entry as { id?: string; payload?: { id?: string } }; const id = p.id ?? p.payload?.id; if (onSelect && id) onSelect(id); }}>
              {data.map((entry) => <Cell key={entry.id} fill={`url(#grade-${bandOf(entry.pct)})`} fillOpacity={muted(entry) ? 0.3 : 1} style={{ transition: 'fill-opacity 180ms', outline: 'none' }} />)}
              <LabelList dataKey="pct" position="top" offset={6} formatter={(v: unknown) => `${Math.round(Number(v))}`} style={{ fontSize: 11, fontWeight: 800, fill: cssColor('--text') }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/**
 * Notas como filas de porcentaje: nombre y nota arriba, barra con su relleno animado debajo y una marca en el umbral
 * (60 %). La barra usa el color de la materia; el porcentaje, el de su banda (rojo < 60, ámbar < 80, verde).
 */
export function ScoresChart({ data, color, onSelect, threshold = LOW_THRESHOLD }: {
  data: Array<{ id?: string; name: string; pct: number; score: string; max: string; course?: string }>; color?: string; onSelect?: (id: string) => void; threshold?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <ul className={styles.bars} style={{ ['--th' as string]: `${threshold}%` }}>
      {data.map((d, i) => (
        <motion.li key={d.id ?? d.name} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.15 + i * 0.06, ease }}>
          <button type="button" className={styles.barRow} disabled={!onSelect || !d.id} onClick={() => d.id && onSelect?.(d.id)}
            style={{ ['--bar' as string]: color ?? bandColor(d.pct), ['--b' as string]: `var(--${bandOf(d.pct)})` }}
            aria-label={`${d.name}: ${d.score} de ${d.max}, ${Math.round(d.pct)} por ciento`}>
            <span className={styles.barName}>{d.name}</span>
            <span className={styles.barVal}><strong className="tabular">{Math.round(d.pct)}%</strong><small className="tabular">{d.score} / {d.max}</small></span>
            <span className={styles.barTrack} aria-hidden="true">
              <motion.i initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: Math.max(d.pct, 2) / 100 }} transition={{ duration: 0.9, delay: 0.25 + i * 0.06, ease }} />
            </span>
          </button>
        </motion.li>
      ))}
    </ul>
  );
}

/** Estado por materia: barras apiladas (calificadas / entregadas / por entregar / vencidas / sin fecha). */
export function CourseStatusChart({ data }: { data: Array<{ name: string; graded: number; submitted: number; pending: number; overdue: number; nodate: number }> }) {
  const series = [
    { key: 'graded', name: 'Calificadas', color: cssColor('--ok') },
    { key: 'submitted', name: 'Entregadas', color: cssColor('--sky') },
    { key: 'pending', name: 'Por entregar', color: cssColor('--st-pending') },
    { key: 'overdue', name: 'Vencidas', color: cssColor('--bad') },
    { key: 'nodate', name: 'Sin fecha', color: cssColor('--control') },
  ];
  return (
    <div className={styles.chart} style={{ height: Math.max(140, data.length * 44 + 50) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }} barCategoryGap="30%">
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: cssColor('--faint') }} />
          <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: cssColor('--text') }} interval={0} />
          <Tooltip {...TIP} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.name} stackId="s" fill={s.color} radius={i === series.length - 1 ? [0, 8, 8, 0] : 0} isAnimationActive animationDuration={700} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const trendDay = new Intl.DateTimeFormat('es-SV', { timeZone: TIMEZONE, day: 'numeric', month: 'short' });

function TrendTip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: { date: string; pct: number; name: string } }> }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className={styles.tip}>
      <strong>{p.name}</strong>
      <span className={styles.tipCourse}>{trendDay.format(new Date(p.date)).replace('.', '')}</span>
      <span className={styles.tipScore} style={{ color: bandColor(p.pct) }}>{Math.round(p.pct)} % · {bandLabel(p.pct)}</span>
    </div>
  );
}

/** Tendencia de notas en el tiempo: curva con área, zona bajo el umbral y un punto por nota con el color de su banda. */
export function TrendChart({ data, color }: { data: Array<{ date: string; label: string; pct: number; name: string }>; color: string }) {
  const id = `trend-${color.replace(/[^a-z0-9]/gi, '')}`;
  const bad = cssColor('--bad');
  return (
    <div className={styles.trend}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 14, right: 18, bottom: 4, left: 4 }}>
          <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.38} /><stop offset="100%" stopColor={color} stopOpacity={0.02} /></linearGradient></defs>
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} minTickGap={34} interval="preserveStartEnd" padding={{ left: 18, right: 18 }}
            tickFormatter={(value: string) => trendDay.format(new Date(value)).replace('.', '')} tick={{ fontSize: 12, fill: cssColor('--muted') }} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} tickMargin={6} width={46} tick={{ fontSize: 11.5, fill: cssColor('--faint') }} tickFormatter={(v) => `${v}%`} />
          <ReferenceArea y1={0} y2={LOW_THRESHOLD} fill={bad} fillOpacity={0.05} />
          <ReferenceLine y={LOW_THRESHOLD} stroke={bad} strokeDasharray="5 5" strokeOpacity={0.75} label={{ value: `${LOW_THRESHOLD} %`, position: 'insideBottomRight', fontSize: 11, fontWeight: 800, fill: bad }} />
          <Tooltip content={<TrendTip />} cursor={{ stroke: color, strokeOpacity: 0.35, strokeDasharray: '3 4' }} />
          <Area type="monotone" dataKey="pct" stroke={color} strokeWidth={3.5} fill={`url(#${id})`} isAnimationActive animationDuration={1000}
            dot={(p: { cx?: number; cy?: number; payload?: { pct: number }; index?: number }) => <circle key={p.index} cx={p.cx} cy={p.cy} r={5.5} fill={bandColor(p.payload?.pct ?? 0)} stroke="#fff" strokeWidth={2.5} />}
            activeDot={{ r: 8, stroke: '#fff', strokeWidth: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
