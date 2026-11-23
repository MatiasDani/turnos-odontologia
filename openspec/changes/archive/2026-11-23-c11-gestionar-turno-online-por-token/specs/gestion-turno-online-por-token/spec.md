# Spec Delta

## Purpose

Permite que un paciente gestione su propio turno desde el enlace del recordatorio usando el token vigente: consultarlo, cancelarlo y reprogramarlo, con la misma anticipación que la recepción le exige y sin revelar datos ajenos.

> Contexto común de los escenarios (seed ficticio de `knowledge-base/04_modelo_de_datos.md`): consultorio `c1` en `America/Argentina/Buenos_Aires`; `p1` Ana Ejemplo, `s1`, `pr1` "Consulta/control" de 30 min; `pr2` "Limpieza" de 45 min; paciente `pa1` (Carla Prueba). Todas las horas son locales (`-03:00`); domingo = 2026-11-22, lunes = 2026-11-23, martes = 2026-11-24. Salvo que se indique otra cosa: `ahora` es el domingo a las 08:00, el **turno base** es un turno `confirmado` de `pa1` con `p1`, `s1`, `pr1`, lunes 09:00-09:30, con un token vigente emitido para él, y su recordatorio está `pendiente`. Un error público pertenece a un conjunto cerrado de códigos: `ENLACE_INVALIDO` (compartido con C-12), `CONTACTAR_CONSULTORIO`, `HORARIO_NO_DISPONIBLE` y `DATOS_INVALIDOS`, cada uno con un mensaje fijo.

## ADDED Requirements

### Requirement: Resolución previa del token de gestión
Toda operación SHALL resolver el token con el servicio de tokens de C-10 y actuar solo sobre el turno que ese token identifica. Un token inexistente, alterado, rotado, vencido o de un turno cancelado MUST rechazarse con `ENLACE_INVALIDO`, siempre con el mismo mensaje y sin revelar el motivo, el estado ni datos del turno (RN-15, RN-21, RN-22).

#### Scenario: Token nunca emitido
- **WHEN** se consulta, cancela o reprograma con un token que nunca se emitió
- **THEN** cada operación se rechaza con `ENLACE_INVALIDO` y ninguna modifica la agenda

#### Scenario: Token rotado por un recordatorio
- **GIVEN** el turno base recibió el token T1 y un recordatorio posterior emitió T2
- **WHEN** se consulta con T1
- **THEN** se rechaza con `ENLACE_INVALIDO`
- **AND** con T2 la consulta devuelve el turno base

#### Scenario: Token vencido por el fin del turno
- **GIVEN** el turno base termina el lunes a las 09:30
- **WHEN** se consulta con su token con `ahora` lunes 09:30
- **THEN** se rechaza con `ENLACE_INVALIDO`
- **AND** con `ahora` lunes 09:29 la consulta devuelve el turno base

#### Scenario: Token de un turno cancelado
- **GIVEN** el turno base fue cancelado
- **WHEN** se consulta con su token
- **THEN** se rechaza con `ENLACE_INVALIDO`

### Requirement: Consulta del propio turno
La consulta SHALL devolver solo `turnoId`, `inicio`, `fin`, el nombre de la prestación y el nombre y apellido del profesional asignado. MUST NOT incluir el sillón, el id ni los datos del paciente, el token, el estado ni datos de otros turnos (DD-18, RN-D-02).

#### Scenario: Paciente consulta su turno online
- **WHEN** se consulta con el token vigente del turno base
- **THEN** la respuesta tiene `turnoId`, inicio lunes 09:00, fin lunes 09:30, prestación "Consulta/control" y profesional "Ana Ejemplo"
- **AND** la respuesta no contiene `sillonId`, `pacienteId`, `token`, `estado` ni ningún otro campo

#### Scenario: Token del primer recordatorio de un turno interno
- **GIVEN** el turno base fue creado por recepción y recibió su token en el primer envío del recordatorio
- **WHEN** se consulta con ese token
- **THEN** la respuesta devuelve el turno base con los mismos campos públicos

### Requirement: Cancelación con anticipación suficiente
Con `inicio - ahora >= 24 h`, la cancelación SHALL delegar en el caso de uso de C-02 con actor `paciente` y devolver una respuesta pública sin datos internos. El turno queda `cancelado` con `canceladoPor` `paciente`, el horario se libera y los recordatorios pendientes se anulan (RN-08, RN-09, RN-19, DD-19).

#### Scenario: Paciente cancela con 25 horas de anticipación
- **WHEN** se cancela el turno base con `ahora` domingo 08:00
- **THEN** el turno queda `cancelado` con `canceladoPor` `paciente`
- **AND** la respuesta no contiene datos del paciente ni del sillón

#### Scenario: Umbral exacto de 24 horas
- **WHEN** se cancela el turno base con `ahora` domingo 09:00
- **THEN** la cancelación se concreta

#### Scenario: El horario queda libre al cancelar
- **GIVEN** el turno base ocupa `p1` y `s1` el lunes 09:00-09:30
- **WHEN** se cancela con el token y luego recepción agenda otro turno en ese horario
- **THEN** el nuevo turno se crea sin solapamiento

#### Scenario: El recordatorio pendiente se anula
- **WHEN** se cancela el turno base con el token
- **THEN** su recordatorio pendiente queda `cancelado`

### Requirement: Cancelación con menos de 24 horas
Con `inicio - ahora < 24 h` la cancelación MUST rechazarse con `CONTACTAR_CONSULTORIO` y un mensaje fijo que indique al paciente que contacte al consultorio. MUST NOT cancelar el turno, tocar el recordatorio ni exponer el código interno `RN-08` (US-010, RN-08).

