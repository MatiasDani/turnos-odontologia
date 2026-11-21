# Spec Delta

## Purpose

Permite dar turnos en la agenda de un consultorio odontológico ocupando a la vez un profesional y un sillón, garantizando que nunca existan dos turnos activos solapados por recurso, dentro del horario de atención y fuera de los bloqueos.

> Contexto común de los escenarios (seed ficticio de `knowledge-base/04_modelo_de_datos.md`): consultorio `c1` en `America/Argentina/Buenos_Aires`; profesionales `p1` y `p2`, sillones `s1` y `s2`, todos activos; prestaciones `pr1` 30 min, `pr2` 45 min, `pr3` 60 min, `pr4` 90 min; horario lunes a viernes 09:00-13:00 y 15:00-19:00 (hora local); bloqueo de `p1` el miércoles 2026-11-25 de 15:00 a 17:00; pacientes `pa1`..`pa3`. Todas las horas son locales (`-03:00`). Lunes = 2026-11-23, miércoles = 2026-11-25, sábado = 2026-11-28. El actor es recepción salvo que se indique otro.

## ADDED Requirements

### Requirement: Ocupación conjunta de profesional y sillón
Todo turno SHALL ocupar a la vez un profesional y un sillón durante el intervalo semiabierto `[inicio, fin)` (RN-01, RN-05). Dos turnos con distinto profesional y distinto sillón MUST poder coexistir en el mismo horario.

#### Scenario: Distinto profesional y sillón en el mismo horario
- **GIVEN** un turno activo de `p1` en `s1` el lunes de 09:00 a 10:00
- **WHEN** se agenda un turno de `p2` en `s2` el lunes de 09:00 a 10:00
- **THEN** el turno se crea y ambos turnos quedan registrados

#### Scenario: El turno creado registra profesional, sillón y paciente
- **WHEN** se agenda `pa1` con `p1` en `s1`, prestación `pr2`, el lunes a las 09:00
- **THEN** el turno devuelto tiene `p1`, `s1`, `pr2`, `pa1`, inicio 09:00 y fin 09:45

### Requirement: Sin solapamiento por profesional
El sistema MUST rechazar con el código `RN-02` un turno cuyo intervalo se solape con un turno activo del mismo profesional, sin importar el sillón. Dos intervalos `[a1, a2)` y `[b1, b2)` se solapan si y solo si `a1 < b2` y `b1 < a2`; los turnos contiguos son válidos (RN-02, RN-05).

#### Scenario: Contiguos del mismo profesional son válidos
- **GIVEN** un turno activo A de `p1` en `s1` el lunes de 09:00 a 09:45
- **WHEN** se agenda un turno B de `p1` en `s1` el lunes de 09:45 a 10:15
- **THEN** el turno B se crea

#### Scenario: Solapamiento parcial por profesional
- **GIVEN** un turno activo A de `p1` en `s1` el lunes de 09:00 a 09:45
- **WHEN** se agenda un turno de `p1` en `s2` el lunes de 09:44 a 10:14
- **THEN** se rechaza con `RN-02` e informa A como turno en conflicto

#### Scenario: Contención total por profesional
- **GIVEN** un turno activo A de `p1` en `s1` el lunes de 09:00 a 10:30
- **WHEN** se agenda un turno de `p1` en `s2` el lunes de 09:30 a 10:00
- **THEN** se rechaza con `RN-02`

#### Scenario: Mismo profesional en otro sillón
- **GIVEN** un turno activo de `p1` en `s1` el lunes de 09:00 a 10:00
- **WHEN** se agenda un turno de `p1` en `s2` el lunes de 09:00 a 10:00
- **THEN** se rechaza con `RN-02`

### Requirement: Sin solapamiento por sillón
El sistema MUST rechazar con el código `RN-03` un turno cuyo intervalo se solape con un turno activo en el mismo sillón, aunque sea de otro profesional (RN-03, RN-05).

