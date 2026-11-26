# Mockups · mejora-visual-ui

- Design system revision: 2
- Approval: approved (2026-11-25, by user) para la dirección **B · Clínico calmo** (el dueño la eligió en el chat). A y la v1 quedan como alternativas descartadas.
- Preview: rendered (2026-11-25, Microsoft Edge vía Playwright, 390x844 y 1440x900; todas con `scrollWidth == clientWidth`)
- Datos: solo ficticios (Carla Prueba, Diego Modelo, Paciente Ficticio N, Ana Ejemplo, Bruno Muestra).

## v2 · dos direcciones minimalistas (2026-11-25)

Respuesta al comentario del dueño sobre la v1 ("hay muchas cosas juntas", otra paleta, "mucho más minimalista", "no tan genérica"). La investigación y los principios están en [`referencias.md`](referencias.md).

Las dos direcciones comparten la estructura (`v2.css`) y cambian solo las variables (`design-system/paleta-a.css` o `paleta-b.css`). `tokens.css` **no** se tocó: la paleta elegida pasa a `tokens.css` en el apply, después de la aprobación.

### A · Cálido sereno

Papel cálido, tinta casi negra y acento arcilla. Títulos con la serif del sistema: transmite un consultorio cuidado, no un SaaS.

| Token | Hex | Contraste (WCAG) |
|---|---|---|
| `--v-bg` fondo | `#f7f4ef` | — |
| `--v-surface` superficie | `#fffdf9` | — |
| `--v-ink` tinta | `#1f1b16` | 15.61:1 sobre fondo · 16.85:1 sobre superficie |
| `--v-muted` tinta secundaria | `#6b6157` | 5.51:1 sobre fondo · 5.95:1 sobre superficie |
| `--v-line` línea | `#e6dfd5` | decorativa |
| `--v-accent` acento | `#9c4a2f` | texto blanco encima 6.12:1 · acento sobre fondo 5.57:1 |
| `--v-accent-soft` acento suave | `#f3e4dc` | acento sobre él 4.93:1 |
| Reservado | `#5e5146` sobre `#f1ebe3` | 6.47:1 |
| Confirmado | `#3d6647` sobre `#e7efe5` | 5.60:1 |
| Atendido | `#6b6157` sobre `#eeeae4` | 5.05:1 |
| Ausente | `#8a4512` sobre `#f7e7d6` | 5.90:1 |

Tipografía: títulos con `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif` (Palatino Linotype viene con Windows) y texto con `system-ui`. Radios de 12/8 px, sin sombras: solo líneas de 1 px.

### B · Clínico calmo

Blanco frío, grafito y un índigo profundo como único acento. Sans "display" con tracking negativo: se ve precisa y serena, sin el teal genérico.

| Token | Hex | Contraste (WCAG) |
|---|---|---|
| `--v-bg` fondo | `#f6f7f9` | — |
| `--v-surface` superficie | `#ffffff` | — |
| `--v-ink` tinta | `#16181d` | 16.57:1 sobre fondo · 17.76:1 sobre superficie |
| `--v-muted` tinta secundaria | `#5d6470` | 5.56:1 sobre fondo · 5.96:1 sobre superficie |
| `--v-line` línea | `#e3e6eb` | decorativa |
| `--v-accent` acento | `#2f3f8f` | texto blanco encima 9.42:1 · acento sobre fondo 8.79:1 |
| `--v-accent-soft` acento suave | `#e9ecf8` | acento sobre él 8.00:1 |
| Reservado | `#3a4868` sobre `#edf0f7` | 7.98:1 |
| Confirmado | `#2b5e4c` sobre `#e4f1eb` | 6.44:1 |
| Atendido | `#5d6470` sobre `#eff1f4` | 5.27:1 |
| Ausente | `#874719` sobre `#f8ece2` | 6.14:1 |

Tipografía: `"Segoe UI Variable Display", "Segoe UI", system-ui…`. Inter e Inter Display se usan solo si ya están instaladas en la máquina; no se descargan. Radios de 8/6 px y sombra casi nula.

En las dos, "Cancelado" usa la tinta secundaria sobre la superficie (≈5.9:1) con el nombre tachado. El estado siempre aparece también como texto, nunca solo por color. Los ratios se calcularon con la fórmula de luminancia relativa de WCAG 2.x.

### Pantallas v2

