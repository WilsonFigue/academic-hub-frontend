import {
  AcademicCapIcon, ArrowPathIcon, CalendarDaysIcon, CheckBadgeIcon, ClipboardDocumentCheckIcon, MegaphoneIcon, PencilSquareIcon, PlusCircleIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';
import { Link } from 'react-router-dom';
import type { Change } from '../api/types';
import { courseTitle, formatDateTime, formatScore } from '../lib/format';
import { tintFor } from '../lib/tint';
import styles from './ChangeList.module.css';

type Described = { icon: ComponentType<SVGProps<SVGSVGElement>>; title: string; detail: string | null };

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null);

/** Traduce un cambio registrado a una frase; solo usa los campos guardados, sin inferir nada más. */
export function describeChange(change: Change): Described {
  const after = change.after ?? {};
  const before = change.before ?? {};
  const name = text(after.name) ?? text(after.title) ?? 'Sin título';
  switch (change.kind) {
    case 'term_new': return { icon: CalendarDaysIcon, title: `Nuevo período: ${name}`, detail: 'Apareció en tus inscripciones.' };
    case 'course_new': return { icon: AcademicCapIcon, title: `Nueva materia: ${courseTitle(name)}`, detail: null };
    case 'activity_new': return { icon: PlusCircleIcon, title: `Nueva actividad: ${name}`, detail: text(after.due_at) ? `Vence ${formatDateTime(after.due_at as string)}` : 'Sin fecha publicada' };
    case 'due_changed': return {
      icon: CalendarDaysIcon, title: `Cambió el vencimiento de ${name}`,
      detail: `${text(before.due_at) ? formatDateTime(before.due_at as string) : 'Sin fecha'} → ${text(after.due_at) ? formatDateTime(after.due_at as string) : 'Sin fecha'}`,
    };
    case 'activity_renamed': return { icon: PencilSquareIcon, title: `Actividad renombrada: ${name}`, detail: text(before.name) ? `Antes: ${before.name as string}` : null };
    case 'points_changed': return { icon: PencilSquareIcon, title: `Cambió el puntaje máximo de ${name}`, detail: `${formatScore(before.points_possible as string)} → ${formatScore(after.points_possible as string)}` };
    case 'grade_new': return { icon: CheckBadgeIcon, title: `Nueva calificación en ${name}`, detail: `Nota: ${formatScore(after.score as string)}` };
    case 'grade_changed': return { icon: ArrowPathIcon, title: `Se modificó tu nota en ${name}`, detail: `${formatScore(before.score as string)} → ${formatScore(after.score as string)}` };
    case 'submission_changed': return { icon: ClipboardDocumentCheckIcon, title: `Cambió el estado de entrega de ${name}`, detail: null };
    case 'announcement_new': return { icon: MegaphoneIcon, title: `Nuevo anuncio: ${name}`, detail: null };
    default: return { icon: ArrowPathIcon, title: 'Cambio registrado', detail: null };
  }
}

export function ChangeList({ changes, onOpenActivity, compact = false }: {
  changes: Change[]; onOpenActivity?: (activityId: string) => void; compact?: boolean;
}) {
  return (
    <ul className={styles.list}>
      {changes.map((change) => {
        const { title, detail } = describeChange(change);
        return (
          <li key={change.id} className={styles.item}>
            <span className={styles.node} style={{ background: change.courseId ? tintFor(change.courseId).fg : 'var(--faint)' }} aria-hidden="true" />
            <div className={styles.body}>
              <p className={styles.title}>{title}</p>
              <p className={styles.meta}>
                {change.courseName && <span>{courseTitle(change.courseName)}</span>}
                <span>Detectado {formatDateTime(change.detectedAt)}</span>
              </p>
              {!compact && detail && <p className={styles.detail}>{detail}</p>}
            </div>
            {change.activityId && onOpenActivity ? (
              <button type="button" className={styles.action} onClick={() => onOpenActivity(change.activityId!)}>Ver</button>
            ) : change.courseId ? (
              <Link to={`/courses/${change.courseId}`} className={styles.action}>Ver</Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
