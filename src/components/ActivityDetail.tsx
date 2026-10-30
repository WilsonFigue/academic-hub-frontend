import { BadgeCheck, CalendarClock, ExternalLink, Info, Layers, Send, Tag, Target, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useActivity } from '../api/hooks';
import type { Activity } from '../api/types';
import { courseIcon } from '../lib/courseIcon';
import { LOW_THRESHOLD, pctOf } from '../lib/dashFilters';
import { activityKind, categoryLabel, courseTitle, formatDateTime, formatDueRelative, formatScore } from '../lib/format';
import { activityStatus } from '../lib/status';
import { tintFor } from '../lib/tint';
import { Badge, Skeleton } from './ui';
import { StudyGuideBlock } from './StudyGuide';
import { HomeworkBlock } from './Homework';
import { ForumBlock } from './ForumBlock';
import { FileViewer, fileLook, formatBytes, type ViewerTarget } from './FileViewer';
import styles from './ActivityDetail.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const ATTEMPT_LABELS: Record<string, string> = {
  IN_PROGRESS: 'Borrador (no entregado)',
  NEEDS_GRADING: 'Entregado, en revisión',
  COMPLETED: 'Calificado',
};
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');
const bandVar = (pct: number) => (pct < LOW_THRESHOLD ? 'var(--bad)' : pct < 80 ? 'var(--warn)' : 'var(--ok)');
const bandName = (pct: number) => (pct < LOW_THRESHOLD ? 'Nota baja' : pct < 80 ? 'Regular' : 'Buena nota');

/** Anillo con el porcentaje obtenido; se dibuja al abrir el panel. */
function ScoreRing({ activity }: { activity: Activity }) {
  const reduce = useReducedMotion();
  const hasScore = activity.score !== null || activity.isAutoZero;
  const pct = hasScore ? pctOf(activity) : null;
  const R = 46; const C = 2 * Math.PI * R;
  const color = pct === null ? 'var(--control)' : bandVar(pct);
  return (
    <div className={styles.ring}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--surface)" strokeWidth="12" />
        <motion.circle cx="60" cy="60" r={R} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" transform="rotate(-90 60 60)"
          strokeDasharray={C} initial={reduce ? false : { strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - (pct ?? 0) / 100) }} transition={{ duration: 1, delay: 0.25, ease }} />
      </svg>
      <div className={styles.ringText}>
        <strong className="tabular">{pct === null ? '—' : `${Math.round(pct)}%`}</strong>
        <span>{pct === null ? 'sin nota' : bandName(pct)}</span>
      </div>
    </div>
  );
}

