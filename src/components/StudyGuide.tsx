import { BookOpenCheck, ChevronDown, Clock3, Loader2, RotateCcw, Sparkles, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { ApiError } from '../api/client';
import { useRequestStudyGuide, useSetStudyGuide, useStudyGuide, useStudyGuideSettings } from '../api/hooks';
import type { StudyGuide } from '../api/types';
import { courseTitle } from '../lib/format';
import { useReducedMotion } from '../lib/motion';
import { tintFor } from '../lib/tint';
import { Skeleton } from './ui';
import styles from './StudyGuide.module.css';

const ease = [0.22, 1, 0.36, 1] as const;

/** Interruptor accesible (role="switch"). */
export function GuideSwitch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={styles.switch} data-on={checked} onClick={() => onChange(!checked)}>
      <span className={styles.knob} />
    </button>
  );
}

/** Lista de materias con su interruptor (apagado por defecto). Vive en Perfil. */
export function StudyGuideSettings() {
  const { data, isPending, error } = useStudyGuideSettings();
  const set = useSetStudyGuide();
  const reduce = useReducedMotion();
  if (isPending) return <Skeleton height={120} radius={18} />;
  if (error || !data) return <p className={styles.note}>No pudimos cargar tus materias.</p>;
  if (data.courses.length === 0) return <p className={styles.note}>Cuando tengas materias aparecerán aquí.</p>;
  return (
    <>
      <p className={styles.note}>Si activas una materia, se generará automáticamente la guía de sus actividades pendientes. Si la dejas apagada, solo se genera la guía de las actividades que tú pidas.</p>
      <ul className={styles.settings}>
        {data.courses.map((course, index) => {
          const tint = tintFor(course.courseId);
          return (
            <motion.li key={course.courseId} style={{ ['--k' as string]: tint.fg }} initial={reduce ? false : { opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: 0.1 + index * 0.05, ease }}>
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.settingText}>
                <b>{courseTitle(course.name)}</b>
                <small>{course.termName ?? 'Sin período'}{course.ready > 0 ? ` · ${course.ready} ${course.ready === 1 ? 'guía lista' : 'guías listas'}` : ''}{course.queued > 0 ? ` · ${course.queued} en cola` : ''}</small>
              </span>
              <GuideSwitch checked={course.enabled} disabled={set.isPending && set.variables?.courseId === course.courseId}
                label={`Generar guías de estudio automáticamente en ${courseTitle(course.name)}`} onChange={(enabled) => set.mutate({ courseId: course.courseId, enabled })} />
            </motion.li>
          );
        })}
      </ul>
      {set.error && <p className={styles.error} role="alert">No se pudo guardar el cambio. Inténtalo de nuevo.</p>}
    </>
  );
}

/** Interruptor de una sola materia (pestaña Información). */
export function CourseGuideToggle({ courseId }: { courseId: string }) {
  const { data } = useStudyGuideSettings();
  const set = useSetStudyGuide();
  const course = data?.courses.find((item) => item.courseId === courseId);
  if (!course) return null;
  return (
    <section className={styles.toggleCard} aria-label="Guías de estudio con IA">
      <span className={styles.toggleIcon} aria-hidden="true"><Sparkles size={20} /></span>
      <span className={styles.toggleText}>
        <b>Guías de estudio con IA</b>
        <small>{course.enabled ? 'Se generan solas para las actividades pendientes de esta materia.' : 'Apagado: solo se genera la guía de las actividades que tú pidas.'}</small>
      </span>
      <GuideSwitch checked={course.enabled} label="Generar guías de estudio automáticamente en esta materia" onChange={(enabled) => set.mutate({ courseId, enabled })} />
    </section>
  );
}

function GuideBody({ guide }: { guide: StudyGuide }) {
  const content = guide.content;
  if (!content) return null;
  return (
    <div className={styles.guideBody}>
      {content.summary && <p className={styles.summary}>{content.summary}</p>}
      {content.sections.map((section) => (
        <section key={section.heading}>
          <h4>{section.heading}</h4>
          {section.body && <p style={{ whiteSpace: 'pre-line' }}>{section.body}</p>}
          {section.bullets && section.bullets.length > 0 && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
        </section>
      ))}
      {content.sources.length > 0 && (
        <p className={styles.sources}><b>Basada en:</b> {content.sources.map((source) => source.file).join(' · ')}</p>
      )}
    </div>
  );
}

/** Bloque de la guía de estudio dentro del detalle de una actividad. */
export function StudyGuideBlock({ activityId }: { activityId: string }) {
  const { data, isPending } = useStudyGuide(activityId);
  const request = useRequestStudyGuide(activityId);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  if (isPending || !data) return <Skeleton height={86} radius={20} />;
  const guide = data.guide;
  const requestError = request.error instanceof ApiError && request.error.code !== 'study_guide_exists' ? request.error.message : null;

  return (
    <div className={styles.block} data-status={guide?.status ?? 'none'}>
      <div className={styles.blockHead}>
        <span className={styles.blockIcon} aria-hidden="true">
          {guide?.status === 'generating' ? <Loader2 size={20} className={styles.spin} /> : guide?.status === 'requested' ? <Clock3 size={20} /> : guide?.status === 'failed' ? <TriangleAlert size={20} /> : guide?.status === 'ready' ? <BookOpenCheck size={20} /> : <Sparkles size={20} />}
        </span>
        <span className={styles.blockText}>
          {!guide && (<><b>Guía de estudio con IA</b><small>{data.courseEnabled ? 'Esta materia las genera sola; también puedes pedir esta ahora.' : 'Esta materia no genera guías sola: esta se hará solo si la pides.'}</small></>)}
          {guide?.status === 'requested' && (<><b>Guía en cola</b><small>Se generará en cuanto la IA esté disponible. {guide.trigger === 'routine' ? 'La pidió la rutina de esta materia.' : 'La pediste tú.'}</small></>)}
          {guide?.status === 'generating' && (<><b>Generando tu guía…</b><small>Puede tardar un minuto. Puedes cerrar esta ventana.</small></>)}
          {guide?.status === 'ready' && (<><b>Guía de estudio lista</b><small>Armada con el material de la materia. Revisa siempre las fuentes citadas.</small></>)}
          {guide?.status === 'failed' && (<><b>No pudimos generar la guía</b><small>Inténtalo de nuevo; no se cobra una guía que falló.</small></>)}
        </span>
        {!guide && (
          <button type="button" className={styles.primary} disabled={request.isPending} onClick={() => request.mutate()}>
            {request.isPending ? <Loader2 size={16} className={styles.spin} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}Generar guía
          </button>
        )}
        {guide?.status === 'failed' && (
          <button type="button" className={styles.primary} disabled={request.isPending} onClick={() => request.mutate()}>
            {request.isPending ? <Loader2 size={16} className={styles.spin} aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />}Reintentar
          </button>
        )}
        {guide?.status === 'ready' && (
          <button type="button" className={styles.secondary} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? 'Ocultar' : 'Ver guía'}<ChevronDown size={16} aria-hidden="true" data-open={open} />
          </button>
        )}
      </div>
      {requestError && <p className={styles.error} role="alert">{requestError}</p>}
      <AnimatePresence initial={false}>
        {guide?.status === 'ready' && open && (
          <motion.div key="body" initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }} style={{ overflow: 'hidden' }}>
            <GuideBody guide={guide} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
