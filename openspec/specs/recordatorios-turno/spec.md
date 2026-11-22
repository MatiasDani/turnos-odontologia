# recordatorios-turno Specification

## Purpose

Recuerda al paciente su turno por e-mail con anticipación y le permite confirmar su asistencia desde el enlace del mensaje, respetando el consentimiento de contacto y el mínimo dato, y dejando a la recepción la lista de los envíos fallidos.

> Contexto común de los escenarios (seed ficticio de `knowledge-base/04_modelo_de_datos.md`): consultorio `c1` "Consultorio Odontológico Demo" en `America/Argentina/Buenos_Aires`; profesional `p1` Ana Ejemplo, sillón `s1`, prestación `pr1` "Consulta/control" 30 min; horario lunes a viernes 09:00-13:00 y 15:00-19:00. Para esta capacidad el paciente `pa1` (Carla Prueba) tiene el e-mail ficticio `carla.prueba@demo.test` y consentimiento de contacto; `pa2` no tiene e-mail; `pa3` no dio consentimiento. Todas las horas son locales (`-03:00`); domingo = 2026-11-22, lunes = 2026-11-23. Salvo que se indique otra cosa: `ahora` es el domingo a las 08:00, la anticipación es de 24 h, la base pública de los enlaces es `http://localhost:3000` y el **turno base** es un turno `confirmado` de `pa1` con `p1`, `s1`, `pr1`, el lunes de 09:00 a 09:30, creado por recepción. Un **barrido** es una ejecución del envío de recordatorios pendientes con el `ahora` indicado.

## Requirements

### Requirement: Programación del recordatorio al dar de alta un turno
Al crearse un turno, por recepción o por la reserva online, el sistema SHALL programar un recordatorio por e-mail en estado `pendiente` con `programadoPara` igual al `inicio` del turno menos la anticipación configurada (24 h por defecto). El alta y sus reglas no cambian (RN-25, DD-21).

#### Scenario: Alta de recepción programa el recordatorio
- **WHEN** recepción crea el turno base
- **THEN** el turno tiene un único recordatorio `email` `pendiente` con `programadoPara` el domingo a las 09:00

#### Scenario: Reserva online programa el recordatorio
- **WHEN** `pa1` reserva online `pr1` para el lunes a las 10:00
- **THEN** el turno creado tiene un único recordatorio `email` `pendiente` con `programadoPara` el domingo a las 10:00

#### Scenario: Anticipación configurada
- **WHEN** con una anticipación de 48 h recepción crea el turno base
- **THEN** el recordatorio queda `pendiente` con `programadoPara` el sábado 2026-11-21 a las 09:00

#### Scenario: Alta rechazada no programa recordatorio
- **WHEN** recepción intenta crear un turno de `pa1` con `p1` el lunes a las 09:15, solapado con el turno base
- **THEN** el alta se rechaza con `RN-02`
- **AND** no se programa ningún recordatorio nuevo

### Requirement: Falla al programar no deshace el alta
Si programar el recordatorio falla después de crear el turno, el error SHALL informarse a quien dio el alta y el turno creado MUST NOT deshacerse (mismo criterio que la cancelación, DD-19, DD-21).

#### Scenario: Falla al programar con el turno ya creado
- **WHEN** el registro de recordatorios falla y recepción crea el turno base
- **THEN** el alta informa el error del registro de recordatorios
- **AND** el turno base existe en la agenda en estado `confirmado`

### Requirement: Programación idempotente
Programar el recordatorio de un turno que ya tiene uno `pendiente` SHALL reemplazarlo con el `programadoPara` calculado desde el `inicio` actual del turno. Un turno MUST NOT tener más de un recordatorio `email` `pendiente` (RN-25).

#### Scenario: Programar dos veces no duplica
- **WHEN** se programa dos veces el recordatorio del turno base
- **THEN** el turno base tiene un único recordatorio `pendiente` con `programadoPara` el domingo a las 09:00

#### Scenario: Turno movido reprograma el recordatorio
- **WHEN** el turno base pasa a empezar el martes 2026-11-24 a las 10:00 y se vuelve a programar su recordatorio
- **THEN** el turno base tiene un único recordatorio `pendiente` con `programadoPara` el lunes a las 10:00

#### Scenario: Programar un turno con recordatorio ya enviado
- **WHEN** el recordatorio del turno base ya fue `enviado` y se vuelve a programar
- **THEN** el recordatorio `enviado` no cambia
- **AND** se crea un recordatorio `pendiente` con `programadoPara` el domingo a las 09:00

### Requirement: Sin consentimiento o sin e-mail no hay recordatorio
El sistema MUST NOT programar un recordatorio por e-mail para un paciente que no dio consentimiento de contacto o que no tiene e-mail. El alta del turno no se ve afectada (RN-25, RN-D-02).

