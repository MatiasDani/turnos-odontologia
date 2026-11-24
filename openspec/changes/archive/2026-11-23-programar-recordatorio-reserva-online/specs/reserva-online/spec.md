# Spec Delta

## ADDED Requirements

### Requirement: Recordatorio programado al reservar
Cuando la reserva online crea el turno, SHALL programar sus recordatorios con las reglas de `recordatorios-turno` y `recordatorio-wa-me` (RN-25, RN-26), tanto para un paciente nuevo como para uno existente. La programación MUST ocurrir con el paciente ya guardado y antes de emitir el token. Una reserva rechazada MUST NOT programar recordatorios. La falta de e-mail o de consentimiento no rechaza la reserva.

#### Scenario: Reserva de un paciente nuevo programa el recordatorio
- **WHEN** se reserva el pedido base
- **THEN** la reserva responde con el `turnoId` y un token de gestión
- **AND** el turno creado tiene un único recordatorio `email` `pendiente` con `programadoPara` el domingo a las 09:00
- **AND** existe un paciente con DNI `00000004`

#### Scenario: Reserva de un paciente existente programa el recordatorio
- **GIVEN** `pa1` tiene el e-mail `carla.prueba@demo.test` y consentimiento de contacto
- **WHEN** se reserva el pedido base con DNI `00000001`
- **THEN** el turno queda vinculado a `pa1`
- **AND** el turno tiene un único recordatorio `email` `pendiente` con `programadoPara` el domingo a las 09:00

#### Scenario: Paciente nuevo sin e-mail reserva sin recordatorio por e-mail
- **WHEN** se reserva el pedido base sin `email`
- **THEN** la reserva responde con el `turnoId` y un token de gestión
- **AND** el turno creado no tiene recordatorio `email`

#### Scenario: Paciente existente sin consentimiento reserva sin recordatorios
- **GIVEN** `pa3` (DNI `00000003`) no dio consentimiento de contacto
- **WHEN** se reserva el pedido base con DNI `00000003`
- **THEN** la reserva responde con el `turnoId` y un token de gestión y el turno queda vinculado a `pa3`
- **AND** el turno no tiene recordatorios de ningún canal

#### Scenario: Reserva de un paciente nuevo programa también el `wa.me`
- **GIVEN** el recordatorio `wa.me` está habilitado
- **WHEN** se reserva el pedido base
- **THEN** el turno creado tiene un recordatorio `wa_me` `pendiente` con `programadoPara` el domingo a las 09:00 y un `enlaceWaMe` que empieza con `https://wa.me/5491100000004?text=`
- **AND** tiene un único recordatorio `email` `pendiente`

#### Scenario: Reserva rechazada no programa recordatorios ni deja paciente huérfano
- **GIVEN** `p1` y `p2` tienen turnos activos el lunes de 09:00 a 10:00 en `s1` y `s2`
- **WHEN** se reserva el pedido base
- **THEN** se rechaza con `HORARIO_NO_DISPONIBLE`
- **AND** no existe un paciente con DNI `00000004` y no se programó ningún recordatorio nuevo

### Requirement: Falla al programar el recordatorio de la reserva
Si programar los recordatorios falla después de crear el turno, la reserva SHALL rechazarse con ese error, que MUST NOT traducirse a un error público del conjunto cerrado (el turno sí existe). El turno creado MUST NOT deshacerse, el paciente nuevo queda guardado y MUST NOT emitirse token de gestión (DD-19, DD-21). La ruta HTTP lo informa como error inesperado (RN-22).

#### Scenario: Falla al programar no deshace la reserva
- **GIVEN** el registro de recordatorios falla al guardar
- **WHEN** se reserva el pedido base
- **THEN** la reserva se rechaza con el error del registro de recordatorios y no con un error público de la reserva
- **AND** existe un turno `reservado` con `origen: 'online'` el lunes de 09:00 a 09:45 vinculado al paciente con DNI `00000004`

#### Scenario: Falla al programar no emite token
- **GIVEN** el registro de recordatorios falla al guardar
- **WHEN** se reserva el pedido base
- **THEN** no existe ningún token de gestión del turno creado
