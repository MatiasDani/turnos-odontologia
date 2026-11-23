# Spec Delta

## ADDED Requirements

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
