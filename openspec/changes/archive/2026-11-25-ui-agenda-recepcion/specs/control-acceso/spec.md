# Spec Delta

## ADDED Requirements

### Requirement: Pacientes por rol
Buscar pacientes y darlos de alta (acciones `paciente.buscar` y `paciente.crear`) SHALL estar permitido al administrador y a recepción. El odontólogo y el paciente MUST recibir acceso denegado.

#### Scenario: Recepción busca pacientes
- **WHEN** recepción busca `Prueba`
- **THEN** recibe `pa1`

#### Scenario: Odontólogo no da de alta pacientes
- **WHEN** el odontólogo de `p1` da de alta DNI `30000009`, `Paciente`, `Ficticio 9`, teléfono `11 0000 0009` y consentimiento
- **THEN** se rechaza con acceso denegado para el rol `odontologo`
