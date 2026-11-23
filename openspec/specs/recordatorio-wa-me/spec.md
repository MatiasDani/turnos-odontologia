# recordatorio-wa-me Specification

## Purpose

Dar a la recepción un enlace `wa.me` listo para enviar y la marca manual del envío, como alternativa al e-mail cuando el paciente tiene teléfono y consintió el contacto, sin API de WhatsApp ni costo.

> Contexto común de los escenarios (seed ficticio de `knowledge-base/04_modelo_de_datos.md`): consultorio `c1` "Consultorio Odontológico Demo" en `America/Argentina/Buenos_Aires`; profesional `p1` Ana Ejemplo, sillón `s1`, prestación `pr1` "Consulta/control" de 30 min; paciente `pa1` Carla Prueba (tel `+54 9 11 0000-0001`, e-mail `carla.prueba@demo.test`, consentimiento), `pa2` Diego Modelo (tel `+54 9 11 0000-0002`, sin e-mail, consentimiento) y `pa3` Eva Simulada (tel `+54 9 11 0000-0003`, sin consentimiento). Todas las horas son locales (`-03:00`); domingo = 2026-11-22, lunes = 2026-11-23, martes = 2026-11-24. Salvo que se indique otra cosa: `ahora` es el domingo a las 08:00, la anticipación es de 24 h y el **turno base** es un turno `confirmado` de `pa1` con `p1`, `s1`, `pr1`, lunes 09:00-09:30, creado por recepción. Un **barrido** es una ejecución de `EnviarRecordatoriosPendientes` con el `ahora` indicado. Los números de teléfono son ficticios y se normalizan a dígitos: `+54 9 11 0000-0001` → `5491100000001`.

## Requirements

### Requirement: Generación del `wa.me` al programar el turno
Al dar de alta un turno, por recepción o por reserva online, o al reprogramarlo, el sistema SHALL programar también un recordatorio de canal `wa_me` en estado `pendiente` con `programadoPara = inicio - horasAntes` y un `enlaceWaMe` armado. Un turno MUST NOT tener más de un recordatorio `wa_me` `pendiente` y programar dos veces MUST conservar su `id` (RN-25, RN-26, DD-24). El alta y sus reglas no cambian.

#### Scenario: Alta de recepción programa el `wa.me`
- **WHEN** recepción crea el turno base
- **THEN** el turno tiene un recordatorio `wa_me` `pendiente` con `programadoPara` el domingo a las 09:00
- **AND** su `enlaceWaMe` empieza con `https://wa.me/5491100000001?text=`

#### Scenario: Reserva online programa el `wa.me`
- **WHEN** `pa1` reserva online `pr1` para el lunes a las 10:00
- **THEN** el turno creado tiene un recordatorio `wa_me` `pendiente` con `programadoPara` el domingo a las 10:00

#### Scenario: Anticipación configurada
- **WHEN** con una anticipación de 48 h recepción crea el turno base
- **THEN** el recordatorio `wa_me` queda `pendiente` con `programadoPara` el sábado 2026-11-21 a las 09:00

#### Scenario: Programar dos veces no duplica el `wa.me`
- **WHEN** se programa dos veces el turno base
- **THEN** el turno tiene un único recordatorio `wa_me` `pendiente` con el mismo `id`

#### Scenario: Turno movido reprograma el `wa.me`
- **WHEN** el turno base pasa a empezar el martes 2026-11-24 a las 10:00 y se vuelve a programar
- **THEN** su recordatorio `wa_me` `pendiente` tiene `programadoPara` el lunes a las 10:00 y un enlace con la nueva fecha

#### Scenario: Sin consentimiento no se genera el `wa.me`
- **WHEN** recepción crea un turno para `pa3` (sin consentimiento de contacto)
- **THEN** el turno no tiene recordatorio `wa_me`
- **AND** el turno se crea igual

#### Scenario: Teléfono inválido no se genera el `wa.me`
- **WHEN** se intenta programar el `wa.me` de un paciente con teléfono `+54 9 11 000` (9 dígitos)
- **THEN** no se guarda ningún recordatorio `wa_me`
- **AND** la regla no lanza

