# Design

## Context

Ver `proposal.md` (Why) y los specs `api-publica-paciente` e `interfaz-paciente` (comportamiento observable). Estado actual relevante:

- La capa de aplicación pública ya existe y no se modifica: `ConsultarDisponibilidad` (C-07, devuelve combos con `sillonId`), `ReservarOnline` + `validarPedidoReserva`/`reservarDesdePedido` (C-10, frontera pura sobre `unknown`), `ResolverTurnoDesdeToken`, `ConsultarTurnoDesdeToken`, `CancelarTurnoDesdeToken`, `ReprogramarTurnoDesdeToken` (C-11) y `ConfirmarDesdeEnlace` (C-12). Sus errores públicos son `ErrorReservaPublica`, `ErrorGestionTurnoPublica` y `ErrorEnlacePublico`, todos con mensaje fijo.
- Los e-mails de C-12 ya enlazan a `BASE_URL_PUBLICA/public/turnos/<token>` y, para un turno `reservado`, a `.../<token>/confirmar` (`src/domain/reglas/recordatorios.ts`). Esas rutas son un contrato existente: la página de gestión vive ahí y un clic de un e-mail es un `GET`.
- `ReprogramarTurno` (C-03) conserva profesional y sillón no informados; la entrada pública de C-11 no acepta `sillonId`.
- `PrestacionRepositorio` solo tiene `obtenerPorId`; `ProfesionalRepositorio` ya lista por consultorio.
- No hay servidor, ni `npm start`, ni build: `tsconfig` es `noEmit` y los imports usan sufijo `.js`.
- Design system rev. 1 aprobado (`design-system/`): tokens, `brand.js`, componentes de reserva (pasos, slots, resumen, alertas, modal).

## Goals / Non-Goals

**Goals:**
- Una fábrica de la app HTTP reutilizable por C-15 y una raíz de composición única.
- Cablear los casos de uso existentes sin cambiar su contrato ni sus tests; lo nuevo se agrega como casos de uso de aplicación pequeños o adaptadores.
- Un formato de error público único y estable para toda ruta `/public/*`.
- UI sin build, accesible, mobile-first, que solo consume la API pública.
- `npm test` sigue rápido y sin navegador; la UI se prueba con Playwright aparte.

**Non-Goals:**
- Rate limit (pregunta abierta, ver Risks), CAPTCHA, sesiones o cuentas de paciente.
- Proceso periódico de `EnviarRecordatoriosPendientes` (DD-21 lo había dejado "para C-14"): se excluye de C-14 por requerir SMTP y operación; queda como pregunta abierta para el change que integre la operación (ver `10_preguntas_abiertas.md`). **Decisión del propose, confirmada por el owner (2026-11-23).**
- Cambiar profesional o prestación al reprogramar online (solo cambia el horario, ver D7).
- Persistencia real, RBAC (C-09) y rutas internas (C-15).

## Decisions

**D1 — Fastify 5 con fábrica `crearApp(deps, opciones)` (DD-29).** `src/adapters/http/app.ts` crea la instancia (logger, cabeceras de seguridad, manejador de errores y de 404) y registra módulos de rutas como plugins: `rutasPublicasPaciente` (este change); C-15 agregará `rutasRecepcion` sin tocar las públicas. `crearApp` recibe casos de uso ya construidos (puertos), nunca repositorios: la raíz de composición `src/main.ts` (más `src/composicion.ts`, que arma el sistema con repos en memoria, seed ficticio y `RelojSistema`) es el único lugar que conoce adaptadores concretos. Los tests construyen la misma composición con `RelojFijo` y usan `app.inject`. Versión: `fastify` 5.x vigente (5.12 al proponer; fijada por `package-lock`). *Alternativas:* `node:http` puro (más código de routing/serialización propio); Express (sin `inject` ni schemas de respuesta); Fastify 4 (en fin de soporte).

