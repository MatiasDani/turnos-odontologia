# Design

## Context

Ver `proposal.md` (Why). Estado de partida relevante:

- **Páginas**: `leerPagina(raiz, pagina)` (`estaticos.ts`) lee un HTML de `src/adapters/http/web/`; `rutasPublicasPaciente` sirve `/public/reservar` y `/public/turnos/:token`, `rutasRecepcion` sirve `/recepcion` y `/recepcion/login`. No hay ruta `/`: cae en el `NotFoundHandler` (404 HTML).
- **Estáticos**: listas blancas `ARCHIVOS_WEB`, `ARCHIVOS_RECEPCION` y `ARCHIVOS_DESIGN_SYSTEM` (`tokens.css`, `brand.js`, `assets/logo.svg`). Un test exige que `/public/assets/reserva.html` dé 404: las páginas no se sirven como estáticos.
- **CSP**: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:` → sin `<style>` ni `style=""` en el HTML (los estilos que pone el JS por CSSOM sí valen, como hoy en la grilla).
- **Recepción**: `.workspace` grilla fija sin media queries; la grilla usa `--slot: 17px` y columnas `minmax(150px, 1fr)`; `agenda.html` no carga `brand.js`.
- **Paciente**: ya es responsive (C-14); `selector.js` ya agrupa los horarios en "Mañana" y "Tarde" (`.slot-group`).
- **Design system rev. 1**: nombre y logo `(TBD)`, paleta teal.

## Goals / Non-Goals

**Goals:**
- Solo presentación y la ruta `/`: los nombres accesibles, ids, textos y clases que usan los tests se mantienen.
- Un solo lenguaje visual minimalista (dirección **B "Clínico calmo"**, elegida por el dueño el 2026-11-25) para portada, paciente y recepción: blanco frío, grafito, un índigo como único acento, líneas de 1 px, casi sin sombras ni tarjetas.

**Non-Goals:**
- Sidebar, menús con secciones nuevas, modo oscuro, ilustraciones o fotos.
- Cambios de copy en los pasos de la reserva o en los diálogos; cambios de dominio, API o permisos.

## Decisions

### D1. Portada estática en `GET /`
`portada.html` en `src/adapters/http/web/`, servida con `leerPagina` desde `rutasPublicasPaciente` (siempre registrado, sin sesión), con `cache-control: no-store` como las otras páginas. Estilos en `portada.css` (en `ARCHIVOS_WEB`), sin JS propio: solo `brand.js`. Contenido: marca, un título, una frase, un botón "Reservar turno", un enlace discreto "Soy del consultorio" (→ `/recepcion/login`) y dos líneas de confianza al pie. *Descartado*: redirigir `/` a `/public/reservar` (no resuelve el acceso del personal ni la presentación).

### D2. Paleta B en `tokens.css` con los mismos nombres de token
Los valores de `design-system/paleta-b.css` (`--v-*`) se mapean sobre los tokens existentes (`--color-bg`, `--color-accent`, `--turno-*`, `--radius-*`…), así que patient y recepción toman la paleta sin tocar cada regla. Se agregan `--font-display`, `--display-weight`, `--display-tracking`, `--turno-*-mark` y `--scrim`. Se mantiene el bloque `prefers-reduced-motion`. Las paletas A y B quedan en `design-system/` como referencia.

### D3. Recepción: barra fina y herramientas quietas (sin navegación extra)
Barra superior de 56 px: marca (enlace a `/`), consultorio, usuario + rol, "Salir". **No hay** enlaces "Agenda" ni "Reserva online". La barra de herramientas es una fila: ‹ Hoy › con el título de la fecha y el selector de fecha; Día/Semana como segmentado; Por sillón/Por profesional como pestañas de texto; "Bloquear horario" como botón de texto y "Dar turno" como única acción con color. `.rc-actions` (envuelve los mismos `#btn-bloquear` y `#btn-dar-turno`) usa `display: contents` en escritorio y en ≤ 768 px pasa a una barra fija al pie. Se mantienen todos los ids y nombres.

### D4. Layout responsive con CSS y un solo ajuste en JS
- `.workspace`: dos columnas (`minmax(0,1fr) 300px`) por encima de 768 px; una columna debajo (agenda primero, `#panel` después). La columna de horas (`.ag-times` y la esquina) usa `position: sticky; left: 0`.
- ≤ 768 px: barra de una línea con el email oculto (`#usuario-email` sigue en el DOM), "Salir" de 44 px, `#fecha` reducido al ícono, `.agenda-scroll` sin `max-height` pero con su propio `overflow-x`, `padding-bottom` de 76 px para que la barra fija no tape turnos, columnas de `minmax(150px, 1fr)`.
- JS (`agenda.js`): al seleccionar un turno, si `matchMedia('(max-width: 768px)')` coincide, `#panel` hace `scrollIntoView({ block: 'start' })` (sin animación si hay movimiento reducido).

