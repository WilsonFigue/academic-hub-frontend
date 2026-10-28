import type { Activity } from '../api/types';
import { daysUntil } from './format';

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

type StatusInput = Pick<Activity, 'isExempt' | 'isAutoZero' | 'status' | 'isSubmitted' | 'dueAt' | 'isCalculated'> & { score?: string | null };

/**
 * Estado legible de una actividad a partir de los datos importados:
 * - "Entregada" sale de los intentos (isSubmitted), no de grade.status.
 * - PAST_DUE_AUTO_ZERO es un cero automático, no una nota del docente.
 * - La ausencia de nota NO implica que falte la entrega: sin evidencia se dice "Sin información".
 */
export function activityStatus(activity: StatusInput): { label: string; tone: Tone } {
  if (activity.isCalculated) return { label: 'Columna calculada', tone: 'neutral' };
  if (activity.isExempt) return { label: 'Exenta', tone: 'neutral' };
  if (activity.isAutoZero) return { label: 'Cero por vencimiento', tone: 'warning' };
  if (activity.status === 'GRADED') return { label: 'Calificada', tone: 'success' };
  if (activity.isSubmitted) return { label: activity.status === 'NEEDS_GRADING' ? 'Entregada · por calificar' : 'Entregada', tone: 'info' };
  const overdue = activity.dueAt !== null && new Date(activity.dueAt).getTime() < Date.now();
  if (overdue) return activity.isSubmitted === false ? { label: 'Vencida sin entrega', tone: 'danger' } : { label: 'Fecha vencida', tone: 'warning' };
  if (activity.dueAt) {
    const days = daysUntil(activity.dueAt);
    return { label: days <= 2 ? 'Vence pronto' : 'Pendiente', tone: 'accent' };
  }
  return { label: 'Sin fecha', tone: 'neutral' };
}

/** Grupo de filtrado (coherente con activityStatus). */
export type StatusGroup = 'pending' | 'submitted' | 'graded' | 'overdue' | 'nodate' | 'calculated';

export function statusGroup(activity: StatusInput): StatusGroup {
  if (activity.isCalculated) return 'calculated';
  if (activity.status === 'GRADED' || activity.isAutoZero) return 'graded';
  if (activity.isSubmitted) return 'submitted';
  if (!activity.dueAt) return 'nodate';
  return new Date(activity.dueAt).getTime() < Date.now() ? 'overdue' : 'pending';
}

export function syncStatus(status: string | undefined): { label: string; tone: Tone } {
  switch (status) {
    case 'succeeded': return { label: 'Importación completa', tone: 'success' };
    case 'partial': return { label: 'Importación parcial', tone: 'warning' };
    case 'failed': return { label: 'Importación fallida', tone: 'danger' };
    case 'running': return { label: 'Importando…', tone: 'info' };
    case 'needs_reauth': return { label: 'Requiere reautenticación', tone: 'warning' };
    default: return { label: 'Sin importaciones', tone: 'neutral' };
  }
}

/**
 * Estado de la cuenta universitaria. "active" significa identidad vinculada y verificada en la última importación,
 * no una sesión de Blackboard abierta (Academic Hub no conserva sesiones).
 */
export function linkStatus(status: string | undefined): { label: string; tone: Tone; detail: string } {
  switch (status) {
    case 'active': return { label: 'Vinculada', tone: 'success', detail: 'Identidad verificada en la última importación. Academic Hub no mantiene una sesión abierta en Blackboard.' };
    case 'needs_reauth': return { label: 'Requiere reautenticación', tone: 'warning', detail: 'Inicia sesión de nuevo en Blackboard mediante una importación para actualizar tus datos.' };
    case 'pending': return { label: 'Vinculación pendiente', tone: 'info', detail: 'La identidad aún no se ha verificado.' };
    case 'error': return { label: 'Error de vinculación', tone: 'danger', detail: 'La última verificación falló.' };
    case 'revoked': return { label: 'Desvinculada', tone: 'neutral', detail: 'La cuenta ya no está vinculada.' };
    default: return { label: 'Sin vincular', tone: 'neutral', detail: 'Aún no hay una cuenta universitaria vinculada.' };
  }
}
