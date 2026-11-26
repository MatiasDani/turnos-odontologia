# Tasks

> Dirección visual aprobada: **B "Clínico calmo"** (2026-11-25, por el dueño). Criterios de aceptación visuales: `mockups/b-*.html` y `mockups/previews/b-*.png`; paleta en `design-system/paleta-b.css`.
>
> **Preservar (lo usan los tests de `npm test` y `npm run test:ui`):**
> - Ids: `#titulo`, `#consultorio`, `#usuario-email`, `#usuario-rol`, `#salir`, `#v-dia`, `#v-semana`, `#modo`, `#m-sillon`, `#m-profesional`, `#recurso`, `#mi-agenda`, `#anterior`, `#hoy`, `#siguiente`, `#fecha`, `#btn-bloquear`, `#btn-dar-turno`, `#contenido`, `#agenda` (con `aria-busy`), `#panel`, `#avisos`, `#dlg`, `#login`, `#email`, `#clave`, `#ingresar`, `#app`, `#nombre-consultorio`, `#pie-consultorio`, `#dni-e`, `#tel-e`, `#nom-e`, `#ape-e`, `#mail-e`, `#cons-e`, `#enlace`.
> - Clases consultadas: `.toolbar .btn`, `.topbar .btn`, `.seg button` (≥ 36 px), `.ag-head`, `.chosen`, `.slot`, `.day`, `.chip`, `.facts`, `.spinner`, `.alert.a-info`, `label.choice`, `.skip`, `.visually-hidden`.
> - Nombres accesibles únicos (modo estricto de Playwright): botones "Dar turno", "Salir", "Bloquear horario", "Día", "Semana", "Por sillón", "Por profesional", "Hoy", "Anterior", "Siguiente", "Reintentar", "Ingresar"; turnos "hora, paciente, prestación, estado"; "Bloqueado de … a …"; enlaces "Abrir WhatsApp para …", "Reservar un turno nuevo"; textos "Recordatorios por WhatsApp", "Cargando agenda…", "No pudimos cargar la agenda.", "Paso N de 4 · …". No agregar otro botón o enlace con esos nombres (la marca se llama "Turnos Odonto, inicio").

## 1. Decisión y marca (design system revisión 2)

- [x] 1.1 `design.md` → `## UI Mockups`: revisión 2, `Decision: yes`, dirección B, `Approval: approved (2026-11-25, by user)`; `mockups/README.md` con la aprobación.
- [x] 1.2 `design-system/tokens.css` con la paleta B sobre los nombres de token existentes (más `--font-display`, `--display-*`, `--turno-*-mark`, `--scrim`), conservando `prefers-reduced-motion`.
- [x] 1.3 `brand.js` `BRAND_NAME = "Turnos Odonto"`; `assets/logo.svg` redibujado (diente de trazo fino, `#2f3f8f` fijo); se borra `assets/logo-propuesto.svg`; `README.md` (`Revision: 2`, `Approval: approved`), `brand.md`, `components.html` y `.active-orchestrator-state.json` (`visual_design.revision: 2`).

## 2. Ruta `/` y portada (TDD)

- [x] 2.1 RED: en `tests/adapters/http/portada-http.test.ts`, "La raíz ya no da 404" y "La portada no expone datos"; en `navegacion-y-logs-http.test.ts`, `/public/assets/portada.css` entre los estáticos que dan 200 y `/public/assets/portada.html` entre los que dan 404.
- [x] 2.2 GREEN: `leerPagina` acepta `'portada.html'`; `ARCHIVOS_WEB` suma `portada.css`; `rutasPublicasPaciente` registra `GET /`. Crear `portada.html` y `portada.css` (sin `<style>` ni `style=""`, solo `brand.js`, un único `h1`, "Reservar turno" → `/public/reservar`, "Soy del consultorio" → `/recepcion/login`).
- [x] 2.3 RED/GREEN (`tests/ui/portada.ui.test.ts`): "La portada ofrece reservar e ingresar" (1440 × 900), "Reservar desde la portada", "Portada en el celular" (375 × 812); agregar `/` al test de humo (sin errores de consola).

## 3. Recepción: barra fina y herramientas quietas

- [x] 3.1 RED (`tests/ui/recepcion-visual.ui.test.ts`): "La navegación solo lleva a pantallas que existen" (único enlace de la barra: la marca → `/`; sin "Agenda" ni "Reserva online") y "La recepción muestra la marca definitiva" (agenda y login).
- [x] 3.2 GREEN: `agenda.html` y `login.html` con marca-enlace (logo 36×36, `aria-label` "Turnos Odonto, inicio"), `brand.js` cargado, `<title>` sin "(TBD)", favicon; barra superior fina; toolbar en una fila con `.rc-actions` alrededor de `#btn-bloquear` y `#btn-dar-turno`; íconos de navegación; `recepcion.css` según `mockups/b-recepcion.html`.

## 4. Recepción: grilla legible y layout adaptable

- [x] 4.1 RED: "Nombre completo en un turno corto" (1280 × 800: el nombre de `Carla Prueba` no está recortado).
- [x] 4.2 GREEN: `grilla.js` con `--slot` 22 px, horas solo enteras, columna de horas sticky; CSS de hairlines, bloques tenues y leyenda arriba (`leyenda()` pasa al encabezado de la tarjeta de la agenda, mismo contenido); WhatsApp y detalle en columna de 300 px.
- [x] 4.3 RED: "Sin desplazamiento horizontal en 375 px", "La grilla no queda tapada por el panel" y "Acciones fijas al pie en el celular" (375 × 812, con un recordatorio pendiente de `Carla Prueba`).
- [x] 4.4 GREEN: media queries ≤ 768 px y ≤ 400 px (barra de una línea, email oculto, toolbar en filas, `.rc-actions` fija al pie, `padding-bottom` en el área de desplazamiento, `#fecha` como ícono, grilla con scroll propio, panel debajo).
- [x] 4.5 RED/GREEN: "El detalle se muestra al elegir un turno en el celular" (`scrollIntoView` del `#panel` en `agenda.js` si `matchMedia('(max-width: 768px)')`).
- [x] 4.6 Revisar que el test existente "foco que vuelve al cerrar el diálogo, objetivos de 44 px y sin scroll horizontal" siga en verde.

## 5. Paciente

- [x] 5.1 RED (`tests/ui/reserva-marca.ui.test.ts`): "Encabezado con la marca aprobada" y "Sin desplazamiento horizontal en 375 px en la reserva".
- [x] 5.2 GREEN: `reserva.html` y `gestion.html` con marca-enlace y el pie con "Volver al inicio"; `paciente.css` en una columna de 640 px sin tarjetas, progreso de tramos finos, prestaciones como filas, píldoras, días y horarios como en `b-reserva-2.html`.
- [x] 5.3 Login de recepción: misma marca y tarjeta con líneas, sin cambiar ids ni textos.

## 6. Verificación

- [x] 6.1 Capturas de la implementación en `verify/` (390×844 y 1440×900: `/`, `/public/reservar`, `/recepcion`) y comparación con `mockups/previews/b-*.png`; registrar el resultado al final de `design.md`.
- [x] 6.2 Ejecutar `npm test`, `npm run test:ui`, `npm run typecheck`, `npm run build` y `openspec validate mejora-visual-ui --strict`: todo en verde.

## Workflow follow-up

- Archivar con `/opsx:archive mejora-visual-ui` y registrar la revisión 2 en la KB (`02_descripcion_general.md` si menciona el nombre provisorio).
