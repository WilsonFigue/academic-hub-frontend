// Formato centralizado. Blackboard entrega instantes UTC; todo se presenta en la hora de El Salvador.
// Regla: cualquier cálculo de "días" usa el día calendario local (dayKey), nunca restas de milisegundos sueltas.
export const TIMEZONE = 'America/El_Salvador';
const DAY_MS = 86_400_000;

const dateFormatter = new Intl.DateTimeFormat('es-SV', { timeZone: TIMEZONE, day: 'numeric', month: 'short', year: 'numeric' });
const shortFormatter = new Intl.DateTimeFormat('es-SV', { timeZone: TIMEZONE, weekday: 'short', day: 'numeric', month: 'short' });
const longDayFormatter = new Intl.DateTimeFormat('es-SV', { timeZone: TIMEZONE, weekday: 'long', day: 'numeric', month: 'long' });
const timeFormatter = new Intl.DateTimeFormat('es-SV', { timeZone: TIMEZONE, hour: 'numeric', minute: '2-digit' });
const dateTimeFormatter = new Intl.DateTimeFormat('es-SV', { timeZone: TIMEZONE, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const keyFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const hourFormatter = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, hour: 'numeric', hourCycle: 'h23' });
const relative = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

export const formatDate = (iso: string | null | undefined) => (iso ? dateFormatter.format(new Date(iso)) : '—');
export const formatShortDate = (iso: string | null | undefined) => (iso ? shortFormatter.format(new Date(iso)) : '—');
/** Primera letra en mayúscula (sin capitalizar conectores como "de"). */
export const capitalize = (value: string) => value.charAt(0).toLocaleUpperCase("es") + value.slice(1);
export const formatLongDay = (date: Date) => capitalize(longDayFormatter.format(date));
export const formatTime = (iso: string | null | undefined) => (iso ? timeFormatter.format(new Date(iso)) : '');
export const formatDateTime = (iso: string | null | undefined) => (iso ? dateTimeFormatter.format(new Date(iso)) : '—');

/** Día calendario en El Salvador como "AAAA-MM-DD" (clave estable para agrupar y comparar). */
export function dayKey(value: Date | string): string {
  return keyFormatter.format(typeof value === 'string' ? new Date(value) : value);
}

/** Fecha (mediodía UTC) que representa un día calendario; segura para sumar días sin cruces de zona. */
export function dayFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function addDays(key: string, days: number): string {
  return dayKey(new Date(dayFromKey(key).getTime() + days * DAY_MS));
}

/** Diferencia en días calendario (El Salvador) entre hoy y la fecha: 0 = hoy, 1 = mañana, -1 = ayer. */
export function daysUntil(iso: string): number {
  return Math.round((dayFromKey(dayKey(iso)).getTime() - dayFromKey(dayKey(new Date())).getTime()) / DAY_MS);
}

/** Texto relativo por días calendario: "hoy", "mañana", "en 3 días", "hace 2 días". */
export function formatDueRelative(iso: string | null | undefined): string {
  if (!iso) return '';
  const days = daysUntil(iso);
  if (days === 0) return new Date(iso).getTime() < Date.now() ? 'hoy (ya venció)' : 'hoy';
  return relative.format(days, 'day');
}

/** Texto relativo fino para marcas de tiempo pasadas ("hace 5 minutos"). */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  if (abs < 3_600_000) return relative.format(Math.round(diff / 60_000), 'minute');
  if (abs < DAY_MS) return relative.format(Math.round(diff / 3_600_000), 'hour');
  return relative.format(daysUntil(iso), 'day');
}

export function formatScore(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('es-SV', { maximumFractionDigits: 2 }) : String(value);
}

/** Saludo según la hora local de El Salvador. */
export function greeting(): string {
  const hour = Number(hourFormatter.format(new Date()));
  if (hour < 5) return 'Buenas noches';
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const ROMAN = /^(i{1,3}|iv|v|vi{1,3}|ix|x)$/i;
const CONNECTORS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'a', 'para', 'por', 'con', 'o', 'u', 'al']);

/**
 * Nombre legible de materia sin el sufijo de sección y período ("FÍSICA III 01 02-2026" → "Física III").
 * Conserva números romanos y siglas; los conectores van en minúscula salvo al inicio.
 */
export function courseTitle(name: string): string {
  const base = name.replace(/\s+\d{1,3}\s+\d{2}-\d{4}\s*$/, '').trim() || name;
  const isAllCaps = base === base.toLocaleUpperCase('es');
  if (!isAllCaps) return base; // Respetar nombres que ya vienen con mayúsculas y minúsculas.
  return base.split(/\s+/).map((word, index) => {
    const lower = word.toLocaleLowerCase('es');
    if (ROMAN.test(word)) return word.toLocaleUpperCase('es');
    if (index > 0 && CONNECTORS.has(lower)) return lower;
    // Sigla sin vocales (p. ej. "TIC" no; "HTML", "SQL" sí): se conserva en mayúsculas.
    if (word.length >= 2 && !/[aeiouáéíóú]/i.test(word)) return word;
    return lower.charAt(0).toLocaleUpperCase('es') + lower.slice(1);
  }).join(' ');
}

const HANDLER_LABELS: Record<string, string> = {
  'resource/x-bb-folder': 'Carpeta',
  'resource/x-bb-lesson': 'Lección',
  'resource/x-bb-document': 'Documento',
  'resource/x-bb-file': 'Archivo',
  'resource/x-bb-externallink': 'Enlace externo',
  'resource/x-bb-courselink': 'Enlace del curso',
  'resource/x-bb-asmt-test-link': 'Evaluación',
  'resource/x-bb-forumlink': 'Foro',
  'resource/x-bb-assignment': 'Tarea',
};
export const handlerLabel = (handler: string) => HANDLER_LABELS[handler] ?? 'Recurso';

const KIND_LABELS: Record<string, string> = {
  'resource/x-bb-assessment': 'Evaluación',
  'resource/x-bb-assignment': 'Tarea',
  'resource/x-bb-forumlink': 'Foro',
};
export const activityKind = (kind: string | null | undefined) => (kind ? KIND_LABELS[kind] ?? 'Actividad' : 'Actividad');

// Claves de categoría observadas en UTEC (gradebookCategory.localizableTitle.languageKey).
const CATEGORY_LABELS: Record<string, string> = {
  'Test.name': 'Prueba',
  'Exam.name': 'Examen',
  'Assignment.name': 'Actividad',
  'Homework.name': 'Tarea',
  'Discussion.name': 'Debate',
  'Journal.name': 'Diario',
};

/**
 * Categoría legible. Una clave de localización desconocida ("Algo.name") no se muestra cruda;
 * un título escrito por el docente (sin forma de clave) se respeta tal cual.
 */
export function categoryLabel(key: string | null | undefined, title?: string | null): string | null {
  if (key && CATEGORY_LABELS[key]) return CATEGORY_LABELS[key]!;
  if (title && CATEGORY_LABELS[title]) return CATEGORY_LABELS[title]!;
  if (title && !/^[A-Za-z]+\.name$/.test(title)) return title;
  return key || title ? 'Otra categoría' : null;
}

/** Código corto del ciclo a partir de su nombre: "Ciclo 02-2026" → "C-02". Sin número reconocible devuelve null. */
export function cycleCode(name: string | null | undefined): string | null {
  const match = /(\d{1,2})\s*[-–/]\s*\d{4}/.exec(name ?? '') ?? /ciclo\s+(\d{1,2})/i.exec(name ?? '');
  return match ? `C-${match[1]!.padStart(2, '0')}` : null;
}