#### Scenario: Sin e-mail sí se genera el `wa.me`
- **WHEN** recepción crea un turno para `pa2` (consentimiento, teléfono válido, sin e-mail)
- **THEN** el turno tiene un recordatorio `wa_me` `pendiente`
- **AND** no tiene recordatorio `email`

#### Scenario: Alta rechazada no programa recordatorios
- **WHEN** recepción intenta crear un turno de `pa1` con `p1` el lunes a las 09:15, solapado con el turno base
- **THEN** el alta se rechaza con `RN-02`
- **AND** no se programa ningún recordatorio de ningún canal

### Requirement: URL `wa.me` codificada y mensaje mínimo
El enlace SHALL tener la forma `https://wa.me/<digitos>?text=<mensaje codificado>`, donde `<digitos>` es el teléfono normalizado y `<mensaje codificado>` es `encodeURIComponent` de un texto con fecha y hora local, prestación, profesional y consultorio. MUST NOT incluir el token de gestión, el enlace de gestión, DNI, e-mail ni datos clínicos (RN-14, RN-21, RN-26, RN-D-02).

#### Scenario: URL con teléfono normalizado y mensaje codificado
- **WHEN** se programa el `wa.me` del turno base
- **THEN** `enlaceWaMe` es `https://wa.me/5491100000001?text=` seguido del mensaje codificado
- **AND** no contiene el carácter `+` ni guiones en el segmento del teléfono

#### Scenario: Mensaje con fecha, hora, prestación, profesional y consultorio
- **WHEN** se decodifica el parámetro `text` del enlace del turno base
- **THEN** el mensaje contiene `lunes 23/11/2026 09:00`, `Consulta/control`, `Ana Ejemplo` y `Consultorio Odontológico Demo`

#### Scenario: Caracteres especiales se codifican
- **WHEN** se arma el enlace de una prestación cuyo nombre incluye acentos, espacios y `/`
- **THEN** el parámetro `text` no contiene espacios ni `/` sin codificar
- **AND** `decodeURIComponent(text)` devuelve el mensaje original

#### Scenario: Mensaje sin token ni enlace de gestión
- **WHEN** se inspecciona el mensaje codificado del turno base
- **THEN** no contiene `/public/turnos/` ni el token de gestión del turno

#### Scenario: Prefijo de otro país se rechaza
- **WHEN** se intenta programar el `wa.me` de un paciente con teléfono `+34 600 000 000`
- **THEN** no se guarda ningún recordatorio `wa_me`

#### Scenario: Teléfono con longitud fuera de rango se rechaza
- **WHEN** se intenta programar el `wa.me` de un paciente con teléfono `5491100000000000` (16 dígitos)
- **THEN** no se guarda ningún recordatorio `wa_me`

### Requirement: Lista de `wa.me` pendientes para recepción
La recepción SHALL poder listar todos los recordatorios `wa_me` en estado `pendiente`, ordenados por `programadoPara` ascendente, con `id`, `turnoId`, `enlaceWaMe` y `programadoPara`. MUST NOT incluir datos del paciente, del turno, del e-mail ni tokens (DD-18, RN-D-02, DD-24).

#### Scenario: Lista ordenada por `programadoPara`
- **GIVEN** un `wa_me` pendiente para el lunes 09:00 y otro para el lunes 10:00, guardados en orden inverso
- **WHEN** la recepción lista los pendientes
- **THEN** el primero corresponde a las 09:00 y el segundo a las 10:00

#### Scenario: Solo aparecen los `wa.me` pendientes
- **GIVEN** el turno base tiene un `email` y un `wa_me` pendientes, y otro turno tiene un `wa_me` `enviado`
- **WHEN** la recepción lista los pendientes
- **THEN** solo aparece el `wa_me` pendiente del turno base

#### Scenario: La lista no expone datos ajenos
- **WHEN** la recepción lista los pendientes
- **THEN** cada elemento tiene solo `id`, `turnoId`, `enlaceWaMe` y `programadoPara`
- **AND** no contiene `pacienteId`, `telefono`, `email`, `estado` ni token

