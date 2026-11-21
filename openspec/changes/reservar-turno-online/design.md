# Design

## Context

Ver `proposal.md` (Why). Estado actual observado en el código:

- `AgendarTurno` (C-01) valida con `validarAlta` y persiste en la sección crítica `TurnoRepositorio.agregarSiDisponible` (RN-12); el estado inicial sale de `estadoInicial(actor.rol)`: con `rol: 'paciente'` el turno nace `reservado` / `online` (DD-11). Rechaza con `ReglaNegocioError` (incluye `turnoEnConflicto` / `bloqueoEnConflicto`) o `RecursoNoEncontradoError`.
- `ConsultarDisponibilidad` (C-07) recibe `ahora` explícito, devuelve combos `Hueco {inicio, fin, profesionalId, sillonId}` en orden determinista (inicio → profesionalId → sillonId) solo con profesionales habilitados; `agruparPorHorario` agrupa por horario único.
- `Paciente` (`src/domain/paciente.ts`) exige `nombre`, `apellido`, `dni`, `telefono`, `consentimientoContacto` y `email?`. No existen todavía `Reloj`, `PacienteRepositorio`, lecturas de turnos por id o por paciente, ni nada de tokens.
- `tsconfig`: `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`. `node:crypto` ya se usa en `generador-id-uuid.ts` (adaptador).
- Decisiones de KB que rigen: DD-13 (sin Fastify), DD-14, DD-15, DD-16 (C-10 crea `Reloj` y `PacienteRepositorio`), DD-17 (datos del paciente), DD-18 (datos públicos del profesional); reglas RN-19..RN-23.

## Goals / Non-Goals

**Goals:**
- Reserva pública determinista y testeable con `Reloj` inyectado, reutilizando C-01 y C-07 sin cambiar su comportamiento.
- Superficie pública mínima: un único error tipado con códigos cerrados y una respuesta sin datos internos.
- Servicio de tokens reutilizable por C-11 (`resolver`) y C-12 (`rotar`).

**Non-Goals:**
- Endpoints HTTP, rate limit, logs redactados (DD-13).
- Cancelación o gestión por token (C-11), e-mail (C-12), modificación de pacientes (C-05).
- Garantía de unicidad de DNI ante dos altas concurrentes del mismo DNI nuevo (ver Risks).

## Decisions

### D1. Capas y archivos (todo aditivo)

| Capa | Archivo | Contenido |
|---|---|---|
| Dominio | `src/domain/datos-paciente-online.ts` | Reglas puras de formato y normalización del paciente (D3) |
| Dominio | `src/domain/token-gestion.ts` | `TokenGestion { turnoId, hash, creadoEn, invalidadoEn? }` |
| Aplicación | `src/application/puertos/reloj.ts` | `export interface Reloj { ahora(): Date }` (DD-16) |
| Aplicación | `src/application/puertos/generador-token.ts` | `GeneradorToken { generar(): string }` |
| Aplicación | `src/application/puertos/hasher.ts` | `Hasher { sha256(texto: string): string }` (hex en minúsculas) |
| Aplicación | `src/application/puertos/repositorios.ts` | `PacienteRepositorio`, `TokenGestionRepositorio`; `TurnoRepositorio` + `obtenerPorId`, `listarPorPaciente` |
| Aplicación | `src/application/errores-reserva-publica.ts` | `ErrorReservaPublica` (D9) |
| Aplicación | `src/application/servicio-tokens.ts` | `ServicioTokens`, `TokenYaEmitidoError` (D11) |
| Aplicación | `src/application/reservar-online-input.ts`, `reservar-online.ts` | Contrato tipado y caso de uso (D4, D5) |
| Adaptador | `src/adapters/http/pedido-reserva.ts` | `validarPedidoReserva(unknown)` y `reservarDesdePedido(cuerpo, reservar)` (D2) |
| Adaptador | `src/adapters/reloj/reloj-sistema.ts` | `RelojSistema` (único `new Date()` sin argumentos) |
| Adaptador | `src/adapters/crypto/generador-token-crypto.ts`, `hasher-sha256.ts` | `randomBytes(32).toString('base64url')`; `createHash('sha256')` |
| Adaptador | `src/adapters/persistence/en-memoria/paciente-repositorio.ts`, `token-gestion-repositorio.ts` | Repos en memoria |
| Tests | `tests/fixtures/reloj-fijo.ts`, `tests/fixtures/sistema.ts` | `RelojFijo` (mutable con `fijar`) y cableado de la reserva |