**D2 — Validación de entrada con validadores puros, respuesta con schemas de Fastify.** Cuerpos y query se reciben como `unknown` y pasan por validadores puros en `src/adapters/http/` (`validarPedidoReserva` de C-10 reutilizado; nuevos `validarConsultaDisponibilidad`, `validarPedidoReprogramacion`), así el error es siempre `DATOS_INVALIDOS` con `campos`. Las respuestas declaran JSON Schema con `additionalProperties: false`: `fast-json-stringify` descarta cualquier campo no declarado (`turnoId`, `sillonId`), defensa en profundidad de DD-18. Límite de cuerpo 16 KB; un cuerpo no JSON o mal formado es `DATOS_INVALIDOS` con `campos: ['pedido']`. *Alternativa:* schemas de entrada de Fastify (Ajv): producen su propio formato de error y duplican la frontera de C-10.

**D3 — Errores públicos → HTTP en un único `setErrorHandler`.** Mapeo fijo del spec (400/404/409/422); `ErrorEnlacePublico` → 404. Cualquier otro error → 500 `ERROR_INTERNO` "Ocurrió un error. Probá de nuevo en unos minutos.", se registra con su traza (sin cuerpo del pedido) y nunca se devuelve. 404 de ruta inexistente: `NO_ENCONTRADO` en JSON o una página HTML mínima. Cuerpo: `{ error: { codigo, mensaje, campos?, nuevaOferta? } }`.

**D4 — Rutas y negociación de contenido (DD-29).** Se conservan las rutas que DD-13 y DD-23 nombraron y las que ya usan los e-mails:

| Método y ruta | Respuesta |
|---|---|
| `GET /public/reservar` | Página de reserva (HTML) |
| `GET /public/prestaciones` | Consultorio, días reservables y prestaciones activas |
| `GET /public/prestaciones/:prestacionId/profesionales` | Profesionales activos habilitados |
| `GET /public/disponibilidad?prestacionId&fecha&profesionalId?` | Horarios únicos del día |
| `POST /public/reservas` | 201 con turno público + token |
| `GET /public/turnos/:token` | HTML (navegación) o JSON (`Accept: application/json`) |
| `GET /public/turnos/:token/confirmar` | HTML (misma página, foco en confirmar) |
| `POST /public/turnos/:token/confirmar` | Confirma asistencia |
| `POST /public/turnos/:token/cancelar` | Cancela (RN-08) |
| `GET /public/turnos/:token/disponibilidad?fecha` | Horarios para reprogramar |
| `POST /public/turnos/:token/reprogramar` | Reprograma `{ inicio }` |
| `GET /public/assets/<archivo>`, `GET /public/design-system/{tokens.css,brand.js,assets/logo.svg}` | Estáticos (lista blanca) |

`GET /public/turnos/:token` responde JSON solo si `Accept` incluye `application/json` y no `text/html`; si no, la página. Se envía `Vary: Accept`. **Ningún `GET` cambia estado**: el enlace `/confirmar` del e-mail abre la página y el paciente confirma con un botón (`POST`), porque los clientes de correo y antivirus prefetchean enlaces. Esto agrega un clic al flujo de C-12; se registra en DD-29. Un token con forma inválida (no base64url de 43 caracteres) responde `ENLACE_INVALIDO` sin consultar repositorios. *Alternativas:* prefijo `/public/api/...` para JSON (rompe los nombres de DD-13/DD-23); confirmar en el `GET` (expuesto a prefetch).

**D5 — Casos de uso públicos nuevos (aplicación, sin tocar C-07/C-10/C-11/C-12).**
- `ListarCatalogoPublico` → consultorio `{nombre, zonaHoraria}`, `diasReservables` y prestaciones activas `{id, nombre, duracionMinutos}`. Requiere `PrestacionRepositorio.listarPorConsultorio` (extensión aditiva del puerto y del adaptador en memoria; **coordinar con C-05**, que también extiende repositorios).
- `ListarProfesionalesPublicos(prestacionId)` → `{id, nombre, apellido}` activos y habilitados (RN-19).
- `ConsultarDisponibilidadPublica({prestacionId, fecha, profesionalId?})` → valida RN-30, convierte el día local a `[desde, hasta)` con `deHoraLocal`, llama a `ConsultarDisponibilidad` con actor paciente, filtra profesionales activos habilitados y agrupa con `agruparPorHorario`, devolviendo solo `{inicio, fin}`.
- `ReservarOnlinePublica` → verifica RN-30 sobre `inicio` y delega en `ReservarOnline` sin modificarlo; fuera del horizonte lanza `ErrorReservaPublica('HORARIO_NO_DISPONIBLE', { nuevaOferta: [] })` (no se agrega un código al conjunto cerrado de C-10).
- `ConsultarGestionDesdeToken` → resuelve con `ResolverTurnoDesdeToken` y arma la vista de D6.
- `ConsultarDisponibilidadParaReprogramar({token, fecha})` → resuelve el token, aplica RN-08 (`CONTACTAR_CONSULTORIO`) y RN-30, consulta con `profesionalId` del turno y filtra los combos del mismo `sillonId`, sin exponerlo.
- `ReprogramarDesdeTokenPublica` → verifica RN-30 sobre el nuevo `inicio` (fuera del horizonte: `HORARIO_NO_DISPONIBLE`) y delega en `ReprogramarTurnoDesdeToken` sin modificarlo; el orden token → RN-08 de C-11 se conserva porque la verificación del horizonte ocurre después de resolver el token y comprobar la anticipación.
- La regla pura de RN-30 (`diasReservables(ahora, zona)` y `dentroDelHorizonte(inicio, ahora, zona)`) vive en `src/domain/reglas/horizonte-reserva.ts`.

