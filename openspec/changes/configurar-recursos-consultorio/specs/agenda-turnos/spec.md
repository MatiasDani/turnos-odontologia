# Spec Delta

## ADDED Requirements

### Requirement: Horario propio del profesional por día
Si el profesional del turno tiene al menos un tramo de horario propio para el día de la semana del turno, el horario de atención de ese día MUST ser solo el de sus tramos propios; si no tiene, SHALL valer el horario del consultorio. Sobre los tramos resultantes rigen igual `RN-07` y `RN-17`. Un profesional sin horario propio se comporta igual que antes (RN-28, DD-26).

#### Scenario: Turno dentro del horario propio del profesional
- **GIVEN** `p2` tiene un tramo propio el lunes de 14:00 a 18:00
- **WHEN** se agenda un turno de `p2` en `s1` con `pr1` el lunes a las 14:00
- **THEN** el turno se crea de 14:00 a 14:30

#### Scenario: El horario del consultorio no aplica el día con horario propio
- **GIVEN** `p2` tiene un tramo propio el lunes de 14:00 a 18:00
- **WHEN** se agenda un turno de `p2` en `s1` con `pr1` el lunes a las 09:00
- **THEN** se rechaza con `RN-07`

#### Scenario: Día sin horario propio usa el del consultorio
- **GIVEN** `p2` tiene un tramo propio el lunes de 14:00 a 18:00
- **WHEN** se agenda un turno de `p2` en `s1` con `pr1` el martes 2026-11-24 a las 09:00
- **THEN** el turno se crea de 09:00 a 09:30

#### Scenario: El horario propio de otro profesional no cambia la agenda
- **GIVEN** `p2` tiene un tramo propio el lunes de 14:00 a 18:00
- **WHEN** se agenda un turno de `p1` en `s1` con `pr1` el lunes a las 09:00 y otro de `p1` en `s2` con `pr1` el lunes a las 14:00
- **THEN** el turno de las 09:00 se crea
- **AND** el de las 14:00 se rechaza con `RN-07`

#### Scenario: Turno que excede el último tramo propio del día
- **GIVEN** `p2` tiene un tramo propio el lunes de 14:00 a 18:00
- **WHEN** se agenda un turno de `p2` en `s1` con `pr3` el lunes a las 17:30
- **THEN** se rechaza con `RN-07`

#### Scenario: Turno que cruza el corte entre tramos propios
- **GIVEN** `p2` tiene tramos propios el lunes de 08:00 a 10:00 y de 16:00 a 18:00
- **WHEN** se agenda un turno de `p2` en `s1` con `pr1` el lunes a las 09:45
- **THEN** se rechaza con `RN-17`
