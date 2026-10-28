/**
 * Las animaciones de esta interfaz son cortas y suaves (desvanecidos y desplazamientos de pocos píxeles), así que se
 * mantienen aunque el sistema operativo tenga activado "reducir movimiento" (en Windows, "Efectos de animación"
 * desactivados es muy común y dejaba la interfaz sin ninguna animación de entrada).
 * Para volver a respetar la preferencia del sistema basta con devolver aquí `useReducedMotion()` de 'motion/react'.
 */
export function useReducedMotion(): boolean {
  return false;
}