`Paciente`, `Turno`, `AgendarTurno` y `ConsultarDisponibilidad` no cambian. `TurnoRepositorioEnMemoria` solo suma los dos métodos de lectura (fuera de la sección crítica) y pasa su colección de `private` a `protected` para que un doble de tests pueda simular cancelaciones y carreras.

**Alternativas**: poner las reglas de formato solo en la frontera (el dominio no revalidaría, contra DD-13); crear un `ReservaRepositorio` nuevo en vez de ampliar `TurnoRepositorio` (duplica la fuente de turnos).

### D2. Frontera pura (`src/adapters/http/pedido-reserva.ts`)

`validarPedidoReserva(cuerpo: unknown)` devuelve `{ ok: true, valor: ReservarOnlineInput } | { ok: false, campos: readonly string[] }` sin I/O:
- `cuerpo` debe ser objeto plano no nulo (si no: `campos: ['pedido']`).
- Claves permitidas de primer nivel: `prestacionId`, `inicio`, `profesionalId`, `paciente`; del paciente: `dni`, `nombre`, `apellido`, `telefono`, `email`, `consentimientoContacto`. Toda otra clave (p. ej. `duracionMinutos`, `sillonId`, `forzar`, `rol`, `actor`, `paciente.id`) es un campo inválido con su ruta.
- `prestacionId` string no vacío; `profesionalId` opcional, string no vacío si viene.
- `inicio`: string ISO 8601 con zona obligatoria (`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$`) que produzca un `Date` válido.
- Datos del paciente: tipos string/boolean y luego las reglas de D3.
- Orden de `campos`: los conocidos en el orden de arriba, luego los desconocidos en orden alfabético. Se informan todos.

`reservarDesdePedido(cuerpo, reservar)` valida y, si falla, lanza `ErrorReservaPublica('DATOS_INVALIDOS', { campos })`; si no, delega en `ReservarOnline.ejecutar`. Es el punto de entrada que cableará C-14; los tests de escenarios lo usan.

### D3. Formato del paciente (`src/domain/datos-paciente-online.ts`, DD-17)

Función pura `validarDatosPacienteOnline(datos)` → `{ ok: true, datos: normalizados } | { ok: false, campos }`, usada por la frontera y revalidada por el caso de uso:
- **DNI**: se quitan los puntos; `^\d{7,8}$`.
- **Nombre / apellido**: `trim`; longitud 1..80 tras el trim; se guarda el valor recortado.
- **Teléfono** (formato preciso): (1) se quitan espacios, guiones, puntos y paréntesis; (2) si empieza con `+`, lo que sigue debe empezar con `54` y se quita el `+`; un `+` en otra posición es inválido; (3) debe quedar `^\d{10,13}$`. Se guarda solo dígitos (ej.: `+54 9 11 0000-0004` → `5491100000004`; `011 0000-0004` → `01100000004`; `+1 555 000 0000` inválido).
- **E-mail**: opcional; si viene, `trim`, longitud ≤ 254 y `^[^\s@]+@[^\s@]+\.[^\s@]+$`. Cadena vacía es inválida.
- **Consentimiento**: `=== true`.

### D4. Contrato y dependencias

```ts
interface ReservarOnlineInput {
  readonly prestacionId: string; readonly inicio: Date; readonly profesionalId?: string;
  readonly paciente: { dni; nombre; apellido; telefono; email?; consentimientoContacto: boolean };
}
interface ReservaOnlineConfirmada {
  readonly turnoId: string; readonly inicio: Date; readonly fin: Date;
  readonly prestacion: { readonly nombre: string };
  readonly profesional: { readonly nombre: string; readonly apellido: string };
  readonly token: string;
}
```
Sin campo `actor`: el caso de uso usa la constante interna `{ rol: 'paciente' }`. Dependencias: `reloj`, `pacientes`, `turnos` (lecturas), `profesionales`, `prestaciones`, `consultorios`, `ids` (`GeneradorId`, para el paciente), `consultar: Pick<ConsultarDisponibilidad, 'ejecutar'>`, `agendar: Pick<AgendarTurno, 'ejecutar'>`, `tokens: Pick<ServicioTokens, 'emitir'>` y `topeTurnosOnline?` (por defecto `TOPE_TURNOS_ONLINE = 2`, RN-23 configurable). Los `Pick` permiten dobles para la defensa RN-19.

### D5. Algoritmo y orden de errores

