# reprogramacion-turnos Specification

## Purpose

Define la reprogramación atómica de turnos: mover un turno existente a otro horario o recursos conservando su identidad, validándolo como un alta que no se cuenta a sí mismo y sin dejar ventanas de carrera con otras operaciones de la agenda.

> Contexto común de los escenarios (seed ficticio de `knowledge-base/04_modelo_de_datos.md`): consultorio `c1` en `America/Argentina/Buenos_Aires`; profesionales `p1` y `p2`, sillones `s1` y `s2`, todos activos; prestaciones `pr1` 30 min, `pr2` 45 min; horario lunes a viernes 09:00-13:00 y 15:00-19:00; bloqueo de `p1` el miércoles 2026-11-25 de 15:00 a 17:00. Todas las horas son locales (`-03:00`). Salvo que se indique otra cosa, `ahora` es el domingo 2026-11-22 a las 08:00, el **turno base** es `t-base`, `confirmado`, de `pa1` con `p1`, `s1`, `pr1`, el lunes 2026-11-23 de 09:00 a 09:30, y el actor es recepción. Un rechazo informa un código `RN-XX`; un turno inexistente se rechaza sin código RN.

## Requirements

### Requirement: Conservación de la identidad del turno

Al reprogramarse, el turno SHALL conservar su `id`, paciente, `estado` y `origen`. El `inicio`, el `fin` y la duración efectiva MUST reflejar el nuevo horario; el profesional, el sillón y la prestación MUST reflejar los informados, o los anteriores si no se informan. El turno MUST NOT borrarse ni duplicarse (US-005).

#### Scenario: El turno mantiene su identidad

- **GIVEN** el turno base `t-base`, `confirmado`, con origen `recepcion`
- **WHEN** recepción reprograma `t-base` al martes 2026-11-24 a las 10:00
- **THEN** se devuelve el turno con `id` `t-base`, `pa1`, estado `confirmado` y origen `recepcion`
- **AND** su inicio es el martes a las 10:00 y su fin es el martes a las 10:30

#### Scenario: Reprogramación con cambio de recursos

- **GIVEN** el turno base
- **WHEN** recepción reprograma `t-base` al martes a las 11:00 con `p2`, `s2` y `pr2`
- **THEN** el turno queda con `p2`, `s2` y `pr2`, con fin a las 11:45
- **AND** conserva su `id`, su paciente, su estado y su origen

### Requirement: Estados reprogramables

Solo los turnos en estado `reservado` o `confirmado` SHALL poder reprogramarse. Reprogramar un turno `cancelado`, `ausente` o `atendido` MUST rechazarse con `RN-10` informando el `estadoActual`, sin modificar el turno (DD-22).

#### Scenario: Un turno reservado se puede reprogramar

- **GIVEN** un turno `reservado` con origen `online` del lunes a las 09:00
- **WHEN** recepción lo reprograma al martes a las 10:00
- **THEN** el turno se mueve y sigue `reservado` con origen `online`

#### Scenario: Un turno cancelado no se reprograma

- **GIVEN** el turno base en estado `cancelado`
- **WHEN** recepción intenta reprogramarlo al martes a las 10:00
- **THEN** se rechaza con `RN-10` e informa `estadoActual: 'cancelado'`
- **AND** el turno conserva su horario y sus recursos originales

#### Scenario: Un turno atendido no se reprograma

- **GIVEN** el turno base en estado `atendido`
- **WHEN** recepción intenta reprogramarlo al martes a las 10:00
- **THEN** se rechaza con `RN-10` e informa `estadoActual: 'atendido'`

### Requirement: Anticipación mínima del paciente

El paciente SHALL reprogramar solo si faltan 24 h o más respecto del `inicio` original (umbral inclusivo); si no, el sistema MUST rechazar con `RN-08` sin mover el turno. Recepción, odontólogo y administrador SHALL reprogramar sin restricción de anticipación (RN-08, DD-22).

#### Scenario: Paciente con 24 h exactas puede reprogramar

- **GIVEN** el turno base y `ahora` el domingo 2026-11-22 a las 09:00
- **WHEN** el paciente reprograma `t-base` al martes a las 10:00
- **THEN** el turno se mueve al martes a las 10:00

#### Scenario: Paciente con 23 h 59 min no puede reprogramar

