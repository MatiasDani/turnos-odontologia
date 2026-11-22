# Design

## Context

Ver `proposal.md` (Why) y `specs/cancelacion-turnos/spec.md` (requisitos). Las decisiones de negocio están en DD-19 (`knowledge-base/09_decisiones_y_supuestos.md`). Estado actual relevante:

- `src/domain/turno.ts`: `Turno` es inmutable (`readonly`) y no tiene campos de cancelación. `esActivo()` es el único predicado de ocupación y ya excluye `cancelado` y `ausente`; lo usan el solapamiento (`src/domain/reglas/solapamiento.ts`), la disponibilidad y el tope de RN-23 de `ReservarOnline`.
- `src/domain/errores.ts`: `CodigoRN` no incluye `RN-08` ni `RN-10`. `Violacion` es el resultado de una regla pura y `ReglaNegocioError` la envuelve.
- `TurnoRepositorio` solo inserta (`agregarSiDisponible`, sección crítica sin `await`) y lee. No hay forma de modificar un turno.
- Puerto `Reloj`, `RelojSistema` y `RelojFijo` existen desde C-10 (DD-16). No hay puerto de recordatorios.
- `tests/fixtures/turno-repositorio-de-prueba.ts` tiene un `cambiarEstado` de prueba (sin reglas), que se mantiene para armar escenarios.

## Goals / Non-Goals

**Goals:**
- Reglas de cancelación como funciones puras del dominio, testeables sin repositorio ni reloj.
- Una operación atómica de modificación genérica que reutilicen C-03 (reprogramar) y C-04 (estados), en vez de una por caso de uso.
- Cambios aditivos: las suites de C-01, C-07 y C-10 siguen en verde sin modificarse.

**Non-Goals:**
- Control de acceso por rol (C-09) y verificación de que el turno sea del paciente (C-11).
- `creadoEn`/`actualizadoEn` en `Turno` (C-04, ver `10_preguntas_abiertas.md`).
- Recordatorios reales, reintentos o cola (C-12).
- Endpoint HTTP de cancelación.

## Decisions

### D1. Capas y archivos

```
src/domain/turno.ts                       + canceladoEn?: Date, canceladoPor?: Rol
src/domain/errores.ts                     + 'RN-08' | 'RN-10' en CodigoRN, estadoActual? en Violacion y ReglaNegocioError
src/domain/reglas/cancelacion.ts          NUEVO: evaluarCancelacion, cancelar (puras)
src/application/puertos/repositorios.ts   + TurnoRepositorio.actualizarSi
src/application/puertos/recordatorios.ts  NUEVO: puerto Recordatorios
src/application/cancelar-turno-input.ts   NUEVO: { turnoId, actor }
src/application/cancelar-turno.ts         NUEVO: caso de uso CancelarTurno
src/adapters/persistence/en-memoria/turno-repositorio.ts   + actualizarSi
src/adapters/recordatorios/recordatorios-no-op.ts          NUEVO
tests/fixtures/recordatorios-espia.ts     NUEVO: doble que registra llamadas y puede fallar
tests/fixtures/sistema.ts                 + crearSistemaCancelacion (cableado con RelojFijo y espía)
```

Las reglas viven en el dominio (`src/domain/reglas/`, junto a `validar-alta.ts`) y no importan nada de infraestructura ni leen la hora: reciben `ahora` como dato (reglas duras 2 y 3).

### D2. Reglas puras (`src/domain/reglas/cancelacion.ts`)

```ts
evaluarCancelacion(turno: Turno, rol: Rol, ahora: Date): Violacion | null
cancelar(turno: Turno, rol: Rol, ahora: Date): Turno   // { ...turno, estado: 'cancelado', canceladoPor: rol, canceladoEn: ahora }
```

Orden fijo dentro de `evaluarCancelacion` (spec, "Orden de evaluación de los rechazos"):
1. `turno.estado` no es `reservado` ni `confirmado` → `{ codigo: 'RN-10', estadoActual: turno.estado }`.
2. `rol === 'paciente'` y `turno.inicio.getTime() - ahora.getTime() < 86_400_000` → `{ codigo: 'RN-08' }`.
3. Si no, `null`.

