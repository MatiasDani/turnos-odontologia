# Spec Delta

## Purpose

Define qué puede hacer cada rol (administrador, recepción, odontólogo y paciente) sobre turnos, agenda, bloqueos, configuración, recordatorios y usuarios, y lo hace cumplir en cada caso de uso antes de sus reglas de negocio, para que nadie acceda a datos ni acciones fuera de su alcance (US-013, RN-D-02).

> Contexto común de los escenarios (seed ficticio de `knowledge-base/04_modelo_de_datos.md`): consultorio `c1` en `America/Argentina/Buenos_Aires`; profesionales `p1` y `p2`, sillones `s1` y `s2`, prestación `pr1` 30 min; horario lunes a viernes 09:00-13:00 y 15:00-19:00; pacientes `pa1` y `pa2`. Todas las horas son locales (`-03:00`); lunes = 2026-11-23, martes = 2026-11-24. `ahora` es el lunes 2026-11-23 a las 10:00. Turnos: `t-hoy` `confirmado` de `pa1` con `p1`, `s1`, `pr1` el lunes de 09:00 a 09:30; `t-base` `confirmado` de `pa1` con `p1`, `s1`, `pr1` el martes de 09:00 a 09:30; `t-otro` `confirmado` de `pa2` con `p2`, `s2`, `pr1` el martes de 11:00 a 11:30. Actores: el administrador, recepción, el **odontólogo de `p1`**, el **odontólogo de `p2`**, el **paciente de `t-base`** (opera con el token de `t-base`) y el **paciente de `t-otro`**. Un acceso denegado se informa con un error de acceso denegado que indica el rol y la acción, sin código RN.

## ADDED Requirements

### Requirement: Alta de turnos por rol
Dar un turno SHALL estar permitido al administrador y a recepción. El paciente solo MUST poder hacerlo por la reserva online. El odontólogo MUST recibir acceso denegado sin que se cree ningún turno.

#### Scenario: Recepción da un turno
- **WHEN** recepción agenda un turno de `pa2` con `p2`, `s2` y `pr1` el martes a las 15:00
- **THEN** el turno queda creado

#### Scenario: Odontólogo no da turnos
- **WHEN** el odontólogo de `p1` agenda un turno de `pa2` con `p1`, `s1` y `pr1` el martes a las 15:00
- **THEN** se rechaza con acceso denegado para el rol `odontologo`
- **AND** no se crea ningún turno

### Requirement: Cancelación y reprogramación por rol
Cancelar y reprogramar SHALL estar permitido al administrador y a recepción sobre cualquier turno, y al paciente solo sobre el turno de su token. El odontólogo MUST recibir acceso denegado, también sobre turnos de su propio profesional.

#### Scenario: Odontólogo no cancela un turno de su profesional
- **WHEN** el odontólogo de `p1` cancela `t-base`
- **THEN** se rechaza con acceso denegado para el rol `odontologo`
- **AND** `t-base` sigue `confirmado`

#### Scenario: Odontólogo no reprograma un turno de su profesional
- **WHEN** el odontólogo de `p1` reprograma `t-base` al martes a las 10:00
- **THEN** se rechaza con acceso denegado para el rol `odontologo`
- **AND** `t-base` sigue el martes a las 09:00

#### Scenario: Paciente cancela su propio turno
- **GIVEN** `ahora` es el lunes 2026-11-23 a las 08:00 (25 h antes de `t-base`, RN-08)
- **WHEN** el paciente de `t-base` cancela `t-base`
- **THEN** `t-base` queda `cancelado` con `canceladoPor: 'paciente'`

#### Scenario: Paciente no cancela un turno ajeno
- **WHEN** el paciente de `t-otro` cancela `t-base`
- **THEN** se rechaza con acceso denegado para el rol `paciente`
- **AND** `t-base` sigue `confirmado`

#### Scenario: Paciente no reprograma un turno ajeno
- **WHEN** el paciente de `t-otro` reprograma `t-base` al martes a las 10:00
- **THEN** se rechaza con acceso denegado para el rol `paciente`

### Requirement: Confirmación por rol
Confirmar un turno SHALL estar permitido al administrador, a recepción y al paciente sobre el turno de su token. El odontólogo MUST recibir acceso denegado.

#### Scenario: Recepción confirma un turno reservado
- **GIVEN** `t-base` en estado `reservado`
- **WHEN** recepción confirma `t-base`
- **THEN** `t-base` queda `confirmado`

#### Scenario: Odontólogo no confirma turnos
- **GIVEN** `t-base` en estado `reservado`
- **WHEN** el odontólogo de `p1` confirma `t-base`
- **THEN** se rechaza con acceso denegado para el rol `odontologo`
- **AND** `t-base` sigue `reservado`

#### Scenario: Paciente no confirma un turno ajeno
- **GIVEN** `t-base` en estado `reservado`
- **WHEN** el paciente de `t-otro` confirma `t-base`
- **THEN** se rechaza con acceso denegado para el rol `paciente`

### Requirement: Cierre del turno por rol
Marcar un turno como atendido o ausente SHALL estar permitido al administrador, a recepción y al odontólogo solo sobre los turnos de su profesional. El paciente MUST recibir acceso denegado.

