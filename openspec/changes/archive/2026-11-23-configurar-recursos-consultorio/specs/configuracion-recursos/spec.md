# Spec Delta

## Purpose

Permite que el administrador configure los recursos del consultorio (profesionales, sillones, prestaciones y tramos del horario de atención) con datos válidos, desactivándolos de forma lógica sin dejar turnos futuros huérfanos, para que la agenda refleje la realidad del consultorio (US-008).

> Contexto común de los escenarios (seed ficticio de `knowledge-base/04_modelo_de_datos.md`): consultorio `c1` en `America/Argentina/Buenos_Aires`; profesionales `p1` y `p2` (ambos realizan `pr1`..`pr4`), sillones `s1` y `s2`, todos activos; prestaciones `pr1` 30 min, `pr2` 45 min, `pr3` 60 min, `pr4` 90 min; tramos del consultorio lunes a viernes 09:00-13:00 y 15:00-19:00 (el del lunes a la mañana es `h1m` y el del lunes a la tarde `h1t`); ningún profesional tiene horario propio; pacientes `pa1`..`pa3`. Todas las horas son locales (`-03:00`); domingo = 2026-11-22, lunes = 2026-11-23, martes = 2026-11-24, sábado = 2026-11-28. Salvo que se indique otra cosa: el actor es el administrador, `ahora` es el lunes 2026-11-23 a las 10:00 y la agenda no tiene turnos. Un recurso inexistente se rechaza con un error de no encontrado que lo identifica, sin código RN; un dato inválido se rechaza con un error de configuración inválida que indica el campo, sin código RN; un rol no autorizado se rechaza con un error de acceso denegado que indica el rol, sin código RN.

## ADDED Requirements

### Requirement: Solo el administrador configura recursos
Dar de alta, modificar, desactivar o reactivar profesionales, sillones y prestaciones, y agregar, modificar o eliminar tramos de horario, SHALL estar permitido solo al rol `administrador`. Cualquier otro rol MUST rechazarse con un error de acceso denegado que indica el rol, sin modificar nada (US-008, DD-28).

#### Scenario: El administrador da de alta un sillón
- **WHEN** el administrador da de alta el sillón "Sillón 3" en `c1`
- **THEN** el sillón queda registrado y activo

#### Scenario: Recepción no puede dar de alta un sillón
- **WHEN** recepción da de alta el sillón "Sillón 3" en `c1`
- **THEN** se rechaza con acceso denegado para el rol `recepcion`
- **AND** `c1` sigue teniendo solo los sillones `s1` y `s2`

#### Scenario: Odontólogo no puede desactivar un profesional
- **WHEN** el odontólogo desactiva a `p2`
- **THEN** se rechaza con acceso denegado para el rol `odontologo`
- **AND** `p2` sigue activo

#### Scenario: Paciente no puede modificar una prestación
- **WHEN** un paciente cambia la duración de `pr1` a 40 minutos
- **THEN** se rechaza con acceso denegado para el rol `paciente`
- **AND** `pr1` sigue durando 30 minutos

#### Scenario: Recepción no puede agregar un tramo de horario
- **WHEN** recepción agrega un tramo del consultorio el sábado de 09:00 a 13:00
- **THEN** se rechaza con acceso denegado para el rol `recepcion`

### Requirement: Alta de profesional
Dar de alta un profesional SHALL registrarlo activo, con un id nuevo, en el consultorio indicado, con su nombre, apellido, matrícula opcional y las prestaciones que realiza (`prestacionIds`). El consultorio y cada prestación MUST existir; `prestacionIds` MUST no tener repetidos y puede estar vacío (RN-29, DD-27).

#### Scenario: Alta de un profesional con sus prestaciones
- **WHEN** el administrador da de alta en `c1` al profesional "Franco" "Ficticio", matrícula "0003", con las prestaciones `pr1` y `pr2`
- **THEN** el profesional queda registrado activo en `c1`, con un id distinto de `p1` y `p2`, y con las prestaciones `pr1` y `pr2`
- **AND** aparece entre los profesionales de `c1`