#### Scenario: Sin pendientes devuelve lista vacía
- **WHEN** ningún turno tiene un `wa_me` pendiente
- **THEN** la lista es vacía

### Requirement: Marcar el `wa.me` como enviado
`MarcarRecordatorioEnviado({ recordatorioId, reloj })` SHALL cambiar un `wa_me` `pendiente` a `enviado` con `enviadoEn` igual a `reloj.ahora()`. Llamarlo sobre un `enviado` SHALL ser idempotente y no modificar el registro. Un id inexistente o un recordatorio en estado `cancelado` o `fallido` MUST rechazarse con un error tipado, sin escribir (RN-26, DD-24).

#### Scenario: Marca el pendiente como enviado
- **GIVEN** el turno base tiene su `wa_me` `pendiente`
- **WHEN** la recepción marca ese recordatorio como enviado con `ahora` domingo 12:00
- **THEN** el recordatorio queda `enviado` con `enviadoEn` domingo 12:00
- **AND** mantiene su `id`, `turnoId` y `enlaceWaMe`

#### Scenario: Segunda llamada no cambia el recordatorio
- **WHEN** se marca dos veces como enviado el mismo recordatorio `wa_me`
- **THEN** la segunda llamada no modifica `enviadoEn` ni lanza

#### Scenario: Id inexistente se rechaza
- **WHEN** se marca como enviado un id que no existe
- **THEN** se rechaza con `RECORDATORIO_NO_ENCONTRADO`
- **AND** no se crea ningún registro

#### Scenario: Recordatorio cancelado se rechaza
- **GIVEN** el `wa_me` del turno base está `cancelado`
- **WHEN** se marca como enviado
- **THEN** se rechaza con `ESTADO_NO_ENVIABLE` y sigue `cancelado`

#### Scenario: Recordatorio fallido se rechaza
- **GIVEN** un `wa_me` está `fallido` con `motivoFallo`
- **WHEN** se marca como enviado
- **THEN** se rechaza con `ESTADO_NO_ENVIABLE` y conserva su `motivoFallo`

#### Scenario: Marcar el `wa.me` no toca el e-mail
- **GIVEN** el turno base tiene un `email` y un `wa_me` `pendientes`
- **WHEN** se marca el `wa_me` como enviado
- **THEN** el recordatorio `email` sigue `pendiente`

### Requirement: Independencia de canales
Los canales `email` y `wa_me` SHALL convivir sin sobrescribirse: programar el e-mail no reemplaza el `wa_me` pendiente, el barrido de e-mail no envía los `wa_me` pendientes, y cancelar el turno anula los pendientes de ambos canales con el mismo contrato de C-12.

#### Scenario: Programar el e-mail no sobrescribe el `wa.me`
- **GIVEN** el turno base tiene su `wa_me` `pendiente` con un `enlaceWaMe` dado
- **WHEN** se programa solo el recordatorio `email`
- **THEN** el `wa_me` conserva su `id` y su `enlaceWaMe`

#### Scenario: El barrido de e-mail ignora los `wa.me`
- **GIVEN** el turno base tiene un `email` y un `wa_me` `pendientes` con `programadoPara` el domingo 09:00
- **WHEN** se ejecuta un barrido el domingo a las 09:00
- **THEN** se envía solo el e-mail y el `wa_me` sigue `pendiente`
- **AND** el notificador recibió un único mensaje

#### Scenario: Cancelar el turno anula ambos canales
- **GIVEN** el turno base tiene un `email` y un `wa_me` `pendientes`
- **WHEN** recepción cancela el turno
- **THEN** ambos recordatorios quedan `cancelado`

#### Scenario: Marcar enviado el `wa.me` no reenvía el e-mail
- **GIVEN** el turno base tiene un `email` y un `wa_me` `pendientes`
- **WHEN** se marca el `wa_me` como enviado
- **THEN** no se envía ningún mensaje por e-mail
