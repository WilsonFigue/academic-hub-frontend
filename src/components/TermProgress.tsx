import { Check, Flag, Target } from 'lucide-react';
import { motion } from 'motion/react';
import { useEvaluationOverview } from '../api/hooks';
import type { EvaluationOverviewTerm, OverviewEvaluation } from '../api/types';
import { dayRange, daysBetween } from '../lib/evalDates';
import { useReducedMotion } from '../lib/motion';
import styles from './TermProgress.module.css';

const points = (value: number) => value.toFixed(1);
const EASE = [0.22, 1, 0.36, 1] as const;

function headline(data: EvaluationOverviewTerm) {
  const { term, evaluations } = data;
  const current = evaluations.find((e) => e.status === 'current');
  const closed = evaluations.filter((e) => e.status === 'closed').length;
  if (!current) return null;
  const ended = closed === evaluations.length;
  const days = daysBetween(term.today, current.examStart);
  return { current, closed, ended, days, total: evaluations.length };
}

/** Medidor semicircular de 0 a 10: lo que llevas, lo que aún puedes sumar y la marca de la meta. */
function Gauge({ earned, available, passing, reduce }: { earned: number; available: number; passing: number; reduce: boolean }) {
  const e = Math.min(1, earned / 10);
  const a = Math.min(1 - e, available / 10);
  const angle = Math.PI * (1 - passing / 10);
  const at = (radius: number) => ({ x: 110 + radius * Math.cos(angle), y: 110 - radius * Math.sin(angle) });
  const tickA = at(66); const tickB = at(96); const flag = at(81);
  const arc = 'M 30 110 A 80 80 0 0 1 190 110';
  return (
    <svg className={styles.gaugeSvg} viewBox="0 0 220 126" role="presentation" aria-hidden="true">
      <path d={arc} className={styles.gaugeTrack} pathLength={1} />
      <path d={arc} className={styles.gaugeGhost} pathLength={1} strokeDasharray={`0 ${e} ${a} 1`} />
      <motion.path d={arc} className={styles.gaugeFill} pathLength={1} initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: e }} transition={{ duration: 1.1, ease: EASE, delay: 0.35 }} />
      <line x1={tickA.x} y1={tickA.y} x2={tickB.x} y2={tickB.y} className={styles.gaugeTick} />
      <circle cx={flag.x} cy={flag.y} r="9" className={styles.gaugeFlag} />
      <path d={`M ${flag.x - 2.6} ${flag.y + 3.6} V ${flag.y - 3.8} L ${flag.x + 3.6} ${flag.y - 1.9} L ${flag.x - 2.6} ${flag.y}`} className={styles.gaugeFlagGlyph} />
    </svg>
  );
}

function Steps({ evaluations, reduce }: { evaluations: OverviewEvaluation[]; reduce: boolean }) {
  return (
    <ol className={styles.steps} aria-label="Evaluaciones del ciclo">
      {evaluations.map((e, index) => (
        <motion.li key={e.number} className={styles.step} data-status={e.status} aria-current={e.status === 'current' ? 'step' : undefined}
          initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE, delay: 0.15 + index * 0.07 }}>
          <span className={styles.stepNode}>{e.status === 'closed' ? <Check size={15} strokeWidth={3.2} aria-hidden="true" /> : e.number}</span>
          <span className={styles.stepBody}>
            <span className={styles.stepName}>Eval. {e.number}</span>
            <span className={styles.stepDate}>{dayRange(e.examStart, e.examEnd)}</span>
          </span>
          <span className={styles.stepState}>{e.status === 'closed' ? 'Cerrada' : e.status === 'current' ? 'En curso' : 'Próxima'}</span>
        </motion.li>
      ))}
    </ol>
  );
}

/** Cómo va el ciclo para todas las materias: comparten las mismas 5 evaluaciones y las mismas fechas. */
export function TermProgress() {
  const { data } = useEvaluationOverview();
  const reduce = useReducedMotion();
  if (!data || data.terms.length === 0) return null;
  const term = data.terms[0]!;
  if (term.evaluations.length === 0) return null;
  const info = headline(term);
  const passing = term.term.passingGrade;
  const courses = term.courses;
  const earned = courses.length ? courses.reduce((sum, c) => sum + c.pointsEarned, 0) / courses.length : 0;
  const available = courses.length ? courses.reduce((sum, c) => sum + c.pointsAvailable, 0) / courses.length : 0;
  const above = courses.filter((c) => c.pointsEarned >= passing).length;
  const tone = earned >= passing ? 'ok' : earned + available < passing ? 'bad' : 'pending';
  const status = tone === 'ok' ? 'Meta superada' : tone === 'bad' ? 'No alcanza con lo que queda' : `Te faltan ${points(passing - earned)}`;

  return (
    <motion.section className={styles.card} aria-labelledby="term-progress-title" initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}>
      <span className={styles.ghostNumber} aria-hidden="true">{info?.ended ? '✓' : info?.current.number}</span>
      <div className={styles.top}>
        <div className={styles.lead}>
          <p className={styles.kicker}>{term.term.name} · así va tu ciclo</p>
          <h2 id="term-progress-title" className={styles.title}>
            {!info ? 'Ciclo sin evaluaciones' : info.ended ? 'Ciclo terminado' : <>Evaluación <em>{info.current.number}</em> en curso</>}
          </h2>
          {info && !info.ended && (
            <p className={styles.sub}>
              Examen del <strong>{dayRange(info.current.examStart, info.current.examEnd)}</strong>
              <span className={styles.countdown} data-soon={info.days <= 7}>
                {info.days > 1 ? `en ${info.days} días` : info.days === 1 ? 'mañana' : 'ahora'}
              </span>
            </p>
          )}
          {info && <p className={styles.tally}><strong>{info.closed}</strong> de {info.total} evaluaciones cerradas</p>}
        </div>

        {courses.length > 0 && (
          <div className={styles.gauge}>
            <div className={styles.gaugeArc}>
              <Gauge earned={earned} available={available} passing={passing} reduce={reduce} />
              <div className={styles.gaugeCenter}>
                <strong className={styles.gaugeValue}>{points(earned)}</strong>
                <span className={styles.gaugeOf}>de 10</span>
              </div>
            </div>
            <div className={styles.gaugeInfo}>
              <span className={styles.status} data-tone={tone}>{tone === 'ok' ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : <Target size={14} aria-hidden="true" />}{status}</span>
              <p className={styles.gaugeNote}><Flag size={13} aria-hidden="true" />Meta {points(passing)} · {above} de {courses.length} {courses.length === 1 ? 'materia la superó' : 'materias la superaron'}</p>
            </div>
          </div>
        )}
      </div>

      <Steps evaluations={term.evaluations} reduce={reduce} />
      <p className={styles.footnote}>Promedio estimado de tus {courses.length} {courses.length === 1 ? 'materia' : 'materias'} con las notas de Blackboard: cada evaluación vale {term.term.evaluationWeightPercent} % y se promedia lo ya calificado. La nota oficial de cada evaluación la publica tu docente en el portal.</p>
    </motion.section>
  );
}
