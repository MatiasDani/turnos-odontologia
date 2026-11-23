# disponibilidad-turnos Specification

## Purpose
Permite consultar, sin modificar la agenda, los huecos libres para una prestación en un rango de fechas, combinando un profesional habilitado y un sillón libres a la vez, con las mismas reglas que el alta de turnos, para que recepción y paciente elijan un horario que realmente se puede agendar.

> Contexto común de los escenarios (seed ficticio de `knowledge-base/04_modelo_de_datos.md`): consultorio `c1` en `America/Argentina/Buenos_Aires`; profesionales `p1` y `p2` (ambos realizan `pr1`..`pr4`), sillones `s1` y `s2`, todos activos; prestaciones `pr1` 30 min, `pr2` 45 min, `pr3` 60 min, `pr4` 90 min; horario lunes a viernes 09:00-13:00 y 15:00-19:00 (hora local); bloqueo de `p1` el miércoles 2026-11-25 de 15:00 a 17:00. Todas las horas son locales (`-03:00`). Lunes = 2026-11-23, martes = 2026-11-24, miércoles = 2026-11-25, sábado = 2026-11-28. Salvo que se indique otra cosa: el actor es recepción, la prestación es `pr1`, el paso es 15 minutos, la agenda no tiene turnos, `ahora` es el domingo 2026-11-22 a las 08:00 y el rango es el día consultado completo `[00:00, 00:00 del día siguiente)`. Un "combo" es una combinación `{inicio, fin, profesionalId, sillonId}`.

## Requirements

### Requirement: Huecos con profesional y sillón libres a la vez
La consulta SHALL devolver un combo por cada inicio candidato en el que un profesional habilitado y un sillón estén libres a la vez durante todo `[inicio, fin)`, con `fin = inicio + duración efectiva`. Un combo MUST omitirse si el profesional o el sillón tienen un turno activo que se solapa; los intervalos contiguos no se solapan (RN-01, RN-02, RN-03, RN-05, RN-13).

#### Scenario: Día vacío ofrece huecos en ambos tramos
- **WHEN** se consulta la disponibilidad de `pr1` el lunes
- **THEN** se ofrecen 30 horarios con 4 combos cada uno (120 combos): el primero 09:00-09:30 (12:00 UTC), el último de la mañana 12:30-13:00, el primero de la tarde 15:00-15:30 y el último 18:30-19:00

#### Scenario: Hueco contiguo a un turno aparece
- **GIVEN** un turno activo de `p1` en `s1` el lunes de 09:00 a 09:45
- **WHEN** se consulta la disponibilidad de `pr1` el lunes
- **THEN** se ofrece el combo 09:45-10:15 con `p1` y `s1`

#### Scenario: Profesional libre con sillón ocupado no basta
- **GIVEN** un turno activo de `p2` en `s1` el lunes de 09:00 a 10:00
- **WHEN** se consulta la disponibilidad de `pr1` el lunes
- **THEN** a las 09:00 el único combo ofrecido es `p1` con `s2`

#### Scenario: Sillón libre con profesional ocupado no basta
- **GIVEN** un turno activo de `p1` en `s1` el lunes de 09:00 a 10:00
- **WHEN** se consulta la disponibilidad de `pr1` el lunes
- **THEN** a las 09:30 el único combo ofrecido es `p2` con `s2`

#### Scenario: Sin recursos libres no hay hueco
- **GIVEN** turnos activos de `p1` en `s1` y de `p2` en `s2` el lunes de 09:00 a 10:00
- **WHEN** se consulta la disponibilidad de `pr1` el lunes
- **THEN** no se ofrece ningún combo con inicio entre 09:00 y 09:45 y el primer horario ofrecido es 10:00-10:30

### Requirement: Solo los turnos activos bloquean huecos
Los turnos `cancelado` y `ausente` MUST ignorarse al calcular la disponibilidad; solo `reservado`, `confirmado` y `atendido` ocupan recursos (DD-05, RN-09).

#### Scenario: Turno cancelado libera el hueco
- **GIVEN** un turno cancelado de `p1` en `s1` el lunes de 09:00 a 10:00
- **WHEN** se consulta la disponibilidad de `pr1` el lunes
- **THEN** a las 09:00 se ofrecen los 4 combos, incluido `p1` con `s1`

#### Scenario: Turno ausente no ocupa el hueco
- **GIVEN** un turno ausente de `p1` en `s1` el lunes de 09:00 a 10:00
- **WHEN** se consulta la disponibilidad de `pr1` el lunes
- **THEN** a las 09:00 se ofrece el combo `p1` con `s1`