**D6 — Vista de gestión (DD-31).** `GET /public/turnos/:token` (JSON) devuelve `{ inicio, fin, prestacion: {nombre}, profesional: {nombre, apellido}, asistenciaConfirmada, gestionOnline, consultorio: {nombre, telefono, email, zonaHoraria}, diasReservables }`. Se omite `turnoId` (la UI no lo necesita). `asistenciaConfirmada` revela `reservado` vs. `confirmado` del propio turno, coherente con la respuesta de `ConfirmarDesdeEnlace` (C-12), y evita mostrar "Confirmar" a quien ya confirmó; no se expone ningún otro estado (los demás ya dan `ENLACE_INVALIDO`). `gestionOnline` se calcula en el servidor con `evaluarAnticipacionPaciente` y el `Reloj`: la UI nunca usa el reloj del navegador para RN-08 ni RN-30. **Supuesto confirmado por el owner (2026-11-23):** DD-23 excluía el estado de `TurnoPublico`; este campo booleano se agrega solo en la vista HTTP.

**D7 — Reprogramación online solo de horario (DD-31).** Como C-03 conserva el sillón y la entrada pública no lo acepta, ofrecer horarios de otro sillón haría fallar la reprogramación. Por eso la disponibilidad para reprogramar filtra el mismo profesional y el mismo sillón, y el cuerpo admite solo `inicio` (`profesionalId`, `prestacionId`, `sillonId` → `DATOS_INVALIDOS`). Limitación aceptada: los horarios que se solapan con el propio turno actual no se ofrecen, porque C-07 lo cuenta como ocupado. *Alternativa:* aceptar `profesionalId` y elegir sillón en el servidor (requiere cambiar C-11/C-03). **Confirmado por el owner (2026-11-23).**

**D8 — Horizonte de 30 días en el servidor (RN-30, DD-30).** El límite se valida en disponibilidad pública, reserva y disponibilidad para reprogramar; la reprogramación misma (`POST`) también lo verifica antes de delegar. Días locales de la zona del consultorio, `hoy` a `hoy + 30` inclusive (31 días, dentro del máximo de 31 de C-07 porque cada consulta es de un día). Constante de dominio, no variable de entorno. *Alternativa:* solo en la UI (un cliente podría reservar a un año).

**D9 — Logs redactados en alcance; rate limit fuera (DD-29).** Logger de Fastify (pino) con serializadores propios: `req` → `{ method, url }` con el segmento del token reemplazado por `[redactado]` y sin query string; `res` → `{ statusCode }`; sin cabeceras ni cuerpos. Cabeceras de respuesta: `Cache-Control: no-store` en `/public/turnos/*` y respuestas JSON, `Referrer-Policy: no-referrer` (el token está en la URL), `X-Content-Type-Options: nosniff`, `Content-Security-Policy` estricta (`default-src 'self'`, sin inline ni orígenes externos). Rate limit: no se agrega `@fastify/rate-limit` (un contador en memoria por proceso no protege tras varios procesos y suma dependencia); queda en `10_preguntas_abiertas.md` como requisito antes de publicar fuera de la demo, junto con la mitigación pendiente de RN-23.