La anticipación se mide en milisegundos absolutos: Argentina no tiene horario de verano y el umbral es una duración, no una hora local. El umbral es inclusivo (`>=` permite), así que 24 h exactas cancelan y 23 h 59 min no.

Alternativa descartada: un método `cancelar()` dentro de una clase `Turno`. El proyecto modela entidades como interfaces inmutables con funciones puras (`esActivo`, `estadoInicial`, `validarAlta`), y una clase rompería ese patrón y los fixtures existentes.

### D3. Errores

`CodigoRN` suma `'RN-08' | 'RN-10'`. `Violacion` y `ReglaNegocioError` suman `estadoActual?: EstadoTurno`, que se copia igual que `turnoEnConflicto` (solo si viene definido, por `exactOptionalPropertyTypes`). Un turno inexistente se rechaza con `RecursoNoEncontradoError('turno', id)`, como en C-01.

Alternativa descartada: `TransicionInvalidaError` sin código RN (DD-19): el spec de C-01 usa los códigos RN como contrato de todo rechazo de negocio.

### D4. Operación atómica `actualizarSi`

```ts
type ResultadoCambio = { readonly ok: true; readonly turno: Turno } | { readonly ok: false; readonly violacion: Violacion };

actualizarSi(id: string, cambio: (actual: Turno) => ResultadoCambio): Promise<Turno>;
```

Contrato del puerto:
- Si no existe un turno con ese `id` → rechaza con `RecursoNoEncontradoError('turno', id)`.
- Lee el turno actual, ejecuta `cambio(actual)` y, si `ok`, reemplaza el registro y resuelve con el turno nuevo.
- Si `!ok` → rechaza con `ReglaNegocioError(violacion)` y no modifica nada.
- El turno devuelto por `cambio` MUST conservar el `id`; si no, el adaptador rechaza con un `Error` de programación (no de dominio). Esto protege a C-03, que cambia recursos e intervalo pero no el id.

Adaptador en memoria: igual que `agregarSiDisponible`, leer, ejecutar `cambio` y reemplazar ocurren sin ningún `await` intermedio. Node ejecuta un solo hilo, así que dos `actualizarSi` sobre el mismo turno se serializan: la segunda ve el estado que dejó la primera (spec, "Cancelación atómica").

Se usa un resultado discriminado (`ok`) en vez de `Turno | Violacion` para no depender de inspeccionar la forma del objeto, siguiendo el patrón `resultado.ok` de `validarAlta`.

Alternativa descartada: `guardar(turno)` simple. La última escritura pisaría a la anterior y C-03 tendría que inventar su propio mecanismo después.

Alcance para C-03: reprogramar también debe validar solapamiento contra otros turnos dentro de la misma sección crítica. `actualizarSi` no lo resuelve hoy (solo ve el turno propio); C-03 decidirá si extiende el contrato (por ejemplo, pasando a `cambio` los turnos de los recursos de destino). Queda anotado como riesgo.

### D5. Caso de uso `CancelarTurno`

```ts
interface CancelarTurnoDependencias { turnos: TurnoRepositorio; reloj: Reloj; recordatorios: Recordatorios }
ejecutar({ turnoId, actor }): Promise<Turno>
```

1. `ahora = reloj.ahora()`, leído una sola vez antes de la sección crítica. El mismo instante se usa para RN-08 y para `canceladoEn`.
2. `turnos.actualizarSi(turnoId, (actual) => { const v = evaluarCancelacion(actual, actor.rol, ahora); return v ? { ok: false, violacion: v } : { ok: true, turno: cancelar(actual, actor.rol, ahora) }; })`.
3. `await recordatorios.cancelarPendientes(turnoId)`. Va fuera de la sección crítica: un I/O real dentro bloquearía la atomicidad. Si falla, el error se propaga sin capturarlo y la cancelación persistida queda (spec, "Cancelación de recordatorios pendientes").
4. Devuelve el turno cancelado.

