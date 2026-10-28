# Sistema de diseño — Academic Hub

Dirección: **minimalista, cálida y académica**. Papel claro, tinta oscura y un único acento violeta sobrio. La personalidad sale de la tipografía, el espaciado y pequeños detalles (cuadrícula de cuaderno en el login, bloques de fecha, monogramas de materia), no de degradados ni efectos.

Herramientas consultadas: **UI/UX Pro Max** (reglas de `references/quick-reference.md`: accesibilidad, interacción, layout, tipografía, animación, formularios, navegación). Su buscador de paletas no se pudo ejecutar porque el equipo no tiene Python; la paleta se definió manualmente siguiendo sus reglas de contraste y tokens semánticos. **Taste Skill** no se usó en esta iteración (su ciclo de inspección con capturas queda como mejora).

Fuente única de verdad: `src/styles/tokens.css`. Los tintes por materia (`--tint-1…6-bg/fg`, usados en monogramas, calendario y novedades) y el resaltado de búsqueda (`--color-highlight`) también son tokens.

## Paleta

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#FAF8F5` | fondo (papel cálido) |
| `--color-surface` / `-sunken` / `-hover` | `#FFFFFF` / `#F4F1EC` / `#F7F4EF` | tarjetas, rellenos, hover |
| `--color-line` / `-strong` | `#E8E3DB` / `#D9D2C6` | bordes |
| `--color-ink` / `-2` / `-3` | `#1D1A26` / `#4B4659` / `#6E6880` | texto (≈16:1, 8:1, 5.1:1 sobre blanco) |
| `--color-accent` | `#5B3FD1` | acción principal, estado activo (≈7:1 sobre blanco) |
| `--color-accent-soft` / `-ink` / `-line` | `#F0ECFD` / `#3F2A9E` / `#D8CFF9` | fondos y texto de acento |
| `success` / `warning` / `danger` / `info` | `#18794E` / `#8F5400` / `#B42318` / `#2F5FB3` | con su variante `-soft`; siempre acompañados de texto o icono |

El panel de marca del login usa un violeta muy oscuro (`#241C45`) con texto `#F4F1FF`.

## Tipografía

**Plus Jakarta Sans Variable**, servida localmente con `@fontsource-variable` (sin CDN). Una sola familia; jerarquía por peso y tamaño. Cifras tabulares (`.tabular`) en notas, conteos y fechas.

Escala: 12 · 14 · 16 (base) · 18 · 22 · 28 · 36 px. Interlineado 1.55 en texto, 1.2 en títulos. Pesos 400 / 500 / 600 / 700.

## Espaciado, radios y elevación

- Espaciado en escala de 4 px (`--space-1` … `--space-16`).
- Radios: 8 / 12 / 16 / 22 px y píldora.
- Sombras: `--shadow-1` (tarjetas), `--shadow-2` (hover), `--shadow-3` (paneles flotantes). Sin glassmorphism; solo la barra superior móvil usa un leve desenfoque para separar el contenido al hacer scroll.

## Componentes (`src/components`)

| Componente | Descripción |
|---|---|
| `Button` | primary / secondary / ghost; 44 px de alto mínimo; estado de carga con spinner y `aria-busy` |
| `TextField` | label visible, ayuda, error bajo el campo con `aria-describedby` y `role="alert"`, mostrar/ocultar contraseña |
| `Badge` | estado con punto + texto (nunca solo color) |
| `Card`, `SectionHeader` | contenedores |
| `Skeleton` | carga con brillo suave (detenido con movimiento reducido) |
| `EmptyState` | icono, título, explicación y acción |
| `AppShell` | barra lateral (≥1024 px) / barra superior + menú lateral (móvil), enlace "saltar al contenido" |
| `ActivityList` | bloque de fecha, nombre, materia, tipo, estado y nota |
| `ActivityDetail` | panel lateral (escritorio) u hoja inferior (móvil) con intentos |
| `CourseCard` | monograma, código y período, conteo de actividades, próximo vencimiento |
| `ContentTree` | árbol de contenido con carpetas desplegables |

## Iconografía

Solo **Heroicons** (outline, 24 px, trazo 1.5). Los iconos decorativos llevan `aria-hidden`; los botones solo-icono tienen `aria-label`.

## Layout y breakpoints

Mobile-first. Breakpoints: 560 (lista compacta), 768 (tableta), 1024 (barra lateral), 1100 (rejilla de dos columnas del dashboard). Contenido con ancho máximo de 1180 px. Sin desplazamiento horizontal (verificado a 390 px y 1440 px).

