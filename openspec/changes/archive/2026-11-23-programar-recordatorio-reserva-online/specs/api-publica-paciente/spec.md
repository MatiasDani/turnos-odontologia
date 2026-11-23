# Spec Delta

## ADDED Requirements

### Requirement: Recordatorio de la reserva por HTTP
Una reserva aceptada por `POST /public/reservas` SHALL dejar programado el recordatorio de su turno con el sistema compuesto real, también cuando el DNI no existía (RN-25). Si programar el recordatorio falla, la respuesta MUST ser el error inesperado (500 `ERROR_INTERNO` con mensaje fijo) y MUST NOT incluir token ni detalle del error de origen (RN-22).

#### Scenario: Reserva por HTTP de un paciente nuevo deja su recordatorio pendiente
- **WHEN** se envía la reserva del escenario "Reserva exitosa por HTTP" (DNI `30000001`, que no existía, con e-mail `paciente1@ejemplo.test` y consentimiento)
- **THEN** responde 201 con un `token`
- **AND** el turno creado tiene un único recordatorio `email` `pendiente` con `programadoPara` el domingo a las 11:00
- **AND** el `token` de la respuesta resuelve a ese turno

#### Scenario: Falla al programar el recordatorio por HTTP
- **GIVEN** el registro de recordatorios falla al guardar con un error técnico
- **WHEN** se envía la reserva del escenario "Reserva exitosa por HTTP" (DNI `30000001`, que no existía, con e-mail `paciente1@ejemplo.test` y consentimiento)
- **THEN** responde 500 con código `ERROR_INTERNO` y mensaje fijo, sin `token` ni el mensaje del error técnico
- **AND** el turno del lunes 11:00 queda creado
