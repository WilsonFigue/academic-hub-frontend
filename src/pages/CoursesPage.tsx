import { GraduationCap, TriangleAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import { useCourses } from '../api/hooks';
import type { Course } from '../api/types';
import { CourseCard } from '../components/CourseCard';
import { TermProgress } from '../components/TermProgress';
import { Button, Card, EmptyState, Skeleton } from '../components/ui';
import { courseTitle, formatDate } from '../lib/format';
import { tintFor } from '../lib/tint';
import page from './Page.module.css';

export function CoursesPage() {
  const { data, isPending, error, refetch } = useCourses();
  const reduce = useReducedMotion();
  const all = (data ?? []).slice().sort((a, b) => courseTitle(a.name).localeCompare(courseTitle(b.name), 'es'));

  // Agrupadas por período real de la inscripción (nunca por el nombre de la materia).
  const groups = new Map<string, { label: string; range: string; courses: Course[] }>();
  for (const course of all) {
    const key = course.term?.id ?? 'none';
    const group = groups.get(key) ?? { label: course.term?.name ?? 'Sin período', range: course.term ? `${formatDate(course.term.startAt)} – ${formatDate(course.term.endAt)}` : '', courses: [] };
    group.courses.push(course);
    groups.set(key, group);
  }

  return (
    <div>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 'var(--fs-title)', fontWeight: 700, letterSpacing: '-0.02em' }}>Mis materias</h1>
        <p style={{ marginTop: 6, color: 'var(--muted)' }}>Tus inscripciones del campus virtual. Cada materia tiene su color y su icono en toda la aplicación.</p>
      </header>

      {isPending && <div className={page.courseGrid}>{[0, 1, 2].map((n) => <Skeleton key={n} height={236} radius={20} />)}</div>}
      {error && <Card><EmptyState tone="danger" icon={<TriangleAlert />} title="No pudimos cargar tus materias"
        action={<Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>}>{error.message}</EmptyState></Card>}
      {data && all.length === 0 && <Card><EmptyState icon={<GraduationCap />} title="Aún no hay materias">Tus materias aparecerán cuando se importen tus inscripciones.</EmptyState></Card>}

      <TermProgress />

      <div className={page.stack}>
        {[...groups.entries()].map(([key, group]) => (
          <section key={key} aria-labelledby={`term-${key}`}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
              <h2 id={`term-${key}`} style={{ fontSize: 'var(--fs-section)', fontWeight: 700 }}>{group.label}</h2>
              {group.range && <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--muted)' }}>{group.range}</span>}
              <span style={{ display: 'flex', gap: 4, marginLeft: 'auto' }} aria-hidden="true">
                {group.courses.map((c) => <span key={c.id} style={{ width: 10, height: 10, borderRadius: 5, background: tintFor(c.id).fg }} />)}
              </span>
            </div>
            <div className={page.courseGrid}>
              {group.courses.map((course, index) => (
                <motion.div key={course.id} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.06 }}>
                  <CourseCard course={course} showShortcuts />
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