## Movimiento

**Motion for React**, con `MotionConfig reducedMotion="user"` y tokens CSS que bajan a 0 ms con `prefers-reduced-motion`.

- Entrada del dashboard y del login: fundido + 8–12 px hacia arriba (320–400 ms, desaceleración).
- Tarjetas de métricas y filas de lista: escalonadas 35–50 ms.
- Menú móvil y panel de actividad: muelle (spring); salida más rápida que la entrada.
- Árbol de contenido: expansión de altura y opacidad.
- Hover discreto (−2 px y sombra en tarjetas de materia) y presión de botón (escala 0.98).

## Accesibilidad

- Contraste AA en todo el texto; foco visible (`--focus-ring`, 3 px).
- Objetivos táctiles de ≥ 44 px; navegación completa por teclado; Escape cierra menú y panel.
- Foco movido al contenido principal al cambiar de ruta; los diálogos devuelven el foco al elemento que los abrió.
- Errores de formulario junto al campo, anunciados a lectores de pantalla; los estados no dependen solo del color.
- `lang="es"`; fechas en `America/El_Salvador` con `Intl`.

---

## v2: rediseño "editorial-greeting" (28 oct 2026)

Reemplaza la v1 visual. La v1 quedó como alias de tokens al final de `src/styles/tokens.css` para no romper estilos sin migrar.

**Principios**
- El color va en los datos (materias, estados, hoy), no en el cromo. Acento violeta de marca solo en datos y en el marcador de "Hoy".
- Paneles tonales (`--panel`) sin borde ni sombra; filas más claras (`--panel-row`) con 8 px entre ellas, sin filetes.
- Sin etiquetas sobre los títulos (eyebrows), sin degradados, sin vidrio, sin iconos en cuadros teñidos. Sombras solo en capas flotantes (panel de detalle, hoja de menú).
- Títulos de pantalla a 24 px (`--fs-title`); el saludo del Inicio a 30 px (`--fs-greeting`).

**Inicio**
- Saludo construido con un hecho real: "Buenas tardes, Camila. Tu próxima entrega es X, mañana." (el nombre de la entrega abre su detalle).
- Franja de indicadores dividida por filetes, cifras en peso regular.
- **Línea del ciclo** (`components/TermRibbon.tsx`), el elemento propio: el período de inicio a fin, relleno animado hasta hoy, marcador "Hoy", y una marca por cada vencimiento real (color de su materia), con semana actual, % del período y días restantes. Si el período no tiene fechas, no se dibuja.
- Rejilla de 12 columnas: 8+4 (próximas entregas y semana), 6+6 (notas y novedades), y materias en filas.

**Otros módulos**
- Materias: bloques tonales con franja del color de la materia; detalle con marca de la materia y pestañas de subrayado animado.
- Calificaciones: barra de avance publicadas/evaluables por materia.
- Novedades: línea de tiempo con nodo del color de la materia.
- Acceso: campo de tinta con ilustración de la línea del ciclo (forma, sin datos).

**Movimiento**: entradas escalonadas de 0,28 a 0,4 s, píldoras de navegación y pestañas con `layoutId`, relleno de la línea del ciclo y barras de avance. Todo se desactiva con `prefers-reduced-motion`.

**Puntos de quiebre** (definidos en `tokens.css` y en cada módulo):
- Ancho mínimo: 2560 (4K) y 1920 (Full HD/2K).
- Ancho máximo: 1574, 1439, 1365 (rejilla 7+5), 1100 (barra superior, columnas apiladas), 900 (indicadores 2×2), 768 (barra inferior), 581 (móvil: filtros desplazables, filas compactas), 500 (barras de avance ocultas), 390 (móvil pequeño).
- Altura: `max-height:860px and min-width:1101px` (escritorio bajo), 800/700/620 (asistente de acceso, que se compacta progresivamente), `max-height:560px and max-width:1100px` (tableta baja).

**Verificación**: `npm run ui:breakpoints <carpeta> [rutas]` (backend) captura cada pantalla en 2560, 1920, 1440, 1366×768, 1100, 900, 768, 581 y 390 contra la demo ficticia y avisa de desplazamiento horizontal. `scripts/ui-login-heights.ts` revisa el acceso en 800/700/620/560 de alto.

### v2.1: paleta viva (28 oct 2026, a pedido del usuario)

