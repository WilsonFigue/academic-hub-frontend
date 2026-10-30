import { AlarmClock, BookOpenCheck, CalendarClock, CheckCircle2, Clock, FileCheck2, FilePlus2, Hourglass, Megaphone, RefreshCw, type LucideIcon } from 'lucide-react';
import type { NotificationKind } from '../api/types';

/** Cómo se ve y se llama cada tipo de aviso. El color sale de los tokens de la app. */
export const KIND_META: Record<NotificationKind, { label: string; hint: string; icon: LucideIcon; color: string }> = {
  guide_ready: { label: 'Guía de estudio lista', hint: 'Cuando la IA termina una guía de estudio.', icon: BookOpenCheck, color: 'var(--mint)' },
  homework_ready: { label: 'Tarea lista', hint: 'Cuando la IA termina el borrador de una tarea.', icon: FileCheck2, color: 'var(--mint)' },
  activity_new: { label: 'Actividad nueva', hint: 'Cuando el docente publica una actividad.', icon: FilePlus2, color: 'var(--sky)' },
  due_changed: { label: 'Cambio de fecha', hint: 'Cuando se mueve la fecha de entrega.', icon: CalendarClock, color: 'var(--amber)' },
  due_tomorrow: { label: 'Vence mañana', hint: 'Un día antes de cada entrega o examen pendiente.', icon: Clock, color: 'var(--amber)' },
  due_today: { label: 'Vence hoy', hint: 'El mismo día de la entrega o el examen.', icon: AlarmClock, color: 'var(--accent)' },
  due_soon: { label: 'Vence en pocas horas', hint: 'Cuando faltan 3 horas o menos.', icon: Hourglass, color: 'var(--bad)' },
  grade_new: { label: 'Nota nueva', hint: 'Cuando el docente califica una actividad.', icon: CheckCircle2, color: 'var(--ok)' },
  grade_changed: { label: 'Nota modificada', hint: 'Cuando cambia una nota ya publicada.', icon: RefreshCw, color: 'var(--warn)' },
  announcement_new: { label: 'Anuncio nuevo', hint: 'Cuando el docente publica un anuncio.', icon: Megaphone, color: 'var(--teal)' },
};

/** Agrupación para la pantalla de preferencias. */
export const KIND_GROUPS: Array<{ title: string; kinds: NotificationKind[] }> = [
  { title: 'Recordatorios de entrega', kinds: ['due_tomorrow', 'due_today', 'due_soon'] },
  { title: 'Actividades', kinds: ['activity_new', 'due_changed'] },
  { title: 'Notas y anuncios', kinds: ['grade_new', 'grade_changed', 'announcement_new'] },
  { title: 'Inteligencia artificial', kinds: ['guide_ready', 'homework_ready'] },
];
