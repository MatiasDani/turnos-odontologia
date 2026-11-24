# api-publica-paciente Specification

## Purpose

Expone por HTTP, sin autenticación, las operaciones públicas del paciente (catálogo, disponibilidad, reserva y gestión del turno por token) con un contrato JSON estable, errores públicos sin filtrado de datos, navegación segura y logs sin token ni datos personales.

> Contexto común de los escenarios (seed ficticio de `knowledge-base/04_modelo_de_datos.md`): consultorio `c1` "Consultorio Odontológico Demo" en `America/Argentina/Buenos_Aires`, teléfono `+54 9 11 0000-0000`, e-mail `contacto@demo.test`, atiende de lunes a viernes 09:00-13:00 y 15:00-19:00; profesionales activos `p1` Ana Ejemplo y `p2` Bruno Muestra, ambos habilitados para todas las prestaciones; sillones `s1` y `s2`; prestaciones activas `pr1` "Consulta/control" (30 min), `pr2` "Limpieza" (45 min), `pr3` "Extracción simple" (60 min) y `pr4` "Endodoncia" (90 min). Horas locales (`-03:00`); domingo = 2026-11-22, lunes = 2026-11-23. Salvo indicación, `ahora` es el domingo a las 08:00 y el **turno base** es un turno `reservado` de un paciente ficticio con `p1`, `s1`, `pr1`, lunes 10:00-10:30, con token vigente `T`. Todo error tiene la forma `{ "error": { "codigo", "mensaje" } }` con un mensaje fijo por código, más `campos` solo con `DATOS_INVALIDOS` y `nuevaOferta` solo con `HORARIO_NO_DISPONIBLE`.

## Requirements

### Requirement: Catálogo público de prestaciones
`GET /public/prestaciones` SHALL responder 200 con el nombre y la zona horaria del consultorio, los días reservables `{desde, hasta}` (RN-30) y la lista de prestaciones activas con solo `id`, `nombre` y `duracionMinutos`, ordenadas por nombre. MUST NOT incluir prestaciones inactivas, sillones, profesionales ni datos de pacientes.

#### Scenario: Lista de prestaciones activas
- **GIVEN** `pr4` "Endodoncia" está inactiva
- **WHEN** se pide `GET /public/prestaciones`
- **THEN** responde 200 con el consultorio "Consultorio Odontológico Demo", su zona horaria y los días reservables del 2026-11-22 al 2026-12-22
- **AND** la lista contiene `pr1`, `pr2` y `pr3` con `id`, `nombre` y `duracionMinutos`, sin `pr4` ni ningún otro campo

### Requirement: Profesionales habilitados de una prestación
`GET /public/prestaciones/:prestacionId/profesionales` SHALL responder 200 con los profesionales activos habilitados para esa prestación, con solo `id`, `nombre` y `apellido` (DD-18, RN-19). Una prestación inexistente o inactiva MUST responder 422 `PRESTACION_NO_DISPONIBLE`.

#### Scenario: Profesionales activos y habilitados
- **GIVEN** `p2` está inactivo
- **WHEN** se pide la lista de profesionales de `pr1`
- **THEN** responde 200 con solo Ana Ejemplo (`id`, `nombre`, `apellido`)
- **AND** la respuesta no contiene matrícula, `prestacionIds`, sillones ni el campo `activo`

#### Scenario: Profesionales de una prestación inactiva
- **GIVEN** `pr4` está inactiva
- **WHEN** se pide la lista de profesionales de `pr4`
- **THEN** responde 422 con código `PRESTACION_NO_DISPONIBLE`

### Requirement: Disponibilidad pública por día
`GET /public/disponibilidad` SHALL recibir `prestacionId`, `fecha` (`AAAA-MM-DD` local del consultorio) y `profesionalId` opcional, y responder 200 con `fecha`, `zonaHoraria` y los horarios únicos `{inicio, fin}` libres ese día, ordenados, solo de profesionales activos habilitados (RN-13, RN-19). MUST NOT incluir sillón ni profesional por horario.