- **GIVEN** el turno base y `ahora` el domingo 2026-11-22 a las 09:01
- **WHEN** el paciente intenta reprogramar `t-base` al martes a las 10:00
- **THEN** se rechaza con `RN-08`
- **AND** el turno sigue el lunes a las 09:00 con `p1` y `s1`

#### Scenario: Recepción reprograma con menos de 24 h

- **GIVEN** el turno base y `ahora` el lunes 2026-11-23 a las 08:00
- **WHEN** recepción reprograma `t-base` al martes a las 10:00
- **THEN** el turno se mueve al martes a las 10:00

### Requirement: Validación del nuevo horario

El nuevo horario SHALL validarse con las mismas reglas que el alta —recursos activos (RN-18), duración (RN-06/RN-16), horario y bloqueos (RN-07/RN-17) y solapamiento por profesional y sillón (RN-02/RN-03)— **ignorando el propio turno** en la comparación (RN-11). Un solape parcial con el intervalo que el turno ocupaba MUST estar permitido; un solape con otro turno activo MUST rechazarse. Ningún rol SHALL poder forzar un solapamiento (RN-04).

#### Scenario: Mover a un hueco libre

- **GIVEN** el turno base y `ahora` el domingo a las 08:00
- **WHEN** recepción reprograma `t-base` al martes a las 10:00
- **THEN** el turno se mueve al martes de 10:00 a 10:30

#### Scenario: Solape parcial con el propio turno

- **GIVEN** el turno base del lunes de 09:00 a 09:30
- **WHEN** recepción reprograma `t-base` al lunes a las 09:15 (nuevo fin 09:45)
- **THEN** el turno se mueve, porque el propio turno se excluye de la validación

#### Scenario: Mover sobre otro turno activo

- **GIVEN** el turno base y otro turno activo de `p1` en `s2` el martes de 10:00 a 10:30
- **WHEN** recepción intenta reprogramar `t-base` al martes a las 10:15 con `p1`
- **THEN** se rechaza con `RN-02` e informa el otro turno como conflicto
- **AND** `t-base` sigue el lunes a las 09:00 con `p1` y `s1`

#### Scenario: Mover a un horario contiguo a otro turno

- **GIVEN** el turno base y otro turno activo de `p1` en `s1` el martes de 10:30 a 11:00
- **WHEN** recepción reprograma `t-base` al martes a las 10:00
- **THEN** el turno se mueve, porque los intervalos semiabiertos contiguos no se solapan (RN-05)

#### Scenario: Mover sobre un bloqueo del profesional

- **GIVEN** el turno base
- **WHEN** recepción intenta reprogramar `t-base` al miércoles 2026-11-25 a las 15:30 con `p1`
- **THEN** se rechaza con `RN-07` e informa el bloqueo de `p1`

#### Scenario: Mover a un recurso inactivo

- **GIVEN** el turno base y el sillón `s2` inactivo
- **WHEN** recepción intenta reprogramar `t-base` al martes a las 10:00 con `p2` y `s2`
- **THEN** se rechaza con `RN-18`
- **AND** `t-base` conserva su profesional, sillón y horario originales

### Requirement: Atomicidad y liberación del horario original

La validación y la persistencia del movimiento SHALL ejecutarse como una única operación atómica sobre el turno y los recursos de destino (RN-12). Si la validación falla, el turno original MUST quedar intacto y seguir ocupando su horario; el horario original solo SHALL liberarse cuando la reprogramación se concrete (RN-09, RN-11). Dos reprogramaciones concurrentes del mismo turno MUST serializarse.

#### Scenario: Un rechazo no modifica ni libera el turno

- **GIVEN** el turno base y otro turno activo de `p1` en `s1` el martes de 10:00 a 10:30
- **WHEN** recepción intenta reprogramar `t-base` al martes a las 10:15 y la validación falla
- **THEN** `t-base` sigue el lunes a las 09:00 con `p1` y `s1`
- **AND** ningún otro turno puede agendarse en el hueco del lunes a las 09:00

#### Scenario: El horario original se libera al concretarse

- **GIVEN** el turno base
- **WHEN** recepción reprograma `t-base` al martes a las 10:00 y luego agenda otro turno de `p1` en `s1` el lunes a las 09:00
- **THEN** el turno nuevo se crea `confirmado`