#### Scenario: Mismo sillón con otro profesional
- **GIVEN** un turno activo A de `p1` en `s1` el lunes de 09:00 a 10:00
- **WHEN** se agenda un turno de `p2` en `s1` el lunes de 09:30 a 10:00
- **THEN** se rechaza con `RN-03` e informa A como turno en conflicto

#### Scenario: Contiguos en el mismo sillón son válidos
- **GIVEN** un turno activo de `p1` en `s1` el lunes de 09:00 a 10:00
- **WHEN** se agenda un turno de `p2` en `s1` el lunes de 10:00 a 10:30
- **THEN** el turno se crea

### Requirement: Solo los turnos activos ocupan recursos
Solo los turnos en estado `reservado`, `confirmado` o `atendido` SHALL ocupar profesional y sillón. Los turnos `cancelado` o `ausente` MUST ignorarse en la verificación de solapamiento (DD-05).

#### Scenario: Turno cancelado no ocupa
- **GIVEN** un turno `cancelado` de `p1` en `s1` el lunes de 09:00 a 10:00
- **WHEN** se agenda un turno de `p1` en `s1` el lunes de 09:00 a 10:00
- **THEN** el turno se crea

#### Scenario: Turno ausente no ocupa
- **GIVEN** un turno `ausente` de `p1` en `s1` el lunes de 09:00 a 10:00
- **WHEN** se agenda un turno de `p2` en `s1` el lunes de 09:30 a 10:00
- **THEN** el turno se crea

#### Scenario: Turno atendido sigue ocupando
- **GIVEN** un turno `atendido` de `p1` en `s1` el lunes de 09:00 a 10:00
- **WHEN** se agenda un turno de `p1` en `s2` el lunes de 09:30 a 10:00
- **THEN** se rechaza con `RN-02`

### Requirement: Sin sobreturnos para ningún rol
Ningún rol, incluido el administrador, SHALL poder crear un turno solapado: la entrada del alta MUST NOT ofrecer ninguna opción para forzar un solapamiento y el rol no altera el resultado de RN-02 ni RN-03 (RN-04).

#### Scenario: Administrador intenta forzar un solapamiento
- **GIVEN** un turno activo de `p1` en `s1` el lunes de 09:00 a 10:00
- **WHEN** el administrador agenda un turno de `p1` en `s1` el lunes de 09:30 a 10:30
- **THEN** se rechaza con `RN-02`, igual que para recepción

#### Scenario: La entrada no admite opción de forzar
- **WHEN** se inspecciona el contrato de entrada del alta de turnos
- **THEN** no existe ningún campo que permita forzar u omitir la validación de solapamiento

### Requirement: Duración efectiva del turno
El `fin` del turno SHALL ser `inicio + duración efectiva`: la `duracionMinutos` informada o, si no se informa, la de la prestación. La duración informada MUST ser un entero mayor que 0 y múltiplo de 5, o se rechaza con `RN-06`. El turno persiste `fin` y la duración efectiva (RN-06, DD-10).

#### Scenario: Duración por defecto de la prestación
- **WHEN** se agenda un turno con `pr1` el lunes a las 09:00 sin informar duración
- **THEN** el turno tiene fin 09:30 y duración 30 minutos

#### Scenario: Duración ajustada por recepción
- **WHEN** recepción agenda un turno con `pr1` el lunes a las 09:00 con duración 45
- **THEN** el turno tiene fin 09:45 y duración 45 minutos

#### Scenario: Duración cero rechazada
- **WHEN** se agenda un turno con `pr1` el lunes a las 09:00 con duración 0
- **THEN** se rechaza con `RN-06`

#### Scenario: Duración no múltiplo de 5 rechazada
- **WHEN** se agenda un turno con `pr1` el lunes a las 09:00 con duración 37
- **THEN** se rechaza con `RN-06`

#### Scenario: Duración negativa o no entera rechazada
- **WHEN** se agenda un turno con `pr1` el lunes a las 09:00 con duración -5 o 12.5
- **THEN** se rechaza con `RN-06`

