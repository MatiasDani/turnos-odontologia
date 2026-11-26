# Proposal

## Why

La interfaz funciona pero se ve sin terminar: `http://localhost:3000/` devuelve 404 (no hay portada), el encabezado muestra "LOGO PROVISIONAL" y "Turnos Odonto (TBD)", y `/recepcion` se rompe en el celular (título en cuatro líneas, "Salir" cortado, grilla tapada por el panel de WhatsApp y scroll horizontal de la página). En escritorio la agenda se ve apretada: nombres truncados ("Pa…") en anchos medios y una barra superior cargada. La entrega del TP es mañana: hace falta un pulido visual acotado, sin funciones nuevas.

## What Changes

- **Portada en `/`**: página estática (HTML + `tokens.css` + `brand.js`, sin framework, misma CSP) con un botón "Reservar turno" (`/public/reservar`) y un enlace discreto "Soy del consultorio" para el personal (`/recepcion/login`). Requiere una ruta `GET /` nueva en el adaptador HTTP.
- **Design system revisión 2 (aprobada 2026-11-25)**: dirección B "Clínico calmo" (blanco frío, grafito, índigo `#2f3f8f`, líneas de 1 px), nombre "Turnos Odonto" (sin "(TBD)") y logo de diente de trazo fino. Los valores pasan a `tokens.css` con los mismos nombres de token; el nombre se cambia editando solo `brand.js`.
- **Recepción responsive**: a ≤ 768 px encabezado compacto, barra de herramientas en filas ordenadas, "Bloquear horario" y "Dar turno" en una barra fija al pie, panel lateral (detalle y recordatorios WhatsApp) debajo de la agenda, la grilla se desplaza horizontalmente dentro de su propio contenedor y la página no tiene scroll horizontal a 375 px. Al elegir un turno en el celular, el detalle se desplaza a la vista.
- **Recepción en escritorio**: barra superior fina (marca, consultorio, usuario, "Salir", sin enlaces de navegación extra), una fila de herramientas quietas con "Dar turno" como única acción con color, grilla de líneas finas con turnos como bloques tenues (filas más altas, nombre completo), leyenda de estados arriba y recordatorios de WhatsApp en una columna compacta.
- **Paciente (reserva y gestión)**: mismo lenguaje minimalista (una columna, filas en vez de tarjetas, progreso de tramos finos), marca nueva con enlace a la portada, sin cambiar el flujo ni los textos que usan los tests.
- **Sin cambios** en dominio, casos de uso, API, permisos ni reglas de negocio.

## Capabilities

### New Capabilities
- `portada`: página de inicio pública en `/` que presenta el producto y lleva a reservar o a ingresar.

### Modified Capabilities
- `interfaz-recepcion`: "Accesibilidad de la agenda" pasa a exigir también uso sin scroll horizontal de página a 375 px, con la grilla desplazable en su contenedor y el panel debajo; se agrega el requisito "Diseño adaptable de la recepción".
- `interfaz-paciente`: "Accesibilidad y diseño adaptable" agrega que el encabezado muestra la marca aprobada y enlaza a la portada.

## Impact

- **HTTP**: `src/adapters/http/rutas-publicas-paciente.ts` (ruta `GET /`), `src/adapters/http/estaticos.ts` (página `portada.html` y `portada.css` en la lista blanca). Test nuevo en `tests/adapters/http/`.
- **Web**: `src/adapters/http/web/portada.html` y `portada.css` (nuevos); `recepcion/agenda.html`, `recepcion/login.html`, `recepcion/recepcion.css`, `recepcion/grilla.js` (alto de fila), `recepcion/agenda.js` (desplazar detalle en celular); `reserva.html`, `gestion.html`, `paciente.css`.
- **Design system**: `README.md` y `brand.md` (revisión 2 propuesta), `assets/logo.svg` y `brand.js` se reemplazan recién en el apply, una vez aprobados.
- **Tests UI**: se agregan escenarios de 375 px para recepción y de portada; los selectores y textos existentes se preservan (ver `tasks.md`).
- Sin dependencias nuevas. Governance: BAJO/MEDIO (presentación); la ruta `/` es pública y no expone datos.