### Requirement: Huecos dentro de un único tramo de atención
Cada combo ofrecido MUST quedar completo dentro de un único tramo del horario de atención del consultorio, interpretado en su zona horaria. Un hueco puede terminar exactamente al cierre del tramo; no puede excederlo ni cruzar el corte entre tramos. Un día sin tramos no ofrece huecos (RN-07, RN-17).

#### Scenario: Último hueco termina justo al cierre del tramo
- **WHEN** se consulta la disponibilidad de `pr1` el lunes
- **THEN** se ofrecen los horarios 12:30-13:00 y 18:30-19:00

#### Scenario: Hueco que excede el cierre no aparece
- **WHEN** se consulta la disponibilidad de `pr3` (60 min) el lunes
- **THEN** el último horario ofrecido es 18:00-19:00 y no se ofrece 18:15-19:15

#### Scenario: Hueco que cruza el corte del mediodía no aparece
- **WHEN** se consulta la disponibilidad de `pr2` (45 min) el lunes
- **THEN** se ofrece 12:15-13:00, no se ofrece 12:30-13:15 y no hay ningún horario con inicio entre 13:00 y 14:59

#### Scenario: Fin de semana sin huecos
- **WHEN** se consulta la disponibilidad de `pr1` con el rango del sábado 00:00 al lunes 00:00
- **THEN** la consulta devuelve una lista vacía

### Requirement: Bloqueos excluyen solo al recurso bloqueado
Un bloqueo de profesional MUST excluir solo los combos de ese profesional que lo solapen; un bloqueo de sillón MUST excluir solo los combos de ese sillón. Los demás recursos siguen ofreciéndose y un hueco contiguo al bloqueo es válido (RN-07, RN-05).

#### Scenario: Bloqueo de profesional excluye solo a ese profesional
- **WHEN** se consulta la disponibilidad de `pr1` el miércoles
- **THEN** a las 15:00 solo se ofrecen `p2` con `s1` y `p2` con `s2`, y a las 17:00 vuelve a ofrecerse `p1`

#### Scenario: Bloqueo de sillón ofrece el otro sillón
- **GIVEN** un bloqueo del sillón `s1` el lunes de 09:00 a 11:00
- **WHEN** se consulta la disponibilidad de `pr1` el lunes
- **THEN** a las 09:00 solo se ofrecen `p1` con `s2` y `p2` con `s2`

### Requirement: Solo profesionales habilitados para la prestación
La consulta MUST ofrecer únicamente profesionales cuya lista de prestaciones incluye la prestación consultada. Cualquier sillón activo del consultorio es apto; no se evalúan restricciones de sillón por prestación (RN-13, DD-12).

#### Scenario: Profesional que no realiza la prestación excluido
- **GIVEN** `p2` solo realiza `pr1`
- **WHEN** se consulta la disponibilidad de `pr4` el lunes
- **THEN** ningún combo ofrecido tiene a `p2`, y sí se ofrecen combos de `p1`

### Requirement: Solo recursos activos
Los profesionales y sillones inactivos MUST excluirse de la disponibilidad. Si la prestación consultada está inactiva, la consulta MUST rechazarse con `RN-18`. Si la prestación no existe, MUST rechazarse con un error de recurso no encontrado (RN-18).

#### Scenario: Recursos inactivos excluidos
- **GIVEN** el profesional `p2` y el sillón `s2` inactivos
- **WHEN** se consulta la disponibilidad de `pr1` el lunes
- **THEN** todos los combos ofrecidos son de `p1` con `s1`

#### Scenario: Prestación inactiva rechaza la consulta
- **GIVEN** la prestación `pr1` inactiva
- **WHEN** se consulta la disponibilidad de `pr1` el lunes
- **THEN** se rechaza con `RN-18`

#### Scenario: Prestación inexistente rechaza la consulta
- **WHEN** se consulta la disponibilidad de una prestación `pr9` que no existe
- **THEN** se rechaza con un error de recurso no encontrado que identifica `pr9`

### Requirement: Duración efectiva de la consulta
La duración de cada combo SHALL ser la de la prestación o la `duracionMinutos` informada. Solo recepción, odontólogo y administrador pueden informar una duración distinta de la de la prestación; si el paciente lo hace, se rechaza con `RN-16`. Una duración que no es entero > 0 múltiplo de 5 se rechaza con `RN-06` (RN-06, RN-16).

#### Scenario: Duración ajustada por recepción cambia los huecos
- **WHEN** recepción consulta la disponibilidad de `pr1` el lunes con duración 60
- **THEN** cada combo dura 60 minutos, el último horario de la mañana es 12:00-13:00 y no se ofrece 12:15