#### Scenario: La duración ajustada se valida contra solapamientos
- **GIVEN** un turno activo de `p1` en `s1` el lunes de 09:40 a 10:00
- **WHEN** se agenda un turno de `p1` en `s2` con `pr1` el lunes a las 09:00 con duración 45
- **THEN** se rechaza con `RN-02`

### Requirement: Ajuste de duración solo por personal del consultorio
Solo los roles recepción, odontólogo y administrador SHALL poder informar una duración distinta de la de la prestación. Si el actor es paciente e informa una duración distinta, el alta MUST rechazarse con `RN-16`.

#### Scenario: Paciente informa duración distinta
- **WHEN** un paciente agenda un turno con `pr1` el lunes a las 09:00 con duración 45
- **THEN** se rechaza con `RN-16`

#### Scenario: Odontólogo ajusta la duración
- **WHEN** un odontólogo agenda un turno con `pr2` el lunes a las 09:00 con duración 60
- **THEN** el turno tiene fin 10:00 y duración 60 minutos

### Requirement: Horario de atención en la zona del consultorio
El turno MUST comenzar dentro de un tramo del horario de atención del día, interpretado en la zona horaria IANA del consultorio, y no terminar después del cierre del último tramo del día; si no, se rechaza con `RN-07` (RN-07, DD-09).

#### Scenario: Turno de 60 min que excede el cierre
- **WHEN** se agenda un turno con `pr3` el lunes a las 18:30
- **THEN** se rechaza con `RN-07`

#### Scenario: Turno antes de la apertura
- **WHEN** se agenda un turno con `pr1` el lunes a las 08:30
- **THEN** se rechaza con `RN-07`

#### Scenario: Turno que empieza en el corte del mediodía
- **WHEN** se agenda un turno con `pr1` el lunes a las 13:30
- **THEN** se rechaza con `RN-07`

#### Scenario: Turno en fin de semana
- **WHEN** se agenda un turno con `pr1` el sábado a las 10:00
- **THEN** se rechaza con `RN-07`

#### Scenario: Instante UTC convertido a hora local
- **WHEN** se agenda un turno con `pr1` con inicio `2026-11-23T12:00:00Z` (09:00 local)
- **THEN** el turno se crea con fin `2026-11-23T12:30:00Z`

#### Scenario: Instante UTC fuera de horario local
- **WHEN** se agenda un turno con `pr1` con inicio `2026-11-23T11:30:00Z` (08:30 local)
- **THEN** se rechaza con `RN-07`

### Requirement: Turno en un único tramo de atención
El turno MUST caber completo dentro del tramo de atención en el que comienza. Si termina después del fin de ese tramo y ese tramo no es el último del día, se rechaza con `RN-17`. Terminar exactamente al cierre del tramo es válido (RN-17, RN-05).

#### Scenario: Termina justo al cierre del tramo
- **WHEN** se agenda un turno con `pr1` el lunes a las 12:30
- **THEN** el turno se crea con fin 13:00

#### Scenario: Cruza el corte entre tramos
- **WHEN** se agenda un turno con `pr1` el lunes a las 12:45
- **THEN** se rechaza con `RN-17`

### Requirement: Bloqueos de profesional y de sillón
El sistema MUST rechazar con `RN-07` un turno cuyo intervalo se solape con un bloqueo horario del mismo profesional o del mismo sillón, informando el bloqueo en conflicto y qué recurso bloquea. Un turno contiguo al bloqueo es válido (RN-07, RN-05).

#### Scenario: Turno sobre bloqueo del profesional
- **WHEN** se agenda un turno de `p1` en `s1` con `pr1` el miércoles a las 15:30
- **THEN** se rechaza con `RN-07` e informa el bloqueo de profesional de `p1`

#### Scenario: Turno contiguo al fin del bloqueo
- **WHEN** se agenda un turno de `p1` en `s1` con `pr1` el miércoles a las 17:00
- **THEN** el turno se crea

#### Scenario: Bloqueo de un profesional no afecta a otro
- **WHEN** se agenda un turno de `p2` en `s1` con `pr1` el miércoles a las 15:30
- **THEN** el turno se crea