#### Scenario: Alta de un profesional sin matrícula ni prestaciones
- **WHEN** el administrador da de alta en `c1` al profesional "Franco" "Ficticio" sin matrícula y sin prestaciones
- **THEN** el profesional queda registrado activo, sin matrícula y con la lista de prestaciones vacía

#### Scenario: Nombre del profesional con espacios en los extremos
- **WHEN** el administrador da de alta al profesional "  Franco  " "  Ficticio "
- **THEN** el profesional queda registrado con nombre "Franco" y apellido "Ficticio"

#### Scenario: Alta de un profesional con una prestación inexistente
- **WHEN** el administrador da de alta un profesional con las prestaciones `pr1` y `pr9`
- **THEN** se rechaza con un error de no encontrado que identifica la prestación `pr9`
- **AND** no se registra ningún profesional

#### Scenario: Alta de un profesional con prestaciones repetidas
- **WHEN** el administrador da de alta un profesional con las prestaciones `pr1` y `pr1`
- **THEN** se rechaza como configuración inválida por el campo `prestacionIds`

#### Scenario: Alta de un profesional en un consultorio inexistente
- **WHEN** el administrador da de alta un profesional en el consultorio `c9`
- **THEN** se rechaza con un error de no encontrado que identifica el consultorio `c9`

### Requirement: Modificación de profesional
Modificar un profesional SHALL cambiar solo los datos informados entre nombre, apellido, matrícula y `prestacionIds`, con las mismas validaciones que el alta, y MUST conservar su id, su consultorio y su estado de actividad. Las prestaciones que deja de realizar dejan de ofrecerlo en la disponibilidad (RN-13, DD-27).

#### Scenario: Modificar las prestaciones de un profesional
- **WHEN** el administrador cambia las prestaciones de `p2` a solo `pr1`
- **THEN** `p2` queda con la prestación `pr1`, conserva su id, nombre, apellido, matrícula y consultorio, y sigue activo

#### Scenario: Profesional que deja una prestación no aparece en su disponibilidad
- **GIVEN** el administrador cambió las prestaciones de `p2` a solo `pr1`
- **WHEN** recepción consulta la disponibilidad de `pr2` el lunes
- **THEN** ningún combo ofrecido es de `p2`
- **AND** la disponibilidad de `pr1` el lunes sigue ofreciendo combos de `p2`

#### Scenario: Modificar un profesional inactivo no lo reactiva
- **GIVEN** `p2` está inactivo
- **WHEN** el administrador cambia el nombre de `p2` a "Bruno José"
- **THEN** `p2` queda con nombre "Bruno José" y sigue inactivo

#### Scenario: Modificar un profesional con apellido vacío
- **WHEN** el administrador cambia el apellido de `p2` a "   "
- **THEN** se rechaza como configuración inválida por el campo `apellido`
- **AND** `p2` conserva el apellido "Muestra"

#### Scenario: Modificar un profesional inexistente
- **WHEN** el administrador cambia el nombre del profesional `p9`
- **THEN** se rechaza con un error de no encontrado que identifica el profesional `p9`

### Requirement: Alta y modificación de sillón
Dar de alta un sillón SHALL registrarlo activo, con un id nuevo, en el consultorio indicado. Modificar un sillón SHALL cambiar solo su nombre y MUST conservar su id, consultorio y actividad. El nombre MUST ser válido (RN-29).

#### Scenario: Alta de un sillón
- **WHEN** el administrador da de alta el sillón "Sillón 3" en `c1`
- **THEN** el sillón queda registrado activo en `c1` con un id distinto de `s1` y `s2`
- **AND** aparece entre los sillones de `c1`

#### Scenario: Renombrar un sillón
- **WHEN** el administrador cambia el nombre de `s2` a "Box 2"
- **THEN** `s2` queda con nombre "Box 2", conserva su id y sigue activo

