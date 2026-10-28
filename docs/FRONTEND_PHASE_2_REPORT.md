# Reporte de la Fase 2 del frontend — Evolución del dashboard y experiencia académica

Fecha: 2026-10-28. Solo se describen funciones implementadas y verificadas. Sin datos personales: las capturas usan un entorno de demostración con datos ficticios.

## 1. Auditoría inicial

No llegaron capturas en la conversación; la auditoría se hizo sobre el código, la API, PostgreSQL y capturas propias.

| Verificación | Resultado |
|---|---|
| Fastify y PostgreSQL | API en 127.0.0.1:4000, `/health/db` OK, PostgreSQL 18.4, base `header_dev` (la configurada en `.env`; `aether` no se tocó) |
| Migraciones | 0001–0010 aplicadas; se agregó 0011 |
| Frontend | compila y genera build |
| Datos reales | **2 cuentas importadas**: una con 2 materias / 19 columnas y otra con 4 materias / 58 columnas. La documentación anterior describía solo la primera (cuentas distintas, no un error de conteo) |
| Coherencia (script `npm run db:validate`, solo conteos) | actividades = conteo SQL en ambas cuentas; columnas calculadas excluidas; calendario sin duplicados y solo con actividades propias; 0 claves de categoría sin traducir |

Hallazgos que motivaron correcciones:

- `category_title` de Blackboard guarda la **clave de localización** (`Homework.name`, `Test.name`, `Assignment.name`, `Discussion.name`, `Exam.name`, `Journal.name`).
- Las 62 columnas enlazadas a contenido tienen **el mismo título** que su contenido y 0 con cuerpo (la lectura `@view=Summary` no trae instrucciones); 14 tienen una descripción real distinta del título.
- `courseTitle()` convertía "FÍSICA III" en "Física Iii".
- "Conectada" daba a entender una sesión de Blackboard permanente.
- Cada componente calculaba "días restantes" por su cuenta, con restas en milisegundos.
- `entity_changes` estaba vacía: el importador no registraba novedades.

## 2. Correcciones

| Problema | Solución |
|---|---|
| `Homework.name` visible | `categoryLabel()` traduce las 6 claves reales (Prueba, Examen, Actividad, Tarea, Debate, Diario). Una clave desconocida con forma `X.name` muestra "Otra categoría"; un título escrito por el docente se respeta. La clave original se conserva en la BD y la API |
| "Material" repetía el título | La API solo expone `description` si aporta texto distinto del título. El panel muestra "Instrucciones" con texto real, "Material relacionado" si hay enlace, o nada |
| Nombres dañados | `courseTitle()` conserva números romanos y siglas, pone conectores en minúscula y respeta nombres que ya vienen con mayúsculas/minúsculas |
| Estado de conexión | "Vinculada" + explicación ("identidad verificada en la última importación; no se mantiene una sesión abierta") + "Última importación hace…" |
| Fechas | Módulo único `src/lib/format.ts`: `dayKey`, `daysUntil` y `formatDueRelative` por **día calendario de El Salvador**; "hoy (ya venció)", "mañana", "en 3 días" |
| Pendiente sin evidencia | El indicador del dashboard se llama "Pendientes · sin entrega ni nota registrada". El detalle distingue "Entregada · por calificar", "Vencida sin entrega" (solo con evidencia de intentos) y "Fecha vencida" (sin evidencia) |
| Mayúsculas de fecha | Se quitó `text-transform: capitalize` ("28 De Octubre" → "28 de octubre") |
| Anillo de foco en `<main>` tras navegar | Se oculta el foco programático del contenedor; el foco sigue moviéndose para lectores de pantalla |

## 3. Funciones nuevas

| Ruta / vista | Contenido |
|---|---|
| `/grades` | Calificaciones agrupadas por materia con "x de y publicadas"; filtros por materia, período, búsqueda y tipo (Calificadas, Sin calificar, Cero automático, Calculadas, Todas). Las columnas calculadas se marcan y no se presentan como nota oficial. Sin promedios ni CUM |
| `/calendar` | Vista mensual (chips por materia en escritorio, puntos en móvil), semanal y "Próximos 31 días"; navegación, "Hoy", selección de día con panel. Combina vencimientos de actividades (con fecha personal si existe) y eventos independientes; los `GradableItem` enlazados no se duplican |
| `/updates` | Historial cronológico agrupado por día, con frase legible por tipo de cambio, materia, fecha de detección, detalle (antes → después) y acceso al recurso. Paginación con "Cargar más" |
| Pestaña **Ciclos** en cada materia | Selector Ciclo 1–5, ciclo activo, asignar/quitar actividades, peso del ciclo en la materia y peso de la actividad dentro del ciclo (opcionales). Guarda en PostgreSQL por inscripción y se recupera al volver. Las columnas calculadas aparecen solo como referencia; nada se asigna automáticamente |
| Actividades | Búsqueda con resaltado, materia, período, rango de vencimiento (7 días, 31 días, ya vencidas) y estado (Próximas, Vencidas, Entregadas, Calificadas, Sin fecha, Todas) con conteos. Los filtros viven en la URL |
| Materias | Búsqueda, filtro por período, orden por nombre o próximo vencimiento, aviso de no disponibilidad y accesos directos a Contenido, Calificaciones y Ciclos |
| Árbol de contenido | Búsqueda con resaltado y apertura automática de las ramas con coincidencias, expandir/contraer todo (límite de 150 carpetas), estado de apertura conservado al cambiar de pestaña. Los archivos no se presentan como descargables |
| Detalle de actividad | Categoría legible, fecha real de entrega, fecha de calificación, intentos, retroalimentación, instrucciones reales, enlace a la materia en Blackboard y notas aclaratorias (cero automático, columna calculada, entrega no confirmable) |
| Dashboard | "Esta semana" (próximos 7 días), novedades recientes (solo si existen), materias compactas, calificaciones disponibles |
| Perfil | Separación cuenta Academic Hub / cuenta universitaria, explicación del estado, última importación y períodos relacionados |
| Navegación | Inicio, Mis materias, Actividades, Calendario, Calificaciones, Novedades, Mi perfil (escritorio y menú móvil) |

