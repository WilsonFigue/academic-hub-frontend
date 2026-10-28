import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { BellRing, BookOpen, CalendarDays, ClipboardList, GraduationCap, House, Search, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivities, useCourses } from '../api/hooks';
import { courseTitle, formatDueRelative } from '../lib/format';
import { courseIcon } from '../lib/courseIcon';
import { tintFor } from '../lib/tint';
import styles from './CommandPalette.module.css';

const PAGES = [
  { to: '/dashboard', label: 'Hoy', icon: House },
  { to: '/courses', label: 'Mis materias', icon: GraduationCap },
  { to: '/activities', label: 'Actividades', icon: ClipboardList },
  { to: '/calendar', label: 'Calendario', icon: CalendarDays },
  { to: '/grades', label: 'Calificaciones', icon: BookOpen },
  { to: '/updates', label: 'Novedades', icon: BellRing },
  { to: '/profile', label: 'Mi perfil', icon: UserRound },
];

/** Buscador global (Ctrl/⌘ + K): páginas, materias y actividades reales del usuario. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const courses = useCourses();
  const activities = useActivities();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); onOpenChange(!open); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => { if (!open) setQuery(''); }, [open]);

  const go = (to: string) => { onOpenChange(false); navigate(to); };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content} aria-describedby={undefined}>
          <Dialog.Title className="visually-hidden">Buscar en Academic Hub</Dialog.Title>
          <Command label="Buscar" className={styles.command} loop>
            <div className={styles.inputRow}>
              <Search size={18} aria-hidden="true" />
              <Command.Input className={styles.input} value={query} onValueChange={setQuery} placeholder="Buscar materias, actividades o secciones…" autoFocus />
              <kbd className={styles.kbd}>Esc</kbd>
            </div>
            <Command.List className={styles.list}>
              <Command.Empty className={styles.empty}>Nada coincide con “{query}”.</Command.Empty>
              <Command.Group heading="Secciones" className={styles.group}>
                {PAGES.map(({ to, label, icon: Icon }) => (
                  <Command.Item key={to} value={`seccion ${label}`} onSelect={() => go(to)} className={styles.item}>
                    <span className={styles.itemIcon}><Icon size={16} aria-hidden="true" /></span>{label}
                  </Command.Item>
                ))}
              </Command.Group>
              {courses.data && courses.data.length > 0 && (
                <Command.Group heading="Materias" className={styles.group}>
                  {courses.data.map((course) => {
                    const title = courseTitle(course.displayName ?? course.name);
                    const Icon = courseIcon(title);
                    const tint = tintFor(course.id);
                    return (
                      <Command.Item key={course.id} value={`materia ${title} ${course.courseCode ?? ''}`} onSelect={() => go(`/courses/${course.id}`)} className={styles.item}>
                        <span className={styles.itemIcon} style={{ background: tint.bg, color: tint.fg }}><Icon size={16} aria-hidden="true" /></span>
                        <span className={styles.itemText}>{title}<small>{course.courseCode}</small></span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )}
              {activities.data && activities.data.length > 0 && (
                <Command.Group heading="Actividades" className={styles.group}>
                  {activities.data.filter((a) => !a.isCalculated).slice(0, 60).map((activity) => (
                    <Command.Item key={activity.id} value={`actividad ${activity.effectiveName ?? activity.name} ${courseTitle(activity.courseName)}`}
                      onSelect={() => go(`/activities?q=${encodeURIComponent(activity.effectiveName ?? activity.name)}&estado=all`)} className={styles.item}>
                      <span className={styles.itemIcon} style={{ color: tintFor(activity.courseId).fg }}><ClipboardList size={16} aria-hidden="true" /></span>
                      <span className={styles.itemText}>{activity.effectiveName ?? activity.name}
                        <small>{courseTitle(activity.courseName)}{activity.dueAt ? ` · ${formatDueRelative(activity.dueAt)}` : ''}</small></span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
