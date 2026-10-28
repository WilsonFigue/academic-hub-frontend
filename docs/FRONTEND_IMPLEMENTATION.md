# Implementación del frontend — Academic Hub

React 19 + Vite 7 + TypeScript + CSS Modules. Sin Next.js ni Tailwind.

## Ejecutar

```bash
npm install
npm run dev        # http://localhost:5173 (la API debe estar en http://127.0.0.1:4000)
npm run build      # tsc + vite build
```

`.env`: `VITE_API_BASE_URL` es solo el destino del proxy de desarrollo. No se ponen secretos en variables `VITE_*`.

## Conexión con la API

- El proxy de Vite sirve `/api` desde la API Fastify: frontend y API quedan en el **mismo origen**, así la cookie `HttpOnly` con `SameSite=Lax` funciona sin CORS. El proxy conserva el `Origin` (`http://localhost:5173`), que la API valida.
- `src/api/client.ts`: cliente único; reenvía la cookie CSRF en `x-csrf-token` para métodos no seguros; convierte errores a `ApiError`; avisa de 401 y `password_change_required`.
- `src/api/hooks.ts`: TanStack Query (caché, reintentos solo en errores de red).
- Ningún dato académico está escrito en el código: todo viene de `/api/v1`. El navegador nunca llama a Blackboard.
- No se guardan contraseñas ni tokens en `localStorage`.

## Rutas

| Ruta | Acceso | Contenido |
|---|---|---|
| `/login` | público | correo o usuario de Academic Hub + contraseña (nunca credenciales UTEC) |
| `/change-password` | sesión (también con contraseña temporal) | cambio obligatorio u opcional |
| `/dashboard` | sesión | saludo, institución, conexión, período(s), última sincronización, métricas, próximas actividades, materias, calificaciones disponibles |
| `/courses` | sesión | materias agrupadas por período real |
| `/courses/:id?tab=` | sesión | pestañas Actividades / Contenido (árbol con búsqueda) / Calificaciones / Ciclos / Información; enlace a Blackboard |
| `/activities` | sesión | filtros combinables (búsqueda, materia, período, vencimiento, estado) en la URL; panel de detalle |
| `/grades` | sesión | calificaciones por materia con filtros; calculadas marcadas, sin promedios |
| `/calendar` | sesión | mes, semana y próximos 31 días; vencimientos + eventos sin duplicar |
| `/updates` | sesión | novedades entre importaciones, por día |
| `/profile` | sesión | cuenta Academic Hub y cuenta universitaria |

Guardas (`App.tsx`): sin sesión → `/login`; contraseña temporal → `/change-password`; un 401 en cualquier consulta limpia la caché y vuelve al login con el aviso "Tu sesión expiró".

El menú solo incluye secciones que funcionan. Detalle de la segunda versión en `FRONTEND_PHASE_2_REPORT.md`.

## Reglas de presentación de datos

- Actividades = columnas no calculadas; las calculadas solo aparecen en Calificaciones.
- Estado (`src/lib/status.ts`): "Entregada" viene de los intentos (no de `grade.status`); `PAST_DUE_AUTO_ZERO` se muestra como "Cero por vencimiento"; sin datos suficientes, "Sin fecha" o "Vencida", nunca un estado inventado.
- Las calificaciones se presentan como "disponibles", no como "nuevas": todavía no hay historial de cambios.
- Varios períodos actuales se muestran todos.
- Fechas en `America/El_Salvador`.

## Bibliotecas

`react-router-dom` 7 · `@tanstack/react-query` 5 · `motion` 12 · `@heroicons/react` 2 · `@fontsource-variable/plus-jakarta-sans`. `npm audit`: 0 vulnerabilidades.

## Verificación

- `tsc --noEmit` y `vite build`: sin errores.
- Capturas con Playwright a 1440×900 y 390×844 del login (vacío, validación, error real) y del dashboard/perfil en estado vacío. Sin desplazamiento horizontal. Se corrigió la alineación de "Cerrar sesión" y el saludo de madrugada.
- Pendiente: revisión visual con los datos reales del titular y pruebas automatizadas de componentes/E2E.