**D10 — UI sin framework (DD-30).** Archivos en `src/adapters/http/web/`: `reserva.html`, `gestion.html`, `paciente.css` y módulos ES (`api.js` cliente `fetch` con `Accept: application/json` y timeout, `formato.js` con `Intl.DateTimeFormat` en la zona del consultorio, `reserva.js`, `gestion.js`, `dialogo.js`). Cada `.js` lleva `// @ts-check` + JSDoc y se tipa con `tsconfig.web.json` (`lib: DOM`, `checkJs`), incluido en `npm run typecheck`. HTML estático sin datos: la página de gestión lee el token de `location.pathname` y nunca lo guarda en `localStorage`/`sessionStorage`. `tokens.css` y `brand.js` del design system se sirven tal cual; `paciente.css` solo agrega layout y componentes con esos tokens (partiendo del CSS de los mockups). Estados con texto + icono, `aria-live="polite"` para carga y resultados, foco gestionado al cambiar de paso, diálogo con `<dialog>` nativo, días como `radiogroup` con flechas, horarios como botones `aria-pressed`. Movimiento: solo `transform`/`opacity` < 240 ms con `--ease-out`, desactivado por `prefers-reduced-motion` (ya en tokens). *Alternativas:* React/Vite (build y dependencias para dos pantallas); SSR con plantillas (mezcla token y datos en HTML cacheable).

**D11 — Ejecución y build.** `npm run build` (`tsc -p tsconfig.build.json`, emite `src/` a `dist/`) y `npm start` (`node dist/src/main.js`); los estáticos se leen desde `src/adapters/http/web/` y `design-system/` resolviendo desde la raíz del proyecto. `main.ts` carga un seed demo ficticio (`src/adapters/persistence/en-memoria/seed-demo.ts`, mismos datos que el seed de tests, sin pacientes) y lee `PORT` (3000), `HOST` (`127.0.0.1`), `BASE_URL_PUBLICA` y `LOG_LEVEL`. *Alternativa:* `tsx` como devDependency (otra dependencia solo para ejecutar).

**D12 — Tests (DD-30).** (a) Contrato HTTP: `tests/adapters/http/*.test.ts` con `app.inject`, un test por escenario de `api-publica-paciente` con el nombre exacto; logs capturados con un `stream` en memoria. (b) UI: `tests/ui/*.ui.test.ts` con Playwright (Chromium) bajo una configuración de Vitest aparte (`vitest.ui.config.ts`, `npm run test:ui`), un test por escenario de `interfaz-paciente`; la app escucha en un puerto efímero con `RelojFijo`, y los estados de carga/error se fuerzan con `page.route`. `vitest.config.ts` excluye `tests/ui/**`, así `npm test` no abre navegador. `playwright` entra como devDependency fijada; en este entorno Chromium ya está instalado, en otros `npx playwright install chromium`. Accesibilidad verificada en los tests de UI (foco, nombres accesibles, 44 px, sin scroll horizontal) sin agregar `axe`.

## Risks / Trade-offs

- **Infra compartida con C-15** → la fábrica recibe módulos de rutas y casos de uso por parámetro; C-15 debe agregar su plugin y sus tests de contrato sin modificar `rutasPublicasPaciente`. Avisar al equipo al archivar.
- **Conflicto con C-05 en `PrestacionRepositorio`** → extensión aditiva de una sola firma; rebase sobre C-05 antes del apply si C-05 se archiva primero.
- **Enumeración y abuso sin rate limit** → mensajes fijos (RN-22), tokens de 256 bits, validación de forma del token sin I/O; rate limit registrado como bloqueante para publicar fuera de la demo.
- **Un clic más para confirmar desde el e-mail** → aceptado por seguridad frente al prefetch; la página enfoca el botón "Confirmar asistencia" al venir de `/confirmar`.
- **Reprogramación sin horarios solapados con el turno actual (D7)** → aceptado; mover 15 minutos dentro del propio turno no se ofrece.
- **Reloj del navegador desfasado** → la UI nunca decide RN-08 ni RN-30; usa `gestionOnline` y `diasReservables` del servidor.
- **Token en la URL** → `Referrer-Policy: no-referrer`, `no-store`, logs redactados, página estática sin token incrustado.
- **Suite de UI más lenta o frágil** → aislada en `npm run test:ui`, con datos y reloj fijos; obligatoria antes de `verify`/archive.
- **Fastify agrega superficie de dependencias** → una sola dependencia de runtime nueva, versión fijada.