1. Revalidar datos del paciente (D3) → `DATOS_INVALIDOS`.
2. `ahora = reloj.ahora()` una sola vez; `inicio < ahora` → `RESERVA_EN_PASADO` (RN-20).
3. Prestación: inexistente o inactiva → `PRESTACION_NO_DISPONIBLE`.
4. Si viene `profesionalId`: inexistente, inactivo o sin la prestación en `prestacionIds` → `PROFESIONAL_NO_DISPONIBLE` (RN-19; el profesional es dato público, DD-18).
5. `pacientes.obtenerPorDni(dni)` (sin crear). Si existe: `turnos.listarPorPaciente(id)`; duplicado (misma prestación, mismo `inicio`, `esActivo`) → `RESERVA_DUPLICADA`; luego tope (`origen === 'online'`, `esActivo`, `inicio >= ahora`, cantidad ≥ tope) → `LIMITE_DE_TURNOS`.
6. `consultar.ejecutar({ actor paciente, prestacionId, rango: [inicio, inicio + 1 min), ahora, profesionalId? })`; filtrar combos con `inicio` exacto y profesional habilitado (verificación explícita RN-19 con el profesional cargado). Sin combos → `HORARIO_NO_DISPONIBLE`.
7. `pacienteId` = id existente o `ids.siguiente()` reservado (sin guardar, D6).
8. `agendar.ejecutar({ actor paciente, pacienteId, profesionalId, sillonId, prestacionId, inicio })` sin `duracionMinutos`. Carrera según D7.
9. Si el paciente es nuevo: `pacientes.guardar(...)` con los datos normalizados.
10. `token = await tokens.emitir(turno.id)`; armar la respuesta con nombres de prestación y profesional.

Cualquier `ReglaNegocioError` o `RecursoNoEncontradoError` que escape de C-07 o C-01 se traduce a un código público; nunca se propaga.

### D6. Política de paciente huérfano

El paciente nuevo se guarda **solo después** de que `AgendarTurno` creó el turno (paso 9), usando un id reservado de antemano. Así ningún rechazo (datos, pasado, catálogo, tope, sin hueco, carrera) deja un paciente sin turno: es más seguro que "crear justo antes del alta", que dejaría huérfanos ante la carrera. **Alternativa** descartada: crear y borrar como compensación (el puerto no tiene `eliminar` y la compensación puede fallar). **Costo**: entre el paso 8 y el 9 hay un turno cuyo `pacienteId` aún no está guardado; en memoria no hay fallo posible entre ambos pasos. Con PostgreSQL, ambos pasos irán en una transacción (C futura).

### D7. Carrera (RN-12)

Si el alta rechaza con `ReglaNegocioError` `RN-02` o `RN-03`, se vuelve a consultar la disponibilidad para el mismo `inicio` (la nueva lectura ya excluye lo ocupado), se descarta el combo fallido y se intenta **una vez** con el primero restante. Si no hay combo o el segundo intento falla por cualquier motivo → `HORARIO_NO_DISPONIBLE` con nueva oferta. Otros rechazos del primer intento (`RN-07`, `RN-17`, `RN-18`, recurso inexistente: cambios de catálogo o bloqueos concurrentes) no se reintentan y dan `HORARIO_NO_DISPONIBLE`. **Alternativa**: tomar el "siguiente combo" de la lista original sin reconsultar; se descarta porque tras un turno nuevo de `p1`/`s1` el siguiente combo `p1`/`s2` también choca por RN-02, y el reintento sería inútil.

### D8. Nueva oferta

Rango del día local de `inicio` en la zona del consultorio: `desde = inicio − (minutosDelDia de aHoraLocal(inicio, zona))` (con segundos y milisegundos descartados), `hasta = desde + 24 h` (Argentina sin cambios de horario, DD-09). Se llama a `consultar.ejecutar` con el mismo `ahora` y `profesionalId?`, se agrupa con `agruparPorHorario` y se proyecta a `{inicio, fin}`. Si esa consulta falla, la oferta es vacía.

### D9. Error público

`class ErrorReservaPublica extends Error` con `codigo: CodigoReservaPublica` (`'DATOS_INVALIDOS' | 'RESERVA_EN_PASADO' | 'PRESTACION_NO_DISPONIBLE' | 'PROFESIONAL_NO_DISPONIBLE' | 'RESERVA_DUPLICADA' | 'LIMITE_DE_TURNOS' | 'HORARIO_NO_DISPONIBLE'`), `campos?` (solo `DATOS_INVALIDOS`) y `nuevaOferta?` (solo `HORARIO_NO_DISPONIBLE`). Mensaje genérico fijo por código, sin `cause` ni datos del error interno. Los mensajes de `RESERVA_DUPLICADA` y `LIMITE_DE_TURNOS` no repiten DNI ni horarios. **Alternativa**: reutilizar `ReglaNegocioError` filtrando campos (fácil de filtrar mal).