El usuario pidió un diseño menos formal y más vivo. Cambios sobre la v2, manteniendo estructura y puntos de quiebre:
- Suelo lavanda claro `#f5f4fb`; paneles blancos con borde `--border` y `--shadow-card` (definidos, no difusos).
- Violeta de marca `#6d4aff` usado con ganas: botón principal, navegación activa, filtros activos, pestañas, chips de conteo, "Ver todas". Colores de apoyo: rosa `--pink`, coral, menta, ámbar, cielo; tintes de materia saturados; estados vivos.
- Inicio: bloque hero en degradado violeta (`.hero`) con el saludo, la meta y los 4 indicadores en celdas translúcidas; cifras que cuentan desde 0 (`CountUp`); dos círculos de luz flotando al fondo (se apagan con `prefers-reduced-motion`).
- Línea del ciclo con relleno violeta→rosa y marcador "Hoy" en rosa.
- Filas y tarjetas se elevan al pasar el mouse (`--shadow-lift`, `translateY(-2px)`); fecha "vence pronto" en violeta lleno.
- Acceso: panel en degradado violeta con detalle ámbar `#ffd166`.

---

## v3: interfaz propia (28 oct 2026)

Reemplaza la estructura de la v2 a pedido del usuario: sin fichas de "número + icono", sin el patrón "input + filtros + lista", sin listas tabulares. Cada módulo tiene su propia forma. Librerías nuevas: **Recharts** (gráficas), **lucide-react** (iconos), **Radix UI** (tooltips y diálogos accesibles), **cmdk** (buscador global).

**Armazón** (`components/AppShell.tsx`): riel de iconos a la izquierda con tooltips y píldora activa con degradado; barra superior con la fecha, el período, el buscador global (Ctrl/⌘ K, `components/CommandPalette.tsx`: secciones, materias y actividades reales), chip de última importación y campana. ≤1100 px: hoja lateral; ≤768 px: dock flotante.

**Hoy** (`pages/DashboardPage.tsx`): hero con saludo y cuenta regresiva real a la próxima entrega (anillo = tiempo restante en una semana, se actualiza cada 30 s); tira horizontal "Lo que viene" (tarjetas con color e icono de materia); línea del ciclo; "Tu semana" en siete columnas; gráfica de carga por semana (vencimientos reales de 6 semanas); últimas notas como barras de porcentaje (clic abre el detalle); anillo de evaluables; novedades; materias.

**Tablero de actividades** (`pages/ActivitiesPage.tsx`): columnas por estado real (por entregar, vencidas, entregadas, calificadas, sin fecha), tarjetas con color/icono de materia, anillo de días restantes en las pendientes, nota en las calificadas; filtro por materia con chips; en móvil las columnas se deslizan con snap. Solo lectura: no hay arrastre.

**Calificaciones** (`pages/GradesPage.tsx`): fichas de materia como pestañas (icono + "n de m con nota"), cabecera con puntos acumulados (suma, marcada como no oficial) y mejor nota, gráfica de barras por evaluación (clic abre el detalle) y tendencia en el tiempo (área); chips para "sin calificar" y columnas calculadas.

**Calendario** (`pages/CalendarPage.tsx`): chips por materia que ocultan/muestran, toggles de entregas/eventos, mes con pastillas y tooltip, semana en columnas, agenda; panel lateral del día seleccionado.

**Novedades**: feed con hilo vertical, chips por tipo y por materia, tarjetas con icono del tipo de cambio.

**Materias**: tarjetas con cubierta de color, icono deducido del nombre (`lib/courseIcon.tsx`) y marca de agua.

**Perfil**: hero con avatar y cifras reales, cuenta universitaria con línea de tiempo de la vinculación, privacidad y actualización.

**Acceso**: tarjeta centrada sobre manchas de color animadas y fichas flotantes (solo rótulos, sin cifras).

Las gráficas leen los colores de los tokens con `lib/colors.ts` (Recharts no resuelve `var()`). Verificación: `npm run ui:breakpoints` y `npm run ui:review` en el backend, sobre la demo ficticia.

### v3.2: Inicio rehecho (28 oct 2026)

Solo el Inicio (`pages/DashboardPage.tsx`, `pages/Dashboard.module.css`, `components/Charts.tsx`, `components/TermRibbon.tsx`).

