# Design

## Context

Ver `proposal.md` (Why) y los specs del change. Decisiones de negocio en RN-34 y RN-35 (`05_reglas_de_negocio.md`) y DD-38 a DD-41 (`09_decisiones_y_supuestos.md`). Estado actual relevante:

- **HTTP (C-14, C-09).**
  - `crearApp(casos, opciones)` registra las rutas públicas, `/auth/*` si recibe `autenticacion`, y los módulos de `opciones.rutas`.
  - `crearExigirSesion(resolver)` deja el `ActorInterno` en `request.actor` y `actorDe(request)` lo lee.
  - `traducirError` ya mapea `AccesoDenegadoError` (403), `SesionInvalidaError` y `CredencialesInvalidasError` (401) y los errores públicos de C-10, C-11 y C-12. `ReglaNegocioError`, `RecursoNoEncontradoError` y `ConfiguracionInvalidaError` todavía caen en 500.
  - La política de seguridad del contenido es `script-src 'self'`, sin inline, y los logs solo registran método, ruta sin query y estado.
- **Casos de uso disponibles:** `AgendarTurno` (y `AgendarTurnoConRecordatorio`), `CancelarTurno`, `ReprogramarTurno`, `ConfirmarTurno`, `MarcarAtendido`, `MarcarAusente`, `ConsultarDisponibilidad`, `AgendaDiaria`, `AgendaSemanal`, `BloquearHorario`, `LiberarBloqueo`, `ListarRecordatoriosPendientesWaMe` y `MarcarRecordatorioEnviado`. Todos reciben `actor` y aplican la matriz de C-09.
- **Agenda (C-08):** `AgendaDiaria` devuelve `Turno & { ocupa }` y `BloqueoHorario` con ids, sin nombres. `AgendaSemanal` arma los 7 días.
- **Pacientes:** `PacienteRepositorio` tiene `obtenerPorDni`, `obtenerPorId` y `guardar`. `validarDatosPacienteOnline` (C-10) normaliza y valida DNI, nombre, apellido, teléfono, e-mail y consentimiento.
- **Interfaz del paciente (C-14):** HTML y módulos ES en `src/adapters/http/web/`, con `// @ts-check`, tipados con `tsconfig.web.json` y servidos por una lista blanca de estáticos. Se prueba con Playwright aparte (`npm run test:ui`).
- **Design system rev. 1:** grilla de agenda por sillón y por profesional, chips de estado, botones, campos, modal, toast y tabla (`design-system/components.html`).
- **Seed demo:** `seed-demo.ts` no tiene pacientes ni turnos.

## Goals / Non-Goals

**Goals:**
- Exponer los casos de uso existentes sin cambiar su contrato ni sus tests: C-15 agrega rutas, una vista y dos casos de uso de pacientes.
- Que el navegador reciba solo lo que muestra: nombres en la agenda, y DNI y teléfono solo en pacientes y en el detalle del turno.
- Reutilizar la técnica de C-14 (sin framework, `@ts-check`, Playwright) y los componentes del design system tal como están.
- Que los permisos sigan estando en los casos de uso: la interfaz oculta lo que el rol no puede hacer, pero el servidor es quien decide.

**Non-Goals:**
- Un framework de frontend, un bundler o una biblioteca de componentes.
- Actualizar la agenda en tiempo real (WebSocket o polling): se recarga después de cada acción y con "Hoy" o "Siguiente".
- Pantallas de administración.

## Decisions

### D1. Capas y archivos

