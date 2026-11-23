# Proposal

## Why

C-10 y C-11 dejaron los casos de uso públicos (reservar, consultar, cancelar, reprogramar por token) y C-12 ya envía e-mails con enlaces a `BASE_URL_PUBLICA/public/turnos/<token>` y `.../confirmar`, pero no existe ningún servidor ni pantalla que atienda esos enlaces: hoy el paciente no puede reservar desde un enlace ni abrir el enlace de su recordatorio. C-14 cierra el camino crítico del MVP (`C-01 → C-02 → C-03 → C-11 → C-14`) y el criterio pendiente de US-009 ("enlace público; el paciente elige prestación y horario entre la disponibilidad real"), y cablea por HTTP lo que DD-13, DD-21 y DD-23 difirieron explícitamente a este change.

## What Changes

- **Servidor HTTP con Fastify 5** (primera integración HTTP del proyecto): una fábrica de la app (`crearApp`) y una raíz de composición extensibles, pensadas para que C-15 registre después sus rutas internas sin rehacer el arranque. Tests de contrato con `fastify.inject`.
- **Endpoints públicos JSON** (todos bajo `/public`, sin autenticación, `03_actores_y_roles.md` §Rutas públicas):
  - `GET /public/prestaciones` y `GET /public/prestaciones/:prestacionId/profesionales` (catálogo público mínimo, casos de uso nuevos).
  - `GET /public/disponibilidad?prestacionId&fecha&profesionalId?` y `POST /public/reservas` (diferidos por DD-13).
  - `GET /public/turnos/:token` (JSON con `Accept: application/json`), `POST /public/turnos/:token/confirmar`, `POST .../cancelar`, `GET .../disponibilidad?fecha`, `POST .../reprogramar` (diferidos por DD-23 y DD-21).
- **Páginas públicas** HTML + CSS + JavaScript sin framework ni build, servidas por el mismo servidor y usando `design-system/tokens.css` y `brand.js` tal cual: `GET /public/reservar` (reserva en pasos) y `GET /public/turnos/:token` y `.../confirmar` (gestión del turno, en las mismas rutas que ya usan los e-mails de C-12). Copy en español rioplatense (voseo).
- **Gestión por enlace**: ver turno, confirmar asistencia (reutiliza `ConfirmarDesdeEnlace` de C-12), cancelar y reprogramar; con menos de 24 h se reemplazan cancelar/reprogramar por el contacto del consultorio (RN-08); enlace inválido o vencido → mensaje genérico fijo (RN-15, RN-22). Abrir un enlace (GET) nunca cambia el estado del turno.
- **Reserva**: el paciente elige prestación, profesional (por defecto "Cualquiera") y un día de los próximos 30 con sus horarios libres; nunca ve el sillón ni datos de otros pacientes (DD-18). La confirmación muestra el profesional asignado y el enlace de gestión (entrega única del token, DD-15).
- **Regla nueva RN-30**: horizonte de la reserva online de 30 días, validado en el servidor (disponibilidad pública, reserva y reprogramación por token), no solo en la UI.
- **Logs redactados** (en alcance): el token y los datos personales no se registran (RN-21, RN-D-02). **Rate limit**: fuera de alcance, queda como pregunta abierta.
- **Estados de UI** cubiertos y probados: carga, vacío, error, éxito, enlace inválido y menos de 24 h, con Playwright en una suite separada (`npm run test:ui`) para que `npm test` siga rápido.
- Mockups obligatorios (390x844 y 1440x900) en `mockups/`, con aprobación explícita antes del apply.

## Capabilities

### New Capabilities

- `api-publica-paciente`: contrato HTTP de las rutas públicas del paciente (catálogo, disponibilidad, reserva, gestión por token y confirmación), traducción de errores públicos a códigos HTTP, horizonte de 30 días, navegación segura (GET sin efectos) y logs redactados.
- `interfaz-paciente`: pantallas públicas de reserva y de gestión del turno, sus estados (carga, vacío, error, éxito, enlace inválido, menos de 24 h), accesibilidad y responsive sobre el design system aprobado.

### Modified Capabilities

(ninguna: `reserva-online`, `gestion-turno-online-por-token` y `recordatorios-turno` conservan sus requisitos; el horizonte RN-30 se aplica en la capa pública nueva, delante de `ReservarOnline`, sin cambiar su contrato)

## Impact

- **Dependencias**: `fastify` 5.x en runtime; `playwright` como devDependency para la suite de UI. Script de build (`tsc` a `dist/`) y `npm start` para levantar el servidor con datos ficticios en memoria.
- **Aplicación**: casos de uso públicos nuevos (catálogo, disponibilidad pública por día, vista de gestión, disponibilidad para reprogramar, reserva con horizonte); extensión aditiva de `PrestacionRepositorio` con un listado por consultorio (coordinar con C-05, en curso).
- **Adaptadores**: `src/adapters/http/` (fábrica, rutas públicas, traducción de errores, redacción de logs, páginas estáticas); raíz de composición en `src/main.ts`.
- **Infraestructura compartida**: C-15 reutilizará la fábrica de la app; cambios posteriores deben extenderla sin romper las rutas públicas.
- **KB**: RN-30 en `05`, DD-29 a DD-31 en `09`, sección HTTP/UI en `08`, rutas en `03`, preguntas abiertas en `10` (rate limit, barrido periódico de recordatorios). Numeración desde RN-30 / DD-29 porque C-05 reserva RN-27..RN-29 y DD-25..DD-28.
- **Sin cambios** en dominio de agenda ni en los casos de uso de C-10, C-11 y C-12.
