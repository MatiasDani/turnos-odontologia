# Proposal

## Why

Hoy profesionales, sillones, prestaciones y horarios solo existen como fixtures de tests: el administrador no puede dar de alta un recurso, cambiar una duración ni desactivar a un profesional, y el horario propio del profesional (SU-09) existe en el modelo pero ninguna regla lo evalúa. C-05 cubre US-008, deja la agenda configurable por casos de uso y es una de las condiciones de C-09 (roles).

## What Changes

- Casos de uso de configuración, solo para el rol `administrador` (US-008, DD-27): alta, modificación, desactivación y reactivación de `Profesional`, `Sillon` y `Prestacion`; alta, modificación y eliminación de tramos de `HorarioAtencion` del consultorio o de un profesional. Cualquier otro rol se rechaza con un error nuevo de acceso denegado, sin código RN, antes de leer nada.
- Validez de la configuración (RN-28 nueva, DD-26): nombres obligatorios (recortados, no vacíos, hasta 80 caracteres), `duracionMinutos` de la prestación entero > 0 y múltiplo de 5, tramos con `diaSemana` 0..6, `HH:mm` de 24 h, `desde < hasta` y sin solaparse con otro tramo del mismo día y ámbito. Se informa con un error nuevo de configuración inválida que indica el campo, sin ampliar `CodigoRN`. `prestacionIds` sin repetidos y con prestaciones existentes.
- Desactivación lógica (RN-26 nueva, DD-24): no se desactiva un profesional, sillón o prestación con turnos `reservado` o `confirmado` de `inicio >= ahora`; el rechazo `RN-26` lista todos los turnos en conflicto. La reactivación siempre se permite. Que un recurso inactivo no reciba turnos nuevos ya lo garantiza RN-18 (solo test de integración).
- Horario propio del profesional por día (RN-27 nueva, DD-25, resuelve SU-09): si el profesional tiene tramos propios para un día de la semana, ese día solo valen esos; si no, los del consultorio. Rige en el alta (C-01), la disponibilidad (C-07, con inicios alineados a los tramos del profesional) y la reprogramación (C-03). Sin horario propio el comportamiento es idéntico al actual.
- Puertos de catálogo con escritura y adaptadores en memoria mutables, que siguen aceptando el seed por constructor; `TurnoRepositorio` suma una lectura de turnos por recurso. Los fixtures quedan como seed para tests y demo.
- `PacienteRepositorio` no cambia: el "extiende" de `CHANGES.md` ya lo cumplieron C-10 y C-12 (DD-27).

## Capabilities

### New Capabilities
- `configuracion-recursos`: configuración del consultorio por el administrador (profesionales, sillones, prestaciones y tramos de horario), con sus validaciones, la desactivación lógica bloqueada por turnos activos futuros, la reactivación, el orden de los rechazos y el efecto de la configuración en la agenda.

### Modified Capabilities
- `agenda-turnos`: el horario evaluado en el alta es el del profesional para los días en que tiene tramos propios (RN-27).
- `disponibilidad-turnos`: los huecos y sus inicios candidatos usan los tramos propios del profesional por día (RN-27).
- `reprogramacion-turnos`: el nuevo horario se valida contra el horario propio del profesional destino por día (RN-27).

## Impact

- Código nuevo: reglas puras de configuración y de desactivación en `src/domain/reglas/`, casos de uso de configuración en `src/application/`.
- Código modificado: `src/domain/errores.ts` (`RN-26`, `turnosEnConflicto`, dos clases de error nuevas), `src/domain/reglas/horario.ts` y `src/domain/reglas/validar-alta.ts` (tramos por profesional), `src/domain/disponibilidad/generar-candidatos.ts` y `src/application/consultar-disponibilidad.ts` (inicios por profesional), `src/application/puertos/repositorios.ts`, adaptadores en memoria de catálogos y de turnos, `tests/fixtures/sistema*.ts`.
- Dependencias: ninguna nueva.
- KB actualizada en este propose: RN-26, RN-27 y RN-28 (`05`), DD-24 a DD-27 y SU-09 confirmado (`09`), restricciones de `Profesional`, `Sillon`, `Prestacion` y `HorarioAtencion` (`04`), preguntas abiertas (`10`) y alcance de C-05 en `CHANGES.md`.
- Governance BAJO: sin checkpoints obligatorios; TDD estricto.

## Non-goals

- Que `AgendarTurno` valide que el paciente exista, o que exija el profesional habilitado (RN-19) en el alta interna: siguen como preguntas abiertas, fuera de C-05.
- `Prestacion.requiereSillonIds`: no se agrega ni se evalúa (pregunta abierta, post-MVP).
- Revisar turnos futuros al eliminar o modificar un tramo de horario (pregunta abierta nueva).
- Autenticación real, usuarios y matriz RBAC completa (C-09); ABM de pacientes y del consultorio; endpoints HTTP y UI (C-15).
- Cancelar o reasignar en cascada los turnos que impiden una desactivación.