#### Scenario: Paciente con duración distinta rechazado
- **WHEN** un paciente consulta la disponibilidad de `pr1` el lunes con duración 45
- **THEN** se rechaza con `RN-16`

#### Scenario: Duración inválida rechazada
- **WHEN** recepción consulta la disponibilidad de `pr1` el lunes con duración 32
- **THEN** se rechaza con `RN-06`

### Requirement: Filtro opcional por profesional
Si se informa un profesional, la consulta MUST devolver solo combos de ese profesional. Si el profesional informado no existe, MUST rechazarse con un error de recurso no encontrado; si existe pero no está habilitado o está inactivo, el resultado es vacío.

#### Scenario: Filtro por profesional
- **WHEN** se consulta la disponibilidad de `pr1` el lunes filtrando por `p1`
- **THEN** se ofrecen 60 combos y todos son de `p1`

#### Scenario: Filtro por profesional inexistente
- **WHEN** se consulta la disponibilidad de `pr1` el lunes filtrando por `p9`
- **THEN** se rechaza con un error de recurso no encontrado que identifica `p9`

### Requirement: Paso de los inicios candidatos
Los inicios candidatos SHALL generarse cada `pasoMinutos` minutos a partir del inicio de cada tramo de atención (por defecto 15). Un paso que no sea entero > 0 múltiplo de 5 MUST rechazarse como consulta inválida, indicando el paso como causa.

#### Scenario: Paso configurable de 30 minutos
- **WHEN** se consulta la disponibilidad de `pr1` el lunes con paso 30
- **THEN** los horarios de la mañana son 09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00 y 12:30, y no se ofrece 09:15

#### Scenario: Paso alineado al inicio de cada tramo
- **WHEN** se consulta la disponibilidad de `pr1` el lunes con paso 25
- **THEN** la mañana ofrece 09:00, 09:25 hasta 12:20 y la tarde empieza en 15:00 y 15:25

#### Scenario: Paso inválido rechazado
- **WHEN** se consulta la disponibilidad de `pr1` el lunes con paso 0, 7 o 12,5
- **THEN** cada consulta se rechaza como consulta inválida por el paso

### Requirement: Sin huecos en el pasado
La consulta MUST recibir el instante actual `ahora` y excluir todo combo cuyo inicio sea anterior a `ahora`; un combo que empieza exactamente en `ahora` se ofrece (RN-13).

#### Scenario: Huecos en el pasado excluidos
- **GIVEN** `ahora` es el lunes a las 10:07
- **WHEN** se consulta la disponibilidad de `pr1` el lunes
- **THEN** el primer horario ofrecido es 10:15-10:45 y no se ofrece ningún inicio anterior a 10:07

#### Scenario: Hueco que empieza justo ahora aparece
- **GIVEN** `ahora` es el lunes a las 10:15
- **WHEN** se consulta la disponibilidad de `pr1` el lunes
- **THEN** el primer horario ofrecido es 10:15-10:45

### Requirement: Rango de consulta acotado
El rango `[desde, hasta)` SHALL ser semiabierto: un combo pertenece al rango si su inicio está dentro. Un rango con `hasta` anterior o igual a `desde`, o de más de 31 días, MUST rechazarse como consulta inválida, indicando el rango como causa.

#### Scenario: Rango semiabierto por inicio del hueco
- **WHEN** se consulta la disponibilidad de `pr1` con el rango del lunes de 09:00 a 10:00
- **THEN** el último horario ofrecido es 09:45-10:15 y no se ofrece 10:00

#### Scenario: Rango invertido o vacío rechazado
- **WHEN** se consulta la disponibilidad de `pr1` con `hasta` anterior a `desde` o igual a `desde`
- **THEN** cada consulta se rechaza como consulta inválida por el rango

#### Scenario: Rango mayor a 31 días rechazado
- **WHEN** se consulta la disponibilidad de `pr1` con un rango de 31 días y un minuto desde el lunes 00:00
- **THEN** se rechaza como consulta inválida por el rango

#### Scenario: Rango de exactamente 31 días aceptado
- **WHEN** se consulta la disponibilidad de `pr1` con un rango de 31 días exactos desde el lunes 00:00
- **THEN** la consulta devuelve combos sin error

### Requirement: Errores de la consulta con orden fijo
Ante varios problemas la consulta MUST informar solo el primero según el orden: consulta inválida (rango, luego paso), prestación inexistente, profesional filtrado inexistente, `RN-18` de la prestación, `RN-16`, `RN-06`.

#### Scenario: Consulta inválida prevalece sobre prestación inexistente
- **WHEN** se consulta la disponibilidad de una prestación `pr9` que no existe con un rango invertido
- **THEN** se rechaza como consulta inválida por el rango

