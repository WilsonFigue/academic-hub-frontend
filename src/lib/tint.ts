// Color estable por materia (derivado de su ID): la misma materia conserva su tinte en todas las vistas.
const TINTS = 6;

export function tintFor(id: string | null | undefined): { bg: string; fg: string; index: number } {
  let hash = 0;
  for (const char of id ?? '') hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const index = (hash % TINTS) + 1;
  return { bg: `var(--tint-${index}-bg)`, fg: `var(--tint-${index}-fg)`, index };
}

/** Iniciales de una materia para el monograma (ignora conectores; conserva romanos). */
export function monogram(title: string): string {
  const words = title.split(/\s+/).filter((word) => word.length > 2 || /^[IVX]+$/.test(word));
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || title.slice(0, 2).toUpperCase();
}
