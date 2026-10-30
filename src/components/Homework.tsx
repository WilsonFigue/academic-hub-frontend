import { ArrowUpRight, BookCheck, FileSpreadsheet, FileText, Shapes } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useHomework } from '../api/hooks';
import styles from './Homework.module.css';

/** Cómo se ve cada tipo de archivo de una tarea. */
export const HOMEWORK_KIND = {
  pdf: { label: 'PDF', icon: FileText, color: '#e5392f' },
  docx: { label: 'Word', icon: FileText, color: '#2f7cf6' },
  xlsx: { label: 'Excel', icon: FileSpreadsheet, color: '#0f9f6e' },
  ggb: { label: 'GeoGebra', icon: Shapes, color: '#6557d2' },
} as const;

/**
 * Apartado dentro de la actividad: solo aparece cuando la rutina ya dejó la tarea lista. Abre la vista con los archivos.
 * (Si la tarea sigue en cola, falló o la actividad es un examen, no se muestra nada: el detalle queda en la bitácora de IA del servidor.)
 */
export function HomeworkBlock({ activityId }: { activityId: string }) {
  const { data } = useHomework(activityId);
  const run = data?.homework;
  if (!run || run.status !== 'ready' || run.deliverables.length === 0) return null;
  return (
    <Link to={`/activities/${activityId}/homework`} className={styles.block}>
      <span className={styles.icon} aria-hidden="true"><BookCheck size={22} /></span>
      <span className={styles.text}>
        <b>Tarea lista para enviar</b>
        <small>{run.deliverables.length} {run.deliverables.length === 1 ? 'archivo' : 'archivos'} · toca para abrirla</small>
      </span>
      <span className={styles.go} aria-hidden="true"><ArrowUpRight size={18} /></span>
    </Link>
  );
}
