# Spec Delta

## ADDED Requirements

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
