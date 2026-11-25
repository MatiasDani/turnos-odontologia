# Spec Delta

## MODIFIED Requirements

### Requirement: Anticipación mínima del paciente

El paciente SHALL reprogramar solo si faltan 24 h o más respecto del `inicio` original (umbral inclusivo); si no, el sistema MUST rechazar con `RN-08` sin mover el turno. Recepción y administrador SHALL reprogramar sin restricción de anticipación (RN-08, DD-22). El odontólogo no reprograma turnos (control de acceso, C-09).

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

#### Scenario: Odontólogo no puede reprogramar

- **GIVEN** el turno base y `ahora` el lunes 2026-11-23 a las 08:00
- **WHEN** el odontólogo de `p1` intenta reprogramar `t-base` al martes a las 10:00
- **THEN** se rechaza con acceso denegado para el rol `odontologo`
- **AND** el turno sigue el lunes a las 09:00 con `p1` y `s1`