#### Scenario: Alta de un sillón con nombre vacío
- **WHEN** el administrador da de alta un sillón con nombre ""
- **THEN** se rechaza como configuración inválida por el campo `nombre`
- **AND** no se registra ningún sillón

#### Scenario: Nombre de sillón en el límite de longitud
- **WHEN** el administrador da de alta un sillón con un nombre de 80 caracteres y otro con un nombre de 81 caracteres
- **THEN** el de 80 caracteres queda registrado
- **AND** el de 81 caracteres se rechaza como configuración inválida por el campo `nombre`

#### Scenario: Modificar un sillón inexistente
- **WHEN** el administrador cambia el nombre del sillón `s9`
- **THEN** se rechaza con un error de no encontrado que identifica el sillón `s9`

### Requirement: Alta y modificación de prestación
Dar de alta una prestación SHALL registrarla activa, con un id nuevo, en el consultorio indicado, con su nombre y duración por defecto. Modificar una prestación SHALL cambiar solo su nombre o su duración, MUST conservar su id, consultorio y actividad, y MUST NOT alterar los turnos ya existentes (RN-06, RN-29).

#### Scenario: Alta de una prestación
- **WHEN** el administrador da de alta en `c1` la prestación "Blanqueamiento" de 60 minutos
- **THEN** la prestación queda registrada activa en `c1` con 60 minutos y un id distinto de `pr1`..`pr4`

#### Scenario: La nueva duración se usa en los turnos siguientes
- **GIVEN** el administrador cambió la duración de `pr1` a 40 minutos
- **WHEN** recepción agenda un turno de `pa1` con `p1`, `s1`, `pr1` el martes a las 09:00 sin informar duración
- **THEN** el turno se crea de 09:00 a 09:40

#### Scenario: Cambiar la duración no altera los turnos existentes
- **GIVEN** un turno `confirmado` de `pa1` con `p1`, `s1`, `pr1` el martes de 09:00 a 09:30
- **WHEN** el administrador cambia la duración de `pr1` a 40 minutos
- **THEN** el turno sigue de 09:00 a 09:30 con duración de 30 minutos

#### Scenario: Modificar una prestación inexistente
- **WHEN** el administrador cambia el nombre de la prestación `pr9`
- **THEN** se rechaza con un error de no encontrado que identifica la prestación `pr9`

### Requirement: Duración válida de la prestación
La duración de una prestación MUST ser un entero mayor que 0 y múltiplo de 5, tanto en el alta como en la modificación. Si no, se rechaza como configuración inválida por el campo `duracionMinutos`, sin registrar ni modificar nada (RN-29).

#### Scenario: Prestación de 5 minutos es válida
- **WHEN** el administrador da de alta la prestación "Control rápido" de 5 minutos
- **THEN** la prestación queda registrada con 5 minutos

#### Scenario: Duraciones de prestación inválidas
- **WHEN** el administrador da de alta prestaciones de 0, -15, 32 y 12,5 minutos
- **THEN** cada alta se rechaza como configuración inválida por el campo `duracionMinutos`
- **AND** no se registra ninguna prestación

#### Scenario: Modificar una prestación a una duración inválida
- **WHEN** el administrador cambia la duración de `pr1` a 32 minutos
- **THEN** se rechaza como configuración inválida por el campo `duracionMinutos`
- **AND** `pr1` sigue durando 30 minutos

### Requirement: Desactivación lógica de recursos
Desactivar un profesional, un sillón o una prestación SHALL marcarlo inactivo sin borrarlo: sigue existiendo y conserva sus datos. Desactivar un recurso ya inactivo MUST tener éxito sin cambios (DD-25).

#### Scenario: Desactivar un profesional sin turnos futuros
- **WHEN** el administrador desactiva a `p2`
- **THEN** `p2` queda inactivo
- **AND** `p2` se puede seguir obteniendo por su id con su nombre, apellido y prestaciones