## 4. Componentes

Nuevos: `Filters` (`PageHeader`, `FilterBar`, `SearchInput`, `Select`, `Segmented` con píldora animada, `ResultSummary`, `Highlight`), `ChangeList`, `EvaluationCycles`. Ampliados: `ActivityList`, `ActivityDetail`, `ContentTree`, `CourseCard` (enlace extendido sin enlaces anidados). Módulos: `lib/format.ts` (fechas y etiquetas centralizadas), `lib/status.ts` (estados honestos y grupos de filtrado), `lib/tint.ts` (tinte estable por materia con tokens).

Tokens nuevos: `--color-highlight` y `--tint-1…6-bg/fg`.

## 5. Backend

### Endpoints nuevos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/grades?courseId&termId` | Libro propio de todas las materias (incluye calculadas marcadas) |
| GET | `/api/v1/changes?limit&before&courseId` | Novedades con cursor |
| GET | `/api/v1/courses/:id/evaluation-cycles` | Ciclos de la inscripción propia |
| PUT | `/api/v1/courses/:id/evaluation-cycles` | Reemplazo idempotente; valida números únicos, ciclo activo existente, actividad en un solo ciclo, suma de pesos ≤ 100 % y actividades de la propia inscripción |

Ampliados (compatibles): `/activities` acepta `termId` y devuelve `feedbackText`, `lmsUrl`, `termId`, `termName`, `attemptCount`, `submittedAt`, `gradedAt` y `content.description`/`externalUrl`; `/calendar` devuelve estado y tipo; `/dashboard` agrega `recentChanges` y `weekAhead`.

### Migración

`0011_entity_changes_course`: columna `course_id` en `entity_changes` + índice, para filtrar novedades por inscripción.

### Novedades entre importaciones

- Los upserts devuelven los valores anteriores y nuevos con `RETURNING old/new` (PostgreSQL 18).
- **Línea base**: la primera importación de una cuenta no genera novedades; tampoco una materia o inscripción nueva para sus propios elementos.
- Se registran: período nuevo, materia nueva, actividad nueva, cambio de vencimiento, nombre o puntaje máximo, calificación nueva o modificada, cambio de estado de entrega y anuncio nuevo.
- Nunca se registran eliminaciones; una lectura fallida no borra ni inventa cambios.
- Los cambios del catálogo (columnas, anuncios) son "compartidos" y se muestran solo a estudiantes inscritos desde antes de la detección; las notas son "personales".

## 6. Pruebas

| Prueba | Resultado |
|---|---|
| Backend `npm test` | **40/40** (antes 32): incluye línea base sin novedades, importación con 4 cambios reales, repetición sin novedades falsas, lectura fallida sin borrados, feed visible solo para el dueño, `/grades` solo propias, ciclos guardar/recuperar/validar, ciclos ajenos → 404 y actividad ajena → 400 |
| Coherencia de datos reales | `npm run db:validate` (ver §1) |
| Frontend | `tsc` sin errores; `vite build` sin advertencias (código dividido por ruta y por librería) |
| Revisión visual automatizada | `npm run ui:review` contra la demo (1440×900 y 390×844): 13 pantallas por tamaño, login real, guardado y persistencia de ciclos tras recargar, Escape cierra el detalle, sin desplazamiento horizontal, sin claves técnicas visibles, sin errores JS. Resultado final: sin problemas |

Defectos encontrados y corregidos durante la revisión: mayúsculas en fechas, anillo de foco en el contenido, "Quitar filtros" sin filtros, "1 elementos", placeholder cortado en pesos, barra de guardado fija sin cambios, encabezados apretados en móvil, aviso de entrega no confirmable en actividades futuras.

## 7. Capturas (datos ficticios)

`docs/screenshots/`: `desktop-01-dashboard.png` … `desktop-13-profile.png` y `mobile-01-dashboard.png` … `mobile-13-profile.png`.

Entorno de demostración: `DB_SCHEMA=academic_hub_demo npm run demo:seed` (backend) crea un esquema aparte con un estudiante ficticio importado dos veces mediante el importador real.

## 8. Pendiente

- No probé visualmente las cuentas reales: no tengo sus contraseñas y no se crearon sesiones a su nombre. Primer uso real pendiente del titular.
- Las novedades solo aparecerán tras una **segunda** importación de cada cuenta.
- Instrucciones completas de actividades: la importación usa la vista resumida de Blackboard; traer el cuerpo completo requiere leer el detalle de cada contenido (no implementado).
- Sugerencias de ciclos a partir de fórmulas: hoy solo se muestran como referencia.
- Pruebas automatizadas de componentes; la revisión visual es un script, no una suite CI.
- En listas que se parten en varias líneas (móvil) el separador "·" puede quedar al inicio de línea.
