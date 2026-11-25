# api-interna Specification

## Purpose

Define el contrato HTTP de las rutas `/interno/*` que usa la interfaz de recepción: qué expone, cómo exige la sesión del personal, cómo informa errores y qué datos nunca devuelve, sobre los casos de uso existentes del MVP.

> Contexto común de los escenarios (seed ficticio de `knowledge-base/04_modelo_de_datos.md`): consultorio `c1` en `America/Argentina/Buenos_Aires`; profesionales `p1` Ana Ejemplo y `p2` Bruno Muestra; sillones `s1` y `s2`; prestaciones `pr1` Consulta/control 30 min y `pr2` Limpieza 45 min; horario lunes a viernes 09:00-13:00 y 15:00-19:00; pacientes `pa1` Carla Prueba y `pa2` Diego Modelo. Usuarios de C-09: `u-rec` (recepción), `u-admin` (administrador) y `u-odo1` (odontólogo de `p1`). `ahora` es el lunes 2026-11-23 a las 10:00 (horas locales). Salvo que se indique otra cosa, cada pedido lleva `Authorization: Bearer` con una sesión vigente de `u-rec`, y la agenda tiene un turno `confirmado` `t-base` de `pa1` con `p1`, `s1` y `pr1` el martes de 09:00 a 09:30. Un error responde `{ error: { codigo, mensaje, campos? } }`.

## Requirements

### Requirement: Sesión obligatoria en las rutas internas
Toda ruta `/interno/*` MUST exigir una sesión vigente del personal (C-09): sin ella responde 401 `SESION_INVALIDA`; con un rol sin permiso para la acción, 403 `ACCESO_DENEGADO`. Ninguna respuesta interna se guarda en caché.

#### Scenario: Agenda sin sesión
- **WHEN** se pide `GET /interno/agenda?fecha=2026-11-24&vista=dia` sin cabecera `Authorization`
- **THEN** responde 401 con el código `SESION_INVALIDA`

#### Scenario: Respuestas internas sin caché
- **WHEN** recepción pide `GET /interno/catalogo`
- **THEN** responde 200 con `cache-control: no-store`

### Requirement: Agenda del día
`GET /interno/agenda?fecha&vista=dia&profesionalId?&sillonId?` SHALL responder la vista de la agenda de ese día (consulta-agenda), con los turnos y bloqueos y sus nombres, instantes en ISO 8601 UTC y los filtros aplicados.

#### Scenario: Agenda del martes
- **WHEN** recepción pide la agenda del martes 2026-11-24 en vista día
- **THEN** responde 200 con `t-base`, paciente `Carla Prueba`, profesional `Ana Ejemplo`, sillón `Sillón 1`, estado `confirmado` e inicio `2026-11-24T12:00:00.000Z`

#### Scenario: Fecha inválida
- **WHEN** recepción pide la agenda con `fecha=24/11/2026`
- **THEN** responde 400 `DATOS_INVALIDOS` con el campo `fecha`

### Requirement: Agenda de la semana de un recurso
`GET /interno/agenda?fecha&vista=semana` SHALL responder los 7 días de lunes a domingo de la semana de `fecha` para un solo recurso: recepción y administrador MUST informar `profesionalId` o `sillonId` (si no, 400 `DATOS_INVALIDOS` con el campo `recurso`); para el odontólogo el recurso es siempre su profesional (DD-39).

#### Scenario: Semana de un profesional
- **WHEN** recepción pide la semana de `fecha=2026-11-25` con `profesionalId=p1`
- **THEN** responde 200 con los días del 2026-11-23 al 2026-11-29 y `t-base` el martes

#### Scenario: Semana sin recurso
- **WHEN** recepción pide la semana de `fecha=2026-11-25` sin `profesionalId` ni `sillonId`
- **THEN** responde 400 `DATOS_INVALIDOS` con el campo `recurso`

#### Scenario: Semana del odontólogo sin filtro
- **GIVEN** una sesión vigente de `u-odo1`
- **WHEN** pide la semana de `fecha=2026-11-25` sin filtro
- **THEN** responde 200 con la semana de `p1`

### Requirement: Catálogo interno
`GET /interno/catalogo` SHALL responder el consultorio (nombre y zona horaria), los profesionales, sillones y prestaciones activos con sus ids y nombres (de las prestaciones, también la duración) y el usuario de la sesión con su rol.

#### Scenario: Catálogo para recepción
- **WHEN** recepción pide `GET /interno/catalogo`
- **THEN** responde 200 con `p1`, `p2`, `s1`, `s2`, `pr1` con 30 minutos y el rol `recepcion`

### Requirement: Disponibilidad interna
`GET /interno/disponibilidad?prestacionId&fecha&profesionalId?` SHALL responder los huecos libres de ese día, cada uno con inicio, fin y las combinaciones posibles de profesional y sillón (C-07).

#### Scenario: Huecos del martes con sillón
- **WHEN** recepción pide la disponibilidad de `pr1` para el 2026-11-24 con `profesionalId=p1`
- **THEN** responde 200 sin el hueco de las 09:00 en `s1` y con el hueco de las 09:30 con `p1` y `s1`

### Requirement: Pacientes por HTTP
`GET /interno/pacientes?texto` SHALL responder la búsqueda, `GET /interno/pacientes/:id` el resumen de un paciente (para el detalle del turno) y `POST /interno/pacientes` el alta rápida con 201 (pacientes-recepcion). Un DNI repetido responde 409 con `RN-35` y el paciente existente.

#### Scenario: Búsqueda por HTTP
- **WHEN** recepción pide `GET /interno/pacientes?texto=Prueba`
- **THEN** responde 200 con `pa1` con nombre, apellido, DNI y teléfono

