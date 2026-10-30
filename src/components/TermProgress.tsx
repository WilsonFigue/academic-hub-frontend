import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useEvaluationOverview } from '../api/hooks';
import type { EvaluationOverviewTerm, OverviewEvaluation } from '../api/types';
import { dayRange, daysBetween } from '../lib/evalDates';
import { useReducedMotion } from '../lib/motion';
import styles from './TermProgress.module.css';

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
      </div>

      <Steps evaluations={term.evaluations} reduce={reduce} />
    </motion.section>
  );
}