#### Scenario: Horarios libres del día sin datos internos
- **GIVEN** el turno base ocupa `p1` y `s1` el lunes 10:00-10:30
- **WHEN** se pide la disponibilidad de `pr1` para el lunes sin profesional
- **THEN** responde 200 y el horario 10:00-10:30 figura una sola vez (lo cubre `p2`)
- **AND** cada horario tiene solo `inicio` y `fin` en ISO 8601, sin `sillonId` ni `profesionalId`

#### Scenario: Disponibilidad filtrada por profesional
- **WHEN** se pide la disponibilidad de `pr1` para el lunes con `profesionalId` `p1`
- **THEN** el horario 10:00-10:30 no figura y el de 10:30-11:00 sí

#### Scenario: Día sin atención devuelve lista vacía
- **WHEN** se pide la disponibilidad de `pr1` para el sábado 2026-11-28
- **THEN** responde 200 con la lista de horarios vacía

#### Scenario: Parámetros de disponibilidad inválidos
- **WHEN** se pide la disponibilidad con `fecha` `2026-02-30` y sin `prestacionId`
- **THEN** responde 400 `DATOS_INVALIDOS` con `campos` `prestacionId` y `fecha`

### Requirement: Horizonte de reserva online de 30 días
La disponibilidad pública, la reserva y la reprogramación por token SHALL admitir solo horarios cuyo día local esté entre hoy y hoy + 30 días, ambos inclusive, según el `Reloj` del servidor y la zona del consultorio (RN-30). El límite MUST validarse en el servidor además de la interfaz.

#### Scenario: Último día del horizonte
- **WHEN** se pide la disponibilidad de `pr1` para el martes 2026-12-22
- **THEN** responde 200 con los horarios libres de ese día

#### Scenario: Disponibilidad fuera del horizonte
- **WHEN** se pide la disponibilidad de `pr1` para el miércoles 2026-12-23
- **THEN** responde 400 `DATOS_INVALIDOS` con `campos` `fecha`

#### Scenario: Reserva fuera del horizonte
- **WHEN** se envía una reserva válida de `pr1` con `inicio` miércoles 2026-12-23 09:00
- **THEN** responde 409 `HORARIO_NO_DISPONIBLE` con `nuevaOferta` vacía y no se crea turno ni paciente

### Requirement: Alta de reserva por HTTP
`POST /public/reservas` SHALL validar el cuerpo con la frontera de C-10 (claves desconocidas incluidas), delegar en la reserva online y responder 201 con `inicio`, `fin`, prestación, profesional asignado y el token de gestión (entrega única, DD-15). MUST NOT devolver `turnoId`, sillón ni id de paciente (DD-18).

#### Scenario: Reserva exitosa por HTTP
- **WHEN** se envía una reserva de `pr1` el lunes 11:00 con "Paciente Ficticio 1", DNI `30000001`, teléfono `1100000000` y consentimiento
- **THEN** responde 201 con inicio lunes 11:00, fin 11:30, prestación "Consulta/control", el profesional asignado y un `token`
- **AND** la respuesta no contiene `turnoId`, `sillonId` ni `pacienteId`

#### Scenario: Cuerpo de reserva con clave desconocida
- **WHEN** se envía una reserva válida que además trae `sillonId`
- **THEN** responde 400 `DATOS_INVALIDOS` con `campos` `sillonId` y no se crea turno

#### Scenario: Horario tomado entre la consulta y la reserva
- **GIVEN** `p1` y `p2` están ocupados el lunes 11:00-11:30
- **WHEN** se envía una reserva de `pr1` el lunes 11:00
- **THEN** responde 409 `HORARIO_NO_DISPONIBLE` con `nuevaOferta` de horarios `{inicio, fin}` del lunes