### Requirement: Orden determinista de los combos
Los combos MUST devolverse ordenados por inicio, luego por identificador de profesional y luego por identificador de sillón, sin depender del orden en que estén almacenados los recursos.

#### Scenario: Orden determinista de combos
- **GIVEN** los profesionales almacenados en el orden `p2`, `p1` y los sillones en el orden `s2`, `s1`
- **WHEN** se consulta la disponibilidad de `pr1` del lunes al miércoles 00:00
- **THEN** a las 09:00 del lunes los combos son `p1`/`s1`, `p1`/`s2`, `p2`/`s1`, `p2`/`s2` en ese orden y todos los combos del lunes preceden a los del martes

### Requirement: Agrupación por horario único
El sistema SHALL ofrecer una agrupación de los combos por horario `[inicio, fin)` único, en orden de inicio, conservando dentro de cada horario el orden determinista de los combos, para la vista del paciente.

#### Scenario: Agrupación por horario único
- **WHEN** se agrupan los combos de la disponibilidad de `pr1` del lunes
- **THEN** resultan 30 horarios; el primero es 09:00-09:30 con las opciones `p1`/`s1`, `p1`/`s2`, `p2`/`s1`, `p2`/`s2` en ese orden

#### Scenario: Agrupación de una lista vacía
- **WHEN** se agrupan los combos de la disponibilidad de `pr1` del sábado
- **THEN** resulta una lista vacía de horarios

### Requirement: Consistencia con el alta de turnos
Todo combo ofrecido MUST poder agendarse con el alta de turnos sin error si la agenda no cambió entre la consulta y el alta (misma prestación, duración y actor).

#### Scenario: Todo hueco ofrecido se puede agendar
- **GIVEN** un turno activo de `p1` en `s1` el lunes de 09:00 a 09:45 y un bloqueo del sillón `s2` el lunes de 15:00 a 16:00
- **WHEN** cada combo ofrecido para `pr2` el lunes se agenda por separado sobre esa misma agenda
- **THEN** todas las altas se crean sin error

### Requirement: Consulta de solo lectura
La consulta MUST NOT crear, modificar ni reservar turnos; dos consultas iguales sobre la misma agenda devuelven el mismo resultado (RN-13).

#### Scenario: La consulta no modifica la agenda
- **GIVEN** un turno activo de `p1` en `s1` el lunes de 09:00 a 09:45
- **WHEN** se consulta dos veces la disponibilidad de `pr1` el lunes
- **THEN** ambas consultas devuelven los mismos combos y la agenda sigue teniendo solo ese turno

### Requirement: Horario propio del profesional en la disponibilidad
Los combos de un profesional MUST quedar dentro de su horario efectivo del día: sus tramos propios si tiene alguno ese día de la semana, o los del consultorio si no. Sus inicios candidatos SHALL alinearse al inicio de esos tramos con el paso de la consulta. El orden de los combos no cambia (RN-28, RN-13, DD-26).

#### Scenario: Huecos de un profesional con horario propio
- **GIVEN** `p2` tiene un tramo propio el lunes de 14:00 a 18:00
- **WHEN** se consulta la disponibilidad de `pr1` el lunes
- **THEN** los combos de `p2` empiezan entre 14:00 y 17:30, el primero 14:00-14:30 y el último 17:30-18:00
- **AND** los combos de `p1` siguen siendo los de 09:00 a 12:30 y de 15:00 a 18:30

#### Scenario: Inicios alineados al tramo propio del profesional
- **GIVEN** `p2` tiene un tramo propio el lunes de 14:10 a 15:00
- **WHEN** se consulta la disponibilidad de `pr1` el lunes con paso 15
- **THEN** los únicos horarios de `p2` son 14:10-14:40 y 14:25-14:55
- **AND** no se ofrece ningún combo de `p1` a las 14:10 ni a las 14:25

#### Scenario: Orden determinista con horarios propios
- **GIVEN** `p2` tiene un tramo propio el lunes de 14:00 a 18:00
- **WHEN** se consulta la disponibilidad de `pr1` el lunes
- **THEN** a las 14:00 los combos son `p2`/`s1`, `p2`/`s2` en ese orden
- **AND** a las 15:00 los combos son `p1`/`s1`, `p1`/`s2`, `p2`/`s1`, `p2`/`s2` en ese orden

#### Scenario: Día sin horario propio en la disponibilidad
- **GIVEN** `p2` tiene un tramo propio el lunes de 14:00 a 18:00
- **WHEN** se consulta la disponibilidad de `pr1` el martes 2026-11-24
- **THEN** se ofrecen 30 horarios con 4 combos cada uno, igual que sin horario propio
