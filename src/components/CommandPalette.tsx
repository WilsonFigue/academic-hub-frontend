import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { ArrowDown, ArrowUp, Bell, BellRing, BookOpen, CalendarDays, ClipboardList, CornerDownLeft, GraduationCap, House, Search, SearchX, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivities, useCourses } from '../api/hooks';
import { courseIcon } from '../lib/courseIcon';
import { courseTitle, daysUntil, formatDueRelative } from '../lib/format';
import { tintFor } from '../lib/tint';
import { Highlight, normalize } from './Filters';
import styles from './CommandPalette.module.css';

const PAGES = [
  { to: '/dashboard', label: 'Hoy', hint: 'Resumen del día', icon: House },
  { to: '/courses', label: 'Mis materias', hint: 'Tus inscripciones', icon: GraduationCap },
  { to: '/activities', label: 'Actividades', hint: 'Tablero por estado', icon: ClipboardList },
  { to: '/calendar', label: 'Calendario', hint: 'Mes, semana y agenda', icon: CalendarDays },
  { to: '/grades', label: 'Calificaciones', hint: 'Notas por materia', icon: BookOpen },
  { to: '/updates', label: 'Novedades', hint: 'Cambios en tu campus', icon: BellRing },
  { to: '/notifications', label: 'Notificaciones', hint: 'Avisos y preferencias', icon: Bell },
  { to: '/profile', label: 'Mi perfil', hint: 'Cuenta y vinculación', icon: UserRound },
];

type Scope = 'all' | 'sections' | 'courses' | 'activities';
const SCOPES: Array<{ id: Scope; label: string }> = [
  { id: 'all', label: 'Todo' }, { id: 'sections', label: 'Secciones' }, { id: 'courses', label: 'Materias' }, { id: 'activities', label: 'Actividades' },
];

/** Orden de relevancia: empieza por el texto > lo contiene en el título > lo contiene en otro campo. */
function rank(needle: string, title: string, extra = ''): number {
  const t = normalize(title);
  if (t.startsWith(needle)) return 0;
  if (t.includes(needle)) return 1;
  return normalize(extra).includes(needle) ? 2 : -1;
}

function Group({ heading, count, children }: { heading: string; count: number; children: ReactNode }) {
  return (
    <Command.Group heading={<span className={styles.heading}>{heading}<b className="tabular">{count}</b></span>} className={styles.group}>{children}</Command.Group>
  );
}