## Migration Plan

Change aditivo: nuevas rutas, dependencias y scripts; no se migran datos ni cambian contratos existentes. Despliegue local con `npm run build && npm start` y `BASE_URL_PUBLICA` apuntando al servidor. Rollback: revertir el commit del change (los casos de uso de C-10..C-12 siguen funcionando sin HTTP).

## Confirmaciones del owner (tarea 0.2, 2026-11-23, Alejo Carabelli)

1. `GET /public/turnos/:token/confirmar` nunca cambia el estado: la confirmación es por el botón (`POST`).
2. La reprogramación online solo cambia el horario (mismo profesional y mismo sillón).
3. El barrido periódico de recordatorios queda fuera de C-14.
4. El rate limit queda fuera de C-14; los logs redactados están dentro.

## Open Questions

- Rate limit: ¿por IP y por DNI?, ¿con qué límites y en qué change? (no cambia este diseño; se agrega como plugin en la fábrica).
- Proceso periódico del barrido de recordatorios: ¿qué change lo opera y con qué intervalo?

## UI Mockups

- Approval: approved (2026-11-23, Alejo Carabelli como owner y Lautaro Medina en el PR #6: "okey")
- Design system: `design-system/` revisión 1 (aprobada); los mockups enlazan `../../../../design-system/tokens.css` y `brand.js` sin modificarlos.
- Hoja de estilos compartida de los mockups: `mockups/paciente.css` (base de `src/adapters/http/web/paciente.css` en el apply).
- Datos 100 % ficticios: "Paciente Ficticio 1", DNI 30000001, teléfono 1100000000, "Ana Ejemplo"/"Bruno Muestra", "Consultorio Odontológico Demo".
- Fecha de referencia de los mockups: "hoy" es el domingo 22 de noviembre (el consultorio no atiende), así que el horizonte llega al martes 22 de diciembre y el turno de ejemplo del lunes 23 a las 10:00 todavía se puede gestionar online; la pantalla "menos de 24 h" simula un "ahora" posterior.

| Pantalla / estado | Archivo | 390x844 | 1440x900 |
|---|---|---|---|
| Reserva paso 1: prestación | `mockups/reserva-1-prestacion.html` | `mockups/previews/reserva-1-prestacion-mobile.png` | `mockups/previews/reserva-1-prestacion-desktop.png` |
| Reserva paso 1: error de red | `mockups/reserva-1-error.html` | `mockups/previews/reserva-1-error-mobile.png` | `mockups/previews/reserva-1-error-desktop.png` |
| Reserva paso 2: profesional, día y horario | `mockups/reserva-2-horario.html` | `mockups/previews/reserva-2-horario-mobile.png` | `mockups/previews/reserva-2-horario-desktop.png` |
| Reserva paso 2: cargando horarios | `mockups/reserva-2-cargando.html` | `mockups/previews/reserva-2-cargando-mobile.png` | `mockups/previews/reserva-2-cargando-desktop.png` |
| Reserva paso 2: día sin horarios | `mockups/reserva-2-vacio.html` | `mockups/previews/reserva-2-vacio-mobile.png` | `mockups/previews/reserva-2-vacio-desktop.png` |
| Reserva paso 3: datos con errores | `mockups/reserva-3-datos.html` | `mockups/previews/reserva-3-datos-mobile.png` | `mockups/previews/reserva-3-datos-desktop.png` |
| Reserva paso 3: horario ocupado al confirmar | `mockups/reserva-3-horario-ocupado.html` | `mockups/previews/reserva-3-horario-ocupado-mobile.png` | `mockups/previews/reserva-3-horario-ocupado-desktop.png` |
| Reserva paso 4: turno reservado | `mockups/reserva-4-confirmacion.html` | `mockups/previews/reserva-4-confirmacion-mobile.png` | `mockups/previews/reserva-4-confirmacion-desktop.png` |
| Gestión: turno normal | `mockups/gestion-normal.html` | `mockups/previews/gestion-normal-mobile.png` | `mockups/previews/gestion-normal-desktop.png` |
| Gestión: cancelar (diálogo) | `mockups/gestion-cancelar.html` | `mockups/previews/gestion-cancelar-mobile.png` | `mockups/previews/gestion-cancelar-desktop.png` |
| Gestión: turno cancelado | `mockups/gestion-cancelado.html` | `mockups/previews/gestion-cancelado-mobile.png` | `mockups/previews/gestion-cancelado-desktop.png` |
| Gestión: reprogramar | `mockups/gestion-reprogramar.html` | `mockups/previews/gestion-reprogramar-mobile.png` | `mockups/previews/gestion-reprogramar-desktop.png` |
| Gestión: menos de 24 h | `mockups/gestion-menos-24h.html` | `mockups/previews/gestion-menos-24h-mobile.png` | `mockups/previews/gestion-menos-24h-desktop.png` |
| Gestión: enlace inválido | `mockups/gestion-enlace-invalido.html` | `mockups/previews/gestion-enlace-invalido-mobile.png` | `mockups/previews/gestion-enlace-invalido-desktop.png` |

Índice navegable: `mockups/index.html`. Las capturas son de página completa (en 390 px se toman con un viewport tan alto como la página, por eso la barra de acciones fija de los pasos de reserva aparece al pie). Generadas con Playwright/Chromium; sin desplazamiento horizontal en ningún mockup y todos los controles visibles de al menos 44 px.

Notas de diseño: mobile-first, una columna en 390 px y resumen "Tu turno" lateral desde 1024 px; acento teal único del design system; estados siempre con texto + icono (nunca solo color); foco con `--focus-ring`; movimiento solo de `transform`/`opacity` (press `scale(0.97)`, entrada del diálogo `scale(0.96)` → 1 en 240 ms `--ease-out`), anulado por `prefers-reduced-motion` desde `tokens.css`; hover solo con `(hover: hover) and (pointer: fine)`; sin fotos ni ilustraciones (brand.md). De `design-taste-frontend` se tomaron solo los principios aplicables (bordes iguales, sin leyendas bajo imágenes, objetivos táctiles, foco y movimiento); sus reglas de sitio de marketing (fotos, héroe, efectos, gate) no aplican a esta app y prevalece el design system aprobado. El apply no empieza hasta que el owner cambie `Approval: pending` por `Approval: approved (<fecha>, <quién>)`; `verify` compara las pantallas implementadas contra estas capturas.

### Verificación visual (tarea 5.1, 2026-11-23)

Capturas de la implementación a 390x844 y 1440x900 de las 14 pantallas en `verify/` (`<mockup>-mobile.png` y `<mockup>-desktop.png`), generadas con `CAPTURAS_DIR=<carpeta> npx vitest run --config vitest.ui.config.ts tests/ui/capturas.ui.test.ts` y comparadas con `mockups/previews/`. Diferencias aceptadas:

- Los mockups llevan el rótulo "Mockup C-14 · ..." en el pie y un enlace de ejemplo (`localhost:3000/...EjemploToken`); la implementación no tiene el rótulo y muestra el enlace real.
- La reserva paso 1 no preselecciona ninguna prestación (el mockup mostraba una elegida); "Continuar" queda deshabilitado hasta elegir.
- El selector de días lista los 31 días del horizonte (el mockup mostraba 14) y el paso 2 empieza en "Hoy"; si ese día no tiene horarios se ofrece "Ver el <próximo día con horarios>" (el servidor lo busca día por día hasta 14 días).
- Tras "Ese horario se acaba de ocupar" el horario elegido se limpia ("Sin horario") y "Confirmar turno" queda deshabilitado hasta elegir otro, en vez de conservar el horario ocupado; la lista de la nueva oferta muestra todos los horarios del día devueltos por el servidor.
- La columna lateral de "menos de 24 h" no incluye la línea "Lunes a viernes de 09:00 a 13:00 y de 15:00 a 19:00": la API pública no expone los horarios de atención (queda como mejora si se agrega al contrato).
- Textos: "hasta el mar 22 de diciembre" se mantiene; "Cancelaste tu turno." lleva punto final (el spec lo cita así) y el aviso del horario ocupado dice "del lunes 23 de noviembre" en vez de "del lunes 23".
- Nombre del consultorio en el encabezado y el pie: se completa desde la API (la página HTML es estática y no incluye datos).
