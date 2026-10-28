import {
  ArrowLeftIcon, ArrowTopRightOnSquareIcon, CheckBadgeIcon, ExclamationTriangleIcon, FolderOpenIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useCourse, useCourseContent, useCourseGrades } from '../api/hooks';
import type { Activity } from '../api/types';
import { ActivityDetail } from '../components/ActivityDetail';
import { ActivityList } from '../components/ActivityList';
import { ContentTree } from '../components/ContentTree';
import { EvaluationCycles } from '../components/EvaluationCycles';
import { Badge, Card, EmptyState, Skeleton, buttonClass } from '../components/ui';
import { courseTitle, formatDate, formatDateTime, formatDueRelative } from '../lib/format';
import { monogram, tintFor } from '../lib/tint';
import styles from './Page.module.css';

const TABS = ['activities', 'content', 'grades', 'cycles', 'info'] as const;
type Tab = (typeof TABS)[number];

export function CourseDetailPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const course = useCourse(id);
  const content = useCourseContent(id);
  const grades = useCourseGrades(id);
  const reduce = useReducedMotion();
  const requested = params.get('tab');
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : 'activities';
  const [selected, setSelected] = useState<Activity | null>(null);
  // Carpetas abiertas del árbol: se conservan al cambiar de pestaña o abrir un detalle.
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  if (course.isPending) return <div><Skeleton width={120} height={16} /><div style={{ marginTop: 16 }}><Skeleton width="60%" height={40} /></div><div style={{ marginTop: 32 }}><Skeleton height={360} radius={16} /></div></div>;
  if (course.error || !course.data) {
    const missing = course.error instanceof ApiError && course.error.status === 404;
    return (
      <Card><EmptyState tone="danger" icon={<ExclamationTriangleIcon />} title={missing ? 'Materia no encontrada' : 'No pudimos cargar la materia'}
        action={<Link to="/courses" className={buttonClass('secondary')}>Volver a mis materias</Link>}>
        {missing ? 'Esta materia no existe o no forma parte de tus inscripciones.' : course.error?.message}
      </EmptyState></Card>
    );
  }

  const data = course.data;
  const title = courseTitle(data.displayName ?? data.name);
  const tone = tintFor(data.id);
  const all = grades.data ?? [];
  const activities = all.filter((activity) => !activity.isCalculated)
    .sort((a, b) => (a.dueAt ? Date.parse(a.dueAt) : Infinity) - (b.dueAt ? Date.parse(b.dueAt) : Infinity));
  const graded = all.filter((activity) => activity.score !== null || activity.isCalculated);
  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: 'activities', label: 'Actividades', count: activities.length },
    { id: 'content', label: 'Contenido', count: content.data?.length },
    { id: 'grades', label: 'Calificaciones', count: graded.length },
    { id: 'cycles', label: 'Ciclos' },
    { id: 'info', label: 'Información' },
  ];
  const setTab = (next: Tab) => setParams(next === 'activities' ? {} : { tab: next }, { replace: true });

  return (
    <div>
      <Link to="/courses" className={styles.backLink}><ArrowLeftIcon aria-hidden="true" />Mis materias</Link>
      <header className={styles.header}>
        <div className={styles.courseHead}>
          <span className={styles.courseHeadMark} style={{ background: tone.bg, color: tone.fg }} aria-hidden="true">{monogram(title)}</span>
          <div style={{ minWidth: 0 }}>
            <h1 className={styles.title}>{title}</h1>
            <div className={styles.metaRow}>
              <span className={styles.metaChip}>{data.term?.name ?? 'Sin período'}</span>
              {data.courseCode && <span className={styles.metaChip}>{data.courseCode}</span>}
              <span className={styles.metaChip}><Badge tone={data.isAvailable === false ? 'neutral' : 'success'}>{data.isAvailable === false ? 'No disponible' : 'Disponible'}</Badge></span>
              {data.nextDueAt && <span className={styles.metaChip}>Próximo vencimiento {formatDateTime(data.nextDueAt)} ({formatDueRelative(data.nextDueAt)})</span>}
            </div>
          </div>
        </div>
        {data.lmsUrl && (
          <a href={data.lmsUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary')}>
            Abrir en Blackboard<ArrowTopRightOnSquareIcon aria-hidden="true" width={18} height={18} />
            <span className="visually-hidden"> (se abre en otra pestaña)</span>
          </a>
        )}
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Secciones de la materia">
        {tabs.map((item) => (
          <button key={item.id} type="button" role="tab" id={`tab-${item.id}`} aria-controls={`panel-${item.id}`}
            aria-selected={tab === item.id} className={styles.tab} onClick={() => setTab(item.id)}>
            {item.label}{item.count !== undefined && <span className={styles.tabCount}>{item.count}</span>}
            {tab === item.id && <motion.span layoutId="course-tab" className={styles.tabLine} transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          </button>
        ))}
      </div>

      <motion.div key={tab} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}
        initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
        <Card>
          {tab === 'activities' && (grades.isPending ? <Skeleton height={240} /> : activities.length > 0
            ? <ActivityList activities={activities} showCourse={false} onSelect={setSelected} />
            : <EmptyState icon={<SparklesIcon />} title="Sin actividades evaluables">Esta materia todavía no tiene actividades publicadas en el libro de calificaciones.</EmptyState>)}

          {tab === 'content' && (content.isPending ? <Skeleton height={240} /> : content.data && content.data.length > 0
            ? <ContentTree items={content.data} open={openFolders} onOpenChange={setOpenFolders} />
            : <EmptyState icon={<FolderOpenIcon />} title="Sin contenido visible">No hay contenido disponible para tu inscripción en esta materia.</EmptyState>)}

          {tab === 'grades' && (grades.isPending ? <Skeleton height={240} /> : graded.length > 0
            ? <ActivityList activities={graded} showCourse={false} showScore onSelect={setSelected} />
            : <EmptyState icon={<CheckBadgeIcon />} title="Sin calificaciones publicadas">Tus notas aparecerán aquí cuando el docente las publique.</EmptyState>)}

          {tab === 'cycles' && (grades.isPending ? <Skeleton height={240} /> : <EvaluationCycles courseId={id} activities={all} />)}

          {tab === 'info' && (
            <dl className={styles.dl}>
              <div><dt>Nombre oficial</dt><dd>{data.name}</dd></div>
              <div><dt>Código</dt><dd>{data.courseCode ?? '—'}</dd></div>
              <div><dt>Período</dt><dd>{data.term ? `${data.term.name} (${formatDate(data.term.startAt)} – ${formatDate(data.term.endAt)})` : '—'}</dd></div>
              <div><dt>Rol</dt><dd>{data.enrollment.role ?? '—'}</dd></div>
              <div><dt>Inscripción</dt><dd>{formatDate(data.enrollment.enrolledAt)}</dd></div>
              <div><dt>Último acceso en Blackboard</dt><dd>{formatDateTime(data.enrollment.lastAccessAt)}</dd></div>
              <div><dt>Datos actualizados</dt><dd>{formatDateTime(data.lastSeenAt)}</dd></div>
              {data.description && <div style={{ gridColumn: '1 / -1' }}><dt>Descripción</dt><dd>{data.description}</dd></div>}
            </dl>
          )}
        </Card>
      </motion.div>

      <ActivityDetail activityId={selected?.id ?? null} onClose={() => setSelected(null)} />
    </div>
  );
}
