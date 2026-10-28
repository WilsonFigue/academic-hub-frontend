import { GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import { useId } from 'react';
import type { Course } from '../api/types';
import { courseIcon } from '../lib/courseIcon';
import { courseTitle } from '../lib/format';
import { tintFor } from '../lib/tint';
import styles from './CourseTabs.module.css';

const ease = [0.22, 1, 0.36, 1] as const;
const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

/**
 * Pestañitas de materia pegadas a la tarjeta del ciclo (como carpetas). La elegida se funde con la tarjeta y lleva una
 * franja del color de la materia que se desliza; pasar el mouse por una pestaña muestra ya el resultado sin elegirla.
 */
export function CourseTabs({ courses, value, onChange, onPreview }: { courses: Course[]; value: string; onChange: (id: string) => void; onPreview: (id: string | null) => void }) {
  const reduce = useReducedMotion();
  const layoutId = useId();
  if (courses.length === 0) return null;
  const items = [
    { id: '', title: 'Todas', Icon: GraduationCap, color: 'var(--text)' },
    ...courses.map((course) => {
      const title = courseTitle(course.displayName ?? course.name);
      return { id: course.id, title, Icon: courseIcon(title), color: tintFor(course.id).fg };
    }),
  ];
  return (
    <div className={styles.tabs} role="group" aria-label="Filtrar por materia" onPointerLeave={() => onPreview(null)}>
      {items.map(({ id, title, Icon, color }, index) => {
        const on = value === id;
        return (
          <motion.button key={id || 'all'} type="button" className={cx(styles.tab, on && styles.tabOn)} aria-pressed={on} style={{ ['--c' as string]: color }} title={title}
            onClick={() => onChange(on && id ? '' : id)}
            onPointerEnter={(event) => { if (event.pointerType === 'mouse') onPreview(id); }}
            onFocus={(event) => { if (event.currentTarget.matches(':focus-visible')) onPreview(id); }} onBlur={() => onPreview(null)}
            initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 + index * 0.06, ease }}>
            {on && <motion.span layoutId={layoutId} className={styles.bar} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <Icon size={16} className={styles.icon} aria-hidden="true" />
            <span className={styles.name}>{title}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
