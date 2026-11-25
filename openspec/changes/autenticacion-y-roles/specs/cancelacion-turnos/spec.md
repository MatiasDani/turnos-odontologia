# Spec Delta

## ADDED Requirements

### Requirement: Recepción y administrador sin restricción de anticipación
Recepción y administrador SHALL poder cancelar con cualquier anticipación; RN-08 MUST aplicarse solo al paciente (RN-08). El odontólogo no cancela turnos: qué rol puede cancelar lo define el control de acceso (C-09).

#### Scenario: Recepción con menos de 24 h puede cancelar
- **WHEN** `ahora` es el lunes 2026-11-23 a las 08:00 y recepción cancela el turno base
- **THEN** el turno queda `cancelado` con `canceladoPor: 'recepcion'`

#### Scenario: Administrador con menos de 24 h puede cancelar
- **WHEN** `ahora` es el lunes 2026-11-23 a las 08:00 y el administrador cancela el turno base
- **THEN** el turno queda `cancelado` con `canceladoPor: 'administrador'`

#### Scenario: Odontólogo no puede cancelar
- **WHEN** `ahora` es el lunes 2026-11-23 a las 08:00 y el odontólogo de `p1` cancela el turno base
- **THEN** se rechaza con acceso denegado para el rol `odontologo`
- **AND** el turno sigue `confirmado`

## REMOVED Requirements

### Requirement: Personal del consultorio sin restricción de anticipación
**Reason**: incluía al odontólogo entre quienes cancelan; la matriz RBAC (C-09) reserva la cancelación interna a recepción y administrador.
**Migration**: reemplazado por "Recepción y administrador sin restricción de anticipación"; el escenario "Odontólogo con menos de 24 h puede cancelar" pasa a "Odontólogo no puede cancelar".
