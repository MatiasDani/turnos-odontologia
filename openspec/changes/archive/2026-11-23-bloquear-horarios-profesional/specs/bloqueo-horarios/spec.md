# bloqueo-horarios Specification

## Purpose
Permite bloquear horarios de profesionales y de sillones para evitar la asignación de turnos (por licencias, vacaciones, mantenimiento o recesos), garantizando que no se puedan crear bloqueos que destruyan o solapen turnos activos preexistentes sin reprogramación previa (DD-06, RN-31), y permitiendo la posterior liberación de dichos bloqueos.

> Contexto común de los escenarios (seed ficticio de `knowledge-base/04_modelo_de_datos.md`): consultorio `c1` en `America/Argentina/Buenos_Aires`; profesionales `p1` (Dra. Ana) y `p2` (Dr. Bruno); sillones `s1` y `s2`; horarios de atención habituales. Fechas de referencia: lunes 2026-11-23, martes 2026-11-24.

## ADDED Requirements

### Requirement: Alta de bloqueos válidos
El sistema MUST permitir a recepción, administrador y al profesional involucrado registrar bloqueos de horario indicando un intervalo semiabierto `[inicio, fin)`, especificando `profesionalId`, `sillonId` o ambos.

#### Scenario: Bloqueo de profesional sin turnos
- **GIVEN** que el profesional `p1` no tiene turnos activos el lunes de 15:00 a 17:00
- **WHEN** recepción solicita un bloqueo para `p1` el lunes de 15:00 a 17:00 con motivo "Capacitación"
- **THEN** el bloqueo se crea satisfactoriamente con los datos informados

#### Scenario: Bloqueo de sillón sin turnos
- **GIVEN** que el sillón `s1` no tiene turnos activos el martes de 09:00 a 12:00
- **WHEN** administración solicita un bloqueo para `s1` el martes de 09:00 a 12:00 con motivo "Mantenimiento de turbina"
- **THEN** el bloqueo se crea y queda registrado para el sillón `s1`

#### Scenario: Bloqueo conjunto de profesional y sillón
- **GIVEN** que `p2` y `s2` están libres de turnos activos el lunes de 10:00 a 11:00
- **WHEN** se solicita un bloqueo indicando tanto `p2` como `s2` de 10:00 a 11:00
- **THEN** el bloqueo se crea afectando a ambos recursos

### Requirement: Conflicto con turnos activos preexistentes
El sistema MUST rechazar con el código `RN-31` la creación de un bloqueo si existe al menos un turno activo (`reservado` o `confirmado`) solapado en el profesional o en el sillón indicado, devolviendo la lista ordenada de turnos en conflicto (DD-06).

#### Scenario: Rechazo de bloqueo por turno activo del profesional
- **GIVEN** un turno confirmado del profesional `p1` el lunes de 10:00 a 10:45
- **WHEN** se intenta crear un bloqueo para `p1` el lunes de 10:30 a 12:00
- **THEN** la creación es rechazada con el código `RN-31` y se informa el turno en la lista de conflictos

#### Scenario: Rechazo de bloqueo por turno activo en el sillón
- **GIVEN** un turno reservado en el sillón `s1` el lunes de 11:00 a 11:30 con `p2`
- **WHEN** se intenta crear un bloqueo para el sillón `s1` el lunes de 10:00 a 12:00
- **THEN** la creación es rechazada con el código `RN-31` informando el turno del sillón `s1`

#### Scenario: Turnos inactivos no impiden la creación del bloqueo
- **GIVEN** un turno del profesional `p1` el lunes de 09:00 a 10:00 en estado `cancelado` y otro en estado `ausente`
- **WHEN** se solicita un bloqueo para `p1` el lunes de 09:00 a 10:00
- **THEN** el bloqueo se crea con éxito al no haber turnos activos en conflicto

### Requirement: Intervalos contiguos válidos
Los intervalos de bloqueo y turnos son semiabiertos `[inicio, fin)` (RN-05). Un bloqueo contiguo a un turno activo MUST permitirse sin conflicto.

#### Scenario: Bloqueo que inicia justo al finalizar un turno activo
- **GIVEN** un turno activo del profesional `p1` el lunes de 09:00 a 10:00
- **WHEN** se solicita un bloqueo para `p1` el lunes de 10:00 a 11:00
- **THEN** el bloqueo se crea exitosamente por ser contiguo según RN-05

#### Scenario: Bloqueo que finaliza justo al iniciar un turno activo
- **GIVEN** un turno activo del profesional `p1` el lunes de 11:00 a 12:00
- **WHEN** se solicita un bloqueo para `p1` el lunes de 10:00 a 11:00
- **THEN** el bloqueo se crea exitosamente

### Requirement: Control de acceso por rol
El sistema MUST aplicar las reglas de autorización del dominio: solo personal autorizado puede gestionar bloqueos.

#### Scenario: Odontólogo bloquea su propia agenda
- **GIVEN** un actor odontólogo con `profesionalId: 'p1'`
- **WHEN** solicita un bloqueo para `profesionalId: 'p1'` en un horario libre
- **THEN** la operación es autorizada y el bloqueo se crea

#### Scenario: Odontólogo no puede bloquear la agenda de otro profesional
- **GIVEN** un actor odontólogo con `profesionalId: 'p1'`
- **WHEN** intenta crear un bloqueo para `profesionalId: 'p2'`
- **THEN** se rechaza la solicitud con error de acceso denegado

#### Scenario: Paciente no puede bloquear horarios
- **GIVEN** un actor con rol `paciente`
- **WHEN** intenta crear cualquier bloqueo de horario
- **THEN** se rechaza con error de acceso denegado

### Requirement: Liberación de bloqueos
El sistema MUST permitir eliminar un bloqueo existente mediante su identificador, liberando los horarios correspondientes.

#### Scenario: Liberación exitosa de bloqueo existente
- **GIVEN** un bloqueo registrado con id `b-1` para el profesional `p1`
- **WHEN** el administrador o el profesional `p1` solicita liberar el bloqueo `b-1`
- **THEN** el bloqueo se elimina y deja de figurar en el repositorio

#### Scenario: Liberar bloqueo inexistente lanza error
- **WHEN** se solicita liberar un bloqueo con id `inexistente`
- **THEN** se rechaza la operación con error de recurso no encontrado

#### Scenario: Odontólogo no puede liberar bloqueo ajeno
- **GIVEN** un bloqueo registrado con id `b-2` para el profesional `p2`
- **WHEN** el odontólogo `p1` intenta liberar el bloqueo `b-2`
- **THEN** se rechaza con error de acceso denegado
