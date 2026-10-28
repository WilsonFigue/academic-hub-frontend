import * as Tooltip from '@radix-ui/react-tooltip';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import { useMemo, useRef, useState } from 'react';
import type { Activity, Term } from '../api/types';
import { matchesStatus, type DashStatus } from '../lib/dashFilters';
import { courseTitle, daysUntil, formatDate, formatDateTime, formatDueRelative, formatScore } from '../lib/format';
import { statusGroup, type StatusGroup } from '../lib/status';
import { tintFor } from '../lib/tint';
import styles from './TermRibbon.module.css';

const monthFormatter = new Intl.DateTimeFormat('es-SV', { timeZone: 'America/El_Salvador', month: 'short' });
const DAY_MS = 86_400_000;
type Marker = { activity: Activity; at: number; position: number; group: StatusGroup };

/** Estados de las marcas: sirven de leyenda (el punto es el color de la marca) y de filtro. */
const FILTERS: Array<{ key: Exclude<DashStatus, 'all' | 'nodate'>; label: string; dot: string; hollow?: boolean }> = [
  { key: 'graded', label: 'Calificadas', dot: 'var(--ok)' },
  { key: 'overdue', label: 'Vencidas o cero', dot: 'var(--bad)' },
  { key: 'submitted', label: 'Entregadas', dot: 'var(--sky)' },
  { key: 'pending', label: 'Por entregar', dot: 'conic-gradient(var(--tint-1-fg), var(--tint-3-fg), var(--tint-5-fg), var(--tint-1-fg))' },
  { key: 'low', label: 'Notas bajas', dot: 'var(--bad)', hollow: true },
];

function markerColor(m: Marker): string {
  if (m.group === 'graded') return m.activity.isAutoZero ? 'var(--bad)' : 'var(--ok)';
  if (m.group === 'overdue') return 'var(--bad)';
  if (m.group === 'submitted') return 'var(--sky)';
  return tintFor(m.activity.courseId).fg;
}

/**
 * Próxima entrega: al inicio solo un círculo con los días que faltan (con un pulso discreto);
 * al pasar el mouse, enfocar con teclado o tocar, se despliega la actividad. En pantallas táctiles,
 * el primer toque despliega y el segundo abre el detalle.
 */
function NextPill({ activity, onOpen }: { activity: Activity; onOpen: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const pointer = useRef<string>('mouse');
  const days = daysUntil(activity.dueAt!);
  const tint = tintFor(activity.courseId);
  const title = activity.effectiveName ?? activity.name;
  return (
    <button type="button" className={styles.next} data-open={open} style={{ ['--c' as string]: tint.fg }}
      aria-label={`Próxima entrega: ${title}, ${courseTitle(activity.courseName)}, ${formatDateTime(activity.dueAt)}. Abrir detalle`}
      onPointerDown={(event) => { pointer.current = event.pointerType; }}
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setOpen(true); }}
      onPointerLeave={(event) => { if (event.pointerType === 'mouse') setOpen(false); }}
      onFocus={(event) => { if (event.currentTarget.matches(':focus-visible')) setOpen(true); }}
      onBlur={() => setOpen(false)}
      onClick={() => {
        if (pointer.current !== 'mouse' && !open) { setOpen(true); return; }
        onOpen(activity.id);
      }}>
      <span className={styles.nextRing} aria-hidden="true">
        {days <= 0 ? <strong>Hoy</strong> : <><strong className="tabular">{days}</strong><small>{days === 1 ? 'día' : 'días'}</small></>}
      </span>
      <span className={styles.nextText}>
        <small><CalendarClock size={12} aria-hidden="true" />Próxima entrega · {formatDueRelative(activity.dueAt)}<ArrowRight size={13} className="nextGo" aria-hidden="true" /></small>
        <strong>{title}</strong>
        <span>{courseTitle(activity.courseName)} · {formatDateTime(activity.dueAt)}</span>
      </span>
    </button>
  );
}