#### Scenario: Odontólogo marca atendido su turno
- **WHEN** el odontólogo de `p1` marca atendido `t-hoy`
- **THEN** `t-hoy` queda `atendido`

#### Scenario: Odontólogo no cierra el turno de otro profesional
- **WHEN** el odontólogo de `p2` marca ausente `t-hoy`
- **THEN** se rechaza con acceso denegado para el rol `odontologo`
- **AND** `t-hoy` sigue `confirmado`

#### Scenario: Paciente no cierra turnos
- **WHEN** el paciente de `t-base` marca atendido `t-base`
- **THEN** se rechaza con acceso denegado para el rol `paciente`

### Requirement: Consulta de disponibilidad por rol
Consultar huecos disponibles SHALL estar permitido a todos los roles: el personal desde la agenda interna y el paciente por la ruta pública. La respuesta no incluye datos de pacientes.

#### Scenario: Odontólogo consulta disponibilidad
- **WHEN** el odontólogo de `p1` consulta la disponibilidad de `pr1` para el martes
- **THEN** recibe los huecos libres del martes

### Requirement: Bloqueos y agenda conservan sus permisos
La política única SHALL mantener los permisos ya definidos: administrador y recepción bloquean, liberan y ven la agenda de cualquier profesional; el odontólogo solo los de su profesional; el paciente MUST recibir acceso denegado.

#### Scenario: Odontólogo bloquea su propia agenda
- **WHEN** el odontólogo de `p1` bloquea `p1` el martes de 15:00 a 16:00
- **THEN** el bloqueo queda creado

#### Scenario: Odontólogo no bloquea otro profesional
- **WHEN** el odontólogo de `p1` bloquea `p2` el martes de 15:00 a 16:00
- **THEN** se rechaza con acceso denegado para el rol `odontologo`

#### Scenario: Odontólogo no ve la agenda de otro profesional
- **WHEN** el odontólogo de `p1` consulta la agenda del martes filtrada por `p2`
- **THEN** se rechaza con acceso denegado para el rol `odontologo`

#### Scenario: Paciente no ve la agenda
- **WHEN** el paciente de `t-base` consulta la agenda del martes
- **THEN** se rechaza con acceso denegado para el rol `paciente`

### Requirement: Recordatorios por rol
Listar los recordatorios `wa.me` pendientes y los recordatorios fallidos SHALL estar permitido al administrador y a recepción; marcar un recordatorio `wa.me` como enviado, solo a recepción. Los demás roles MUST recibir acceso denegado. El envío automático de e-mails no depende de ningún rol.

#### Scenario: Recepción lista los wa.me pendientes
- **WHEN** recepción lista los recordatorios `wa.me` pendientes
- **THEN** recibe la lista

#### Scenario: Odontólogo no lista recordatorios
- **WHEN** el odontólogo de `p1` lista los recordatorios fallidos
- **THEN** se rechaza con acceso denegado para el rol `odontologo`

#### Scenario: Administrador no marca enviado
- **GIVEN** un recordatorio `wa.me` pendiente de `t-base`
- **WHEN** el administrador lo marca como enviado
- **THEN** se rechaza con acceso denegado para el rol `administrador`
- **AND** el recordatorio sigue pendiente

### Requirement: El acceso se evalúa antes que las reglas de negocio
Si el rol no puede hacer la acción sobre ningún recurso, se MUST rechazar antes de leer datos. Si depende del recurso ("propio"), se MUST rechazar tras leerlo y antes de cualquier otra regla (`RN-10`, `RN-08`, `RN-24` y las del horario). Un turno inexistente para un rol habilitado sigue informándose como no encontrado.

#### Scenario: Rol sin la acción no revela si el turno existe
- **WHEN** el odontólogo de `p1` cancela el turno `t-inexistente`
- **THEN** se rechaza con acceso denegado para el rol `odontologo`, no con no encontrado

#### Scenario: El alcance propio prevalece sobre el estado
- **GIVEN** `t-hoy` en estado `cancelado`
- **WHEN** el odontólogo de `p2` marca atendido `t-hoy`
- **THEN** se rechaza con acceso denegado, no con `RN-10`

#### Scenario: El alcance propio prevalece sobre la anticipación
- **GIVEN** `ahora` es el martes 2026-11-24 a las 08:00
- **WHEN** el paciente de `t-otro` cancela `t-base`
- **THEN** se rechaza con acceso denegado, no con `RN-08`

#### Scenario: Rol habilitado y turno inexistente
- **WHEN** recepción cancela el turno `t-inexistente`
- **THEN** se rechaza con un error de no encontrado, sin código RN

### Requirement: Error de acceso denegado
El acceso denegado MUST indicar el rol y la acción intentada, MUST NOT tener código RN, MUST NOT modificar ningún dato y su mensaje MUST NOT incluir datos del recurso pedido (paciente, horario ni profesional).

#### Scenario: El rechazo no expone datos del turno
- **WHEN** el paciente de `t-otro` cancela `t-base`
- **THEN** el error indica el rol `paciente` y la acción de cancelar
- **AND** su mensaje no contiene `pa1`, `p1` ni el horario de `t-base`