/** Panel lateral de una actividad: cabecera con el color de la materia, anillo de nota, línea de tiempo, intentos y acciones. */
export function ActivityDetail({ activityId, onClose }: { activityId: string | null; onClose: () => void }) {
  const { data, isPending, error } = useActivity(activityId);
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);
  const [viewing, setViewing] = useState<ViewerTarget | null>(null);

  useEffect(() => {
    if (!activityId) return;
    opener.current = document.activeElement;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [activityId, onClose]);

  const activity = data?.activity;
  const status = activity ? activityStatus(activity) : null;
  const category = activity ? categoryLabel(activity.categoryKey, activity.categoryTitle) : null;
  const instructions = activity?.content?.description ?? null;
  const contentLink = activity?.content?.externalUrl ?? null;
  const title = activity ? courseTitle(activity.courseName) : '';
  const tint = tintFor(activity?.courseId);
  const Icon = courseIcon(title);
  const rise = (i: number) => ({ initial: reduce ? false : { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: 0.12 + i * 0.07, ease } });

  // Línea de tiempo: vence → entregado → calificado (solo con fechas reales).
  // Vencida o ya calificada: ya no se puede entregar ni participar, así que no se ofrece guía, sugerencia ni tarea con IA.
  const finished = Boolean(activity && ((activity.dueAt !== null && Date.parse(activity.dueAt) < Date.now()) || activity.status === 'GRADED'));
  const steps = activity ? [
    { icon: CalendarClock, label: 'Vence', value: activity.dueAt ? formatDateTime(activity.dueAt) : 'Sin fecha', done: activity.dueAt !== null && Date.parse(activity.dueAt) < Date.now() },
    { icon: Send, label: 'Entregado', value: activity.submittedAt ? formatDateTime(activity.submittedAt) : 'Sin registro', done: Boolean(activity.submittedAt) },
    { icon: BadgeCheck, label: 'Calificado', value: activity.gradedAt ? formatDateTime(activity.gradedAt) : 'Pendiente', done: Boolean(activity.gradedAt) },
  ] : [];

  return (
    <>
    <AnimatePresence>
      {activityId && (
        <>
          <motion.div className={styles.overlay} onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} />
          <motion.div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="activity-title"
            style={{ ['--c' as string]: tint.fg, ['--cbg' as string]: tint.bg }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 56, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: 56, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}>
            <div className={styles.head}>
              <span className={styles.headIcon} aria-hidden="true"><Icon size={26} /></span>
              <div className={styles.headText}>
                <p className={styles.course}>{activity ? title : ' '}</p>
                <h2 id="activity-title" className={styles.title}>{activity ? activity.effectiveName ?? activity.name : error ? 'No disponible' : 'Cargando…'}</h2>
              </div>
              <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Cerrar detalle"><X size={20} aria-hidden="true" /></button>
            </div>

            <div className={styles.body}>
              {error ? <p className={styles.note}>No pudimos cargar esta actividad. {error.message}</p>
                : isPending || !activity || !status ? (
                <><Skeleton height={130} radius={20} /><Skeleton height={150} radius={16} /></>
              ) : (
                <>
                  <motion.section className={styles.hero} {...rise(0)}>
                    <ScoreRing activity={activity} />
                    <div className={styles.heroInfo}>
                      <p className={styles.heroLabel}>{activity.isCalculated ? 'Valor calculado por Blackboard' : 'Calificación'}</p>
                      <p className={cx(styles.heroScore, 'tabular')}>
                        {formatScore(activity.score)}
                        {activity.pointsPossible !== null && <small> / {formatScore(activity.pointsPossible)}</small>}
                      </p>
                      <div className={styles.heroBadges}>
                        <Badge tone={status.tone}>{status.label}</Badge>
                        {activity.dueAt && <span className={styles.due}><CalendarClock size={13} aria-hidden="true" />{formatDueRelative(activity.dueAt)}</span>}
                      </div>
                    </div>
                  </motion.section>

                  {activity.countsInGrade === false && activity.gradeNote && <motion.p className={styles.callout} {...rise(1)}><Info size={16} aria-hidden="true" />No cuenta en tu nota. {activity.gradeNote}</motion.p>}
                  {activity.isAutoZero && activity.countsInGrade !== false && <motion.p className={styles.callout} {...rise(1)}><Info size={16} aria-hidden="true" />Blackboard asignó un cero automático porque la fecha venció sin entrega registrada. No es una calificación del docente y aún puede modificarse.</motion.p>}
                  {activity.isCalculated && <motion.p className={styles.callout} {...rise(1)}><Info size={16} aria-hidden="true" />Esta columna la calcula Blackboard con una fórmula del docente. No se presenta como nota final oficial.</motion.p>}
                  {!activity.isCalculated && activity.isSubmitted === null && activity.status !== 'GRADED' && activity.dueAt !== null && Date.parse(activity.dueAt) < Date.now() && (
                    <motion.p className={styles.callout} {...rise(1)}><Info size={16} aria-hidden="true" />Blackboard no informó intentos para esta actividad, así que no podemos confirmar si hubo entrega.</motion.p>
                  )}

                  {!activity.isCalculated && (
                    <motion.ol className={styles.steps} aria-label="Línea de tiempo" {...rise(2)}>
                      {steps.map(({ icon: StepIcon, label, value, done }) => (
                        <li key={label} className={cx(styles.step, done && styles.stepDone)}>
                          <span className={styles.stepDot}><StepIcon size={15} aria-hidden="true" /></span>
                          <span className={styles.stepText}><b>{label}</b><small>{value}</small></span>
                        </li>
                      ))}
                    </motion.ol>
                  )}

                  <motion.dl className={styles.facts} {...rise(3)}>
                    <div><dt><Tag size={13} aria-hidden="true" />Tipo</dt><dd>{activity.isCalculated ? 'Columna calculada' : activityKind(activity.kind)}</dd></div>
                    {category && <div><dt><Layers size={13} aria-hidden="true" />Categoría</dt><dd>{category}</dd></div>}
                    <div><dt><Target size={13} aria-hidden="true" />Puntaje máximo</dt><dd className="tabular">{formatScore(activity.pointsPossible)}</dd></div>
                    {activity.dueSource === 'todo' && <div><dt><CalendarClock size={13} aria-hidden="true" />Fecha personal</dt><dd>Distinta de la general</dd></div>}
                  </motion.dl>

                  {(instructions || contentLink) && (
                    <motion.section aria-labelledby="material-title" {...rise(4)}>
                      <h3 id="material-title" className={styles.subhead}>{instructions ? 'Instrucciones' : 'Material relacionado'}</h3>
                      {instructions && <p className={styles.note} style={{ whiteSpace: 'pre-line' }}>{instructions}</p>}
                      {contentLink && (
                        <a className={styles.link} href={contentLink} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" />Abrir enlace del material<span className="visually-hidden"> (se abre en otra pestaña)</span></a>
                      )}
                    </motion.section>
                  )}

                  {!activity.isCalculated && !finished && (
                    <motion.section aria-label="Guía de estudio con IA" {...rise(4)}>
                      <StudyGuideBlock activityId={activity.id} />
                    </motion.section>
                  )}

                  {activity.content?.handler === 'resource/x-bb-forumlink' && !finished && (
                    <motion.section aria-label="Sugerencia de respuesta para el foro" {...rise(4)}>
                      <ForumBlock base={`/activities/${activity.id}`} />
                    </motion.section>
                  )}

                  {!activity.isCalculated && !finished && (
                    <motion.section aria-label="Tarea con IA" {...rise(4)}>
                      <HomeworkBlock activityId={activity.id} />
                    </motion.section>
                  )}

                  {data.guides.length > 0 && (
                    <motion.section aria-labelledby="guides-title" {...rise(4)}>
                      <h3 id="guides-title" className={styles.subhead}>{data.guides.length === 1 ? 'Guía de esta actividad' : 'Guías y material de esta actividad'}</h3>
                      <ul className={styles.guides}>
                        {data.guides.map((guide) => {
                          const look = fileLook(guide.mimeType, guide.fileName);
                          return (
                            <li key={guide.id}>
                              <button type="button" className={styles.guide} style={{ ['--k' as string]: look.color }}
                                onClick={() => setViewing({ courseId: guide.courseId, id: guide.id, title: guide.title, handler: 'resource/x-bb-file', file: { name: guide.fileName, mimeType: guide.mimeType, size: guide.size }, lmsUrl: activity.lmsUrl })}>
                                <span className={styles.guideIcon}><look.icon size={20} aria-hidden="true" /></span>
                                <span className={styles.guideText}><b>{guide.title}</b><small>{look.tag} · {formatBytes(guide.size)}</small></span>
                                <span className={styles.guideOpen}>Ver</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      <p className={styles.note}>Son los archivos que el docente puso en la misma carpeta que esta actividad.</p>
                    </motion.section>
                  )}

                  {activity.feedbackText && (
                    <motion.section aria-labelledby="feedback-title" {...rise(5)}>
                      <h3 id="feedback-title" className={styles.subhead}>Retroalimentación</h3>
                      <p className={styles.note} style={{ whiteSpace: 'pre-line' }}>{activity.feedbackText}</p>
                    </motion.section>
                  )}

                  {!activity.isCalculated && (
                    <motion.section aria-labelledby="attempts-title" {...rise(6)}>
                      <h3 id="attempts-title" className={styles.subhead}>Tus intentos{data.attempts.length > 0 ? ` (${data.attempts.length})` : ''}</h3>
                      {data.attempts.length > 0 ? (
                        <ul className={styles.attempts}>
                          {data.attempts.map((attempt) => (
                            <li key={attempt.id} className={styles.attempt}>
                              <span>
                                <b>{ATTEMPT_LABELS[attempt.status] ?? attempt.status}</b>
                                <small>{attempt.submittedAt ? `Entregado ${formatDateTime(attempt.submittedAt)}` : attempt.attemptedAt ? `Iniciado ${formatDateTime(attempt.attemptedAt)}` : 'Sin fecha'}</small>
                              </span>
                              {attempt.score !== null && <strong className="tabular">{formatScore(attempt.score)}</strong>}
                            </li>
                          ))}
                        </ul>
                      ) : <p className={styles.note}>No hay intentos registrados para esta actividad.</p>}
                    </motion.section>
                  )}

                  <motion.div className={styles.actions} {...rise(7)}>
                    <Link to={`/courses/${activity.courseId}`} onClick={onClose} className={styles.primary}>Ver la materia</Link>
                    {activity.lmsUrl && (
                      <a href={activity.lmsUrl} target="_blank" rel="noopener noreferrer" className={styles.secondary}>
                        Abrir en Blackboard <ExternalLink size={14} aria-hidden="true" />
                        <span className="visually-hidden"> (se abre en otra pestaña)</span>
                      </a>
                    )}
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    <FileViewer target={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