#### Scenario: Dos reprogramaciones concurrentes

- **WHEN** recepción intenta mover `t-base` al martes a las 10:00 y, al mismo tiempo, al martes a las 11:00
- **THEN** exactamente una se concreta y la otra se rechaza con `RN-10` o con la regla de horario correspondiente
- **AND** el turno queda una sola vez en el horario de la operación concretada

### Requirement: Orden de evaluación de los rechazos

Ante varias violaciones se MUST informar solo la primera, en este orden: turno inexistente (sin código RN), `RN-10`, `RN-08` y, por último, las reglas del nuevo horario en el orden definido para el alta (DD-22).

#### Scenario: El estado prevalece sobre la anticipación

- **GIVEN** el turno base en estado `cancelado` y `ahora` el lunes 2026-11-23 a las 08:00
- **WHEN** el paciente intenta reprogramarlo
- **THEN** se rechaza con `RN-10`, no con `RN-08`

#### Scenario: La anticipación prevalece sobre el solapamiento

- **GIVEN** `ahora` el lunes 2026-11-23 a las 08:00 y otro turno activo de `p1` en `s1` el martes a las 10:00
- **WHEN** el paciente intenta reprogramar `t-base` al martes a las 10:00
- **THEN** se rechaza con `RN-08`, no con `RN-02`

### Requirement: Reprogramación del recordatorio

Al concretarse una reprogramación, el sistema SHALL programar el recordatorio del turno con `programadoPara` calculado desde el nuevo `inicio`, reemplazando el pendiente sin duplicarlo (RN-25, DD-21). Una reprogramación rechazada MUST NOT pedirlo. Si la programación falla, el error SHALL informarse y el turno ya movido MUST NOT deshacerse.

#### Scenario: El recordatorio se mueve con el turno

- **GIVEN** el turno base con un recordatorio `pendiente` calculado desde el lunes a las 09:00
- **WHEN** recepción reprograma `t-base` al martes a las 10:00
- **THEN** se pide una única vez programar el recordatorio de `t-base`
- **AND** su nuevo `programadoPara` se calcula desde el martes a las 10:00

#### Scenario: Un rechazo no toca el recordatorio

- **GIVEN** el turno base con un recordatorio `pendiente`
- **WHEN** el paciente con menos de 24 h intenta reprogramarlo y se rechaza con `RN-08`
- **THEN** no se pide programar el recordatorio

#### Scenario: Falla al programar no deshace el movimiento

- **GIVEN** un puerto de recordatorios que falla al programar
- **WHEN** recepción reprograma `t-base` al martes a las 10:00
- **THEN** la operación informa el error
- **AND** el turno queda movido al martes a las 10:00

### Requirement: Horario propio del profesional al reprogramar
El nuevo horario de un turno reprogramado MUST validarse contra el horario efectivo del día del profesional de destino: sus tramos propios si tiene alguno ese día de la semana, o los del consultorio si no. Si queda fuera, se rechaza con `RN-07` o `RN-17` y el turno no cambia (RN-28, RN-11, DD-26).

#### Scenario: Reprogramar al horario propio del profesional de destino
- **GIVEN** el turno base y `p2` con un tramo propio el lunes de 14:00 a 18:00
- **WHEN** recepción reprograma `t-base` al lunes a las 14:00 con `p2`
- **THEN** el turno se mueve al lunes de 14:00 a 14:30 con `p2` y `s1`

#### Scenario: Reprogramar fuera del horario propio del profesional de destino
- **GIVEN** el turno base y `p2` con un tramo propio el lunes de 14:00 a 18:00
- **WHEN** recepción intenta reprogramar `t-base` al lunes a las 10:00 con `p2`
- **THEN** se rechaza con `RN-07`
- **AND** `t-base` sigue el lunes a las 09:00 con `p1` y `s1`

#### Scenario: Reprogramar sin horario propio usa el horario del consultorio
- **GIVEN** el turno base y `p2` con un tramo propio el lunes de 14:00 a 18:00
- **WHEN** recepción intenta reprogramar `t-base` al lunes a las 14:00 sin cambiar de profesional
- **THEN** se rechaza con `RN-07`, porque `p1` no tiene horario propio y el consultorio no atiende a esa hora