/**
 * Buscador global (Ctrl/⌘ + K). Filtra por tipo (Tab cambia de pestaña), resalta lo escrito, ordena por relevancia, sugiere las
 * próximas entregas cuando está vacío y muestra los atajos de teclado. La lista tiene su propia barra de scroll con desvanecidos.
 */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const courses = useCourses();
  const activities = useActivities();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const [active, setActive] = useState('');
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); onOpenChange(!open); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);
  useEffect(() => { if (!open) { setQuery(''); setScope('all'); } }, [open]);

  const needle = normalize(query.trim());
  const results = useMemo(() => {
    const byRank = <T,>(items: Array<{ r: number; item: T }>) => items.filter((x) => x.r >= 0).sort((a, b) => a.r - b.r).map((x) => x.item);
    const sections = needle ? byRank(PAGES.map((p) => ({ r: rank(needle, p.label, p.hint), item: p }))) : PAGES;
    const matchedCourses = (courses.data ?? []).map((c) => ({ c, title: courseTitle(c.displayName ?? c.name) }));
    const crs = needle ? byRank(matchedCourses.map((x) => ({ r: rank(needle, x.title, x.c.courseCode ?? ''), item: x }))) : matchedCourses;
    const all = (activities.data ?? []).filter((a) => !a.isCalculated);
    const acts = needle
      ? byRank(all.map((a) => ({ r: rank(needle, a.effectiveName ?? a.name, courseTitle(a.courseName)), item: a }))).slice(0, 40)
      : all.filter((a) => a.dueAt && Date.parse(a.dueAt) >= Date.now()).sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!)).slice(0, 5);
    return { sections, courses: crs, activities: acts };
  }, [needle, courses.data, activities.data]);

  const show = (id: Exclude<Scope, 'all'>) => scope === 'all' || scope === id;
  const total = (show('sections') ? results.sections.length : 0) + (show('courses') ? results.courses.length : 0) + (show('activities') ? results.activities.length : 0);

  const first = (show('sections') && results.sections[0] && `seccion-${results.sections[0].to}`)
    || (show('courses') && results.courses[0] && `materia-${results.courses[0].c.id}`)
    || (show('activities') && results.activities[0] && `actividad-${results.activities[0].id}`) || '';
  useEffect(() => { setActive(first); }, [first, query, scope, open]);

  const measure = () => {
    const el = list.current;
    if (el) setEdges({ top: el.scrollTop > 4, bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 4 });
  };
  useEffect(() => { const id = requestAnimationFrame(measure); return () => cancelAnimationFrame(id); }, [query, scope, open, results]);

  const go = (to: string) => { onOpenChange(false); navigate(to); };
  const cycle = (dir: 1 | -1) => setScope((s) => SCOPES[(SCOPES.findIndex((x) => x.id === s) + dir + SCOPES.length) % SCOPES.length]!.id);
  const rowIndex = (() => { let n = 0; return () => Math.min(n++, 9); })();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content} aria-describedby={undefined}>
          <Dialog.Title className="visually-hidden">Buscar en Academic Hub</Dialog.Title>
          <Command label="Buscar" className={styles.command} shouldFilter={false} loop value={active} onValueChange={setActive}
            onKeyDown={(event) => { if (event.key === 'Tab') { event.preventDefault(); cycle(event.shiftKey ? -1 : 1); } }}>
            <div className={styles.inputRow}>
              <span className={styles.searchIcon}><Search size={19} aria-hidden="true" /></span>
              <Command.Input className={styles.input} value={query} onValueChange={setQuery} placeholder="Busca una materia, una actividad o una sección…" autoFocus />
              {query ? (
                <button type="button" className={styles.clear} onMouseDown={(event) => event.preventDefault()} onClick={() => setQuery('')} aria-label="Borrar búsqueda"><X size={16} aria-hidden="true" /></button>
              ) : <kbd className={styles.kbd}>Esc</kbd>}
            </div>

            <div className={styles.scopes} role="tablist" aria-label="Tipo de resultado">
              {SCOPES.map((s) => (
                <button key={s.id} type="button" role="tab" aria-selected={scope === s.id} className={styles.scope} onMouseDown={(event) => event.preventDefault()} onClick={() => setScope(s.id)}>{s.label}</button>
              ))}
              <span className={styles.total} aria-live="polite">{total} {total === 1 ? 'resultado' : 'resultados'}</span>
            </div>

            <div className={styles.listWrap} data-top={edges.top} data-bottom={edges.bottom}>
              <Command.List ref={list} className={styles.list} onScroll={measure}>
                <Command.Empty className={styles.empty}>
                  <span className={styles.emptyIcon}><SearchX size={26} aria-hidden="true" /></span>
                  <strong>Nada coincide con “{query}”</strong>
                  <small>Prueba con otra palabra, o cambia de pestaña con <kbd>Tab</kbd>.</small>
                </Command.Empty>

                {show('sections') && results.sections.length > 0 && (
                  <Group heading="Secciones" count={results.sections.length}>
                    {results.sections.map(({ to, label, hint, icon: Icon }) => (
                      <Command.Item key={to} value={`seccion-${to}`} onSelect={() => go(to)} className={styles.item} style={{ ['--i' as string]: rowIndex() }}>
                        <span className={styles.disc}><Icon size={17} aria-hidden="true" /></span>
                        <span className={styles.text}><strong><Highlight text={label} query={query} /></strong><small>{hint}</small></span>
                        <CornerDownLeft size={15} className={styles.enter} aria-hidden="true" />
                      </Command.Item>
                    ))}
                  </Group>
                )}

                {show('courses') && results.courses.length > 0 && (
                  <Group heading="Materias" count={results.courses.length}>
                    {results.courses.map(({ c, title }) => {
                      const Icon = courseIcon(title);
                      const tint = tintFor(c.id);
                      return (
                        <Command.Item key={c.id} value={`materia-${c.id}`} onSelect={() => go(`/courses/${c.id}`)} className={styles.item} style={{ ['--i' as string]: rowIndex(), ['--c' as string]: tint.fg, ['--cbg' as string]: tint.bg }}>
                          <span className={`${styles.disc} ${styles.discTint}`}><Icon size={17} aria-hidden="true" /></span>
                          <span className={styles.text}><strong><Highlight text={title} query={query} /></strong><small>{[c.courseCode, `${c.activityCount} actividades`].filter(Boolean).join(' · ')}</small></span>
                          <CornerDownLeft size={15} className={styles.enter} aria-hidden="true" />
                        </Command.Item>
                      );
                    })}
                  </Group>
                )}

                {show('activities') && results.activities.length > 0 && (
                  <Group heading={needle ? 'Actividades' : 'Próximas entregas'} count={results.activities.length}>
                    {results.activities.map((a) => {
                      const tint = tintFor(a.courseId);
                      const soon = a.dueAt !== null && Date.parse(a.dueAt) >= Date.now() && daysUntil(a.dueAt) <= 2;
                      const name = a.effectiveName ?? a.name;
                      return (
                        <Command.Item key={a.id} value={`actividad-${a.id}`} onSelect={() => go(`/activities?materia=${a.courseId}&q=${encodeURIComponent(name)}`)} className={styles.item}
                          style={{ ['--i' as string]: rowIndex(), ['--c' as string]: tint.fg, ['--cbg' as string]: tint.bg }}>
                          <span className={`${styles.disc} ${styles.discTint}`}><ClipboardList size={17} aria-hidden="true" /></span>
                          <span className={styles.text}><strong><Highlight text={name} query={query} /></strong><small>{courseTitle(a.courseName)}</small></span>
                          {a.dueAt && <span className={`${styles.due} ${soon ? styles.dueSoon : ''}`}>{formatDueRelative(a.dueAt)}</span>}
                          <CornerDownLeft size={15} className={styles.enter} aria-hidden="true" />
                        </Command.Item>
                      );
                    })}
                  </Group>
                )}
              </Command.List>
            </div>

            <div className={styles.footer} aria-hidden="true">
              <span><kbd><ArrowUp size={12} /></kbd><kbd><ArrowDown size={12} /></kbd> navegar</span>
              <span><kbd><CornerDownLeft size={12} /></kbd> abrir</span>
              <span><kbd>Tab</kbd> cambiar de pestaña</span>
              <span className={styles.footerEnd}><kbd>Esc</kbd> cerrar</span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
