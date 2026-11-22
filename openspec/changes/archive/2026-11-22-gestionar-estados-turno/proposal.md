# Proposal

## Why

Hoy un turno solo se crea o se cancela: no hay forma de confirmar una reserva online ni de registrar si el paciente vino o faltó, así que el seguimiento del turno (US-006, Flujo 7) no existe y un turno `ausente` no puede liberar el horario. C-04 completa la máquina de estados del turno y es condición del GATE 2 para C-12 (la confirmación desde el recordatorio) y C-09 (roles).

## What Changes

- Caso de uso nuevo `ConfirmarTurno` (`turnoId`, `actor`): pasa un turno `reservado` a `confirmado`, sin restricción horaria. Devuelve el turno confirmado.
- Casos de uso nuevos `MarcarAtendido` y `MarcarAusente` (`turnoId`, `actor`): pasan un turno `confirmado` a `atendido` o `ausente`, solo cuando su `inicio` ya llegó (`ahora >= inicio`, RN-24 nueva). Devuelven el turno modificado.
- Toda transición no permitida, incluida repetir la misma (confirmar un turno ya `confirmado`), se rechaza con `RN-10` informando el estado actual, sin modificar el turno (DD-20). El cierre antes del `inicio` se rechaza con `RN-24`. Orden: turno inexistente, transición, hora.
- Una única tabla de transiciones permitidas en el dominio, que también pasa a usar la cancelación de C-02 en lugar de su lista propia, sin cambiar su comportamiento.
- Liberación: un turno `ausente` deja de ocupar profesional y sillón, así que un turno nuevo puede ocupar el mismo horario; un turno `atendido` lo sigue ocupando. No requiere lógica nueva: el alta y la disponibilidad ya ignoran los turnos no activos (DD-05).
- Atomicidad: las transiciones usan `TurnoRepositorio.actualizarSi` (DD-19), así que dos cambios concurrentes sobre el mismo turno no se pisan.
- `CodigoRN` suma `RN-24`. `Turno` no cambia: `creadoEn`/`actualizadoEn` se posponen (DD-20).

## Capabilities

### New Capabilities
- `estados-turno`: confirmación y cierre (atendido o ausente) de un turno, con sus transiciones válidas, la restricción horaria del cierre, el orden de los rechazos, la liberación del horario por ausencia y la atomicidad frente a operaciones concurrentes.

### Modified Capabilities
<!-- Ninguna: agenda-turnos ya establece que los turnos `ausente` no ocupan recursos, y cancelacion-turnos no cambia de comportamiento (solo se refactoriza su implementación). -->

## Impact

- Código nuevo: `src/domain/reglas/transiciones.ts` (tabla y predicado), `src/domain/reglas/estados.ts` (reglas puras de confirmación y cierre), `src/application/confirmar-turno.ts`, `src/application/marcar-atendido.ts`, `src/application/marcar-ausente.ts` y su input común.
- Código modificado: `src/domain/errores.ts` (`RN-24`), `src/domain/reglas/cancelacion.ts` (usa la tabla única), `tests/fixtures/sistema.ts` (cableado de los casos de uso de estado).
- Tests nuevos: `tests/domain/reglas/transiciones.test.ts`, `tests/domain/reglas/estados.test.ts`, `tests/application/estados-turno.test.ts`.
- Dependencias: ninguna nueva.
- KB actualizada en el explore: RN-24 y precisión de RN-10 (`05`), transiciones (`04`), DD-20 (`09`), preguntas abiertas (`10`).
- Governance MEDIO (máquina de estados): implementación con checkpoints.
- Fuera de alcance: control de acceso por rol (C-09), confirmación desde el enlace del recordatorio (C-12), `creadoEn`/`actualizadoEn` (change de persistencia real), endpoints HTTP, tablero de ausentismo.
