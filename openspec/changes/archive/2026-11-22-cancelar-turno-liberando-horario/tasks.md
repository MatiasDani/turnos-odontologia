# Tasks

> TDD estricto, de a UNA tarea por vez: RED (test que falla, ejecutado) → GREEN (mínimo código) → TRIANGULATE (≥ 2 casos) → REFACTOR, con los tests en verde después de cada paso. Los tests de caso de uso usan como título el nombre exacto de cada `#### Scenario:` de `specs/cancelacion-turnos/spec.md`, agrupados en `describe` por requisito (regla dura 8). Solo datos ficticios del seed (`pa1`, `pa2`). `AgendarTurno`, `ConsultarDisponibilidad`, `ReservarOnline` y sus tests no se modifican. Governance MEDIO: checkpoints 2.4 y 4.6. Sin commits intermedios: el commit se hace al cerrar el change completo.

## 1. Safety net, tipos y errores

- [x] 1.1 SAFETY NET: ejecutar `npm test` y `npm run typecheck` y registrar el baseline (N tests en verde); si algo falla, detenerse y reportarlo como falla preexistente
- [x] 1.2 RED/GREEN/TRIANGULATE `CodigoRN` con `'RN-08'` y `'RN-10'`, y `estadoActual?: EstadoTurno` en `Violacion` y `ReglaNegocioError` (`src/domain/errores.ts`, design D3): el error copia `estadoActual` solo si viene, y un error sin `estadoActual` lo tiene `undefined` (igual que `turnoEnConflicto`); verificar `tests/domain/errores.test.ts` en verde
- [x] 1.3 Agregar `canceladoEn?: Date` y `canceladoPor?: Rol` a `Turno` (`src/domain/turno.ts`); verificar `npm run typecheck` y que la suite completa sigue en el baseline

## 2. Reglas puras de cancelación

- [x] 2.1 RED/GREEN/TRIANGULATE `evaluarCancelacion(turno, rol, ahora)` para el estado (`src/domain/reglas/cancelacion.ts`, design D2): `reservado` y `confirmado` → `null`; `cancelado`, `atendido` y `ausente` → `RN-10` con `estadoActual`; verificar `tests/domain/reglas/cancelacion.test.ts` en verde
- [x] 2.2 RED/GREEN/TRIANGULATE la anticipación del paciente: 24 h exactas y 25 h → `null`; 23 h 59 min y `inicio` ya pasado → `RN-08`; recepción, odontólogo y administrador con 1 h y con `inicio` pasado → `null`; estado no cancelable con menos de 24 h → `RN-10` (orden); verificar en verde
- [x] 2.3 RED/GREEN/TRIANGULATE `cancelar(turno, rol, ahora)`: estado `cancelado`, `canceladoPor` y `canceladoEn` correctos, resto de campos iguales, el turno original no cambia (inmutable), con dos roles distintos; REFACTOR del módulo con tests en verde
- [x] 2.4 CHECKPOINT (governance MEDIO): revisar con el owner los tipos, errores y reglas puras con sus tests; confirmar que `src/domain` no importa infraestructura ni usa `new Date()` / `Date.now()` (reglas duras 2 y 3); aprobar antes de seguir

## 3. Operación atómica y puerto de recordatorios

- [x] 3.1 RED/GREEN/TRIANGULATE `TurnoRepositorio.actualizarSi(id, cambio)` en el puerto y en `TurnoRepositorioEnMemoria` (design D4): `ok` reemplaza y devuelve el turno nuevo; `!ok` rechaza con `ReglaNegocioError` y no modifica; id inexistente → `RecursoNoEncontradoError('turno', id)`; un `cambio` que altera el id → `Error` de programación sin modificar; verificar `tests/adapters/turno-repositorio.test.ts` en verde
- [x] 3.2 RED/GREEN atomicidad: dos `actualizarSi` concurrentes (`Promise.allSettled`) que solo aceptan `confirmado` → exactamente una se concreta y la otra ve el estado nuevo y se rechaza; verificar en verde
- [x] 3.3 Puerto `Recordatorios` (`src/application/puertos/recordatorios.ts`), adaptador `RecordatoriosNoOp` (`src/adapters/recordatorios/recordatorios-no-op.ts`) y doble `RecordatoriosEspia` (`tests/fixtures/recordatorios-espia.ts`, registra `turnoId` y puede configurarse para rechazar), design D6; verificar con un test que el no-op resuelve sin error y que el espía registra y rechaza cuando se lo pide

## 4. Caso de uso `CancelarTurno`

- [x] 4.1 Extender `tests/fixtures/sistema.ts` con `crearSistemaCancelacion({ ahora, ...overrides })` (repos en memoria con `TurnoRepositorioDePrueba`, `RelojFijo`, `RecordatoriosEspia`, `AgendarTurno`, `ConsultarDisponibilidad`, `CancelarTurno`) y un helper `cancelar(sistema, { turnoId, rol })`; verificar que `crearSistema`, `crearSistemaReserva` y las suites de C-01/C-07/C-10 siguen en verde
- [x] 4.2 RED/GREEN escenarios de "Cancelación de un turno" en `tests/application/cancelar-turno.test.ts` (`src/application/cancelar-turno.ts` + `cancelar-turno-input.ts`, design D5: `ahora` leído una vez, `actualizarSi` con las reglas puras); verificar en verde
- [x] 4.3 RED/GREEN escenarios de "Solo se cancelan turnos reservados o confirmados", "Cancelación de turnos cuyo inicio ya pasó" y "Orden de evaluación de los rechazos"; verificar en verde
- [x] 4.4 RED/GREEN escenarios de "Anticipación mínima del paciente" y "Personal del consultorio sin restricción de anticipación" con `RelojFijo` (domingo 09:00 y 09:01, lunes 08:00); verificar en verde
- [x] 4.5 RED/GREEN escenarios de "Cancelar libera el horario" (alta con `AgendarTurno` y consulta con `ConsultarDisponibilidad` sobre el mismo sistema), "Cancelación atómica" (`Promise.allSettled`) y "Cancelación de recordatorios pendientes" (espía: una llamada al concretar, ninguna al rechazar, falla que se propaga con el turno `cancelado`); verificar en verde
- [x] 4.6 CHECKPOINT (governance MEDIO): revisar con el owner el caso de uso y sus tests; verificar que cada `#### Scenario:` del spec tiene su test con el mismo nombre; aprobar antes de cerrar

## 5. Integración y documentación

- [x] 5.1 Ejecutar `npm test` y `npm run typecheck` completos: todo en verde, con el baseline de 1.1 más los tests nuevos y ninguno de C-01/C-07/C-10 modificado (`git diff --stat tests/` solo muestra archivos nuevos y `tests/fixtures/sistema.ts`, `tests/adapters/turno-repositorio.test.ts` y `tests/domain/errores.test.ts`)
- [x] 5.2 Alinear la KB con la implementación si cambió algún detalle (`knowledge-base/04_modelo_de_datos.md` §Turno con los campos implementados, `08_arquitectura_propuesta.md` con el puerto `Recordatorios` y `actualizarSi`, DD-19 si corresponde); verificar que la KB no contradice el spec ni el design

## Workflow follow-up

- Verificar el change (`openspec-verify`).
- Archivar con `/opsx:archive cancelar-turno-liberando-horario`, marcar C-02 como `[x]` en `CHANGES.md` y avisar a Luka (C-03 queda desbloqueado si C-06 también está listo).
- Hacer un único commit del change completo con el usuario de Franco Petri (conventional commit en español) y sincronizar Engram.