### Requirement: Códigos HTTP de los errores públicos
Cada código público SHALL mapearse a un estado HTTP fijo: `DATOS_INVALIDOS` 400; `ENLACE_INVALIDO` 404; `HORARIO_NO_DISPONIBLE` y `RESERVA_DUPLICADA` 409; `RESERVA_EN_PASADO`, `PRESTACION_NO_DISPONIBLE`, `PROFESIONAL_NO_DISPONIBLE`, `LIMITE_DE_TURNOS` y `CONTACTAR_CONSULTORIO` 422. Un error inesperado MUST responder 500 `ERROR_INTERNO` con mensaje fijo, sin detalle ni traza.

#### Scenario: Límite de turnos online por HTTP
- **GIVEN** el DNI `30000001` ya tiene 2 turnos online activos futuros
- **WHEN** envía otra reserva válida
- **THEN** responde 422 `LIMITE_DE_TURNOS` con el mensaje fijo del código

#### Scenario: Error inesperado sin detalles
- **GIVEN** un repositorio falla con un error técnico al reservar
- **WHEN** se envía una reserva válida
- **THEN** responde 500 con código `ERROR_INTERNO` y mensaje fijo
- **AND** el cuerpo no contiene el mensaje del error técnico, la traza ni datos del pedido

### Requirement: Consulta del turno por token
`GET /public/turnos/:token` con `Accept: application/json` SHALL responder 200 con `inicio`, `fin`, prestación, profesional, `asistenciaConfirmada`, `gestionOnline` (verdadero solo con `inicio - ahora >= 24 h`, RN-08), el contacto del consultorio y los días reservables (RN-30). MUST NOT incluir `turnoId`, token, sillón ni datos del paciente.

#### Scenario: Paciente consulta su turno por HTTP
- **WHEN** se pide `GET /public/turnos/T` como JSON con `ahora` domingo 08:00
- **THEN** responde 200 con inicio lunes 10:00, "Consulta/control", "Ana Ejemplo", `asistenciaConfirmada` falso y `gestionOnline` verdadero
- **AND** incluye teléfono y e-mail del consultorio y no contiene `turnoId`, `token`, `sillonId` ni `pacienteId`

#### Scenario: Turno con menos de 24 horas
- **WHEN** se pide el turno base como JSON con `ahora` domingo 10:01
- **THEN** responde 200 con `gestionOnline` falso

#### Scenario: Enlace inválido por HTTP
- **WHEN** se pide como JSON un token nunca emitido, uno rotado o el de un turno cancelado
- **THEN** cada pedido responde 404 `ENLACE_INVALIDO` con el mismo mensaje "El enlace no es válido o ya no está vigente."

### Requirement: Confirmación de asistencia por HTTP
`POST /public/turnos/:token/confirmar` SHALL confirmar la asistencia reutilizando la confirmación por enlace de C-12 (RN-14) y responder 200 con `asistenciaConfirmada` verdadero, `inicio` y `fin`. Confirmar un turno ya `confirmado` MUST responder 200 sin cambios. La confirmación no depende de la anticipación de 24 h.

#### Scenario: Confirmar asistencia por HTTP
- **WHEN** se envía `POST /public/turnos/T/confirmar`
- **THEN** responde 200 con `asistenciaConfirmada` verdadero y el turno base queda `confirmado`

#### Scenario: Confirmar dos veces el mismo turno
- **GIVEN** el turno base ya está `confirmado`
- **WHEN** se envía de nuevo la confirmación con `ahora` domingo 10:01
- **THEN** responde 200 con `asistenciaConfirmada` verdadero y el turno no cambia

### Requirement: Cancelación por HTTP
`POST /public/turnos/:token/cancelar` SHALL delegar en la cancelación por token de C-11 y responder 200 con el turno cancelado en forma pública. Con menos de 24 h MUST responder 422 `CONTACTAR_CONSULTORIO` sin cancelar.

#### Scenario: Cancelar por HTTP con anticipación
- **WHEN** se envía `POST /public/turnos/T/cancelar` con `ahora` domingo 08:00
- **THEN** responde 200 y el turno base queda `cancelado` con `canceladoPor` paciente
- **AND** un nuevo `GET /public/turnos/T` como JSON responde 404 `ENLACE_INVALIDO`