```
src/domain/reglas/pacientes-recepcion.ts   NUEVO: normalizarBusqueda, coincide (RN-34), puras
src/domain/permisos/acciones.ts            + 'paciente.buscar', 'paciente.crear'
src/domain/permisos/matriz.ts              + filas (admin y recepción: si; resto: no)
src/domain/errores.ts                      + 'RN-35' en CodigoRN, con pacienteExistente
src/application/puertos/repositorios.ts    PacienteRepositorio + listar()
src/application/buscar-pacientes.ts        NUEVO
src/application/alta-rapida-paciente.ts    NUEVO
src/application/vista-agenda.ts            NUEVO: AgendaDiaria/Semanal + nombres (D3)
src/application/listar-catalogo-interno.ts NUEVO
src/adapters/http/rutas-recepcion.ts       NUEVO: /interno/* y /recepcion (páginas)
src/adapters/http/validadores-internos.ts  NUEVO: fecha, inicio, ids, cuerpos
src/adapters/http/serializadores-internos.ts NUEVO
src/adapters/http/errores-http.ts          + ReglaNegocioError 409, RecursoNoEncontrado 404,
                                             ConfiguracionInvalida 400, ConsultaInvalida 400
src/adapters/http/web/recepcion/           NUEVO: login.html, agenda.html, recepcion.css,
                                             api.js, sesion.js, agenda.js, grilla.js,
                                             dar-turno.js, detalle.js, bloqueo.js, wa-me.js
src/adapters/persistence/en-memoria/paciente-repositorio.ts  + listar()
src/adapters/persistence/en-memoria/seed-demo.ts             + pacientes y turnos ficticios
src/composicion.ts, src/main.ts            casos internos + rutas de recepción
```

### D2. Pacientes (RN-34, RN-35, DD-40)

- `BuscarPacientes({ actor, texto })` sigue este orden:
  1. `autorizar(actor, 'paciente.buscar')`.
  2. `normalizarBusqueda(texto)`, que recorta, pasa a minúsculas y quita tildes con NFD. Menos de 3 caracteres es `ConsultaInvalidaError('texto')`.
  3. `pacientes.listar()` y filtro puro: si son solo dígitos, `dni.startsWith`; si no, nombre o apellido contienen el texto.
  4. Ordena por apellido y nombre y corta en 10.

  Devuelve `{ pacientes: PacienteResumen[], hayMas }`. `PacienteResumen` = `id`, `nombre`, `apellido`, `dni` y `telefono`.
- `AltaRapidaPaciente({ actor, datos })` sigue este orden:
  1. `autorizar(actor, 'paciente.crear')`.
  2. `validarDatosPacienteOnline(datos)` (DD-17), y si falla, `ConfiguracionInvalidaError` con los campos.
  3. Si el DNI ya existe, `ReglaNegocioError({ codigo: 'RN-35', pacienteExistente })`.
  4. `ids.siguiente()` y `guardar`.

  Se reutiliza la validación de C-10 tal como está, así el paciente que crea recepción y el que reserva online tienen exactamente el mismo formato.
- **Alternativas.** Un índice de búsqueda en el repositorio: con 1 a 5 profesionales los pacientes son cientos, y el filtro en memoria es suficiente; cuando llegue PostgreSQL será un `ILIKE`. Dejar que el alta pise al paciente existente: se rechaza para no cambiar datos sin querer, como RN-22.

### D3. Vista de la agenda con nombres (DD-40)

`VistaAgenda` envuelve a `AgendaDiaria` y `AgendaSemanal` (que siguen aplicando la visibilidad del odontólogo) y les agrega los nombres. Los busca en los repositorios de catálogo y de pacientes: un `obtenerPorId` por id distinto, cacheado durante el pedido. Cada turno queda como:

```ts
{ id, estado, ocupa, inicio, fin, duracionMinutos, origen,
  paciente: { id, nombre, apellido },
  prestacion: { id, nombre }, profesional: { id, nombre, apellido }, sillon: { id, nombre } }
```

Cada bloqueo trae `profesional?` o `sillon?` con su nombre. DNI y teléfono no viajan en la agenda: el panel de detalle los pide con `GET /interno/pacientes/:id`, que es un pedido aparte y solo para recepción y administrador. Así el odontólogo ve el nombre del paciente en sus turnos y nada más (la matriz dice "R de sus turnos").

### D4. Rutas internas y formato

- **Organización.**
  - Un plugin `rutasRecepcion(casos)` registrado con `opciones.rutas`.
  - Todas las rutas `/interno/*` usan el `preHandler` de C-09 y leen el actor con `actorDe(request)`.
  - Las páginas `/recepcion` y `/recepcion/login` son HTML estático sin datos y no piden sesión: la sesión la verifica la API.
