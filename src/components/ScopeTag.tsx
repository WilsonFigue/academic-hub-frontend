import { GraduationCap } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Course } from '../api/types';
import { courseIcon } from '../lib/courseIcon';
import { courseTitle } from '../lib/format';
import { useReducedMotion } from '../lib/motion';
import { tintFor } from '../lib/tint';
import styles from './ScopeTag.module.css';

/** Etiqueta que dice de qué materia es la información de una tarjeta (o "Todas las materias"). Cambia con una transición corta. */
export function ScopeTag({ course }: { course?: Course }) {
  const reduce = useReducedMotion();
  const title = course ? courseTitle(course.displayName ?? course.name) : 'Todas las materias';
  const Icon = course ? courseIcon(title) : GraduationCap;
  const tint = course ? tintFor(course.id) : null;
  return (
    <span className={styles.slot}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={course?.id ?? 'all'} className={styles.tag} style={{ ['--c' as string]: tint?.fg ?? 'var(--text)', ['--cbg' as string]: tint?.bg ?? 'var(--panel-row)' }}
          initial={reduce ? false : { opacity: 0, y: 8, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.94, transition: { duration: 0.12 } }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
          <span className={styles.icon}><Icon size={12} aria-hidden="true" /></span>
          <span className={styles.name}>{title}</span>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
