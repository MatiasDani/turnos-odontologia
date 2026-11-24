## Purpose

Consultar la agenda del consultorio por fecha y por recursos, respetando la visibilidad definida por US-002 y el criterio de ocupación de DD-05.

## ADDED Requirements

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
