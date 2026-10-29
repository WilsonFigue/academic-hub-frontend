// Fechas del calendario de evaluaciones (AAAA-MM-DD, sin zona horaria) en formato corto: "17–23 ago" o "28 sep – 4 oct".
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const parts = (date: string) => ({ day: Number(date.slice(8, 10)), month: Number(date.slice(5, 7)) - 1 });

export const shortDay = (date: string): string => { const p = parts(date); return `${p.day} ${MONTHS[p.month]}`; };

export function dayRange(start: string, end: string): string {
  const a = parts(start); const b = parts(end);
  if (start === end) return shortDay(start);
  return a.month === b.month ? `${a.day}–${b.day} ${MONTHS[b.month]}` : `${shortDay(start)} – ${shortDay(end)}`;
}

export const daysBetween = (from: string, to: string): number => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