- **Validación.** La entrada pasa por validadores puros, igual que en C-14:
  - Fechas `YYYY-MM-DD`, `inicio` en ISO 8601 con zona e ids de texto no vacío.
  - El error es siempre `DATOS_INVALIDOS` con `campos`.
- **Formato de salida.** Instantes en ISO UTC; la interfaz los formatea en la zona del consultorio, que viene en el catálogo.
- **Errores.** `traducirError` suma:
  - `ReglaNegocioError` → 409, con `codigo` = RN y un mensaje fijo por código. Por ejemplo, `RN-02` es "El profesional ya tiene un turno en ese horario." Agrega `conflicto: { inicio, fin }` si la regla informa un turno o bloqueo en conflicto, y para `RN-31`, `turnos: [...]`; para `RN-35`, `paciente`.
  - `RecursoNoEncontradoError` → 404 `NO_ENCONTRADO`.
  - `ConfiguracionInvalidaError` y `ConsultaInvalidaError` → 400 `DATOS_INVALIDOS`.

  Estas traducciones solo pueden aparecer en rutas internas: las públicas ya traducen sus errores antes (RN-22), y un test lo verifica.
- **Rutas:**

| Método y ruta | Caso de uso |
|---|---|
| `GET /recepcion`, `GET /recepcion/login`, `GET /recepcion/assets/*` | páginas y estáticos (lista blanca) |
| `GET /interno/catalogo` | `ListarCatalogoInterno` + usuario de la sesión |
| `GET /interno/agenda?fecha&vista&profesionalId?&sillonId?` | `VistaAgenda` |
| `GET /interno/disponibilidad?prestacionId&fecha&profesionalId?` | `ConsultarDisponibilidad` + `agruparPorHorario` |
| `GET /interno/pacientes?texto`, `GET /interno/pacientes/:id`, `POST /interno/pacientes` | `BuscarPacientes`, resumen por id, `AltaRapidaPaciente` |
| `POST /interno/turnos` | `AgendarTurnoConRecordatorio` (programa el recordatorio, Flujo 1) |
| `POST /interno/turnos/:id/{cancelar,confirmar,atendido,ausente,reprogramar}` | C-02, C-04, C-03 |
| `POST /interno/bloqueos`, `POST /interno/bloqueos/:id/liberar` | C-06 |
| `GET /interno/recordatorios/wa-me`, `POST /interno/recordatorios/:id/enviado` | C-13, más nombre del paciente y horario |

- **Alternativa.** REST con `PATCH /interno/turnos/:id { estado }`: mezcla cuatro casos de uso con reglas distintas detrás de un solo verbo. Con un `POST` por acción, cada ruta se corresponde con un caso de uso y un permiso de la matriz.

### D5. Interfaz (DD-38, DD-39, DD-41)

- **Técnica.** Igual que C-14: HTML estático y módulos ES con `// @ts-check` y JSDoc, tipados por `tsconfig.web.json`. Usa `tokens.css` y `brand.js` del design system, y `recepcion.css` copia del design system la grilla, los chips, los botones, los campos, el modal y el toast sin cambiar sus valores. Escritorio primero, con un ancho mínimo útil de 1024 px; en pantallas chicas la grilla hace scroll horizontal dentro de su caja.
- **Sesión (DD-38).**
  - `sesion.js` guarda `{ token, usuario }` en `sessionStorage` con try/catch: si no hay storage, la sesión vive solo en memoria.
  - `api.js` agrega `Authorization`. Ante un 401 borra la sesión y redirige a `/recepcion/login?vencida=1`.
  - El token no va nunca en la URL ni en `localStorage`.
- **Pantalla.** Barra superior con marca, usuario, rol y "Salir". Debajo, la barra de agenda:
  - `[Día | Semana]`, `[Por sillón | Por profesional]` en el día o el selector de recurso en la semana.
  - `Anterior`, `Hoy`, `Siguiente`, el selector de fecha y los botones "Dar turno" y "Bloquear horario".
  - Grilla de la agenda a la izquierda y panel lateral a la derecha, que muestra el detalle del turno elegido o, si no hay ninguno, los pendientes de WhatsApp.
