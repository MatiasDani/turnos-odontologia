# Spec Delta

## ADDED Requirements

### Requirement: Ajuste de duración por recepción y administrador
Solo recepción y administrador SHALL poder informar una duración distinta de la de la prestación al dar un turno; el odontólogo no da turnos (control de acceso, C-09). Si el actor es paciente e informa una duración distinta, el alta MUST rechazarse con `RN-16`.

#### Scenario: Paciente informa duración distinta
- **WHEN** un paciente agenda un turno con `pr1` el lunes a las 09:00 con duración 45
- **THEN** se rechaza con `RN-16`

#### Scenario: Recepción ajusta la duración
- **WHEN** recepción agenda un turno con `pr2` el lunes a las 09:00 con duración 60
- **THEN** el turno tiene fin 10:00 y duración 60 minutos

## MODIFIED Requirements

### Requirement: Estado inicial según el origen
Un turno creado por recepción o administrador SHALL nacer en estado `confirmado` con origen `recepcion`; uno creado por un paciente SHALL nacer `reservado` con origen `online` (DD-11). El odontólogo no da turnos (control de acceso, C-09).

#### Scenario: Alta interna nace confirmado
- **WHEN** recepción agenda un turno válido el lunes a las 09:00
- **THEN** el turno tiene estado `confirmado` y origen `recepcion`

#### Scenario: Alta por paciente nace reservado
- **WHEN** un paciente agenda un turno válido con `pr1` el lunes a las 09:00 sin informar duración
- **THEN** el turno tiene estado `reservado` y origen `online`

## REMOVED Requirements

### Requirement: Ajuste de duración solo por personal del consultorio
**Reason**: incluía al odontólogo entre quienes dan turnos; la matriz RBAC (C-09) no le permite el alta.
**Migration**: reemplazado por "Ajuste de duración por recepción y administrador"; el escenario "Odontólogo ajusta la duración" pasa a "Recepción ajusta la duración".