#### Scenario: 23 horas y 59 minutos
- **WHEN** se cancela el turno base con `ahora` domingo 09:01
- **THEN** se rechaza con `CONTACTAR_CONSULTORIO`
- **AND** el turno sigue `confirmado` y su recordatorio sigue `pendiente`

#### Scenario: El mensaje no revela el código de dominio
- **WHEN** se serialize el rechazo por falta de anticipación
- **THEN** el mensaje contiene la indicación de contactar al consultorio
- **AND** no contiene `RN-08`, el `turnoId` ni datos del paciente

### Requirement: Reprogramación con anticipación suficiente
Con `inicio - ahora >= 24 h`, la reprogramación SHALL delegar en el caso de uso de C-03 con actor `paciente`, validar el nuevo horario de forma atómica y devolver solo el DTO público. El turno conserva su identidad, el original se libera solo si se concreta y el recordatorio se reprograma (RN-08, RN-11, RN-12, RN-25).

#### Scenario: Paciente mueve su turno a un hueco libre
- **WHEN** se reprograma el turno base al martes 10:00 con su token
- **THEN** el turno mantiene su `id`, paciente, estado `confirmado` y origen, y empieza el martes 10:00
- **AND** la respuesta tiene solo los campos públicos de la consulta

#### Scenario: Solapamiento rechazado sin mover el turno
- **GIVEN** otro turno activo ocupa `p1` y `s1` el martes 10:00-10:30
- **WHEN** se reprograma el turno base al martes 10:00 con su token
- **THEN** se rechaza con `HORARIO_NO_DISPONIBLE`
- **AND** el turno base sigue el lunes 09:00 en `p1` y `s1`

#### Scenario: El recordatorio se mueve con el turno
- **WHEN** se reprograma el turno base al martes 10:00 con su token
- **THEN** el único recordatorio `pendiente` tiene `programadoPara` el lunes 10:00

#### Scenario: Reprogramar no rota el token y usa el nuevo fin
- **GIVEN** se reprogramó el turno base del lunes 09:00-09:30 al lunes 10:00-10:30 con su token T1
- **WHEN** se consulta con T1 con `ahora` lunes 09:45
- **THEN** la consulta devuelve el turno movido
- **AND** el token sigue siendo T1 y no se emitió otro token

### Requirement: Reprogramación con menos de 24 horas
Con `inicio - ahora < 24 h` la reprogramación MUST rechazarse con `CONTACTAR_CONSULTORIO` y un mensaje fijo, sin validar el nuevo horario, sin mover el turno y sin tocar el recordatorio (US-010, RN-08).

#### Scenario: 23 horas y 59 minutos con un horario libre
- **WHEN** se reprograma el turno base al martes 10:00 con `ahora` domingo 09:01
- **THEN** se rechaza con `CONTACTAR_CONSULTORIO`
- **AND** el turno y su recordatorio quedan como estaban

### Requirement: Errores públicos sin filtrado de datos
Todo rechazo SHALL expresarse con un código del conjunto cerrado y un mensaje fijo. MUST NOT incluir códigos RN, ids de turnos, pacientes o profesionales, sillones, estados, tokens ni errores de dominio de origen (RN-22, RN-D-02, DD-18).

#### Scenario: Rechazo por solapamiento sin datos ajenos
- **GIVEN** un turno ajeno ocupa el horario pedido
- **WHEN** se serialize el rechazo de la reprogramación
- **THEN** el error no contiene `turnoEnConflicto`, ids, `s1`, `p1` ni `RN-02`

#### Scenario: Rechazo por token inválido sin motivo
- **WHEN** se serialize el rechazo de un token rotado
- **THEN** el error tiene solo el código `ENLACE_INVALIDO` y su mensaje fijo
- **AND** no indica si el turno existe, está cancelado o venció

### Requirement: Orden de evaluación de los rechazos
Las operaciones SHALL evaluar primero el token, después la anticipación y recién entonces las reglas del nuevo horario. Solo se informa el primer rechazo (RN-15, RN-08, DD-19, DD-22).

#### Scenario: Token inválido prevalece sobre la anticipación
- **GIVEN** el turno base empieza en menos de 24 h
- **WHEN** se reprograma con un token que nunca se emitió
- **THEN** se rechaza con `ENLACE_INVALIDO`

#### Scenario: Anticipación prevalece sobre el solapamiento
- **GIVEN** el turno base empieza en menos de 24 h y otro turno ocupa el horario pedido
- **WHEN** se reprograma con el token vigente
- **THEN** se rechaza con `CONTACTAR_CONSULTORIO`

### Requirement: Entrada pública sin campos de privilegio
La entrada de la reprogramación SHALL exponer solo `token`, `inicio` y, de forma opcional, `profesionalId` y `prestacionId`. MUST NOT exponer `turnoId`, `actor`, `rol`, `sillonId`, `duracionMinutos`, `forzar` ni un token distinto del recibido (RN-04, RN-16, DD-18).

#### Scenario: Un `inicio` inválido se rechaza en la frontera
- **WHEN** se reprograma con un `inicio` que no es una fecha válida
- **THEN** se rechaza con `DATOS_INVALIDOS` y no se consulta ni modifica ningún turno

#### Scenario: Sin campos para forzar ni elegir sillón
- **GIVEN** la interfaz pública de reprogramación
- **WHEN** se inspeccionan sus campos
- **THEN** no aparece `forzar`, `sillonId`, `duracionMinutos`, `actor` ni `rol`
