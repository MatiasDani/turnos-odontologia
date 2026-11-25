# Spec Delta

## Purpose

Permite que el personal del consultorio encuentre a un paciente por DNI o por nombre y, si no existe, lo registre con los datos mínimos, para dar turnos desde recepción sin exponer más datos de los necesarios (Flujo 1, RN-D-02).

> Contexto común de los escenarios (seed ficticio de `knowledge-base/04_modelo_de_datos.md`): pacientes `pa1` Carla Prueba (DNI `00000001`, teléfono `+54 9 11 0000-0001`), `pa2` Diego Modelo (DNI `00000002`) y `pa3` Eva Simulada (DNI `00000003`). Salvo que se indique otra cosa, el actor es recepción. Un dato inválido se rechaza con un error que indica el campo; un rol no autorizado, con acceso denegado (C-09).

## ADDED Requirements

### Requirement: Búsqueda de pacientes
El personal SHALL poder buscar pacientes con un texto de 3 caracteres o más, sin tener en cuenta mayúsculas ni tildes: si son solo dígitos, por prefijo del DNI; si no, por coincidencia en nombre o apellido (RN-34). Devuelve hasta 10 resultados ordenados por apellido y nombre.

#### Scenario: Búsqueda por prefijo de DNI
- **WHEN** recepción busca `0000000`
- **THEN** recibe `pa1`, `pa2` y `pa3`

#### Scenario: Búsqueda por apellido sin tildes ni mayúsculas
- **WHEN** recepción busca `MODELO`
- **THEN** recibe solo `pa2`

#### Scenario: Búsqueda por parte del nombre
- **WHEN** recepción busca `carl`
- **THEN** recibe solo `pa1`

#### Scenario: Búsqueda sin resultados
- **WHEN** recepción busca `Inexistente`
- **THEN** recibe una lista vacía

### Requirement: Texto de búsqueda mínimo
Un texto de búsqueda de menos de 3 caracteres, sin contar los espacios de los extremos, MUST rechazarse como dato inválido en el campo `texto`, sin consultar pacientes (RN-34).

#### Scenario: Búsqueda de dos caracteres
- **WHEN** recepción busca ` ca `
- **THEN** se rechaza como dato inválido en el campo `texto`

### Requirement: Resultado de búsqueda con mínimo dato
Cada resultado SHALL incluir solo id, nombre, apellido, DNI y teléfono del paciente: nunca e-mail, consentimiento ni turnos (RN-34, RN-D-02).

#### Scenario: Campos del resultado
- **WHEN** recepción busca `Prueba`
- **THEN** el resultado de `pa1` tiene exactamente `id`, `nombre`, `apellido`, `dni` y `telefono`

### Requirement: Tope de resultados
La búsqueda SHALL devolver como máximo 10 pacientes; si hay más coincidencias, informa que la lista está recortada para que el personal afine la búsqueda.

#### Scenario: Más de 10 coincidencias
- **GIVEN** 12 pacientes ficticios cuyo apellido contiene `Ficticio`
- **WHEN** recepción busca `Ficticio`
- **THEN** recibe 10 pacientes y la indicación de que hay más resultados

### Requirement: Alta rápida de paciente
El personal SHALL poder registrar un paciente con DNI, nombre, apellido, teléfono, e-mail opcional y consentimiento de contacto, con las mismas validaciones y normalizaciones que la reserva online (DD-14, DD-17). El alta devuelve el paciente como un resultado de búsqueda.

#### Scenario: Alta de un paciente nuevo
- **WHEN** recepción da de alta DNI `30000009`, `Paciente`, `Ficticio 9`, teléfono `11 0000 0009` y consentimiento
- **THEN** el paciente queda registrado con DNI `30000009` y teléfono normalizado
- **AND** una búsqueda de `30000009` lo devuelve

#### Scenario: Alta con datos inválidos
- **WHEN** recepción da de alta DNI `123`, sin nombre y sin consentimiento
- **THEN** se rechaza como dato inválido indicando los campos `dni`, `nombre` y `consentimientoContacto`
- **AND** no se registra ningún paciente

### Requirement: DNI único en el alta rápida
Si el DNI ya pertenece a un paciente, el alta rápida MUST rechazarse con `RN-35` e informar ese paciente como resultado de búsqueda, sin modificar sus datos.

#### Scenario: Alta con un DNI existente
- **WHEN** recepción da de alta DNI `00000001`, `Otra`, `Persona`, teléfono `11 0000 0099` y consentimiento
- **THEN** se rechaza con `RN-35` e informa `pa1`
- **AND** `pa1` conserva nombre `Carla` y apellido `Prueba`

### Requirement: Pacientes solo para recepción y administrador
Buscar y dar de alta pacientes SHALL estar permitido a recepción y administrador. El odontólogo y el paciente MUST recibir acceso denegado antes de validar el texto o los datos.

#### Scenario: Odontólogo no busca pacientes
- **WHEN** el odontólogo de `p1` busca `Prueba`
- **THEN** se rechaza con acceso denegado para el rol `odontologo`

#### Scenario: Paciente no da de alta pacientes
- **WHEN** un paciente da de alta DNI `30000009`, `Paciente`, `Ficticio 9`, teléfono `11 0000 0009` y consentimiento
- **THEN** se rechaza con acceso denegado para el rol `paciente`