#### Scenario: Desactivar un sillón sin turnos futuros
- **WHEN** el administrador desactiva `s2`
- **THEN** `s2` queda inactivo y sigue entre los sillones de `c1`

#### Scenario: Desactivar una prestación sin turnos futuros
- **WHEN** el administrador desactiva `pr4`
- **THEN** `pr4` queda inactiva y conserva su duración de 90 minutos

#### Scenario: Desactivar un recurso ya inactivo
- **GIVEN** `s2` está inactivo
- **WHEN** el administrador desactiva `s2`
- **THEN** la operación tiene éxito y `s2` sigue inactivo

#### Scenario: Desactivar un profesional inexistente
- **WHEN** el administrador desactiva al profesional `p9`
- **THEN** se rechaza con un error de no encontrado que identifica el profesional `p9`

### Requirement: Desactivación bloqueada por turnos activos futuros
Un profesional, sillón o prestación con turnos `reservado` o `confirmado` cuyo `inicio` es igual o posterior a `ahora` MUST NOT desactivarse: se rechaza con `RN-27` listando todos esos turnos ordenados por `inicio`, y el recurso sigue activo. Los turnos en otro estado o ya iniciados no lo impiden (RN-27).

#### Scenario: Desactivar un profesional con un turno confirmado futuro
- **GIVEN** un turno `confirmado` de `pa1` con `p1`, `s1`, `pr1` el martes de 09:00 a 09:30
- **WHEN** el administrador desactiva a `p1`
- **THEN** se rechaza con `RN-27` e informa ese turno como conflicto
- **AND** `p1` sigue activa

#### Scenario: Desactivar un sillón con un turno reservado futuro
- **GIVEN** un turno `reservado` de `pa2` con `p2`, `s2`, `pr1` el martes de 10:00 a 10:30
- **WHEN** el administrador desactiva `s2`
- **THEN** se rechaza con `RN-27` e informa ese turno como conflicto
- **AND** `s2` sigue activo

#### Scenario: Desactivar una prestación lista todos los turnos en conflicto
- **GIVEN** un turno `confirmado` de `pa1` con `p1`, `s1`, `pr2` el martes a las 11:00 y otro `reservado` de `pa2` con `p2`, `s2`, `pr2` el lunes a las 15:00
- **WHEN** el administrador desactiva `pr2`
- **THEN** se rechaza con `RN-27` e informa como conflicto los dos turnos, primero el del lunes a las 15:00 y después el del martes a las 11:00
- **AND** `pr2` sigue activa

#### Scenario: Un turno que empieza justo ahora impide desactivar
- **GIVEN** un turno `confirmado` de `pa1` con `p1`, `s1`, `pr1` el lunes de 10:00 a 10:30 y `ahora` el lunes a las 10:00
- **WHEN** el administrador desactiva a `p1`
- **THEN** se rechaza con `RN-27` e informa ese turno como conflicto

#### Scenario: Turnos no activos o ya iniciados no impiden desactivar
- **GIVEN** turnos de `p1` el martes a las 09:00 `cancelado`, el martes a las 10:00 `ausente`, el lunes a las 09:00 `atendido` y el lunes de 09:45 a 10:15 `confirmado`, con `ahora` el lunes a las 10:00
- **WHEN** el administrador desactiva a `p1`
- **THEN** `p1` queda inactiva

#### Scenario: Turnos de otro recurso no impiden desactivar
- **GIVEN** un turno `confirmado` de `pa1` con `p1`, `s1`, `pr1` el martes a las 09:00
- **WHEN** el administrador desactiva `s2`
- **THEN** `s2` queda inactivo

### Requirement: Reactivación de recursos
Reactivar un profesional, sillón o prestación inactivo SHALL marcarlo activo de nuevo, sin otra condición, y desde ese momento puede volver a usarse para dar turnos. Reactivar un recurso ya activo MUST tener éxito sin cambios (DD-25).