#### Scenario: Resumen de un paciente por HTTP
- **WHEN** recepción pide `GET /interno/pacientes/pa1`
- **THEN** responde 200 con `pa1` con nombre, apellido, DNI y teléfono, sin e-mail

#### Scenario: Odontólogo no ve datos de contacto
- **GIVEN** una sesión vigente de `u-odo1`
- **WHEN** pide `GET /interno/pacientes/pa1`
- **THEN** responde 403 con el código `ACCESO_DENEGADO`

#### Scenario: Alta con DNI repetido por HTTP
- **WHEN** recepción envía `POST /interno/pacientes` con DNI `00000001`
- **THEN** responde 409 con el código `RN-35` y el paciente `pa1`

### Requirement: Turnos por HTTP
`POST /interno/turnos` SHALL dar un turno (201); `POST /interno/turnos/:id/cancelar`, `/confirmar`, `/atendido` y `/ausente` cambian su estado; `POST /interno/turnos/:id/reprogramar` con `{ inicio, profesionalId?, sillonId? }` lo mueve. Todos devuelven el turno con los datos de la vista de la agenda.

#### Scenario: Dar un turno por HTTP
- **WHEN** recepción envía `POST /interno/turnos` para `pa2` con `p2`, `s2` y `pr1` el martes a las 15:00
- **THEN** responde 201 con el turno `confirmado`, paciente `Diego Modelo` y fin a las 15:30

#### Scenario: Cancelar por HTTP
- **WHEN** recepción envía `POST /interno/turnos/t-base/cancelar`
- **THEN** responde 200 con `t-base` en estado `cancelado`

#### Scenario: Reprogramar por HTTP
- **WHEN** recepción envía `POST /interno/turnos/t-base/reprogramar` con inicio el martes a las 10:00
- **THEN** responde 200 con `t-base` el martes de 10:00 a 10:30

### Requirement: Reglas de negocio por HTTP
Un rechazo de una regla RN MUST responder 409 con el código `RN-XX`, un mensaje fijo en español para ese código y, cuando la regla informa un turno o bloqueo en conflicto, su inicio y fin. Un turno, paciente o recurso inexistente responde 404 `NO_ENCONTRADO`; un dato con forma inválida, 400 `DATOS_INVALIDOS` con los campos.

#### Scenario: Solapamiento de profesional por HTTP
- **WHEN** recepción envía `POST /interno/turnos` para `pa2` con `p1`, `s2` y `pr1` el martes a las 09:00
- **THEN** responde 409 con el código `RN-02`, un mensaje que dice que el profesional ya tiene un turno y el conflicto de 09:00 a 09:30

#### Scenario: Turno inexistente por HTTP
- **WHEN** recepción envía `POST /interno/turnos/t-inexistente/cancelar`
- **THEN** responde 404 con el código `NO_ENCONTRADO`

#### Scenario: Inicio sin formato por HTTP
- **WHEN** recepción envía `POST /interno/turnos` con `inicio` `mañana`
- **THEN** responde 400 `DATOS_INVALIDOS` con el campo `inicio`

### Requirement: Bloqueos por HTTP
`POST /interno/bloqueos` SHALL crear un bloqueo de profesional o de sillón (201) y `POST /interno/bloqueos/:id/liberar` liberarlo (200). Un bloqueo sobre turnos activos responde 409 con `RN-31` y los turnos en conflicto (C-06).

#### Scenario: Bloquear por HTTP
- **WHEN** recepción envía `POST /interno/bloqueos` para `p2` el martes de 15:00 a 16:00 con motivo `Capacitación`
- **THEN** responde 201 con el bloqueo de `Bruno Muestra`

#### Scenario: Bloqueo sobre un turno por HTTP
- **WHEN** recepción envía `POST /interno/bloqueos` para `p1` el martes de 09:00 a 10:00
- **THEN** responde 409 con el código `RN-31` y `t-base` en conflicto

### Requirement: Recordatorios wa.me por HTTP
`GET /interno/recordatorios/wa-me` SHALL responder los recordatorios `wa.me` pendientes con el turno, el paciente y el enlace, y `POST /interno/recordatorios/:id/enviado` marcarlo enviado (C-13). Los permisos son los de C-09: el administrador lista pero no marca.

#### Scenario: Marcar enviado por HTTP
- **GIVEN** un recordatorio `wa.me` pendiente de `t-base`
- **WHEN** recepción envía `POST /interno/recordatorios/<id>/enviado`
- **THEN** responde 200 con el recordatorio en estado `enviado`

#### Scenario: Administrador no marca enviado por HTTP
- **GIVEN** un recordatorio `wa.me` pendiente de `t-base` y una sesión de `u-admin`
- **WHEN** envía `POST /interno/recordatorios/<id>/enviado`
- **THEN** responde 403 con el código `ACCESO_DENEGADO`

### Requirement: Mínimo dato en las respuestas internas
Las respuestas internas MUST NOT incluir el e-mail ni el consentimiento de los pacientes, el hash de una clave, tokens de gestión de turnos ni datos de pacientes en los logs. El DNI y el teléfono solo aparecen en las rutas de pacientes y en los recordatorios `wa.me`.

#### Scenario: La agenda no expone datos de contacto
- **WHEN** recepción pide la agenda del martes en vista día
- **THEN** la respuesta no contiene `00000001` ni `0000-0001`

#### Scenario: Logs sin datos de pacientes
- **WHEN** recepción busca `Prueba` y da de alta DNI `30000009` con el log activo
- **THEN** el log no contiene `Prueba`, `30000009` ni el token de sesión
