import { BarChart3, Check, FolderOpen, GraduationCap, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { Course } from '../api/types';
import { courseIcon } from '../lib/courseIcon';
import { courseTitle, formatDueRelative } from '../lib/format';
import { tintFor } from '../lib/tint';
import styles from './CourseDial.module.css';

const cx = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(' ');

/**
 * Botón flotante de materias (abanico hacia arriba). El botón principal de cada materia filtra el Inicio; a su derecha
 * hay dos accesos: el contenido de la materia y sus notas. Se abre al pasar el mouse y se cierra al salir; un clic lo
 * deja fijo (táctil y teclado). Escape o tocar fuera lo cierra. Se dibuja en <body> para que ningún ancestro con
 * transformaciones rompa su posición fija.
 */
export function CourseDial({ courses, value, onChange }: { courses: Course[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const reduce = useReducedMotion();
  const active = courses.find((course) => course.id === value);
  const activeTitle = active ? courseTitle(active.displayName ?? active.name) : null;
  const activeTint = active ? tintFor(active.id) : null;
  const ActiveIcon = active ? courseIcon(activeTitle!) : GraduationCap;

  const closeAll = () => { window.clearTimeout(timer.current); setOpen(false); setPinned(false); };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeAll(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (courses.length === 0) return null;
  const list = courses.slice(0, 8);
  const rows = list.length + (value ? 1 : 0);
  const spring = (index: number) => ({ type: 'spring' as const, stiffness: 430, damping: 30, delay: reduce ? 0 : (rows - 1 - index) * 0.045 });
  const onFab = () => {
    if (pinned) { closeAll(); return; }
    setPinned(true); setOpen(true);
  };

  return createPortal(
    <>
      <AnimatePresence>
        {open && pinned && <motion.button type="button" className={styles.scrim} aria-label="Cerrar materias" onClick={closeAll}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />}
      </AnimatePresence>

      <div className={styles.dial}
        onPointerEnter={(event) => { if (event.pointerType === 'mouse') { window.clearTimeout(timer.current); setOpen(true); } }}
        onPointerLeave={(event) => { if (event.pointerType === 'mouse' && !pinned) { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(false), 280); } }}>
        <AnimatePresence>
          {open && (
            <motion.ul className={styles.list} aria-label="Materias" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
              {list.map((course, index) => {
                const title = courseTitle(course.displayName ?? course.name);
                const tint = tintFor(course.id);
                const Icon = courseIcon(title);
                const on = course.id === value;
                return (
                  <motion.li key={course.id} className={styles.row}
                    initial={reduce ? false : { opacity: 0, y: 22, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={spring(index)}>
                    <button type="button" aria-pressed={on} className={cx(styles.item, on && styles.itemOn)} style={{ ['--c' as string]: tint.fg, ['--cbg' as string]: tint.bg }}
                      onClick={() => { onChange(on ? '' : course.id); closeAll(); }}>
                      <span className={styles.itemIcon}><Icon size={19} aria-hidden="true" /></span>
                      <span className={styles.itemText}>
                        <strong>{title}</strong>
                        <small>{course.activityCount} {course.activityCount === 1 ? 'actividad' : 'actividades'}{course.nextDueAt ? ` · próxima ${formatDueRelative(course.nextDueAt)}` : ''}</small>
                      </span>
                      {on && <Check size={17} className={styles.itemCheck} aria-hidden="true" />}
                    </button>
                    <Link to={`/courses/${course.id}?tab=content`} className={styles.act} aria-label={`Contenido de ${title}`} title="Contenido" onClick={closeAll}><FolderOpen size={17} aria-hidden="true" /></Link>
                    <Link to={`/courses/${course.id}?tab=grades`} className={styles.act} aria-label={`Notas de ${title}`} title="Notas" onClick={closeAll}><BarChart3 size={17} aria-hidden="true" /></Link>
                  </motion.li>
                );
              })}
              {value && (
                <motion.li className={styles.row} initial={reduce ? false : { opacity: 0, y: 22, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} transition={spring(rows - 1)}>
                  <button type="button" className={cx(styles.item, styles.itemAll)} onClick={() => { onChange(''); closeAll(); }}>
                    <span className={styles.itemIcon}><GraduationCap size={19} aria-hidden="true" /></span>
                    <span className={styles.itemText}><strong>Todas las materias</strong><small>Quitar el filtro de materia</small></span>
                  </button>
                </motion.li>
              )}
            </motion.ul>
          )}
        </AnimatePresence>

        <motion.button type="button" className={cx(styles.fab, active && styles.fabActive)} aria-expanded={open} aria-haspopup="true"
          aria-label={active ? `Materia filtrada: ${activeTitle}. Abrir materias` : 'Abrir materias'} onClick={onFab} whileTap={{ scale: 0.95 }}
          style={active && activeTint ? { ['--c' as string]: activeTint.fg } : undefined}
          initial={reduce ? false : { opacity: 0, y: 30, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 26, delay: 0.6 }}>
          <span className={styles.fabIcon}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={open ? 'x' : active ? active.id : 'g'} initial={reduce ? false : { rotate: -90, opacity: 0, scale: 0.6 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0.6 }} transition={{ duration: 0.18 }}>
                {open ? <X size={22} aria-hidden="true" /> : <ActiveIcon size={22} aria-hidden="true" />}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className={styles.fabLabel}>{active ? activeTitle : 'Materias'}</span>
        </motion.button>
      </div>
    </>,
    document.body,
  );
}