#### Scenario: Paciente sin consentimiento de contacto
- **WHEN** recepción crea un turno de `pa3` con `p1`, `s1`, `pr1` el lunes a las 10:00
- **THEN** el turno se crea `confirmado`
- **AND** no tiene ningún recordatorio

#### Scenario: Paciente sin e-mail
- **WHEN** recepción crea un turno de `pa2` con `p1`, `s1`, `pr1` el lunes a las 10:00
- **THEN** el turno se crea `confirmado`
- **AND** no tiene ningún recordatorio

### Requirement: La cancelación anula el recordatorio pendiente
Al cancelarse un turno, sus recordatorios `pendiente` SHALL pasar a `cancelado` y MUST NOT enviarse. Un recordatorio `enviado` o `fallido` no cambia (RN-25, DD-19).

#### Scenario: Cancelar el turno anula el pendiente
- **WHEN** recepción cancela el turno base
- **THEN** su recordatorio queda `cancelado`
- **AND** un barrido el domingo a las 09:00 no envía ningún mensaje

#### Scenario: Cancelar no cambia un recordatorio ya enviado
- **WHEN** el recordatorio del turno base ya fue `enviado` y recepción cancela el turno
- **THEN** el recordatorio sigue `enviado`

### Requirement: Envío de los recordatorios vencidos
Un barrido SHALL enviar cada recordatorio `pendiente` con `programadoPara <= ahora` cuyo turno siga activo y no haya empezado, y dejarlo `enviado` con `enviadoEn` igual a `ahora`. Los pendientes con `programadoPara` posterior a `ahora` MUST NOT enviarse; un recordatorio `enviado` MUST NOT reenviarse (RN-25).

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
- **THEN** se envía el recordatorio de ese turno

#### Scenario: Un recordatorio enviado no se reenvía
- **WHEN** se ejecuta un barrido el domingo a las 09:00 y otro a las 12:00
- **THEN** el segundo barrido no envía ningún mensaje

### Requirement: El barrido revalida el turno antes de enviar
Antes de enviar, el barrido SHALL comprobar el turno: si ya no está activo (cancelado, ausente o atendido) o si `ahora >= inicio`, el recordatorio pasa a `cancelado` sin enviarse. Así un pendiente que quedó sin anular nunca llega al paciente (RN-25, DD-21).

#### Scenario: Pendiente de un turno cancelado sin anular
- **WHEN** la anulación de recordatorios falla al cancelar el turno base y luego se ejecuta un barrido el domingo a las 09:00
- **THEN** no se envía ningún mensaje
- **AND** el recordatorio queda `cancelado`

#### Scenario: Turno ya iniciado
- **WHEN** el recordatorio del turno base sigue `pendiente` y se ejecuta un barrido el lunes a las 09:00
- **THEN** no se envía ningún mensaje
- **AND** el recordatorio queda `cancelado`

### Requirement: Cada envío rota el token de gestión
Cada envío SHALL rotar el token de gestión del turno: el mensaje lleva un token nuevo y cualquier token anterior del turno, incluido el de la respuesta de la reserva, deja de resolver. Un turno sin token recibe uno en su primer envío (RN-21, DD-15).

#### Scenario: El token de la reserva deja de valer al enviar
- **WHEN** `pa1` reserva online el lunes a las 10:00 recibiendo el token T1 y un barrido el domingo a las 10:00 envía el recordatorio con el token T2
- **THEN** T1 no resuelve ningún turno
- **AND** T2 resuelve el turno reservado

#### Scenario: Turno interno recibe token en el primer envío
- **WHEN** un barrido el domingo a las 09:00 envía el recordatorio del turno base, que no tenía token
- **THEN** el token del enlace del mensaje resuelve el turno base

### Requirement: Contenido mínimo del mensaje
El mensaje SHALL ir al e-mail del paciente del turno y contener solo la fecha y hora local del turno, el nombre de la prestación, el nombre y apellido del profesional, el nombre del consultorio y los enlaces. MUST NOT incluir DNI, teléfono, datos clínicos ni datos de otros pacientes o turnos (RN-25, RN-D-02).

#### Scenario: Mensaje con los datos del turno
- **WHEN** un barrido el domingo a las 09:00 envía el recordatorio del turno base
- **THEN** el mensaje va a `carla.prueba@demo.test`
- **AND** contiene la fecha y hora local del lunes 23/11/2026 a las 09:00, "Consulta/control", "Ana Ejemplo" y "Consultorio Odontológico Demo"
- **AND** contiene un enlace de gestión que empieza con `http://localhost:3000`

#### Scenario: Mensaje sin datos sensibles
- **WHEN** un barrido el domingo a las 09:00 envía el recordatorio del turno base
- **THEN** el mensaje no contiene el DNI `00000001`, el teléfono de `pa1` ni el sillón

