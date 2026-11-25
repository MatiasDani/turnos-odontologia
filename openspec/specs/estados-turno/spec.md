# estados-turno Specification

## Purpose

Permite confirmar un turno reservado y cerrar un turno confirmado como atendido o ausente, respetando las transiciones de estado válidas y la hora del turno, para mantener el seguimiento de la agenda y liberar el horario cuando el paciente no asiste.

> Contexto común de los escenarios (seed ficticio de `knowledge-base/04_modelo_de_datos.md`): consultorio `c1` en `America/Argentina/Buenos_Aires`; profesionales `p1` y `p2`, sillones `s1` y `s2`; prestación `pr1` 30 min; horario lunes a viernes 09:00-13:00 y 15:00-19:00; paciente `pa1`. Todas las horas son locales (`-03:00`); lunes = 2026-11-23, domingo = 2026-11-22. Salvo que se indique otra cosa: `ahora` es el lunes 2026-11-23 a las 10:00, el **turno base** es un turno `confirmado` de `pa1` con `p1`, `s1`, `pr1`, el lunes de 09:00 a 09:30, y el actor es recepción. Un rechazo informa un código `RN-XX`; un turno inexistente se rechaza con un error de no encontrado, sin código RN.

## Requirements

### Requirement: Confirmación de un turno reservado
Confirmar un turno `reservado` SHALL dejarlo en estado `confirmado`, sin restricción horaria. El turno MUST conservar su id, paciente, recursos, intervalo y origen. La operación devuelve el turno confirmado (US-006, DD-20).

#### Scenario: Recepción confirma un turno reservado
- **GIVEN** un turno `reservado` con `origen: 'online'` de `pa1` con `p1`, `s1`, `pr1`, el martes 2026-11-24 de 09:00 a 09:30
- **WHEN** recepción lo confirma
- **THEN** el turno queda `confirmado`
- **AND** conserva su id, `pa1`, `p1`, `s1`, `pr1`, el intervalo de 09:00 a 09:30 y `origen: 'online'`

#### Scenario: Paciente confirma su turno reservado
- **GIVEN** un turno `reservado` con `origen: 'online'` el martes 2026-11-24 a las 09:00
- **WHEN** el paciente lo confirma
- **THEN** el turno queda `confirmado`

#### Scenario: Confirmar un turno reservado cuyo inicio ya pasó
- **GIVEN** un turno `reservado` el lunes de 09:00 a 09:30
- **WHEN** recepción lo confirma el lunes a las 10:00
- **THEN** el turno queda `confirmado`

### Requirement: Cierre de un turno confirmado
Marcar un turno `confirmado` como atendido SHALL dejarlo en estado `atendido`, y marcarlo como ausente SHALL dejarlo en estado `ausente`. El turno MUST conservar su id, paciente, recursos e intervalo. La operación devuelve el turno modificado (US-006, Flujo 7). El odontólogo solo cierra los turnos de su propio profesional (control de acceso, C-09).

#### Scenario: Odontólogo marca atendido un turno confirmado
- **WHEN** el odontólogo de `p1` marca atendido el turno base
- **THEN** el turno queda `atendido`
- **AND** conserva su id, `pa1`, `p1`, `s1`, `pr1` y el intervalo de 09:00 a 09:30

#### Scenario: Recepción marca ausente un turno confirmado
- **WHEN** recepción marca ausente el turno base
- **THEN** el turno queda `ausente`
- **AND** conserva su id, `pa1`, `p1`, `s1`, `pr1` y el intervalo de 09:00 a 09:30

#### Scenario: Odontólogo de otro profesional no cierra el turno
- **WHEN** el odontólogo de `p2` marca atendido el turno base
- **THEN** se rechaza con acceso denegado para el rol `odontologo`
- **AND** el turno sigue `confirmado`

### Requirement: Solo transiciones de estado permitidas
Solo se SHALL confirmar un turno `reservado` y solo se SHALL cerrar (atendido o ausente) un turno `confirmado`. Cualquier otra transición, incluida repetir la misma, MUST rechazarse con `RN-10` informando el estado actual del turno, sin modificarlo (RN-10, DD-20).

#### Scenario: Confirmar un turno ya confirmado
- **WHEN** recepción confirma el turno base
- **THEN** se rechaza con `RN-10` y estado actual `confirmado`
- **AND** el turno sigue `confirmado`

#### Scenario: Confirmar un turno cancelado
- **GIVEN** el turno base `cancelado`
- **WHEN** recepción lo confirma
- **THEN** se rechaza con `RN-10` y estado actual `cancelado`
- **AND** el turno sigue `cancelado`

#### Scenario: Marcar atendido un turno reservado
- **GIVEN** un turno `reservado` el lunes de 09:00 a 09:30
- **WHEN** recepción lo marca atendido
- **THEN** se rechaza con `RN-10` y estado actual `reservado`
- **AND** el turno sigue `reservado`

#### Scenario: Marcar ausente un turno reservado
- **GIVEN** un turno `reservado` el lunes de 09:00 a 09:30
- **WHEN** recepción lo marca ausente
- **THEN** se rechaza con `RN-10` y estado actual `reservado`

