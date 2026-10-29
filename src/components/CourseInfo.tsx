import { BadgeCheck, CalendarCheck, CalendarRange, Check, Copy, DoorOpen, GraduationCap, Hash, RefreshCw, ScrollText, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import type { Course } from '../api/types';
import { courseIcon } from '../lib/courseIcon';
import { daysUntil, formatDate, formatDateTime, formatRelative } from '../lib/format';
import { useReducedMotion } from '../lib/motion';
import { tintFor } from '../lib/tint';
import { normalize } from './Filters';
import styles from './CourseInfo.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const ROLES: Record<string, string> = { student: 'Estudiante', s: 'Estudiante', instructor: 'Docente', teacher: 'Docente', teachingassistant: 'Asistente', grader: 'Asistente', guest: 'Invitado' };

/** Datos del período: avance real entre el inicio y el fin, solo con las fechas que trae Blackboard. */
function termProgress(startAt: string | null, endAt: string | null) {
  if (!startAt || !endAt) return null;
  const start = Date.parse(startAt); const end = Date.parse(endAt);
  if (!(end > start)) return null;
  const pct = Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
  const left = daysUntil(endAt);
  const label = Date.now() < start ? `Empieza ${formatRelative(startAt)}` : left < 0 ? 'Período terminado' : left === 0 ? 'Termina hoy' : `Faltan ${left} ${left === 1 ? 'día' : 'días'}`;
  return { pct, label };
}

function Tile({ icon: Icon, label, value, note, color, index, wide }: { icon: LucideIcon; label: string; value: ReactNode; note?: ReactNode; color: string; index: number; wide?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.li className={wide ? styles.wide : undefined} initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, delay: 0.12 + index * 0.06, ease }}>
      <div className={styles.tile} style={{ ['--k' as string]: color }}>
        <span className={styles.tileIcon} aria-hidden="true"><Icon size={22} /></span>
        <span className={styles.tileText}>
          <small>{label}</small>
          <strong>{value}</strong>
          {note && <em>{note}</em>}
        </span>
      </div>
    </motion.li>
  );
}

/** Pestaña Información: identidad de la materia, avance del período y los datos de tu inscripción en fichas. */
export function CourseInfo({ course }: { course: Course }) {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const tone = tintFor(course.id);
  const Icon = courseIcon(course.name);
  const term = course.term;
  const progress = term ? termProgress(term.startAt, term.endAt) : null;
  const role = course.enrollment.role;
  const description = course.description && normalize(course.description) !== normalize(course.name) ? course.description : null;
  const copy = async () => {
    if (!course.courseCode) return;
    try { await navigator.clipboard.writeText(course.courseCode); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { /* sin permiso de portapapeles */ }
  };

  return (
    <div className={styles.wrap} style={{ ['--c' as string]: tone.fg, ['--cbg' as string]: tone.bg }}>
      <motion.section className={styles.id} initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <Icon className={styles.mark} size={200} strokeWidth={1} aria-hidden="true" />
        <span className={styles.eyebrow}><ScrollText size={14} aria-hidden="true" />Nombre oficial en Blackboard</span>
        <h2>{course.name}</h2>
        <div className={styles.actions}>
          {course.courseCode && (
            <button type="button" className={styles.code} onClick={copy} aria-label={`Copiar código ${course.courseCode}`}>
              <Hash size={15} aria-hidden="true" /><span className="tabular">{course.courseCode}</span>
              <i aria-hidden="true">{copied ? <Check size={15} /> : <Copy size={15} />}</i>
              <span className={styles.toast} role="status">{copied ? 'Código copiado' : ''}</span>
            </button>
          )}
          {role && <span className={styles.role}><GraduationCap size={15} aria-hidden="true" />{ROLES[role.toLowerCase()] ?? role}</span>}
          <span className={styles.role} data-ok={course.isAvailable !== false}><BadgeCheck size={15} aria-hidden="true" />{course.isAvailable === false ? 'No disponible' : 'Disponible'}</span>
        </div>
      </motion.section>

      {term && (
        <motion.section className={styles.term} initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08, ease }}>
          <div className={styles.termHead}>
            <span className={styles.tileIcon} aria-hidden="true"><CalendarRange size={22} /></span>
            <span className={styles.tileText}><small>Período</small><strong>{term.name}</strong></span>
            {progress && <b className={styles.termLeft}>{progress.label}</b>}
          </div>
          {progress && (
            <div className={styles.track} role="img" aria-label={`El período lleva ${Math.round(progress.pct * 100)} % transcurrido`}>
              <motion.i initial={reduce ? false : { width: 0 }} animate={{ width: `${Math.max(progress.pct * 100, 1.5)}%` }} transition={{ duration: 1.1, delay: 0.3, ease }} />
              <motion.span initial={reduce ? false : { left: 0 }} animate={{ left: `${Math.max(progress.pct * 100, 1.5)}%` }} transition={{ duration: 1.1, delay: 0.3, ease }}>
                <em>Hoy · {Math.round(progress.pct * 100)} %</em>
              </motion.span>
            </div>
          )}
          <div className={styles.dates}><span>{formatDate(term.startAt)}</span><span>{formatDate(term.endAt)}</span></div>
        </motion.section>
      )}

      <ul className={styles.tiles}>
        <Tile index={0} icon={CalendarCheck} color="var(--teal)" label="Te inscribiste" value={course.enrollment.enrolledAt ? formatDate(course.enrollment.enrolledAt) : <span className={styles.none}>Blackboard no lo informa</span>} note={course.enrollment.enrolledAt ? formatRelative(course.enrollment.enrolledAt) : undefined} />
        <Tile index={1} icon={DoorOpen} color="var(--sky)" label="Último acceso en Blackboard" value={course.enrollment.lastAccessAt ? formatDateTime(course.enrollment.lastAccessAt) : <span className={styles.none}>Blackboard no lo informa</span>} note={course.enrollment.lastAccessAt ? formatRelative(course.enrollment.lastAccessAt) : undefined} />
        <Tile index={2} icon={RefreshCw} color="var(--mint)" label="Datos actualizados en Academic Hub" value={formatDateTime(course.lastSeenAt)} note={course.lastSeenAt ? formatRelative(course.lastSeenAt) : undefined} />
        {description && <Tile index={3} wide icon={ScrollText} color="var(--amber)" label="Descripción" value={description} />}
      </ul>
    </div>
  );
}