#### Scenario: Reactivar un profesional inactivo
- **GIVEN** `p2` está inactivo
- **WHEN** el administrador reactiva a `p2`
- **THEN** `p2` queda activo
- **AND** recepción puede agendar un turno de `pa1` con `p2`, `s1`, `pr1` el martes a las 09:00

#### Scenario: Reactivar un sillón y una prestación inactivos
- **GIVEN** `s2` y `pr4` están inactivos
- **WHEN** el administrador reactiva `s2` y `pr4`
- **THEN** `s2` queda activo y `pr4` queda activa

#### Scenario: Reactivar un recurso ya activo
- **WHEN** el administrador reactiva a `p1`
- **THEN** la operación tiene éxito y `p1` sigue activa

#### Scenario: Reactivar una prestación inexistente
- **WHEN** el administrador reactiva la prestación `pr9`
- **THEN** se rechaza con un error de no encontrado que identifica la prestación `pr9`

### Requirement: Un recurso desactivado no recibe turnos nuevos
Un profesional, sillón o prestación desactivado MUST NOT usarse en un turno nuevo ni ofrecerse en la disponibilidad: el alta se rechaza con `RN-18` y la consulta no lo incluye (RN-18, RN-13).

#### Scenario: Profesional desactivado no recibe turnos
- **GIVEN** el administrador desactivó a `p2`
- **WHEN** recepción agenda un turno de `pa1` con `p2`, `s1`, `pr1` el martes a las 09:00
- **THEN** se rechaza con `RN-18`

#### Scenario: Profesional desactivado no aparece en la disponibilidad
- **GIVEN** el administrador desactivó a `p2`
- **WHEN** recepción consulta la disponibilidad de `pr1` el martes
- **THEN** todos los combos ofrecidos son de `p1`

#### Scenario: Sillón desactivado no aparece en la disponibilidad
- **GIVEN** el administrador desactivó `s2`
- **WHEN** recepción consulta la disponibilidad de `pr1` el martes
- **THEN** todos los combos ofrecidos son en `s1`

#### Scenario: Prestación desactivada no se puede consultar ni agendar
- **GIVEN** el administrador desactivó `pr4`
- **WHEN** recepción consulta la disponibilidad de `pr4` el martes y agenda un turno con `pr4` el martes a las 09:00
- **THEN** ambas operaciones se rechazan con `RN-18`

### Requirement: Tramos del horario de atención
El administrador SHALL poder agregar tramos de horario del consultorio o de un profesional (`diaSemana`, `desde`, `hasta`), modificar el día y las horas de un tramo sin cambiar a quién pertenece, y eliminarlo. Los cambios rigen de inmediato para el alta, la disponibilidad y la reprogramación. El profesional del tramo MUST existir (RN-07, RN-28).

#### Scenario: Agregar un tramo del consultorio habilita la agenda ese día
- **GIVEN** el administrador agregó un tramo del consultorio el sábado de 09:00 a 13:00
- **WHEN** recepción agenda un turno de `pa1` con `p1`, `s1`, `pr1` el sábado a las 10:00
- **THEN** el turno se crea de 10:00 a 10:30

#### Scenario: Agregar un tramo propio de un profesional
- **WHEN** el administrador agrega un tramo de `p2` el lunes de 14:00 a 18:00
- **THEN** el tramo queda registrado para `p2` en `c1`, el lunes de 14:00 a 18:00, con un id nuevo

#### Scenario: Modificar las horas de un tramo
- **GIVEN** el administrador cambió el tramo `h1t` a 15:00-20:00
- **WHEN** recepción agenda un turno de `pa1` con `p1`, `s1`, `pr1` el lunes a las 19:30
- **THEN** el turno se crea de 19:30 a 20:00

