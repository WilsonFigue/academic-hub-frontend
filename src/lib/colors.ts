// Recharts pinta SVG con atributos que no resuelven var(): leemos el valor real del token una vez.
const cache = new Map<string, string>();

export function cssColor(token: string): string {
  if (typeof window === 'undefined') return '#6d4aff';
  const cached = cache.get(token);
  if (cached) return cached;
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const resolved = value || '#6d4aff';
  cache.set(token, resolved);
  return resolved;
}

/** Color de materia (tinte N) como valor hexadecimal real, para gráficas. */
export function tintColor(index: number): string {
  return cssColor(`--tint-${index}-fg`);
}
