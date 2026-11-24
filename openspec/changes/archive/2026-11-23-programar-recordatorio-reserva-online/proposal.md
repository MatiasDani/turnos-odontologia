# Proposal

## Why

DD-21 (C-12) engancha el recordatorio a la reserva online inyectando el decorador `AgendarTurnoConRecordatorio` como `agendar` de `ReservarOnline` (C-10). Pero `ReservarOnline` guarda al paciente nuevo **después** del alta (requisito "Sin pacientes huérfanos"), así que `programar` no lo encuentra, lanza `RecursoNoEncontradoError('paciente')`, `ReservarOnline` lo traduce a `HORARIO_NO_DISPONIBLE` y la reserva de un DNI nuevo falla con el turno ya creado (horario ocupado) y sin paciente guardado. Los tests de C-12 y C-13 reservan con `pa1`, un paciente existente, y no lo detectaron. C-14 lo esquivó en la composición con `EmitirTokenConRecordatorio` (D13 de su design, sin test unitario propio) y dejó abierta la corrección en `knowledge-base/10_preguntas_abiertas.md` ("Bug de integración C-10 + C-12"). El cableado documentado en la KB sigue siendo el que falla, y cualquier composición nueva que lo siga (por ejemplo, la de recepción de C-15) repetiría el error.

## What Changes

- `ReservarOnline` pasa a recibir el puerto de recordatorios (solo `programar`) como dependencia **obligatoria** y programa los recordatorios del turno **después** de guardar al paciente nuevo y **antes** de emitir el token. Vale igual para un paciente existente. Las composiciones que no envían recordatorios usan el adaptador sin efecto que ya existe.
- Si programar falla, el error se propaga sin traducir: la reserva no devuelve token, el turno creado no se deshace y el paciente nuevo queda guardado (mismo criterio que DD-19/DD-21). En la ruta HTTP ese error llega como `500 ERROR_INTERNO` con mensaje fijo (RN-22 ya cubierto por la frontera HTTP). No se agrega ningún código al conjunto cerrado de errores públicos de C-10.
- Se elimina `EmitirTokenConRecordatorio` y la composición de C-14 (`src/composicion.ts`) inyecta los recordatorios en `ReservarOnline` con `AgendarTurno` simple.
- `AgendarTurnoConRecordatorio` queda **solo** para el alta de recepción; su documentación deja de decir que se inyecta en `ReservarOnline`.
- El canal `wa.me` (C-13) queda cubierto sin código propio: su decorador implementa el mismo puerto, así que se programa en la misma llamada.
- KB: nueva decisión DD-32 que enmienda el "Enganche al alta" de DD-21, precisión en RN-22 sobre la falla al programar, cierre de la pregunta abierta y entrada nueva en `CHANGES.md`. No hay regla de negocio nueva: RN-25 y RN-26 ya exigen el recordatorio de la reserva online.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `reserva-online`: se agrega el requisito de programar los recordatorios del turno reservado, para un paciente nuevo o existente, con el paciente ya guardado y antes del token, y la conducta ante la falla al programar. "Sin pacientes huérfanos" se conserva sin cambios.
- `api-publica-paciente`: se agrega el requisito de que una reserva por HTTP de un DNI nuevo termine con su recordatorio pendiente (prueba de la composición real).

`recordatorios-turno` y `recordatorio-wa-me` no cambian: sus requisitos ya dicen que la reserva online programa el recordatorio sin nombrar el mecanismo. Lo que cambia es el cableado (DD-21 en la KB), que no es comportamiento observable.

## Impact

- **Aplicación**: `src/application/reservar-online.ts` (nueva dependencia y paso nuevo en `ejecutar`); `src/application/agendar-turno-con-recordatorio.ts` (solo documentación); se borra `src/application/emitir-token-con-recordatorio.ts`.
- **Composición** (C-14, owner Alejo Carabelli): `src/composicion.ts` deja de usar `EmitirTokenConRecordatorio` y pasa `recordatorios` a `ReservarOnline`.
- **Fixtures de test**: `tests/fixtures/sistema.ts` (`crearSistemaReserva` inyecta `RecordatoriosNoOp` o uno opcional) y `tests/fixtures/sistema-recordatorios.ts` (la reserva usa `AgendarTurno` simple y recibe el puerto, con o sin `wa.me`). Las suites de C-10, C-12, C-13 y C-14 tienen que seguir en verde sin cambiar su comportamiento.
- **Tests nuevos**: un test por escenario de los deltas, con el mismo título que el escenario (regla dura 8).
- **Sin cambios** en DTOs públicos, contrato HTTP, códigos de error, dependencias, UI ni datos persistidos.
- **Governance**: ALTO (C-10, datos personales en ruta pública). Este propose espera revisión antes del apply.
- **KB y roadmap**: DD-32 en `knowledge-base/09_decisiones_y_supuestos.md` (y nota en DD-21), precisión en RN-22 de `knowledge-base/05_reglas_de_negocio.md`, fila resuelta en `knowledge-base/10_preguntas_abiertas.md` y entrada en `CHANGES.md` (owner Matías Ibañez, dependencias C-10, C-12, C-14).
