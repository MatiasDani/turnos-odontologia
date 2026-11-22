# Spec Delta

## Purpose

Permite cancelar un turno de la agenda para liberar el horario del profesional y del sillón, respetando las transiciones de estado válidas y la política de 24 h de anticipación del paciente, y dejando registrado quién canceló y cuándo.

> Contexto común de los escenarios (seed ficticio de `knowledge-base/04_modelo_de_datos.md`): consultorio `c1` en `America/Argentina/Buenos_Aires`; profesionales `p1` y `p2`, sillones `s1` y `s2`; prestación `pr1` 30 min; horario lunes a viernes 09:00-13:00 y 15:00-19:00; paciente `pa1`. Todas las horas son locales (`-03:00`); lunes = 2026-11-23, domingo = 2026-11-22. Salvo que se indique otra cosa: `ahora` es el domingo 2026-11-22 a las 08:00, el **turno base** es un turno `confirmado` de `pa1` con `p1`, `s1`, `pr1`, el lunes de 09:00 a 09:30, y el actor es recepción. Un rechazo informa un código `RN-XX`; un turno inexistente se rechaza con un error de no encontrado, sin código RN.

## ADDED Requirements

### Requirement: Cancelación de un turno
Cancelar un turno SHALL dejarlo en estado `cancelado` y registrar `canceladoPor` (el rol del actor) y `canceladoEn` (el instante actual del sistema). El turno MUST NOT borrarse: conserva su id, paciente, recursos e intervalo. La operación devuelve el turno cancelado (US-004).

#### Scenario: Recepción cancela un turno confirmado
- **WHEN** recepción cancela el turno base
- **THEN** el turno queda `cancelado` con `canceladoPor: 'recepcion'` y `canceladoEn` igual al domingo 2026-11-22 a las 08:00
- **AND** conserva su id, `pa1`, `p1`, `s1`, `pr1` y el intervalo de 09:00 a 09:30

#### Scenario: Paciente cancela un turno reservado
- **WHEN** el paciente cancela un turno `reservado` con `origen: 'online'` del lunes a las 09:00
- **THEN** el turno queda `cancelado` con `canceladoPor: 'paciente'`

#### Scenario: Turno inexistente
- **WHEN** recepción cancela el turno `t-inexistente`
- **THEN** se rechaza con un error de no encontrado, sin código RN

### Requirement: Solo se cancelan turnos reservados o confirmados
Solo un turno `reservado` o `confirmado` SHALL poder cancelarse. Cancelar un turno `cancelado`, `atendido` o `ausente` MUST rechazarse con `RN-10`, informando el estado actual del turno, sin modificarlo (RN-10, DD-19).

#### Scenario: Doble cancelación rechazada
- **WHEN** recepción cancela el turno base y luego lo vuelve a cancelar
- **THEN** la segunda cancelación se rechaza con `RN-10` y estado actual `cancelado`
- **AND** el turno conserva el `canceladoPor` y el `canceladoEn` de la primera cancelación

#### Scenario: Turno atendido no se cancela
- **WHEN** recepción cancela un turno `atendido`
- **THEN** se rechaza con `RN-10` y estado actual `atendido`
- **AND** el turno sigue `atendido`

#### Scenario: Turno ausente no se cancela
- **WHEN** recepción cancela un turno `ausente`
- **THEN** se rechaza con `RN-10` y estado actual `ausente`

### Requirement: Cancelación de turnos cuyo inicio ya pasó
La transición a `cancelado` MUST NOT depender de la hora para recepción, odontólogo y administrador: pueden cancelar un turno `confirmado` cuyo `inicio` ya pasó y que todavía no se marcó `atendido` ni `ausente` (DD-19).

#### Scenario: Recepción cancela un turno pasado
- **WHEN** `ahora` es el lunes 2026-11-23 a las 10:00 y recepción cancela el turno base
- **THEN** el turno queda `cancelado`

### Requirement: Anticipación mínima del paciente
El paciente SHALL poder cancelar solo si faltan 24 h o más para el `inicio` del turno (umbral inclusivo); si no, la cancelación MUST rechazarse con `RN-08` sin modificar el turno (RN-08).

#### Scenario: Paciente con 24 h exactas puede cancelar
- **WHEN** `ahora` es el domingo 2026-11-22 a las 09:00 y el paciente cancela el turno base
- **THEN** el turno queda `cancelado`

#### Scenario: Paciente con 23 h 59 min rechazado
- **WHEN** `ahora` es el domingo 2026-11-22 a las 09:01 y el paciente cancela el turno base
- **THEN** se rechaza con `RN-08`
- **AND** el turno sigue `confirmado`