#### Scenario: Marcar ausente un turno atendido
- **GIVEN** el turno base marcado atendido
- **WHEN** recepción lo marca ausente
- **THEN** se rechaza con `RN-10` y estado actual `atendido`
- **AND** el turno sigue `atendido`

#### Scenario: Marcar atendido un turno ausente
- **GIVEN** el turno base marcado ausente
- **WHEN** recepción lo marca atendido
- **THEN** se rechaza con `RN-10` y estado actual `ausente`
- **AND** el turno sigue `ausente`

#### Scenario: Marcar atendido dos veces
- **GIVEN** el turno base marcado atendido
- **WHEN** recepción lo vuelve a marcar atendido
- **THEN** se rechaza con `RN-10` y estado actual `atendido`

#### Scenario: Marcar ausente un turno cancelado
- **GIVEN** el turno base `cancelado`
- **WHEN** recepción lo marca ausente
- **THEN** se rechaza con `RN-10` y estado actual `cancelado`

### Requirement: Cierre solo desde el inicio del turno
Un turno SHALL poder marcarse atendido o ausente solo cuando su `inicio` ya llegó (`ahora >= inicio`, umbral inclusivo). Antes del `inicio` MUST rechazarse con `RN-24`, sin modificar el turno (RN-24).

#### Scenario: Marcar atendido un minuto antes del inicio
- **GIVEN** `ahora` es el lunes a las 08:59
- **WHEN** recepción marca atendido el turno base
- **THEN** se rechaza con `RN-24`
- **AND** el turno sigue `confirmado`

#### Scenario: Marcar atendido justo en el inicio
- **GIVEN** `ahora` es el lunes a las 09:00
- **WHEN** recepción marca atendido el turno base
- **THEN** el turno queda `atendido`

#### Scenario: Marcar ausente antes del inicio
- **GIVEN** `ahora` es el domingo 2026-11-22 a las 08:00
- **WHEN** recepción marca ausente el turno base
- **THEN** se rechaza con `RN-24`
- **AND** el turno sigue `confirmado`

#### Scenario: Marcar ausente días después del turno
- **GIVEN** `ahora` es el miércoles 2026-11-25 a las 12:00
- **WHEN** recepción marca ausente el turno base
- **THEN** el turno queda `ausente`

### Requirement: Orden de evaluación de los rechazos
Los rechazos de confirmar y cerrar un turno SHALL evaluarse en orden fijo y se informa solo el primero: turno inexistente (error de no encontrado, sin código RN), luego transición de estado (`RN-10`), luego hora del turno (`RN-24`) (DD-20).

#### Scenario: Confirmar un turno inexistente
- **WHEN** recepción confirma el turno `t-inexistente`
- **THEN** se rechaza con un error de no encontrado, sin código RN

#### Scenario: Marcar atendido un turno inexistente
- **WHEN** recepción marca atendido el turno `t-inexistente`
- **THEN** se rechaza con un error de no encontrado, sin código RN

#### Scenario: Marcar ausente un turno inexistente
- **WHEN** recepción marca ausente el turno `t-inexistente`
- **THEN** se rechaza con un error de no encontrado, sin código RN

#### Scenario: Transición inválida antes del inicio informa RN-10
- **GIVEN** un turno `reservado` el lunes de 09:00 a 09:30 y `ahora` el domingo a las 08:00
- **WHEN** recepción lo marca atendido
- **THEN** se rechaza con `RN-10` y estado actual `reservado`, no con `RN-24`

### Requirement: La ausencia libera el horario
Un turno `ausente` MUST dejar de ocupar al profesional y al sillón, de modo que un turno nuevo pueda ocupar el mismo horario. Un turno `atendido` SHALL seguir ocupándolos (DD-05).

#### Scenario: Marcar ausente permite agendar en el mismo horario
- **GIVEN** recepción marcó ausente el turno base
- **WHEN** recepción agenda un turno de `pa2` con `p1`, `s1`, `pr1` el lunes a las 09:00
- **THEN** el turno nuevo se crea `confirmado`

#### Scenario: Un turno atendido sigue ocupando el horario
- **GIVEN** recepción marcó atendido el turno base
- **WHEN** recepción agenda un turno de `pa2` con `p1`, `s2`, `pr1` el lunes a las 09:00
- **THEN** se rechaza con `RN-02`

### Requirement: Cambio de estado atómico
Confirmar, cerrar y cancelar un turno MUST ser operaciones atómicas sobre el estado real del turno: si dos cambios concurrentes compiten por el mismo turno, exactamente uno se concreta y el otro se evalúa sobre el estado nuevo (RN-12, DD-19).

#### Scenario: Marcar atendido y ausente a la vez
- **WHEN** recepción marca atendido y marca ausente el turno base de forma concurrente
- **THEN** exactamente una operación se concreta
- **AND** la otra se rechaza con `RN-10` informando el estado que dejó la primera

#### Scenario: Cancelar y marcar ausente a la vez
- **WHEN** recepción cancela y marca ausente el turno base de forma concurrente
- **THEN** exactamente una operación se concreta
- **AND** la otra se rechaza con `RN-10` informando el estado que dejó la primera
