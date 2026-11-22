# Proposal

## Why

Hoy un turno solo se puede crear: no existe forma de cancelarlo, así que un paciente que no va a venir sigue ocupando al profesional y al sillón, y nadie más puede usar ese horario (RN-09). C-02 cubre la parte de dominio de US-004, aplica la política de 24 h del paciente (RN-08) y deja lista la operación atómica de modificación de turnos que necesitan C-03 (reprogramar), C-04 (estados) y C-11 (gestión por token). Es una de las tres condiciones del GATE 1, que hoy bloquea a C-03.

## What Changes

- Caso de uso nuevo `CancelarTurno` (`turnoId`, `actor`): pasa el turno a `cancelado` y registra `canceladoPor` (rol del actor) y `canceladoEn` (instante del `Reloj`). Devuelve el turno cancelado.
- Solo se cancela desde `reservado` o `confirmado`, sin importar si el `inicio` ya pasó. Cancelar un turno `cancelado`, `atendido` o `ausente` se rechaza con `RN-10`, informando el estado actual (DD-19).
- Política de anticipación (RN-08): el paciente cancela solo con `inicio - ahora >= 24 h` (umbral inclusivo); si no, se rechaza con `RN-08`. Recepción, odontólogo y administrador cancelan con cualquier anticipación. El estado se evalúa antes que la anticipación.
- Liberación (RN-09): el turno cancelado deja de ocupar profesional y sillón, así que un turno nuevo puede ocupar el mismo horario. No requiere lógica nueva en el alta ni en la disponibilidad: ya ignoran los turnos no activos (DD-05).
- Operación atómica nueva `TurnoRepositorio.actualizarSi(id, cambio)`: sección crítica que lee el turno, aplica el cambio y lo reemplaza solo si no hay violación (RN-12), de modo que dos operaciones concurrentes sobre el mismo turno no se pisan.
- Puerto nuevo `Recordatorios` (`cancelarPendientes(turnoId)`) con adaptador no-op: se invoca solo cuando la cancelación se concreta. C-12 implementa el adaptador real.
- `Turno` suma los campos opcionales `canceladoEn` y `canceladoPor`; `CodigoRN` suma `RN-08` y `RN-10`; `Violacion` y `ReglaNegocioError` suman `estadoActual` opcional. Todo es aditivo: no cambia el comportamiento de `AgendarTurno`, `ConsultarDisponibilidad` ni `ReservarOnline`.
- Reutiliza el puerto `Reloj`, `RelojSistema` y `RelojFijo` creados por C-10 (DD-16), sin redefinirlos.

## Capabilities

### New Capabilities
- `cancelacion-turnos`: cancelación de un turno por cualquier rol, con sus transiciones de estado válidas, la política de anticipación del paciente, el registro de quién y cuándo canceló, la liberación del horario, la atomicidad frente a operaciones concurrentes y la cancelación de recordatorios pendientes.

### Modified Capabilities
<!-- Ninguna: agenda-turnos ya establece que solo los turnos activos ocupan recursos, y disponibilidad-turnos y reserva-online no cambian de requisitos. -->

## Impact

- Código nuevo: `src/application/cancelar-turno.ts` (+ input), `src/application/puertos/recordatorios.ts`, `src/domain/reglas/cancelacion.ts`, `src/adapters/recordatorios/recordatorios-no-op.ts`.
- Código modificado (aditivo): `src/domain/turno.ts` (campos de cancelación), `src/domain/errores.ts` (`RN-08`, `RN-10`, `estadoActual`), `src/application/puertos/repositorios.ts` (`actualizarSi`), `src/adapters/persistence/en-memoria/turno-repositorio.ts`, `tests/fixtures/sistema.ts` (cableado de la cancelación).
- Tests nuevos: `tests/domain/reglas/cancelacion.test.ts`, `tests/application/cancelar-turno.test.ts`, casos de `actualizarSi` en `tests/adapters/turno-repositorio.test.ts`.
- Dependencias: ninguna nueva.
- Governance MEDIO (máquina de estados): implementación con checkpoints.
- Fuera de alcance: control de acceso por rol (C-09; hoy el odontólogo cancela como recepción), verificación de que el turno sea del paciente (C-11, por token), recordatorios reales (C-12), `creadoEn`/`actualizadoEn` del turno (C-04), lista de espera (fuera del MVP).
