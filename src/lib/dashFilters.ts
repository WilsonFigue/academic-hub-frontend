import type { Activity } from '../api/types';
import { statusGroup } from './status';

/** Filtro de estado del Inicio: lo comparten las insignias, la línea del ciclo, el calendario y las gráficas. */
export type DashStatus = 'all' | 'pending' | 'overdue' | 'submitted' | 'graded' | 'low' | 'nodate';

/** Una nota por debajo de este porcentaje se considera baja (umbral único de la interfaz). */
export const LOW_THRESHOLD = 60;

/** Porcentaje obtenido; null si la actividad no tiene puntaje máximo numérico. */
export function pctOf(activity: Activity): number | null {
  const max = Number(activity.pointsPossible);
  if (!(max > 0)) return null;
  return Math.min(100, (Number(activity.score ?? 0) / max) * 100);
}

/** Nombre y color de cada estado (se usan en las etiquetas de las tarjetas filtradas). */
export const STATUS_INFO: Record<Exclude<DashStatus, 'all'>, { label: string; color: string }> = {
  pending: { label: 'Por entregar', color: 'var(--st-pending-ink)' },
  overdue: { label: 'Vencidas o cero', color: 'var(--bad)' },
  submitted: { label: 'Entregadas', color: 'var(--sky)' },
  graded: { label: 'Calificadas', color: 'var(--ok)' },
  low: { label: 'Notas bajas', color: 'var(--bad)' },
  nodate: { label: 'Sin fecha', color: 'var(--faint)' },
};

/**
 * Pertenencia a un estado. Un cero automático es una entrega vencida (se pinta en rojo), así que cuenta en "vencidas o
 * cero" y no en "calificadas"; así los números de los chips, del pastel y de las marcas cuadran entre sí.
 */
export function matchesStatus(activity: Activity, status: DashStatus): boolean {
  if (status === 'all') return true;
  const group = statusGroup(activity);
  if (status === 'overdue') return group === 'overdue' || activity.isAutoZero;
  if (status === 'graded') return group === 'graded' && !activity.isAutoZero;
  if (status === 'low') {
    const pct = pctOf(activity);
    return group === 'graded' && pct !== null && pct < LOW_THRESHOLD;
  }
  return group === status;
}

export type StatusKey = Exclude<DashStatus, 'all' | 'low'>;
export const STATUS_ORDER: StatusKey[] = ['pending', 'overdue', 'submitted', 'graded', 'nodate'];

/** Estado único de una actividad (el que usan los chips, la cinta y los grupos de la materia). */
export function statusKeyOf(activity: Activity): StatusKey {
  if (matchesStatus(activity, 'overdue')) return 'overdue';
  if (matchesStatus(activity, 'graded')) return 'graded';
  if (matchesStatus(activity, 'submitted')) return 'submitted';
  if (matchesStatus(activity, 'nodate')) return 'nodate';
  return 'pending';
}

/** Promedio real: puntos obtenidos entre puntos posibles de lo calificado (sin columnas calculadas ni exentas). */
export function averagePct(activities: Activity[]): number | null {
  let got = 0; let max = 0;
  for (const a of activities) {
    if (a.isCalculated || a.isExempt || a.countsInGrade === false) continue;
    const possible = Number(a.pointsPossible);
    if (!(possible > 0) || (a.score === null && !a.isAutoZero)) continue;
    got += Number(a.score ?? 0); max += possible;
  }
  return max > 0 ? (got / max) * 100 : null;
}