| Archivos | Pantalla | Qué cambia frente a la v1 | Capturas (`previews/`) |
|---|---|---|---|
| `a-portada.html`, `b-portada.html` | Portada `/` | Marca, un título de 2 líneas, una frase, **un** botón "Reservar turno" y el enlace discreto "Soy del consultorio". Al pie, dos líneas de confianza. Sin tarjetas, ilustración, pasos ni franja oscura. | `{a,b}-portada-desktop.png`, `{a,b}-portada-mobile.png` |
| `a-reserva-1.html`, `b-reserva-1.html` | Reserva, paso 1 | Una columna de 640 px, barra de progreso de 4 tramos, prestaciones como filas con la duración a la derecha y "Continuar" (fijo abajo en el celular). Sin resumen lateral. | `{a,b}-reserva-1-{desktop,mobile}.png` |
| `a-reserva-2.html`, `b-reserva-2.html` | Reserva, paso 2 | Resumen en una línea con "Cambiar", profesional en píldoras, la semana en una tira de días y los horarios en una grilla agrupada en Mañana y Tarde. | `{a,b}-reserva-2-{desktop,mobile}.png` |
| `a-recepcion.html`, `b-recepcion.html` | Recepción, agenda del día por sillón (la misma página a 1440 y a 390) | Barra fina (marca · consultorio · usuario · Salir) y una fila de herramientas sin bordes: ‹ Hoy › con la fecha, Día/Semana como segmentado, Por sillón/Por profesional como pestañas de texto, "Bloquear horario" como botón de texto y "Dar turno" como única acción con color. Grilla con líneas finas, etiquetas por hora y turnos como bloques tenues con borde izquierdo. Recordatorios en una columna de 300 px sin tarjetas. En el celular, "Bloquear horario" y "Dar turno" van en una barra fija abajo, la grilla tiene scroll horizontal propio con las horas fijas y los recordatorios quedan debajo. | `{a,b}-recepcion-desktop.png`, `{a,b}-recepcion-mobile.png`, `{a,b}-recepcion-mobile-completa.png` |

En `*-mobile-completa.png` la barra fija de acciones aparece a mitad de la imagen. Es un efecto de la captura de página completa, no del diseño.

### Implementación: qué se preserva y qué hay que decidir

Se mantienen los ids y nombres accesibles de `tasks.md` (`#titulo`, `#salir`, `#anterior`, `#hoy`, `#siguiente`, `#fecha`, `#v-dia`, `#v-semana`, `#modo`, `#m-sillon`, `#m-profesional`, `#btn-bloquear`, `#btn-dar-turno`, `#contenido`, `#agenda`, `#panel`, `#usuario-email`, `#usuario-rol`, `#consultorio`, `#app`). Nada queda escondido en un menú: todos los controles siguen visibles, solo que más quietos. Del paciente se reutilizan las clases `label.choice`, `.day`, `.slot` y `.chosen`.

Riesgos y cambios respecto del plan actual (`design.md` y `tasks.md`), a resolver si se elige la v2:

1. **Navegación de recepción (D2, tareas 3.1 y 3.2)**: la v2 no tiene "Agenda" ni "Reserva online" en la barra (la marca enlaza a `/`). Si se adopta, el test planeado "La navegación solo lleva a pantallas que existen" se reescribe o se quita.
2. **Copy de la portada (tareas 1.3 y 5.3)**: "Soy del consultorio" reemplaza a "Ingresar" e "Ingresar al consultorio", y no hay enlace de ingreso en el encabezado. Los tests planeados tienen que usar el nombre nuevo.
3. **Barra fija de acciones en el celular**: usa los mismos `#btn-bloquear` y `#btn-dar-turno` (`.rc-actions` tiene `display: contents` en escritorio), así que siguen dentro de `.toolbar` y miden 48 px. Riesgo: en Playwright la barra puede tapar un turno al hacer clic cerca del borde inferior ("element intercepts pointer events"). El `padding-bottom` de 76 px y `scrollIntoView` lo mitigan, pero hay que verificarlo en `npm run test:ui`.
4. **`#fecha` en el celular** queda reducido al ícono del calendario (texto transparente, con la etiqueta "Fecha" intacta). Si un test lee el valor, no cambia. Si se prefiere verlo, puede ir en una fila propia.
5. **Alturas**: `.seg button` mide 36 px (el test exige ≥ 36). `.toolbar .btn` y `.topbar .btn` miden 40 px en escritorio y 44–48 px en el celular.
6. **Grilla**: las etiquetas van solo en las horas enteras (hoy van cada 30 min) y las líneas salen de un `background-image` en la columna. Es un cambio en `grilla.js` y CSS que no toca `data-turno` ni los nombres accesibles de los turnos.
7. **Reserva, paso 2**: agrupar los horarios en Mañana y Tarde y mostrar al profesional en píldoras es presentación en `reserva.js` (mismo estado `profesionalId`; "Cualquiera" ya existe). Los textos "Paso N de 4 · …" no cambian.
8. **Logo**: el isotipo v2 es un diente de trazo fino en el color del acento (en línea en los mockups). `design-system/assets/logo-propuesto.svg` (cuadrado teal) no combina con ninguna de las dos paletas. Al elegir, se redibuja el SVG con el color fijo de la paleta elegida, porque un `<img>` no hereda `currentColor`.
9. **Fuentes**: A depende de que el sistema tenga una serif decente (Palatino Linotype en Windows, Iowan en macOS; en Android cae a la serif por defecto, más genérica). B no depende de ninguna fuente en particular.

