# consulta-agenda Specification

## Purpose

Consultar la agenda del consultorio por fecha y por recursos, respetando la visibilidad definida por US-002 y el criterio de ocupación de DD-05.

## Requirements

### Requirement: Consulta diaria por fecha y recurso

El sistema MUST devolver los turnos de la fecha local solicitada y los bloqueos que afectan ese día. Los filtros de profesional y sillón MUST aplicarse a ambos tipos de registro.

#### Scenario: Recepción consulta la agenda de un día

- **GIVEN** que el lunes tiene un turno y un bloqueo, y el martes tiene otro turno
- **WHEN** recepción consulta el lunes
- **THEN** recibe el turno y el bloqueo del lunes

### Requirement: Visibilidad de la agenda según el actor

Recepción y administración MUST poder consultar todos los profesionales. El odontólogo MUST ver únicamente sus propios registros y recibir un error de acceso si pide expresamente la agenda de otro profesional.

#### Scenario: El odontólogo consulta solo su propia agenda

- **GIVEN** que hay turnos y bloqueos de dos odontólogos para el mismo día
- **WHEN** un odontólogo consulta esa fecha
- **THEN** recibe únicamente sus propios turnos y bloqueos

#### Scenario: El odontólogo no puede filtrar por otro profesional

- **GIVEN** que el odontólogo tiene identidad profesional propia
- **WHEN** aplica el filtro de otro profesional
- **THEN** la consulta se rechaza por falta de permiso

### Requirement: Consulta semanal y ocupación

La agenda semanal MUST incluir los siete días locales de la semana de la fecha solicitada, con los mismos filtros y permisos de la diaria. El resultado MUST conservar el estado del turno e indicar su ocupación según DD-05.

#### Scenario: La semana agrupa por fecha local y conserva los estados sin ocupación

- **GIVEN** que hay turnos confirmados, cancelados y ausentes, y un bloqueo que termina a medianoche del domingo
- **WHEN** recepción consulta una fecha de esa semana
- **THEN** recibe los siete días de lunes a domingo y los turnos cancelados y ausentes tienen `ocupa: false`
- **AND** el bloqueo que termina al comenzar el lunes siguiente solo figura en el domingo

#### Scenario: La agenda semanal aplica los filtros y el permiso del odontólogo

- **GIVEN** que el odontólogo tiene turnos en distintos sillones y hay un turno de otro profesional en el sillón solicitado
- **WHEN** consulta la semana filtrada por ese sillón
- **THEN** recibe únicamente sus turnos de ese sillón

### Requirement: Vista de la agenda con datos para mostrar
La vista de la agenda diaria y semanal SHALL agregar a cada turno el nombre y apellido del paciente, el nombre de la prestación, el nombre y apellido del profesional y el nombre del sillón, y a cada bloqueo el nombre de su profesional o sillón. Del paciente MUST NOT incluir DNI, teléfono, e-mail ni consentimiento (RN-D-02).

#### Scenario: Turno de la agenda con nombres
- **GIVEN** un turno `confirmado` de `pa1` con `p1`, `s1` y `pr1` el lunes a las 09:00
- **WHEN** recepción consulta la vista de la agenda del lunes
- **THEN** el turno informa paciente `Carla Prueba`, prestación `Consulta/control`, profesional `Ana Ejemplo` y sillón `Sillón 1`
- **AND** no informa el DNI ni el teléfono del paciente

#### Scenario: Bloqueo de la agenda con nombre
- **GIVEN** un bloqueo de `p2` el lunes de 15:00 a 16:00
- **WHEN** recepción consulta la vista de la agenda del lunes
- **THEN** el bloqueo informa el profesional `Bruno Muestra`

#### Scenario: El odontólogo ve los nombres solo de sus turnos
- **GIVEN** un turno de `pa1` con `p1` y uno de `pa2` con `p2` el lunes
- **WHEN** el odontólogo de `p1` consulta la vista de la agenda del lunes
- **THEN** recibe solo el turno de `pa1`, con su nombre