- **Paleta**: papel cálido, tinta marino, coral como acento; color semántico (verde bien, ámbar regular o por entregar, rojo vencida o nota baja, azul entregada). Tokens `--ok/--warn/--bad`, `--st-pending`.
- **Línea del ciclo** (la tarjeta "Próxima entrega" se adapta al ancho de su propia tarjeta con container queries: a la derecha, apilada, compacta y píldora en ≤380 px): una marca por evaluable real (color de materia, verde calificada, rojo vencida o cero, azul entregada), filtros por estado y materia, tooltip y clic al detalle.
- **Calendario corto**: 5 días con flechas (de 5 en 5; 4 en ≤768, 3 en ≤581), botón "Hoy", datos reales de `/calendar` entre -28 y +120 días. Se desliza con la dirección del cambio.
- **Estado por materia**: pastel interactivo (hover en rebanada o fila, filtro por materia, centro con cantidad y porcentaje). Disposición vertical u horizontal según el ancho de la tarjeta (container query a 440 px).
- **Últimas notas**: columnas cronológicas coloreadas por banda (80 %+, 60-79, menos de 60), líneas de referencia en 60 y 80, filtro por materia, clic abre la evaluación.
- Se quitaron del Inicio las tarjetas "Carga de las próximas semanas" y "Novedades" (a pedido del usuario); `WorkloadChart` sigue exportado en `Charts.tsx` sin uso. Las gráficas con `fill` ocupan el alto sobrante de su tarjeta.
- **Rejilla** de 12 columnas con tarjetas del mismo alto por fila. Escritorio: calendario 12; pastel 4 + notas 8; materias 12. ≤1365: pastel 5 + notas 7. ≤1100: todo a ancho completo (el pastel pasa solo a disposición horizontal).
- **Variables locales**: `--dash-gap`, `--dash-pad`, `--chart-scale` cambian en 2560, 1920, 1574, 1439, 1365, 1100, 900, 768, 581, 500, 390 y en las alturas (860 con ancho ≥1101, 560 con ancho ≤1100).
- **Entradas**: cada bloque entra con retraso escalonado, las señales cuentan hacia arriba, las columnas del calendario se deslizan. Sin `whileInView` (las capturas completas no dependen del scroll). Todo respeta `prefers-reduced-motion`.
- Verificación: `scripts/ui-breakpoints.ts` y `scripts/ui-dashboard-interact.ts` (flechas, filtro del pastel, hover de la leyenda) en el backend.

### v3.3: filtros globales, materias flotantes y calendario de hojas (28 oct 2026)

Solo el Inicio. Sustituye la sección "Mis materias" y los chips de materia de cada tarjeta por filtros globales.

- **Filtros globales** (estado y materia), compartidos por insignias, pastel, línea del ciclo, calendario y notas (`lib/dashFilters.ts`: `DashStatus`, `matchesStatus`, `pctOf`, `LOW_THRESHOLD = 60`). Una tira "Filtrando" muestra los activos, con "Quitar filtros".
- **Insignias de estado = filtros** (por entregar, vencidas, esperando nota, calificadas, notas bajas): disco de color con icono, cifra grande que cuenta hacia arriba y etiqueta; activa = relleno sólido. En ≤581 px van en una fila deslizable.
- **Materias flotantes** (`components/CourseDial.tsx`): botón fijo abajo a la derecha que abre un abanico hacia arriba; cada materia filtra el Inicio y trae accesos rápidos (abrir materia, notas). Se dibuja en `<body>` con portal; Escape o tocar fuera lo cierra; en ≤768 px queda sobre el dock.
- **Próxima entrega** (`TermRibbon.tsx`): primero solo un círculo con los días y un pulso discreto; al pasar el mouse o enfocar con teclado se despliega la actividad hacia la izquierda. En táctil, el primer toque despliega y el segundo abre el detalle.
- **Calendario** (`components/CalendarCard.tsx`): mini-mes navegable con puntos del color de cada materia (tocar un día salta a él) y hojas de día con franja de color, argollas y contador; hoy en coral, fines de semana en gris. 5 días por página (4 en ≤768, 3 en ≤581). El mini-mes se oculta en ≤1100 px.
- **Gráficas**: el pastel resalta la rebanada (engrosa y atenúa el resto), su leyenda son botones con icono que filtran por estado; las columnas de notas llevan degradado por banda, zona roja bajo 60 %, líneas en 60 y 80, un punto del color de la materia bajo cada fecha y atenuación al pasar el mouse. Las notas muestran "Promedio simple (no oficial)" y la mejor nota.
- **Rejilla**: calendario 12; pastel 4 + notas 8; ≤1365 pastel 5 + notas 7; ≤1100 todo a ancho completo.
- Verificación: `scripts/ui-dashboard-interact.ts` (próxima entrega, flechas, insignia-filtro, abanico de materias, hover del pastel) y `scripts/ui-breakpoints.ts`.