#### Scenario: Eliminar un tramo deja sin horario esa franja
- **GIVEN** el administrador eliminó el tramo `h1t`
- **WHEN** recepción agenda un turno de `pa1` con `p1`, `s1`, `pr1` el lunes a las 15:00
- **THEN** se rechaza con `RN-07`

#### Scenario: Agregar un tramo de un profesional inexistente
- **WHEN** el administrador agrega un tramo del profesional `p9` el lunes de 14:00 a 18:00
- **THEN** se rechaza con un error de no encontrado que identifica el profesional `p9`

#### Scenario: Modificar o eliminar un tramo inexistente
- **WHEN** el administrador modifica el tramo `h9` y elimina el tramo `h9`
- **THEN** ambas operaciones se rechazan con un error de no encontrado que identifica el horario `h9`

### Requirement: Validez de los tramos de horario
Un tramo MUST tener `diaSemana` entero de 0 (domingo) a 6 (sábado), `desde` y `hasta` con formato `HH:mm` de 24 horas (de 00:00 a 23:59) y `desde` anterior a `hasta`. Si no, se rechaza como configuración inválida por el campo que falla, sin registrar ni modificar nada (RN-29).

#### Scenario: Día de la semana inválido
- **WHEN** el administrador agrega tramos del consultorio con `diaSemana` 7, -1 y 1,5
- **THEN** cada uno se rechaza como configuración inválida por el campo `diaSemana`

#### Scenario: Hora con formato inválido
- **WHEN** el administrador agrega tramos del consultorio el sábado con `desde` "9:00", "24:00", "12:60" y "0900"
- **THEN** cada uno se rechaza como configuración inválida por el campo `desde`

#### Scenario: Tramo vacío o invertido
- **WHEN** el administrador agrega un tramo del consultorio el sábado de 10:00 a 10:00 y otro de 13:00 a 09:00
- **THEN** ambos se rechazan como configuración inválida por el campo `hasta`

#### Scenario: Tramo de todo el día es válido
- **WHEN** el administrador agrega un tramo del consultorio el domingo de 00:00 a 23:59
- **THEN** el tramo queda registrado

#### Scenario: Modificar un tramo a horas inválidas
- **WHEN** el administrador cambia el tramo `h1m` a 13:00-09:00
- **THEN** se rechaza como configuración inválida por el campo `hasta`
- **AND** `h1m` sigue de 09:00 a 13:00

### Requirement: Sin tramos solapados en el mismo ámbito
Un tramo MUST NOT solaparse (intervalo semiabierto) con otro tramo del mismo día de la semana y del mismo ámbito: el del consultorio, o el del mismo profesional. Si se solapa, se rechaza como configuración inválida por el campo `tramo`, informando el tramo en conflicto. Tramos contiguos y tramos de ámbitos distintos son válidos (RN-29, RN-05).

#### Scenario: Tramo del consultorio que solapa otro del mismo día
- **WHEN** el administrador agrega un tramo del consultorio el lunes de 12:00 a 14:00
- **THEN** se rechaza como configuración inválida por el campo `tramo` e informa `h1m` como conflicto

#### Scenario: Tramo contiguo a otro del mismo día es válido
- **WHEN** el administrador agrega un tramo del consultorio el lunes de 13:00 a 15:00
- **THEN** el tramo queda registrado

#### Scenario: Tramo propio del profesional no choca con el del consultorio
- **WHEN** el administrador agrega un tramo de `p2` el lunes de 09:00 a 13:00
- **THEN** el tramo queda registrado

#### Scenario: Tramos propios del mismo profesional solapados
- **GIVEN** `p2` tiene un tramo propio el lunes de 14:00 a 18:00
- **WHEN** el administrador agrega un tramo de `p2` el lunes de 17:00 a 19:00
- **THEN** se rechaza como configuración inválida por el campo `tramo` e informa el tramo de 14:00 a 18:00 como conflicto