#### Scenario: Cancelar por HTTP con menos de 24 horas
- **WHEN** se envía la cancelación con `ahora` domingo 10:01
- **THEN** responde 422 `CONTACTAR_CONSULTORIO` y el turno sigue `reservado`

### Requirement: Reprogramación por HTTP
`GET /public/turnos/:token/disponibilidad?fecha` SHALL ofrecer solo horarios del día en que estén libres el mismo profesional y el mismo sillón del turno, dentro del horizonte (RN-30). `POST /public/turnos/:token/reprogramar` SHALL aceptar solo `{ inicio }` y delegar en la reprogramación por token de C-11, conservando profesional, sillón y token.

#### Scenario: Horarios para reprogramar del mismo profesional
- **GIVEN** `p2` tiene un turno el martes 09:00-09:30 en `s2` y `p1` está libre el martes
- **WHEN** se pide `GET /public/turnos/T/disponibilidad?fecha=2026-11-24`
- **THEN** responde 200 con los horarios del martes en que `p1` y `s1` están libres, incluido 09:00-09:30
- **AND** ningún horario incluye sillón ni profesional

#### Scenario: Reprogramar por HTTP a un horario libre
- **WHEN** se envía `POST /public/turnos/T/reprogramar` con `inicio` martes 09:00
- **THEN** responde 200 con inicio martes 09:00 y fin 09:30 con "Ana Ejemplo"
- **AND** el mismo token `T` sigue consultando el turno movido

#### Scenario: Reprogramar por HTTP a un horario ocupado
- **GIVEN** otro turno ocupa `p1` el martes 09:00-09:30
- **WHEN** se envía la reprogramación con `inicio` martes 09:00
- **THEN** responde 409 `HORARIO_NO_DISPONIBLE` y el turno base no cambia

#### Scenario: Cuerpo de reprogramación con claves no admitidas
- **WHEN** se envía la reprogramación con `inicio` válido y además `profesionalId` o `sillonId`
- **THEN** responde 400 `DATOS_INVALIDOS` con esos `campos` y el turno no cambia

### Requirement: Navegación segura de los enlaces
Una navegación `GET` a `/public/reservar`, `/public/turnos/:token` o `/public/turnos/:token/confirmar` sin `Accept: application/json` SHALL responder 200 con la página HTML correspondiente, con `Vary: Accept`, `Cache-Control: no-store` y `Referrer-Policy: no-referrer`. Ningún `GET` MUST modificar un turno, aun con token válido.

#### Scenario: Abrir el enlace de confirmación no confirma el turno
- **WHEN** un navegador pide `GET /public/turnos/T/confirmar` aceptando HTML
- **THEN** responde 200 con la página de gestión en HTML
- **AND** el turno base sigue `reservado` hasta que se envíe el `POST` de confirmación

#### Scenario: La página no incluye el token ni datos del turno
- **WHEN** un navegador pide `GET /public/turnos/T` aceptando HTML con un token válido o inválido
- **THEN** responde 200 con la misma página estática, que no contiene el token, datos del turno ni datos del paciente

### Requirement: Logs sin token ni datos personales
El servidor SHALL registrar cada pedido con método, ruta y estado, reemplazando el token de las rutas `/public/turnos/:token` por `[redactado]`. MUST NOT registrar cuerpos de pedidos o respuestas, query strings con datos del paciente, cabeceras de autenticación ni cookies (RN-21, RN-D-02).

#### Scenario: El token no aparece en los logs
- **WHEN** se piden la consulta, la confirmación, la cancelación y la página de gestión con el token `T`
- **THEN** ninguna línea de log contiene `T` y las rutas registradas muestran `/public/turnos/[redactado]`

#### Scenario: Los datos del paciente no aparecen en los logs
- **WHEN** se envía una reserva exitosa y otra rechazada por `DATOS_INVALIDOS`
- **THEN** ninguna línea de log contiene el DNI, el nombre, el teléfono, el e-mail ni el token devuelto

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