### D10. RN-22: indistinguibilidad

La respuesta tiene siempre las mismas seis claves; no hay bandera de paciente nuevo y el flujo de un DNI existente o nuevo llama a los mismos puertos públicos salvo `guardar`. Los datos del pedido para un DNI existente se descartan.

### D11. Tokens (DD-15, RN-21)

- `TokenGestionRepositorio { guardar(t), obtenerPorHash(hash), obtenerPorTurno(turnoId) /* vigente, no invalidado */, invalidar(turnoId, en: Date) }`; en memoria, `guardar` rechaza un hash repetido (índice único).
- `ServicioTokens` (deps: `generador`, `hasher`, `tokens`, `turnos`, `reloj`):
  - `emitir(turnoId)`: turno inexistente → `RecursoNoEncontradoError`; token vigente para el turno → `TokenYaEmitidoError`; si no, genera, guarda `{turnoId, hash, creadoEn: ahora}` y devuelve el token en claro.
  - `resolver(tokenPlano)`: cadena vacía → `undefined`; por hash; `undefined` si no existe, está invalidado, el turno no existe, está `cancelado` o `ahora >= fin`. Devuelve `turnoId`. **Decisión de vencimiento**: se calcula al resolver (necesita `Reloj` y la lectura del turno), sin TTL guardado; así una cancelación futura (C-02) invalida sin tocar tokens.
  - `rotar(turnoId)`: invalida el vigente (si hay) y emite uno nuevo; lo usará C-12 en cada recordatorio.
- SHA-256 sin sal alcanza por los 256 bits de entropía; la búsqueda por hash evita comparar secretos en claro.

### D12. Estrategia de pruebas (TDD estricto)

Unidad: `datos-paciente-online`, `validarPedidoReserva`, adaptadores (`RelojSistema`, crypto, repos en memoria), `ServicioTokens`. Caso de uso: `tests/application/reservar-online.test.ts` con un `describe` por requisito y el título exacto de cada `#### Scenario:`, entrando por `reservarDesdePedido`. Fixtures: `crearSistemaReserva({ ahora, ...overrides })` y `pedidoBase(overrides)`; `TurnoRepositorioDePrueba` (extiende el adaptador en memoria) con `cambiarEstado(id, estado)` y un gancho `antesDeAgregar` que inserta turnos de recepción para simular la carrera; un `consultar` doble para la defensa RN-19. "Solo se almacena el hash": se serializan los registros de los repos de tokens, turnos y pacientes y se verifica que no contienen el token. Solo datos ficticios (DNI `0000000N`, "Paciente Ficticio N", `*.test`).

## Risks / Trade-offs

- [Dos reservas concurrentes del mismo DNI nuevo podrían crear dos pacientes, y el tope/duplicado de RN-23 no es atómico] → aceptable en memoria y para el MVP; registrado para la integración HTTP/PostgreSQL (índice único por DNI y transacción).
- [`RESERVA_DUPLICADA` y `LIMITE_DE_TURNOS` permiten inferir que un DNI tiene turnos] → solo para DNI con reservas online; mensajes genéricos; mitigación definitiva con rate limit en la capa HTTP (DD-13).
- [El reintento puede asignar otro profesional que el que vio el paciente] → la respuesta informa el profesional asignado (DD-18).
- [Turno creado y paciente aún no guardado entre los pasos 8 y 9] → sin `await` que pueda fallar en memoria; transacción en la persistencia futura.
- [Cambiar `TurnoRepositorio` obliga a implementar dos métodos en todo adaptador] → solo existe el adaptador en memoria; métodos de lectura sin efecto sobre C-01/C-07.

## UI Mockups

- Design system revision: 1 (no aplica)
- Decision: no (no UI) — 2026-11-21. C-10 es un caso de uso y una frontera pura sin pantallas; la UI de reserva es C-14.
- Mockups: n/a
- Approval: n/a
- Preview: n/a
- Visual verify: n/a

## Migration Plan

Cambios aditivos (puertos, adaptadores, módulos nuevos y dos lecturas en `TurnoRepositorio`). Las suites de C-01 y C-07 deben seguir en verde sin modificarse. Rollback: revertir los commits del change.

## Open Questions

- Texto definitivo de los mensajes públicos por código (lo puede ajustar C-14 sin cambiar códigos ni specs).