#### Scenario: Tramos de distintos profesionales no chocan
- **GIVEN** `p1` tiene un tramo propio el lunes de 14:00 a 18:00
- **WHEN** el administrador agrega un tramo de `p2` el lunes de 14:00 a 18:00
- **THEN** el tramo queda registrado

#### Scenario: Modificar un tramo no choca consigo mismo
- **WHEN** el administrador cambia el tramo `h1m` a 09:00-12:00
- **THEN** `h1m` queda de 09:00 a 12:00

#### Scenario: Mover un tramo sobre otro del mismo ámbito
- **WHEN** el administrador cambia el tramo `h1t` a 12:00-19:00
- **THEN** se rechaza como configuración inválida por el campo `tramo` e informa `h1m` como conflicto
- **AND** `h1t` sigue de 15:00 a 19:00

### Requirement: Orden de evaluación de los rechazos de configuración
Los rechazos de configuración SHALL evaluarse en orden fijo y se informa solo el primero: rol no autorizado, luego datos inválidos (en el orden nombre, apellido, matrícula, `prestacionIds`, `duracionMinutos`, `diaSemana`, `desde`, `hasta`), luego recurso o referencia inexistente, luego tramo solapado, luego `RN-27` (DD-27, DD-28).

#### Scenario: Rol no autorizado prevalece sobre datos inválidos
- **WHEN** recepción da de alta una prestación de 0 minutos
- **THEN** se rechaza con acceso denegado para el rol `recepcion`, no como configuración inválida

#### Scenario: Rol no autorizado prevalece sobre recurso inexistente
- **WHEN** recepción desactiva al profesional `p9`
- **THEN** se rechaza con acceso denegado para el rol `recepcion`, no con un error de no encontrado

#### Scenario: Datos inválidos prevalecen sobre referencias inexistentes
- **WHEN** el administrador da de alta un profesional con nombre vacío y la prestación `pr9`
- **THEN** se rechaza como configuración inválida por el campo `nombre`

#### Scenario: Se informa el primer campo inválido
- **WHEN** el administrador da de alta un profesional con nombre y apellido vacíos
- **THEN** se rechaza como configuración inválida por el campo `nombre`

#### Scenario: Recurso inexistente prevalece sobre turnos en conflicto
- **GIVEN** un turno `confirmado` de `pa1` con `p1`, `s1`, `pr1` el martes a las 09:00
- **WHEN** el administrador desactiva al sillón `s9`
- **THEN** se rechaza con un error de no encontrado que identifica el sillón `s9`

### Requirement: Agenda operativa con recursos configurados por casos de uso
Un consultorio cuyos profesionales, sillones, prestaciones y tramos se cargaron solo mediante la configuración SHALL poder agendar turnos y consultar disponibilidad con las mismas reglas que con el seed. Sin tramos de horario configurados no hay agenda (US-008, RN-07).

#### Scenario: Consultorio configurado desde cero
- **GIVEN** el consultorio `c1` sin profesionales, sillones, prestaciones ni tramos, y el administrador dio de alta la prestación "Consulta" de 30 minutos, un profesional que la realiza, un sillón y un tramo del consultorio el lunes de 09:00 a 13:00
- **WHEN** recepción agenda un turno de `pa1` con ese profesional, ese sillón y esa prestación el lunes 2026-11-30 a las 09:00 y consulta la disponibilidad de esa prestación ese día
- **THEN** el turno se crea `confirmado` de 09:00 a 09:30
- **AND** la disponibilidad ofrece desde 09:30 hasta 12:30 como último inicio y no ofrece 09:00

#### Scenario: Consultorio sin tramos configurados no tiene agenda
- **GIVEN** el consultorio `c1` con el profesional, el sillón y la prestación dados de alta por el administrador, pero sin tramos de horario
- **WHEN** recepción agenda un turno con ellos el lunes 2026-11-30 a las 09:00 y consulta la disponibilidad de esa prestación ese día
- **THEN** el alta se rechaza con `RN-07`
- **AND** la disponibilidad devuelve una lista vacía