#### Scenario: Turno sobre bloqueo de sillón
- **GIVEN** un bloqueo del sillón `s1` el lunes de 10:00 a 11:00
- **WHEN** se agenda un turno de `p2` en `s1` con `pr1` el lunes a las 10:00
- **THEN** se rechaza con `RN-07` e informa el bloqueo de sillón de `s1`

### Requirement: Solo recursos activos
El sistema MUST rechazar con `RN-18` un turno cuyo profesional, sillón o prestación estén inactivos (RN-18).

#### Scenario: Profesional inactivo
- **GIVEN** el profesional `p2` está inactivo
- **WHEN** se agenda un turno de `p2` en `s1` con `pr1` el lunes a las 09:00
- **THEN** se rechaza con `RN-18`

#### Scenario: Sillón inactivo
- **GIVEN** el sillón `s2` está inactivo
- **WHEN** se agenda un turno de `p1` en `s2` con `pr1` el lunes a las 09:00
- **THEN** se rechaza con `RN-18`

#### Scenario: Prestación inactiva
- **GIVEN** la prestación `pr4` está inactiva
- **WHEN** se agenda un turno de `p1` en `s1` con `pr4` el lunes a las 09:00
- **THEN** se rechaza con `RN-18`

### Requirement: Estado inicial según el origen
Un turno creado por recepción, odontólogo o administrador SHALL nacer en estado `confirmado` con origen `recepcion`; uno creado por un paciente SHALL nacer `reservado` con origen `online` (DD-11).

#### Scenario: Alta interna nace confirmado
- **WHEN** recepción agenda un turno válido el lunes a las 09:00
- **THEN** el turno tiene estado `confirmado` y origen `recepcion`

#### Scenario: Alta por paciente nace reservado
- **WHEN** un paciente agenda un turno válido con `pr1` el lunes a las 09:00 sin informar duración
- **THEN** el turno tiene estado `reservado` y origen `online`

### Requirement: Errores tipados con orden de evaluación fijo
Todo rechazo MUST informar el código `RN-XX` violado y, si aplica, el turno o bloqueo en conflicto. Ante varias violaciones se informa solo la primera según el orden: `RN-18`, `RN-06`/`RN-16`, `RN-07`/`RN-17`, `RN-02`, `RN-03`. Un recurso inexistente se rechaza con un error de no encontrado, sin código RN.

#### Scenario: Recurso inactivo prevalece sobre solapamiento
- **GIVEN** un turno activo de `p1` en `s1` el lunes de 09:00 a 10:00 y el sillón `s1` inactivo
- **WHEN** se agenda un turno de `p1` en `s1` el lunes a las 09:00
- **THEN** se rechaza con `RN-18`

#### Scenario: Profesional prevalece sobre sillón
- **GIVEN** un turno activo de `p1` en `s1` el lunes de 09:00 a 10:00
- **WHEN** se agenda un turno de `p1` en `s1` el lunes a las 09:15
- **THEN** se rechaza con `RN-02`

#### Scenario: Recurso inexistente
- **WHEN** se agenda un turno con un profesional `p9` que no existe
- **THEN** se rechaza con un error de recurso no encontrado que identifica `p9`

### Requirement: Validación y persistencia atómicas
La verificación de reglas y el registro del turno MUST ejecutarse como una única operación atómica: dos altas concurrentes que compiten por el mismo recurso y horario no pueden crearse ambas, y un alta rechazada no deja ningún turno registrado (RN-12).

#### Scenario: Dos altas simultáneas al mismo horario
- **WHEN** se agendan en simultáneo dos turnos de `p1` el lunes a las 09:00 (uno en `s1` y otro en `s2`)
- **THEN** exactamente uno se crea y el otro se rechaza con `RN-02`

#### Scenario: Un rechazo no persiste nada
- **GIVEN** un turno activo de `p1` en `s1` el lunes de 09:00 a 10:00
- **WHEN** se agenda un turno de `p1` en `s2` el lunes a las 09:30 y se rechaza
- **THEN** la agenda contiene solo el turno original