- **Grilla.** Filas de 30 minutos entre el primer y el último tramo de atención del día, con una altura proporcional a la duración (posición con `grid-row`, como en el design system). Cada turno es un `<button>` con su nombre accesible; los bloqueos son `role="note"`. Si hay turnos superpuestos en la misma columna, no debería pasar (RN-02 y RN-03), pero si ocurre con datos viejos se muestran uno al lado del otro.
- **Formularios.** Dar turno, alta rápida, reprogramar y bloquear se abren en `<dialog>` nativos. La búsqueda de pacientes usa `role="combobox"` con `aria-controls`, y los huecos son botones con `aria-pressed`, como en C-14.
- **Avisos.** Toast con `role="status"`; los errores de la API van en `role="alert"` dentro del formulario.
- **Odontólogo.** El rol viene de `/interno/catalogo` y el botón o panel que no corresponde no se renderiza. La API igual rechazaría la acción con 403.
- **Alternativas.** React u otro framework con build: agrega dependencias y un paso de build para un MVP de dos pantallas internas. Lo mismo que se decidió en C-14 (DD-30).

### D6. Seed demo

`seed-demo.ts` suma 6 pacientes ficticios ("Paciente Ficticio 1" a "Paciente Ficticio 6", DNI `3000000N`, teléfonos `11 0000 000N`) y unos 8 turnos en la semana actual, armados a partir del `Reloj` al arrancar. Así la demo muestra una agenda con contenido. Los tests no usan este seed.

### D7. Tests

- **Contrato HTTP** (`tests/adapters/http/recepcion-*.test.ts`): `fastify.inject` con el fixture de C-09, un test por escenario de `api-interna` con el mismo nombre.
- **Casos de uso:** `pacientes-recepcion`, `consulta-agenda` (vista) y `control-acceso` (pacientes por rol).
- **Interfaz** (`tests/ui/recepcion-*.ui.test.ts`): Playwright con la misma configuración que C-14 (`vitest.ui.config.ts`), un test por escenario de `interfaz-recepcion`, servidor en un puerto efímero con `RelojFijo` y `page.route` para forzar errores de red y sesiones vencidas.
- **Verificación visual:** capturas de 1440 × 900 contra los mockups aprobados (`verify/`), como C-14.

## Risks / Trade-offs

- [El token en `sessionStorage` lo puede leer un script inyectado] → La política de seguridad del contenido es estricta y sin inline, la interfaz no usa HTML de terceros, el texto de los datos se inserta con `textContent` y nunca con `innerHTML`, el token vence a las 8 h y desactivar al usuario lo corta.
- [Con muchos pacientes, `listar()` en memoria no escala] → El MVP es de 1 a 5 profesionales; el puerto permite cambiar a una consulta SQL sin tocar el caso de uso.
- [Dos recepcionistas sobre la misma agenda sin refresco en vivo] → Toda escritura valida en la sección crítica (RN-12), así que el segundo recibe 409 con el conflicto y la interfaz recarga la agenda.
- [`ReglaNegocioError` mapeado a HTTP podría filtrarse en una ruta pública] → Las rutas públicas ya traducen antes; se agrega un test de que `/public/*` nunca responde 409 con un código `RN-XX`.
- [El demo arranca sin usuario de recepción] → Se usa el administrador inicial de C-09, que ve lo mismo que recepción. La creación de usuarios por HTTP sigue fuera de alcance (pregunta abierta).

## Migration Plan

Sin migración de datos. `npm run build` y `npm start` con las variables de C-09; la interfaz queda en `/recepcion/login`. Rollback: revertir el commit del change.

## Open Questions

- Pantalla o ruta para que el administrador cree usuarios de recepción y odontólogos: queda para un change posterior al MVP; mientras tanto, para la demo se usa el administrador inicial.