#### Scenario: Paciente con menos de 24 h rechazado
- **WHEN** `ahora` es el lunes 2026-11-23 a las 08:00 y el paciente cancela el turno base
- **THEN** se rechaza con `RN-08`

### Requirement: Personal del consultorio sin restricción de anticipación
Recepción, odontólogo y administrador SHALL poder cancelar con cualquier anticipación; RN-08 MUST aplicarse solo al paciente (RN-08). El control de qué rol puede cancelar no forma parte de esta capacidad.

#### Scenario: Recepción con menos de 24 h puede cancelar
- **WHEN** `ahora` es el lunes 2026-11-23 a las 08:00 y recepción cancela el turno base
- **THEN** el turno queda `cancelado` con `canceladoPor: 'recepcion'`

#### Scenario: Administrador con menos de 24 h puede cancelar
- **WHEN** `ahora` es el lunes 2026-11-23 a las 08:00 y el administrador cancela el turno base
- **THEN** el turno queda `cancelado` con `canceladoPor: 'administrador'`

#### Scenario: Odontólogo con menos de 24 h puede cancelar
- **WHEN** `ahora` es el lunes 2026-11-23 a las 08:00 y el odontólogo cancela el turno base
- **THEN** el turno queda `cancelado` con `canceladoPor: 'odontologo'`

### Requirement: Orden de evaluación de los rechazos
Ante varias violaciones se MUST informar solo la primera según el orden: turno inexistente, `RN-10`, `RN-08` (DD-19).

#### Scenario: Paciente cancela un turno ya cancelado con menos de 24 h
- **WHEN** el turno base está `cancelado`, `ahora` es el lunes 2026-11-23 a las 08:00 y el paciente lo cancela
- **THEN** se rechaza con `RN-10`, no con `RN-08`

### Requirement: Cancelar libera el horario
Un turno cancelado MUST NOT ocupar al profesional ni al sillón: un turno nuevo SHALL poder agendarse en el mismo horario con los mismos recursos, y la disponibilidad SHALL volver a ofrecer ese horario (RN-09, DD-05).

#### Scenario: Cancelación libera y permite agendar en el mismo horario
- **WHEN** recepción cancela el turno base y luego agenda para `pa2` un turno con `p1`, `s1`, `pr1` el lunes a las 09:00
- **THEN** el turno nuevo se crea `confirmado`

#### Scenario: Sin cancelar, el mismo horario sigue ocupado
- **WHEN** recepción agenda para `pa2` un turno con `p1`, `s1`, `pr1` el lunes a las 09:00 sin cancelar el turno base
- **THEN** se rechaza con `RN-02`

#### Scenario: Disponibilidad vuelve a ofrecer el horario cancelado
- **WHEN** recepción cancela el turno base y consulta la disponibilidad de `pr1` para el lunes
- **THEN** la consulta incluye el combo de 09:00 con `p1` y `s1`

### Requirement: Cancelación atómica
La verificación de la cancelación y el cambio de estado MUST ejecutarse como una única operación atómica sobre el turno: dos operaciones concurrentes sobre el mismo turno no pueden ambas modificarlo a partir del mismo estado, y una cancelación rechazada no modifica el turno (RN-12).

#### Scenario: Dos cancelaciones concurrentes
- **WHEN** recepción y el administrador cancelan el turno base al mismo tiempo
- **THEN** exactamente una cancelación se concreta y la otra se rechaza con `RN-10`
- **AND** el turno queda `cancelado` una sola vez, con el `canceladoPor` de la cancelación concretada

### Requirement: Cancelación de recordatorios pendientes
Al concretarse una cancelación el sistema SHALL pedir la cancelación de los recordatorios pendientes del turno, después de persistir el turno cancelado. Una cancelación rechazada MUST NOT pedirla. Si ese pedido falla, el error se informa y la cancelación ya persistida MUST NOT deshacerse (Flujo 4, DD-19).

#### Scenario: Cancelación concretada pide cancelar recordatorios
- **WHEN** recepción cancela el turno base
- **THEN** se pide una única vez cancelar los recordatorios pendientes del turno base

#### Scenario: Cancelación rechazada no toca los recordatorios
- **WHEN** `ahora` es el lunes 2026-11-23 a las 08:00 y el paciente cancela el turno base
- **THEN** se rechaza con `RN-08` y no se pide cancelar recordatorios

#### Scenario: Falla al cancelar recordatorios no deshace la cancelación
- **WHEN** el pedido de cancelar recordatorios falla y recepción cancela el turno base
- **THEN** la operación informa el error
- **AND** el turno queda `cancelado`
