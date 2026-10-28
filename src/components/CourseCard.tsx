import { ArrowUpRight, CalendarClock, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Course } from '../api/types';
import { courseIcon } from '../lib/courseIcon';
import { courseTitle, daysUntil, formatDueRelative, formatShortDate } from '../lib/format';
import { tintFor } from '../lib/tint';
import { Highlight } from './Filters';
import styles from './CourseCard.module.css';

/**
 * Ficha de materia: cabecera con el color y el icono del tema, datos reales debajo.
 * El título es un enlace "extendido"; los accesos rápidos quedan por encima (sin enlaces anidados).
 */
export function CourseCard({ course, showShortcuts = false, query = '' }: { course: Course; showShortcuts?: boolean; query?: string }) {
  const title = courseTitle(course.displayName ?? course.name);
  const tone = tintFor(course.id);
  const Icon = courseIcon(title);
  const unavailable = course.isAvailable === false || course.enrollment.isAvailable === false;
  const soon = course.nextDueAt ? daysUntil(course.nextDueAt) <= 3 : false;
  return (
    <article className={styles.card} style={{ ['--course-fg' as string]: tone.fg, ['--course-bg' as string]: tone.bg }}>
      <div className={styles.cover}>
        <span className={styles.coverIcon} aria-hidden="true"><Icon size={30} strokeWidth={1.8} /></span>
        <Icon className={styles.coverWatermark} size={120} strokeWidth={1.2} aria-hidden="true" />
        {course.nextDueAt && <span className={`${styles.due} ${soon ? styles.dueSoon : ''}`}><CalendarClock size={13} aria-hidden="true" />{formatDueRelative(course.nextDueAt)}</span>}
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>
          <Link to={`/courses/${course.id}`} className={styles.stretched}><Highlight text={title} query={query} /></Link>
        </h3>
        <p className={styles.code}>{[course.courseCode, course.term?.name].filter(Boolean).join(' · ')}</p>
        {unavailable && <p className={styles.unavailable}>No disponible en Blackboard</p>}
        <div className={styles.facts}>
          <span><ClipboardList size={15} aria-hidden="true" /><strong className="tabular">{course.activityCount}</strong> {course.activityCount === 1 ? 'actividad' : 'actividades'}</span>
          {course.nextDueAt ? <span><CalendarClock size={15} aria-hidden="true" />próxima <strong>{formatShortDate(course.nextDueAt)}</strong></span>
            : course.activityCount > 0 && <span>sin vencimientos próximos</span>}
        </div>
        {showShortcuts ? (
          <nav className={styles.shortcuts} aria-label={`Accesos de ${title}`}>
            <Link to={`/courses/${course.id}?tab=content`}>Contenido</Link>
            <Link to={`/courses/${course.id}?tab=grades`}>Notas</Link>
            <Link to={`/courses/${course.id}?tab=cycles`}>Ciclos</Link>
          </nav>
        ) : <ArrowUpRight className={styles.arrow} size={18} aria-hidden="true" />}
      </div>
    </article>
  );
}