No hay un `obtenerPorId` previo: `actualizarSi` ya informa el turno inexistente y evita leer dos veces.

El caso de uso no filtra por rol más allá de RN-08 (DD-19): el odontólogo cancela como recepción hasta C-09.

### D6. Puerto `Recordatorios`

```ts
interface Recordatorios { cancelarPendientes(turnoId: string): Promise<void> }
```

`RecordatoriosNoOp` resuelve sin hacer nada. En los tests se usa `RecordatoriosEspia` (`tests/fixtures/`), que registra los `turnoId` recibidos y se puede configurar para rechazar. C-12 implementa el adaptador real sin cambiar `CancelarTurno`.

### D7. Token de gestión

No se toca: `ServicioTokens.resolver` ya rechaza un turno `cancelado` (RN-21). Invalidar el registro además sería redundante y acoplaría `CancelarTurno` al servicio de tokens.

### D8. Estrategia de pruebas (TDD estricto)

- `tests/domain/reglas/cancelacion.test.ts`: `evaluarCancelacion` y `cancelar` con al menos dos casos por comportamiento (cada estado no cancelable, umbral 24 h exacto y 1 min menos, paciente contra cada rol del personal, orden RN-10 antes que RN-08, campos de `cancelar` e inmutabilidad del turno original).
- `tests/adapters/turno-repositorio.test.ts`: `actualizarSi` reemplaza, no modifica ante violación, rechaza turno inexistente, rechaza cambio de id y serializa dos llamadas concurrentes (`Promise.allSettled`).
- `tests/domain/errores.test.ts`: `ReglaNegocioError` copia `estadoActual` solo si viene.
- `tests/application/cancelar-turno.test.ts`: un test por escenario del spec con el mismo nombre (regla dura 8), sobre `crearSistemaCancelacion` con `RelojFijo` y `RecordatoriosEspia`. Los turnos `atendido`, `ausente` y `reservado` se arman con los `turnos` del `Entorno` o con `cambiarEstado` del repositorio de prueba.
- Fechas: turno base el lunes 2026-11-23 09:00; `ahora` por defecto el domingo 2026-11-22 08:00 (`AHORA_POR_DEFECTO`); umbral con domingo 09:00 y 09:01.
- Solo datos ficticios del seed (`pa1`, `pa2`), regla dura 4.

## Risks / Trade-offs

- [El odontólogo puede cancelar hasta que exista C-09, aunque la matriz RBAC no lo permite] → Documentado en DD-19 y en `10_preguntas_abiertas.md` para Lautaro (C-09).
- [Si el adaptador real de recordatorios falla, la cancelación ya está hecha y quien llama recibe un error] → Con el no-op no ocurre; C-12 decide reintentos (pregunta abierta registrada).
- [`actualizarSi` no valida solapamiento con otros turnos, que C-03 va a necesitar] → Contrato documentado en D4; C-03 lo extiende de forma compatible.
- [Un adaptador futuro (PostgreSQL) necesita la misma atomicidad] → Contrato del puerto explícito: `SELECT ... FOR UPDATE` o `UPDATE ... WHERE estado IN (...)` dentro de una transacción.
- [Agregar `estadoActual` a `Violacion` y `ReglaNegocioError`] → Campo opcional; los errores existentes no cambian y sus tests siguen pasando.

## UI Mockups

- Design system revision: 1 (no aplica)
- Decision: no (no UI) — 2026-11-22. C-02 es un caso de uso de dominio sin pantallas; la UI de gestión del turno es C-14 y la agenda de recepción es C-15.
- Mockups: n/a
- Approval: n/a
- Preview: n/a
- Visual verify: n/a

## Migration Plan

Cambios aditivos (campos opcionales, códigos nuevos, un método nuevo en el puerto y módulos nuevos). Las suites de C-01, C-07 y C-10 deben seguir en verde sin modificarse. Rollback: revertir el commit del change.
