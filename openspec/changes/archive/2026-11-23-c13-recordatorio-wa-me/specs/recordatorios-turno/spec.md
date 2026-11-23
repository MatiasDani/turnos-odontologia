# Spec Delta

## Purpose

Acotar al canal `email` los dos puntos de C-12 que asumen que todo pendiente es un e-mail, para que la incorporación del canal `wa_me` (C-13) no sobrescriba su enlace ni lo envíe por `nodemailer`. El resto de la capacidad se conserva.

> Contexto común: el de `openspec/specs/recordatorios-turno/spec.md`. Los escenarios nuevos usan además un recordatorio `wa_me` `pendiente` con `enlaceWaMe`, creado por C-13.

## MODIFIED Requirements

### Requirement: Programación idempotente
Programar el recordatorio de un turno que ya tiene uno `pendiente` SHALL reemplazarlo con el `programadoPara` calculado desde el `inicio` actual del turno. Un turno MUST NOT tener más de un recordatorio `email` `pendiente` (RN-25). La búsqueda del pendiente a reemplazar SHALL considerar solo el canal `email`: un pendiente `wa_me` existente no se reemplaza, no se cuenta y conserva su `id` y su `enlaceWaMe` (C-13, RN-26).

#### Scenario: Programar dos veces no duplica
- **WHEN** se programa dos veces el recordatorio del turno base
- **THEN** el turno base tiene un único recordatorio `email` `pendiente` con `programadoPara` el domingo a las 09:00

#### Scenario: Turno movido reprograma el recordatorio
- **WHEN** el turno base pasa a empezar el martes 2026-11-24 a las 10:00 y se vuelve a programar su recordatorio
- **THEN** el turno base tiene un único recordatorio `email` `pendiente` con `programadoPara` el lunes a las 10:00

#### Scenario: Programar un turno con recordatorio ya enviado
- **WHEN** el recordatorio `email` del turno base ya fue `enviado` y se vuelve a programar
- **THEN** el recordatorio `enviado` no cambia
- **AND** se crea un recordatorio `email` `pendiente` con `programadoPara` el domingo a las 09:00

#### Scenario: Programar el e-mail conserva el `wa.me` pendiente
- **GIVEN** el turno base tiene un `wa_me` `pendiente` con `enlaceWaMe`
- **WHEN** se programa su recordatorio `email`
- **THEN** el `wa_me` conserva su `id`, su `enlaceWaMe` y su `programadoPara`
- **AND** el turno tiene un `email` y un `wa_me` `pendientes`

### Requirement: Envío de los recordatorios vencidos
Un barrido SHALL enviar cada recordatorio `pendiente` de canal `email` con `programadoPara <= ahora` cuyo turno siga activo y no haya empezado, y dejarlo `enviado` con `enviadoEn` igual a `ahora`. Los pendientes con `programadoPara` posterior a `ahora` MUST NOT enviarse; un recordatorio `enviado` MUST NOT reenviarse (RN-25). Los recordatorios `wa_me` MUST NOT enviarse por e-mail: los ve la recepción en su lista y marca el envío manual (C-13, RN-26).

#### Scenario: Antes de la hora programada no se envía
- **WHEN** se ejecuta un barrido el domingo a las 08:59
- **THEN** no se envía ningún mensaje
- **AND** el recordatorio del turno base sigue `pendiente`

#### Scenario: En la hora programada se envía
- **WHEN** se ejecuta un barrido el domingo a las 09:00
- **THEN** se envía un mensaje a `carla.prueba@demo.test`
- **AND** el recordatorio queda `enviado` con `enviadoEn` el domingo a las 09:00

#### Scenario: Turno con menos anticipación sale en el primer barrido
- **WHEN** con `ahora` el domingo a las 10:00 recepción crea un turno de `pa1` el lunes a las 09:30 y se ejecuta un barrido a las 10:00
- **THEN** se envía el recordatorio `email` de ese turno

#### Scenario: Un recordatorio enviado no se reenvía
- **WHEN** se ejecuta un barrido el domingo a las 09:00 y otro a las 12:00
- **THEN** el segundo barrido no envía ningún mensaje

#### Scenario: El barrido no envía los `wa.me`
- **GIVEN** el turno base tiene un `email` y un `wa_me` `pendientes` con `programadoPara` el domingo 09:00
- **WHEN** se ejecuta un barrido el domingo a las 09:00
- **THEN** se envía solo el mensaje de e-mail
- **AND** el `wa_me` sigue `pendiente` con su `enlaceWaMe` intacto
