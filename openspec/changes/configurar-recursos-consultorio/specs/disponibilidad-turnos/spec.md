# Spec Delta

## ADDED Requirements

### Requirement: Horario propio del profesional en la disponibilidad
Los combos de un profesional MUST quedar dentro de su horario efectivo del día: sus tramos propios si tiene alguno ese día de la semana, o los del consultorio si no. Sus inicios candidatos SHALL alinearse al inicio de esos tramos con el paso de la consulta. El orden de los combos no cambia (RN-27, RN-13, DD-25).

#### Scenario: Huecos de un profesional con horario propio
- **GIVEN** `p2` tiene un tramo propio el lunes de 14:00 a 18:00
- **WHEN** se consulta la disponibilidad de `pr1` el lunes
- **THEN** los combos de `p2` empiezan entre 14:00 y 17:30, el primero 14:00-14:30 y el último 17:30-18:00
- **AND** los combos de `p1` siguen siendo los de 09:00 a 12:30 y de 15:00 a 18:30

#### Scenario: Inicios alineados al tramo propio del profesional
- **GIVEN** `p2` tiene un tramo propio el lunes de 14:10 a 15:00
- **WHEN** se consulta la disponibilidad de `pr1` el lunes con paso 15
- **THEN** los únicos horarios de `p2` son 14:10-14:40 y 14:25-14:55
- **AND** no se ofrece ningún combo de `p1` a las 14:10 ni a las 14:25

#### Scenario: Orden determinista con horarios propios
- **GIVEN** `p2` tiene un tramo propio el lunes de 14:00 a 18:00
- **WHEN** se consulta la disponibilidad de `pr1` el lunes
- **THEN** a las 14:00 los combos son `p2`/`s1`, `p2`/`s2` en ese orden
- **AND** a las 15:00 los combos son `p1`/`s1`, `p1`/`s2`, `p2`/`s1`, `p2`/`s2` en ese orden

#### Scenario: Día sin horario propio en la disponibilidad
- **GIVEN** `p2` tiene un tramo propio el lunes de 14:00 a 18:00
- **WHEN** se consulta la disponibilidad de `pr1` el martes 2026-11-24
- **THEN** se ofrecen 30 horarios con 4 combos cada uno, igual que sin horario propio
