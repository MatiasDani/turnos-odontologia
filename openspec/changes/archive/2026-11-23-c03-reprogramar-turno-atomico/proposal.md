# Proposal

## Why

Hoy la agenda sabe dar, cancelar y cerrar turnos, pero no moverlos: US-005 sigue sin cubrirse y es el único eslabón que falta para completar el camino crítico (`C-01 → C-02 → C-03 → C-11 → C-14`). Sin reprogramación atómica, mover un turno obligaría a cancelarlo y volver a agendarlo, perdiendo su identidad, su estado y el vínculo con el token de gestión que después usa C-11.

## What Changes

- Se agrega el caso de uso de reprogramación: mueve un turno a otro `inicio` y, si se informan, otro profesional, sillón, prestación y duración, **conservando su `id`, paciente, estado y origen**.
- El nuevo horario se valida con las mismas reglas del alta (RN-01 a RN-07, RN-06, RN-16 a RN-18) **excluyendo el propio turno** de la comparación (RN-11). No hay ninguna opción para forzar un solapamiento (RN-04).
- La operación es atómica (RN-12): si la validación falla, el turno original queda intacto y su horario sigue ocupado; el horario original solo se libera cuando la reprogramación se concreta (RN-09).
- El paciente solo reprograma con `inicio - ahora >= 24 h` (RN-08, umbral inclusivo); con menos tiempo recibe el rechazo sin que se modifique el turno. El orden de rechazos es: turno inexistente → estado inválido (`RN-10`) → anticipación (`RN-08`) → reglas del nuevo horario.
- Después de persistir el movimiento se programa el recordatorio del turno con el nuevo `programadoPara` (RN-25, DD-21), sin duplicar el pendiente.
- Se extrae la comprobación de anticipación de 24 h a una regla pura compartida con la cancelación, sin cambiar el comportamiento de C-02.
- Se extiende la operación atómica de modificación del repositorio de turnos para que la revalidación del solapamiento ocurra dentro de la misma sección crítica, sobre los recursos de destino.

## Capabilities

### New Capabilities

- `reprogramacion-turnos`: identificación del turno, estados reprogramables, anticipación del paciente, validación del nuevo horario excluyendo el propio turno, atomicidad y reprogramación del recordatorio.

### Modified Capabilities

(ninguna: la cancelación, los estados, la disponibilidad y los recordatorios conservan sus requisitos actuales; C-03 solo reutiliza sus contratos)

## Impact

- **Dominio**: nueva regla pura de reprogramación; extracción de la anticipación de RN-08 desde `src/domain/reglas/cancelacion.ts` (sin cambiar su resultado).
- **Aplicación**: nuevo caso de uso `ReprogramarTurno` y su contrato de entrada; extensión aditiva de `TurnoRepositorio.actualizarSi` para pasar los turnos de los recursos de destino al validador dentro de la sección crítica.
- **Adaptadores**: único cambio en `TurnoRepositorioEnMemoria`; no se agregan dependencias ni infraestructura.
- **Tests**: nueva suite de casos de uso, ajustes aditivos en fixtures de cableado y tests de concurrencia; las suites de C-01, C-02, C-04, C-10 y C-12 deben seguir en verde sin modificaciones de comportamiento.
- **KB y roadmap**: se registra DD-22 y se cierra la pregunta abierta sobre el enganche de `Recordatorios.programar`; `CHANGES.md` se marca `[x]` recién al archivar.
- **Sin UI ni HTTP**: las pantallas son C-14 y C-15; este change expone solo el caso de uso.
