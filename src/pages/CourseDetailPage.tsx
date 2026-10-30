import {
  ArrowTopRightOnSquareIcon, CheckBadgeIcon, ExclamationTriangleIcon, FolderOpenIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'motion/react';
import { useReducedMotion } from '../lib/motion';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useCourse, useCourseContent, useCourseGrades } from '../api/hooks';
import type { Activity } from '../api/types';
import { ActivityDetail } from '../components/ActivityDetail';
import { CourseActivities } from '../components/CourseActivities';
import { CourseContent } from '../components/CourseContent';
import { CourseGrades } from '../components/CourseGrades';
import { CourseInfo } from '../components/CourseInfo';
import { CourseHero, CourseSections, type CourseTab } from '../components/CourseHero';
import { EvaluationCycles } from '../components/EvaluationCycles';
import { ForumViewer, type ForumTarget } from '../components/ForumViewer';
import { FileViewer, type ViewerTarget } from '../components/FileViewer';
import { Card, EmptyState, Skeleton, buttonClass } from '../components/ui';
import type { DashStatus } from '../lib/dashFilters';

const TABS: CourseTab[] = ['activities', 'content', 'grades', 'cycles', 'info'];
type Tab = CourseTab;

export function CourseDetailPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const course = useCourse(id);
  const content = useCourseContent(id);
  const grades = useCourseGrades(id);
  const reduce = useReducedMotion();
  const requested = params.get('tab');
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : 'activities';
  const [status, setStatus] = useState<DashStatus>('all');
  const [selected, setSelected] = useState<Activity | null>(null);
  const [viewing, setViewing] = useState<ViewerTarget | null>(null);
  const [forum, setForum] = useState<ForumTarget | null>(null);
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
      <CourseHero course={data} activities={activities} contentCount={content.data?.length} status={status} onStatus={setStatus} onOpen={setSelected} onTab={setTab}
        action={data.lmsUrl ? (
          <a href={data.lmsUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary')}>
            Abrir en Blackboard<ArrowTopRightOnSquareIcon aria-hidden="true" width={18} height={18} />
            <span className="visually-hidden"> (se abre en otra pestaña)</span>
          </a>
        ) : undefined} />

      <CourseSections tab={tab} tabs={tabs} onChange={setTab} />

      <motion.div key={tab} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}
        initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        {tab === 'activities' && (grades.isPending ? <Skeleton height={240} radius={22} /> : activities.length > 0
          ? <CourseActivities activities={activities} status={status} onStatus={setStatus} onSelect={setSelected} />
          : <Card><EmptyState icon={<SparklesIcon />} title="Sin actividades evaluables">Esta materia todavía no tiene actividades publicadas en el libro de calificaciones.</EmptyState></Card>)}

        {tab === 'content' && (content.isPending ? <Skeleton height={240} radius={22} /> : content.data && content.data.length > 0
          ? <CourseContent items={content.data} open={openFolders} onOpenChange={setOpenFolders}
            onView={(item) => item.handler === 'resource/x-bb-forumlink' ? setForum({ courseId: id, id: item.id, title: item.title }) : setViewing({ courseId: id, id: item.id, title: item.title, handler: item.handler, file: item.file, externalUrl: item.externalUrl, lmsUrl: data.lmsUrl })} />
          : <Card><EmptyState icon={<FolderOpenIcon />} title="Sin contenido visible">No hay contenido disponible para tu inscripción en esta materia.</EmptyState></Card>)}

        {tab === 'grades' && (grades.isPending ? <Skeleton height={240} radius={22} /> : graded.length > 0
          ? <CourseGrades activities={all} onSelect={setSelected} />
          : <Card><EmptyState icon={<CheckBadgeIcon />} title="Sin calificaciones publicadas">Tus notas aparecerán aquí cuando el docente las publique.</EmptyState></Card>)}

        {tab === 'cycles' && <Card>{grades.isPending ? <Skeleton height={240} /> : <EvaluationCycles courseId={id} activities={all} />}</Card>}

        {tab === 'info' && <CourseInfo course={data} />}
      </motion.div>

      <ActivityDetail activityId={selected?.id ?? null} onClose={() => setSelected(null)} />
      <FileViewer target={viewing} onClose={() => setViewing(null)} />
      <ForumViewer target={forum} onClose={() => setForum(null)} />
    </div>
  );
}