### D5. Grilla de hairlines
`--slot` pasa a 22 px por fila de 15 min. Las etiquetas de hora van solo en las horas enteras; las líneas (hora, media hora) salen de `background-image` de `.ag-col`. Los turnos son bloques tenues con borde izquierdo del color del estado y el estado siempre como texto. La leyenda va arriba de la grilla, en la tarjeta de la agenda. Solo cambian `grilla.js` (alto de fila, etiquetas) y CSS; `data-turno` y los nombres accesibles no cambian.

### D6. WhatsApp en una columna compacta
El panel "Recordatorios por WhatsApp" pierde el aspecto de tarjeta: una columna de 300 px, lista con líneas finas y acciones de texto. El detalle de turno (`#panel`) usa el mismo estilo. Textos y nombres accesibles iguales.

### D7. Marca en revisión 2
Nombre "Turnos Odonto" (`brand.js`) y logo `design-system/assets/logo.svg`: diente de trazo fino en índigo `#2f3f8f` con color fijo (un `<img>` no hereda `currentColor`), 36×36 en los encabezados. La marca es un enlace a `/` con `aria-label` "Turnos Odonto, inicio". `brand.js` se carga también en `agenda.html` y `login.html`. Se elimina el rótulo "LOGO PROVISIONAL".

### D8. Paciente: mismo lenguaje sin tarjetas
Una columna de 640 px; el panel pierde borde y sombra; barra de progreso de 4 tramos finos; prestaciones como filas con línea inferior; profesionales como píldoras; horarios en grilla agrupados en Mañana y Tarde (ya agrupados por `selector.js`); acciones fijas al pie en el celular (`.sticky-actions`, ya existente). El resumen lateral se oculta y el resumen en una línea (`.summary-inline`) pasa a mostrarse siempre. Marcado y textos sin cambios, salvo el encabezado (marca-enlace).

## Risks / Trade-offs

- [Alturas mínimas: los tests exigen ≥ 36 px en `.toolbar .btn, .topbar .btn, .seg button` y 44 px en celular] → `.seg button` 36 px; botones de la barra 40 px (44–48 px en celular).
- [La barra fija inferior puede interceptar clics a turnos al borde] → `padding-bottom` de 76 px en la zona de desplazamiento y `scrollIntoView`; hay un escenario que lo verifica.
- [`#fecha` queda como ícono en el celular] → el valor y la etiqueta "Fecha" no cambian.
- [Fuentes: B usa solo fuentes del sistema; Inter solo si ya está instalada] → sin descargas ni CSP nueva.
- [Los mockups v1 y A quedan como alternativas descartadas] → se conservan en `mockups/`; la v1 referenciaba `design-system/assets/logo-propuesto.svg`, que se borró al adoptar el logo final (esas dos imágenes quedan sin cargar; las capturas PNG se conservan).

## Migration Plan

Sin datos ni migraciones. Rollback: revertir el commit; la ruta `/` vuelve a 404 y el design system a la revisión 1.

## UI Mockups

- Design system revision: 2
- Decision: yes (2026-11-25)
- Dirección elegida: **B "Clínico calmo"** (el dueño la eligió y aprobó en el chat el 2026-11-25). A "Cálido sereno" y la v1 quedan como alternativas descartadas.
- Mockups: `openspec/changes/mejora-visual-ui/mockups/b-*.html` (portada, reserva pasos 1 y 2, recepción escritorio y celular) con capturas en `mockups/previews/b-*.png`; índice en `mockups/README.md`.
- Fuentes: comentario del dueño sobre la v1 ("muchas cosas juntas", otra paleta, más minimalista, menos genérica); investigación en `mockups/referencias.md`; capturas reales del dueño (recepción en 375–420 px y escritorio), `verify/` de C-15, `mockups/previews/` de C-14.
- Approval: approved (2026-11-25, by user)
- Preview: rendered (2026-11-25, `mockups/previews/b-*.png` a 390x844 y 1440x900 con Microsoft Edge vía Playwright, canal `msedge`)
- Visual verify: ver capturas de la implementación en `verify/` (sección "Verificación visual" al final).

## Verificación visual (2026-11-25)

Capturas de la implementación en `verify/` (Edge por Playwright, 1440x900 y 390x844; script `verify/capturar.mjs`): portada, reserva pasos 1 y 2, login y recepción, todas con `scrollWidth == clientWidth`. Comparadas con `mockups/previews/b-*.png`: sin diferencias mayores. Menores: el título largo de la fecha ("Miércoles 25 de noviembre") baja a dos líneas a 390 px; la agenda demo no tiene horarios libres hoy en el paso 2; los datos son los de la demo, no los del mockup. Visual verify: passed.