### Requirement: Enlace de confirmación según el estado del turno
El mensaje de un turno `reservado` SHALL incluir el enlace para confirmar la asistencia además del de gestión; el de un turno `confirmado` MUST incluir solo el de gestión (RN-14, DD-21).

#### Scenario: Turno reservado con enlace de confirmación
- **WHEN** `pa1` reserva online el lunes a las 10:00 y un barrido el domingo a las 10:00 envía su recordatorio
- **THEN** el mensaje incluye el enlace de confirmación y el de gestión

#### Scenario: Turno confirmado sin enlace de confirmación
- **WHEN** un barrido el domingo a las 09:00 envía el recordatorio del turno base
- **THEN** el mensaje incluye solo el enlace de gestión

### Requirement: Registro del envío fallido
Si el envío de un recordatorio falla, el recordatorio SHALL quedar `fallido` con un motivo que MUST NOT contener el token ni datos personales, y MUST NOT reintentarse en barridos posteriores. El fallo de un recordatorio no impide enviar los demás del mismo barrido (RN-25).

#### Scenario: Envío fallido queda registrado
- **WHEN** el servicio de e-mail rechaza el mensaje y se ejecuta un barrido el domingo a las 09:00
- **THEN** el recordatorio del turno base queda `fallido` con un motivo
- **AND** el motivo no contiene el token ni `carla.prueba@demo.test`

#### Scenario: Un fallido no se reintenta
- **WHEN** el recordatorio del turno base quedó `fallido` y se ejecuta otro barrido el domingo a las 12:00 con el servicio de e-mail disponible
- **THEN** no se envía ningún mensaje
- **AND** el recordatorio sigue `fallido`

#### Scenario: Un fallo no frena el resto del barrido
- **WHEN** hay dos recordatorios vencidos, el servicio de e-mail rechaza solo el primero y se ejecuta un barrido
- **THEN** el primero queda `fallido` y el segundo `enviado`

### Requirement: Lista de recordatorios fallidos para la recepción
El sistema SHALL listar los recordatorios `fallido` con su turno, su `programadoPara` y su motivo, para que la recepción contacte al paciente por otro medio (Flujo 6).

#### Scenario: Solo aparecen los fallidos
- **WHEN** hay un recordatorio `fallido`, uno `enviado` y uno `pendiente` y se consulta la lista de fallidos
- **THEN** la lista tiene un único elemento: el recordatorio `fallido`, con su turno y su motivo

### Requirement: Confirmación de asistencia desde el enlace
Confirmar desde el enlace con un token vigente SHALL pasar un turno `reservado` a `confirmado` y devolver solo el estado y el horario del turno. Si el turno ya está `confirmado`, SHALL devolver lo mismo sin modificarlo (RN-14, DD-20, DD-21).

#### Scenario: Paciente confirma un turno reservado
- **WHEN** el paciente confirma con el token del recordatorio de su turno `reservado` del lunes a las 10:00
- **THEN** el turno queda `confirmado`
- **AND** la respuesta tiene estado `confirmado`, inicio y fin del turno, sin datos del paciente ni sillón

#### Scenario: Confirmar dos veces no es un error
- **WHEN** el paciente confirma con el mismo token dos veces
- **THEN** ambas respuestas tienen estado `confirmado`
- **AND** el turno sigue `confirmado`

### Requirement: Enlace inválido sin revelar datos
Confirmar con un token inexistente, invalidado o vencido, o de un turno cancelado, atendido o ausente, MUST rechazarse con un único error público genérico, sin indicar el motivo, el estado del turno ni datos de pacientes o turnos (RN-15, RN-22).

#### Scenario: Token inexistente
- **WHEN** se confirma con un token que nunca se emitió
- **THEN** se rechaza con el error público genérico de enlace inválido

#### Scenario: Token reemplazado por la rotación
- **WHEN** se confirma con el token de la reserva después de que un barrido envió el recordatorio
- **THEN** se rechaza con el error público genérico de enlace inválido
- **AND** el turno sigue `reservado`

#### Scenario: Turno cancelado
- **WHEN** el turno del token fue cancelado y se confirma con ese token
- **THEN** se rechaza con el error público genérico de enlace inválido

#### Scenario: Turno ya atendido
- **WHEN** el turno del token está `atendido`, `ahora` es anterior a su `fin` y se confirma con ese token
- **THEN** se rechaza con el error público genérico de enlace inválido
- **AND** el error no menciona el estado `atendido`

### Requirement: El token nunca se guarda en el recordatorio
El registro del recordatorio MUST NOT contener el token de gestión, ni en claro ni su hash; el token en claro solo existe en el mensaje enviado (RN-21, RN-25).

#### Scenario: Recordatorio enviado sin token
- **WHEN** un barrido el domingo a las 09:00 envía el recordatorio del turno base
- **THEN** ningún campo del recordatorio guardado contiene el token del enlace ni su hash
