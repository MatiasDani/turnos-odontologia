# Tasks

> TDD estricto, de a UNA tarea por vez: RED (test que falla, ejecutado) → GREEN (mínimo código) → TRIANGULATE (≥ 2 casos) → REFACTOR, con los tests en verde después de cada paso. Los tests de caso de uso usan como título el nombre exacto de cada `#### Scenario:` de `specs/estados-turno/spec.md`, agrupados en `describe` por requisito (regla dura 8). Solo datos ficticios del seed (`pa1`, `pa2`). `src/` y `tests/` usan CRLF: editar con la herramienta de edición, no con reemplazos multilínea por shell. Governance MEDIO: checkpoints 2.5 y 3.6. Sin commits intermedios: el commit se hace al cerrar el change completo.

## 1. Safety net y errores

- [x] 1.1 SAFETY NET: ejecutar `npm test` y `npm run typecheck` y registrar el baseline (519 tests en verde esperados); si algo falla, detenerse y reportarlo como falla preexistente
- [x] 1.2 RED/GREEN/TRIANGULATE `'RN-24'` en `CodigoRN` (`src/domain/errores.ts`, design D6): `ReglaNegocioError` con `RN-24` conserva el código y no tiene `estadoActual`; verificar `tests/domain/errores.test.ts` en verde

## 2. Reglas puras del dominio

- [x] 2.1 RED/GREEN/TRIANGULATE `puedeTransicionar(desde, hacia)` y `TRANSICIONES` (`src/domain/reglas/transiciones.ts`, design D2): los cinco pares permitidos → `true`; cada estado consigo mismo, `reservado → atendido | ausente` y los tres terminales hacia cualquier estado → `false`; verificar `tests/domain/reglas/transiciones.test.ts` en verde
- [x] 2.2 REFACTOR `evaluarCancelacion` para usar `puedeTransicionar(turno.estado, 'cancelado')` y eliminar `ESTADOS_CANCELABLES` (`src/domain/reglas/cancelacion.ts`); verificar que `tests/domain/reglas/cancelacion.test.ts` y `tests/application/cancelar-turno.test.ts` siguen en verde SIN modificarlos
- [x] 2.3 RED/GREEN/TRIANGULATE `evaluarCambioDeEstado(turno, hacia, ahora)` (`src/domain/reglas/estados.ts`, design D3): transiciones inválidas → `RN-10` con `estadoActual` (confirmar `confirmado` y `cancelado`; cerrar `reservado`, `atendido`, `ausente`, `cancelado`); RN-24 en 08:59 (rechaza) y 09:00 (permite) para `atendido` y `ausente`; confirmar con `inicio` pasado y futuro → `null`; transición inválida antes del inicio → `RN-10` (orden); verificar `tests/domain/reglas/estados.test.ts` en verde
- [x] 2.4 RED/GREEN/TRIANGULATE `cambiarEstado(turno, hacia)`: estado nuevo para los tres destinos, resto de campos iguales, el turno original no cambia; REFACTOR del módulo con tests en verde
- [x] 2.5 CHECKPOINT (governance MEDIO): revisar con el owner la tabla de transiciones, el refactor de la cancelación y las reglas puras con sus tests; confirmar que `src/domain` no importa infraestructura ni usa `new Date()` / `Date.now()` (reglas duras 2 y 3); aprobar antes de seguir

## 3. Casos de uso de estado

- [x] 3.1 Input `CambiarEstadoTurnoInput` (`src/application/cambiar-estado-turno-input.ts`), función `aplicarCambioDeEstado` (`src/application/cambiar-estado-turno.ts`) y clases `ConfirmarTurno`, `MarcarAtendido`, `MarcarAusente` (design D4, D5); extender `crearSistemaCancelacion` en `tests/fixtures/sistema.ts` con los tres casos de uso y helpers `confirmar`, `marcarAtendido`, `marcarAusente` (rol por defecto recepción); verificar `npm run typecheck` y que las suites de C-01/C-02/C-07/C-10 siguen en verde
- [x] 3.2 RED/GREEN escenarios de "Confirmación de un turno reservado" y "Cierre de un turno confirmado" en `tests/application/estados-turno.test.ts`; verificar en verde
- [x] 3.3 RED/GREEN escenarios de "Solo transiciones de estado permitidas" (el turno rechazado no cambia, leído del repositorio); verificar en verde
- [x] 3.4 RED/GREEN escenarios de "Cierre solo desde el inicio del turno" (`RelojFijo` en lunes 08:59 y 09:00, domingo 08:00, miércoles 12:00) y "Orden de evaluación de los rechazos" (`RecursoNoEncontradoError` sin código RN en los tres casos de uso); verificar en verde
- [x] 3.5 RED/GREEN escenarios de "La ausencia libera el horario" (alta con `AgendarTurno` sobre el mismo sistema: `pa2` en el hueco del ausente se crea; con el atendido, `RN-02`) y "Cambio de estado atómico" (`Promise.allSettled`: exactamente una se concreta y la otra `RN-10` con el estado nuevo); validar con una mutación (p. ej. quitar el chequeo RN-24 o leer el turno fuera de `actualizarSi`) que los tests fallan; verificar en verde
- [x] 3.6 CHECKPOINT (governance MEDIO): revisar con el owner los casos de uso y sus tests; verificar que cada `#### Scenario:` de la spec tiene su test con el mismo nombre; aprobar antes de cerrar

## 4. Integración y documentación

- [x] 4.1 Ejecutar `npm test` y `npm run typecheck` completos: todo en verde con el baseline de 1.1 más los tests nuevos; `git diff --stat tests/` solo muestra archivos nuevos, `tests/fixtures/sistema.ts` y `tests/domain/errores.test.ts`
- [x] 4.2 Alinear la KB con la implementación (`knowledge-base/04_modelo_de_datos.md` §Turno, `08_arquitectura_propuesta.md` si lista casos de uso o reglas del dominio, DD-20 y RN-24 si cambió algún detalle); verificar que la KB no contradice la spec ni el design

## Workflow follow-up

- Verificar el change (`openspec-verify`).
- Archivar con `/opsx:archive gestionar-estados-turno`, marcar C-04 como `[x]` en `CHANGES.md` y avisar al equipo (C-12 queda habilitado por C-04; C-09 sigue esperando C-03, C-05 y C-06).
- Hacer un único commit del change completo con el usuario de Franco Petri (conventional commit en español), sincronizar Engram, pushear la rama y abrir el PR para que Matías lo mergee.