/**
 * Línea del ciclo: el período completo con una marca por cada evaluable real (color de la materia;
 * rojo si venció sin nota o fue cero automático; verde si ya tiene nota; azul si está entregada).
 * Responde a los filtros globales del Inicio (estado y materia). Clic en una marca abre la actividad.
 */
export function TermRibbon({ term, activities, onOpen, status, preview, onStatus, onPreview, courseId }: {
  term: Term; activities: Activity[]; onOpen: (id: string) => void; status: DashStatus; preview?: DashStatus | null; onStatus: (status: DashStatus) => void; onPreview?: (status: DashStatus | null) => void; courseId: string;
}) {
  // `status` es el filtro ELEGIDO (clic); `preview` es solo lo que se ve mientras el mouse pasa por un chip.
  const active = preview ?? status;
  const reduce = useReducedMotion();
  const start = term.startAt ? Date.parse(term.startAt) : NaN;
  const end = term.endAt ? Date.parse(term.endAt) : NaN;
  const valid = Number.isFinite(start) && Number.isFinite(end) && end > start;
  const now = Date.now();
  const elapsed = valid ? Math.min(1, Math.max(0, (now - start) / (end - start))) : 0;
  const totalWeeks = valid ? Math.max(1, Math.ceil((end - start) / (7 * DAY_MS))) : 0;
  const week = valid ? Math.min(totalWeeks, Math.max(1, Math.ceil((now - start) / (7 * DAY_MS)))) : 0;
  const daysLeft = valid ? Math.max(0, Math.ceil((end - now) / DAY_MS)) : 0;

  const markers = useMemo<Marker[]>(() => {
    if (!valid) return [];
    return activities.filter((a) => a.dueAt && !a.isCalculated && (!a.termId || a.termId === term.id) && (!courseId || a.courseId === courseId)).map((a) => {
      const at = Date.parse(a.dueAt!);
      return { activity: a, at, position: (at - start) / (end - start), group: statusGroup(a) };
    }).filter((m) => m.position >= 0 && m.position <= 1).sort((a, b) => a.at - b.at);
  }, [activities, valid, start, end, term.id, courseId]);
  const shown = markers.filter((m) => matchesStatus(m.activity, active));
  const filtered = active !== 'all' || courseId !== '';
  const counts: Record<Exclude<DashStatus, 'all' | 'nodate'>, number> = {
    graded: markers.filter((m) => matchesStatus(m.activity, 'graded')).length, overdue: markers.filter((m) => matchesStatus(m.activity, 'overdue')).length,
    submitted: markers.filter((m) => matchesStatus(m.activity, 'submitted')).length, pending: markers.filter((m) => matchesStatus(m.activity, 'pending')).length,
    low: markers.filter((m) => matchesStatus(m.activity, 'low')).length,
  };

  const months = useMemo(() => {
    if (!valid) return [];
    const list: Array<{ label: string; position: number }> = [];
    const cursor = new Date(start); cursor.setUTCDate(1); cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    while (cursor.getTime() < end) { list.push({ label: monthFormatter.format(cursor).replace('.', ''), position: (cursor.getTime() - start) / (end - start) }); cursor.setUTCMonth(cursor.getUTCMonth() + 1); }
    return list;
  }, [valid, start, end]);

  // Marcas muy próximas se escalonan en altura para no taparse.
  let lastPos = -1; let lane = 0;
  const laned = shown.map((m) => { lane = m.position - lastPos < 0.012 ? (lane + 1) % 3 : 0; lastPos = m.position; return { ...m, lane }; });
  const next = markers.find((m) => m.group === 'pending' && m.at >= now);
  if (!valid) return null;

  return (
    <Tooltip.Provider>
      <section className={styles.ribbon} aria-labelledby="ribbon-title">
        <div className={styles.head}>
          <h2 id="ribbon-title" className={styles.title}>{term.name}</h2>
          <p className={styles.facts}>
            <span>Semana <strong className="tabular">{week}</strong> de <span className="tabular">{totalWeeks}</span></span>
            <span><strong className="tabular">{Math.round(elapsed * 100)} %</strong> recorrido</span>
            <span><strong className="tabular">{daysLeft}</strong> {daysLeft === 1 ? 'día restante' : 'días restantes'}</span>
            {filtered && <span className={styles.shownNote}>Mostrando <strong className="tabular">{shown.length}</strong> de <span className="tabular">{markers.length}</span></span>}
          </p>
          {next && <div className={styles.nextWrap}><NextPill activity={next.activity} onOpen={onOpen} /></div>}
        </div>

        <div className={styles.track} role="img" aria-label={`Período del ${formatDate(term.startAt)} al ${formatDate(term.endAt)}. ${shown.length} evaluables con fecha.`}>
          <div className={styles.rail}>
            <motion.div className={styles.fill} initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: elapsed }} transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} />
          </div>
          {months.map((m) => <span key={m.label + m.position} className={styles.month} style={{ left: `${m.position * 100}%` }} aria-hidden="true">{m.label}</span>)}
          <span className={styles.today} style={{ left: `${elapsed * 100}%` }} aria-hidden="true"><span className={styles.todayLabel}>Hoy</span></span>
          <AnimatePresence>{laned.map((m, index) => {
            const a = m.activity; const color = markerColor(m);
            return (
              <Tooltip.Root key={a.id} delayDuration={80}>
                <Tooltip.Trigger asChild>
                  <motion.button type="button" className={`${styles.pin} ${m.at < now ? styles.pinPast : ''}`} style={{ left: `${m.position * 100}%`, ['--c' as string]: color, ['--lane' as string]: m.lane }}
                    onClick={() => onOpen(a.id)} aria-label={a.effectiveName ?? a.name}
                    initial={reduce ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0, transition: { duration: 0.18 } }} transition={{ duration: 0.3, delay: 0.3 + Math.min(index, 30) * 0.02, type: 'spring', stiffness: 400, damping: 24 }}>
                    <span className={styles.pinHead} />
                  </motion.button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content side="top" sideOffset={8} className={styles.tooltip}>
                    <strong>{a.effectiveName ?? a.name}</strong>
                    <span>{courseTitle(a.courseName)} · {formatDateTime(a.dueAt)} · {formatDueRelative(a.dueAt)}</span>
                    <span style={{ color }}>{m.group === 'graded' ? (a.isAutoZero ? 'Cero por vencimiento' : `Calificada: ${formatScore(a.score)}${a.pointsPossible ? ` / ${formatScore(a.pointsPossible)}` : ''}`)
                      : m.group === 'overdue' ? 'Vencida sin nota' : m.group === 'submitted' ? 'Entregada, esperando nota' : 'Por entregar'}</span>
                    <Tooltip.Arrow className={styles.tooltipArrow} />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            );
          })}</AnimatePresence>
        </div>
        <div className={styles.foot}>
          <span className="tabular">{formatDate(term.startAt)}</span>
          <div className={styles.filters} role="group" aria-label="Filtrar por estado">
            {FILTERS.filter((item) => counts[item.key] > 0 || status === item.key).map((item) => (
              <button key={item.key} type="button" className={styles.filter} aria-pressed={status === item.key} data-preview={preview === item.key && status !== item.key} onClick={() => onStatus(status === item.key ? 'all' : item.key)}
                style={{ ['--d' as string]: item.dot }} onPointerLeave={() => onPreview?.(null)}
                onPointerEnter={(event) => { if (event.pointerType === 'mouse') onPreview?.(item.key); }}
                onFocus={(event) => { if (event.currentTarget.matches(':focus-visible')) onPreview?.(item.key); }} onBlur={() => onPreview?.(null)}>
                <i className={item.hollow ? styles.dotHollow : styles.dot} />{item.label}<b className="tabular">{counts[item.key]}</b>
              </button>
            ))}
          </div>
          <span className="tabular">{formatDate(term.endAt)}</span>
        </div>
      </section>
    </Tooltip.Provider>
  );
}
