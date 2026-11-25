# Spec Delta

## MODIFIED Requirements

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
