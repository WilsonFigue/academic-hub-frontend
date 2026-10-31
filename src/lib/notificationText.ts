import type { AppNotification } from '../api/types';
import { addDays, dayFromKey, dayKey, formatLongDay, courseTitle } from './format';

const ALL_CAPS = /^[A-ZÁÉÍÓÚÑÜ0-9][A-ZÁÉÍÓÚÑÜ0-9 .,\-/()]*$/;
const HAS_WORD = /[A-ZÁÉÍÓÚÑÜ]{3,}/;

/** «MATEMÁTICA I SECCIÓN 01 02-2026» → «Matemática I». */
export function shortCourse(name: string): string {
  return courseTitle(name.replace(/\s+SECCI[ÓO]N\s+\d+\s+\d{2}-\d{4}\s*$/i, '').trim());
}

const isCourseName = (text: string) => text.length >= 6 && ALL_CAPS.test(text) && HAS_WORD.test(text);

/** Los nombres de materia vienen en MAYÚSCULAS dentro del título: se pasan a un formato legible. */
export const prettyTitle = (title: string) =>
  title.replace(/\b[A-ZÁÉÍÓÚÑÜ]{2,}(?:\s+[A-ZÁÉÍÓÚÑÜ0-9][A-ZÁÉÍÓÚÑÜ0-9.-]*)+/g, (match) => (isCourseName(match) ? shortCourse(match) : match));

export interface BodyParts { lead: string | null; course: string | null; tags: string[] }

/**
 * Separa el detalle de un aviso («Actividad · MATERIA · 2 archivos», «… · vence 5 nov · 11:59 p. m.») en el texto principal,
 * la materia (para mostrarla como etiqueta de su color) y datos cortos (archivos, fecha).
 */
export function parseBody(body: string | null): BodyParts {
  if (!body) return { lead: null, course: null, tags: [] };
  const parts = body.split(' · ').map((part) => part.trim()).filter(Boolean);
  const lead: string[] = []; const tags: string[] = []; let course: string | null = null;
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i]!;
    if (!course && isCourseName(part)) { course = shortCourse(part); continue; }
    if (/^\d+ archivos?$/i.test(part)) { tags.push(part); continue; }
    if (/^(vence|ahora)\b/i.test(part)) {
      const next = parts[i + 1];
      if (next && /^\d{1,2}:\d{2}/.test(next)) { tags.push(`${part} · ${next}`); i += 1; } else tags.push(part);
      continue;
    }
    lead.push(part);
  }
  return { lead: lead.length ? lead.join(' · ') : null, course, tags };
}

/** Detalle en una sola línea de texto (para las tarjetas emergentes). */
export function prettyBody(body: string | null): string | null {
  const { lead, course, tags } = parseBody(body);
  const text = [lead, course, ...tags].filter(Boolean).join(' · ');
  return text || null;
}

/** Hace cuánto: «ahora», «2 min», «5 h», «3 d» o la fecha. */
export function shortAgo(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} h`;
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / (60 * 24))} d`;
  return new Date(iso).toLocaleDateString('es-SV', { day: 'numeric', month: 'short' });
}

export interface NotificationDay { key: string; label: string; items: AppNotification[] }

/** Agrupa por día (hora de El Salvador): Hoy, Ayer y luego la fecha. Conserva el orden recibido (lo más nuevo primero). */
export function groupByDay(items: AppNotification[], now = new Date()): NotificationDay[] {
  const today = dayKey(now); const yesterday = addDays(today, -1);
  const groups: NotificationDay[] = [];
  for (const item of items) {
    const key = dayKey(item.createdAt);
    const last = groups[groups.length - 1];
    if (last?.key === key) { last.items.push(item); continue; }
    groups.push({ key, label: key === today ? 'Hoy' : key === yesterday ? 'Ayer' : formatLongDay(dayFromKey(key)), items: [item] });
  }
  return groups;
}
