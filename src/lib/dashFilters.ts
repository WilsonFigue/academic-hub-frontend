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

export function matchesStatus(activity: Activity, status: DashStatus): boolean {
  if (status === 'all') return true;
  const group = statusGroup(activity);
  if (status === 'low') {
    const pct = pctOf(activity);
    return group === 'graded' && pct !== null && pct < LOW_THRESHOLD;
  }
  return group === status;
}