### v3.4: interacción y animaciones del Inicio (28 oct 2026)

- **Pastel propio en SVG** (`StatusDonut` en `Charts.tsx`, ya sin Recharts): cada rebanada es un arco con extremos redondeados que se dibuja al entrar en pantalla; al filtrar, los arcos se transforman con suavidad; pasar el mouse (o enfocar su fila) engrosa la rebanada y atenúa el resto; el centro cuenta hacia el nuevo valor; un clic filtra por ese estado.
- **Notas**: la leyenda de rangos (80 %+, 60–79, menos de 60) son botones con conteo que resaltan sus columnas; la gráfica se dibuja cuando entra en pantalla (`useInView`) y se re-anima cada vez que cambian la materia o el filtro de notas bajas.
- **Entradas**: el calendario entra al cargar; las tarjetas de abajo suben cuando aparecen en pantalla; las filas del pastel entran en cascada; las marcas de la línea del ciclo entran y salen con animación al filtrar; el mini-mes se repinta en cascada al cambiar de mes; las hojas y sus bloques entran escalonados y se elevan al pasar el mouse.
- **Materias flotantes**: se abren al pasar el mouse (se cierran 280 ms después de salir); un clic las fija con velo (táctil y teclado).
- **Próxima entrega**: con más aire interior (30 px del lado del texto) y altura propia al desplegarse.
- **Bloques de actividad del calendario**: barra de color inscrita, hora en píldora, título hasta 4 líneas y materia con icono; se adaptan al ancho de cada hoja con container queries (≤150 px: sin icono de reloj ni nombre de materia; ≥210 y ≥270 px: texto más grande y más relleno).
- **Breakpoints**: calendario, línea del ciclo y rejilla tienen reglas en 2560, 1920, 1574, 1439, 1365, 1100, 900, 768, 581, 500 y 390, y en las alturas 860 (ancho ≥1101) y 560 (ancho ≤1100).
- Las capturas de layout (`ui-breakpoints.ts`) se toman sin animaciones; las animaciones se prueban en `ui-dashboard-interact.ts`.

### v3.5: franja de materias y panel de actividad (28 oct 2026)

- **Franja de materias** (`components/CourseRail.tsx`): filtro y gráfica a la vez. Una ficha por materia (más "Todas") con icono y color propios, barra apilada con el estado real de sus evaluables y cuántos tienen nota; la elegida lleva un fondo que se desliza (`layoutId`). Convive con el botón flotante: ambos controlan el mismo filtro de materia. En ≤900 px es una fila deslizable.
- **Pastel**: arcos de extremos planos con largo mínimo y separación fija; las rebanadas pequeñas ya no se amontonan ni se salen del anillo.
- **Panel lateral de actividad** (`ActivityDetail.tsx`): cabecera con el color y el icono de la materia, anillo de porcentaje (sin nota = anillo vacío), línea de tiempo vence → entregado → calificado, datos con iconos, intentos y acciones; entra con resorte y secciones escalonadas. Cajón a la derecha desde 769 px, hoja inferior en ≤768.

### v3.6: simplificación del Inicio (28 oct 2026)

A pedido del usuario se retiró lo que se había agregado de más:
- Fuera la franja de materias (`CourseRail`) y las insignias grandes de arriba; fuera la tira "Filtrando". El filtro de materia vive solo en el botón flotante (`CourseDial`), como antes.
- Los filtros de estado ahora son chips pequeños **dentro de la tarjeta de la línea del ciclo**, en lugar de la leyenda de colores: cada chip lleva el punto del color de sus marcas y la cantidad, y al tocarlo filtra (calificadas, vencidas o cero, entregadas, por entregar, notas bajas). Solo aparecen los estados que tienen elementos. Cuando hay un filtro activo, la tarjeta indica "Mostrando X de Y".

### v3.7
- Pestañas de materia pegadas a la tarjeta del ciclo (`CourseTabs`), selector de materia en el pastel (`CourseSelect`), vista previa al pasar el mouse por cualquier filtro (`hoverCourse` / `hoverStatus` en `DashboardPage`), esqueleto de carga con la estructura real y sin el logo del arranque, y entrada animada en todos los bloques.

### v3.8
- Las animaciones ya no se apagan con "reducir movimiento" del sistema (`lib/motion.ts` sustituye a `useReducedMotion`).
- Pantallas grandes: toda la interfaz escala con `zoom` por niveles (1.08 en 1920, 1.3 en 2560, 1.55 en 3200, 1.85 en 3840) en `AppShell` y `CourseDial`.