### Cómo verlos y regenerarlos

- Abrir cualquier `a-*.html` o `b-*.html` con doble clic (file://). Importan `../../../../design-system/paleta-{a,b}.css`, `v2.css`, `design-system/brand.js` y `brand-propuesto.js`.
- Generar el HTML (una sola fuente para A y B): desde la raíz del repo, `node openspec/changes/mejora-visual-ui/mockups/src/gen_v2.mjs`.
- Capturas: `node openspec/changes/mejora-visual-ui/mockups/src/render.mjs v2` (o `v1`, o sin argumento para las dos).

---

## v1 (primera propuesta, no aprobada: "muchas cosas juntas")

Se conserva como antecedente. Sus capturas se movieron a `previews/v1/` (los nombres de archivo de abajo son relativos a esa carpeta).

- Design system revision: 2 (propuesta, pendiente; vigente aprobada: 1)
- Approval: descartada (reemplazada por la v2, dirección B)
- Preview: rendered (2026-11-25, Microsoft Edge vía Playwright, 390x844 y 1440x900)
- Datos: solo ficticios (Carla Prueba, Diego Modelo, Paciente Ficticio N, Ana Ejemplo, Bruno Muestra).

## Pantallas

| Archivo | Pantalla | Qué cambia respecto de hoy | Capturas (`previews/v1/`) |
|---|---|---|---|
| `portada.html` | Portada `/` (nueva) | Hoy da 404. Encabezado con marca, título, "Reservar turno" e "Ingresar", pasos, tres beneficios, franja para el personal. | `portada-desktop.png`, `portada-mobile.png`, `portada-mobile-completa.png` |
| `recepcion-agenda.html` | Recepción, agenda del día por sillón (escritorio) | Barra de aplicación (marca, Agenda, Reserva online, usuario, Salir), barra de herramientas en tres grupos, leyenda arriba de la grilla, filas de 22 px y columnas de 180 px mínimo (sin "Pa…"), panel de 340 px. A ≤ 1100 px el panel pasa abajo. | `recepcion-agenda-desktop.png`, `recepcion-agenda-1024.png`, `recepcion-agenda-mobile.png` |
| `recepcion-agenda-movil.html` | Recepción en el celular (misma página, layout ≤ 768 px) | Encabezado de una línea, toolbar en filas (navegación, vista, columnas, acciones 50/50), grilla con scroll horizontal propio y columna de horas fija, recordatorios de WhatsApp debajo. Sin scroll horizontal de página. | `recepcion-agenda-movil-mobile.png`, `recepcion-agenda-movil-completa.png`, `recepcion-agenda-movil-desktop.png` |
| `reserva-paso-1.html` | Reserva del paciente, paso 1 (pulido) | Marca nueva que enlaza a `/`, título de página, pasos con nombre, sombra suave, pie con "Volver al inicio". Mismo flujo y textos. | `reserva-paso-1-desktop.png`, `reserva-paso-1-mobile.png` |

Gestión del turno (`/public/turnos/:token`) y login de recepción no tienen mockup propio: reciben el mismo encabezado (marca + enlace a `/`) y la tarjeta actual sin otros cambios.

## Marca propuesta (revisión 2)

- Nombre: "Turnos Odonto". En los mockups lo pone `brand-propuesto.js` (se carga después de `design-system/brand.js`); en el apply pasa a `BRAND_NAME`.
- Logo: `design-system/assets/logo-propuesto.svg` (isotipo 64x64, diente con tilde sobre teal).

## Cómo verlos y regenerar capturas

- Abrir cualquier `.html` con doble clic (file://). Importan `../../../../design-system/tokens.css`, `brand.js`, el logo propuesto y `mockups.css`; `reserva-paso-1.html` además usa el `paciente.css` real.
- Fuentes: `src/` (plantilla de la agenda y generador `gen_agenda.py`). Regenerar: desde `mockups/`, `python src/gen_agenda.py`.
- Capturas: desde la raíz del repo, `node openspec/changes/mejora-visual-ui/mockups/src/render.mjs v1` (Edge por Playwright; informa `scrollWidth` de cada captura).
- La etiqueta oscura "Mockup · …" abajo a la derecha es solo del mockup.
