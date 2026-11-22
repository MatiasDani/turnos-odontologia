# Reglas de Negocio

Las reglas **RN-01 a RN-09** provienen del punto 7 de `docs/discovery/checklist-discovery.md` (confirmado por el equipo el 2026-11-21) y son la fuente de verdad. Las reglas con otros códigos están **derivadas de las fuentes y marcadas como tales**; no forman parte del checklist confirmado.

Definición operativa: un turno es **activo** si su estado es `reservado`, `confirmado` o `atendido`. Un turno `cancelado` o `ausente` no ocupa recursos (ver DD-05).

## Dominio: Agenda por recursos (núcleo)

- **RN-01**: un turno ocupa a la vez un profesional y un sillón durante la duración de la prestación.
- **RN-02**: no puede haber dos turnos activos solapados para el mismo profesional.
- **RN-03**: no puede haber dos turnos activos solapados para el mismo sillón o box.
- **RN-04**: no existen sobreturnos; ningún rol puede forzar un solapamiento. Esto incluye al administrador y a cualquier flujo (alta, reprogramación, reserva online).
- **RN-05**: los intervalos son semiabiertos [inicio, fin). Un turno que empieza exactamente cuando termina otro no se solapa. Dos intervalos [a1, a2) y [b1, b2) se solapan si y solo si `a1 < b2` y `b1 < a2`.
- **RN-06**: la duración del turno es ajustable por turno de forma opcional (DD-10). Si no se informa `duracionMinutos`, `fin = inicio + prestacion.duracionMinutos`; si se informa, `fin = inicio + duracionMinutos`. La duración informada debe ser un entero > 0 y múltiplo de 5, sin tope máximo (lo limita el horario de atención, RN-07 y RN-17). El `Turno` persiste `fin` y la duración efectiva.
- **RN-07**: no se pueden dar turnos fuera del horario de atención ni en horarios bloqueados. Un `BloqueoHorario` con `profesionalId` impide turnos de ese profesional en el intervalo; un `BloqueoHorario` con `sillonId` impide turnos en ese sillón en el intervalo. El horario de atención se interpreta en la zona horaria del consultorio (DD-09).
- **RN-16** *(decisión de explore C-01, 2026-11-21)*: solo recepción, odontólogo y administrador pueden informar una `duracionMinutos` distinta de la de la prestación. El paciente (reserva online) siempre usa la duración de la prestación.
- **RN-17** *(decisión de explore C-01, 2026-11-21)*: un turno debe caber completo dentro de un único tramo de atención; no puede cruzar el corte entre tramos (p. ej. el corte de 13:00 a 15:00). Terminar exactamente al cierre del tramo (13:00) es válido por intervalo semiabierto (RN-05).
- **RN-18** *(decisión de explore C-01, 2026-11-21)*: solo un profesional activo, un sillón activo y una prestación activa pueden usarse para dar un turno; si alguno está inactivo, se rechaza con este código.

### Ejemplos de verificación (casos para TDD)

| Caso | Resultado esperado | Regla |
|---|---|---|
| Turno A 09:00-09:45 y B 09:45-10:15, mismo profesional | Válido (contiguos) | RN-05 |
| A 09:00-09:45 y B 09:44-10:14, mismo profesional | Rechazado | RN-02 |
| A 09:00-10:00 en `s1` con `p1`; B 09:30-10:00 en `s1` con `p2` | Rechazado (mismo sillón) | RN-03 |
| A en `s1` con `p1`; B mismo horario en `s2` con `p1` | Rechazado (mismo profesional) | RN-02 |
| A en `s1` con `p1`; B mismo horario en `s2` con `p2` | Válido | RN-01 |
| Turno de 60 min que termina después del cierre | Rechazado (se informa solo RN-07) | RN-07 |
| Turno sobre un bloqueo del profesional (p1, miércoles 15:00-17:00) | Rechazado | RN-07 |
| Turno de `p2` en `s1` sobre un bloqueo de sillón `s1` (mismo intervalo) | Rechazado (bloqueo de sillón) | RN-07 |
| Turno con `pr1` (30 min) sin `duracionMinutos`, inicio 09:00 | `fin` 09:30 | RN-06 |
| Mismo turno con `duracionMinutos` 45 informada por recepción | `fin` 09:45 | RN-06, RN-16 |
| `duracionMinutos` 32 (no múltiplo de 5), 0 o negativa | Rechazado | RN-06 |
| Reserva online que informa `duracionMinutos` distinta de la prestación | Rechazado | RN-16 |
| Turno 12:30-13:00 (termina justo al cierre del tramo de la mañana) | Válido | RN-17, RN-05 |
| Turno 12:45-13:15 (cruza el corte 13:00-15:00) | Rechazado | RN-17 |
| Turno con profesional, sillón o prestación inactivos | Rechazado | RN-18 |
| Intento del administrador de forzar un solapamiento | Rechazado con RN-02/RN-03 (no existe opción de forzar) | RN-04, RN-02, RN-03 |
| Disponibilidad de `pr1` (30 min) el lunes 2026-11-23 con agenda vacía y paso 15 | Primer hueco 09:00-09:30, último de la mañana 12:30-13:00, primero de la tarde 15:00-15:30, último 18:30-19:00; cada horario con los combos `p1`/`s1`, `p1`/`s2`, `p2`/`s1`, `p2`/`s2` en ese orden | RN-13, RN-17 |
| Turno activo de `p1` en `s1` lunes 09:00-09:45; disponibilidad de `pr1` | 09:45-10:15 con `p1`/`s1` aparece (contiguo); 09:30-10:00 con `p1` o con `s1` no aparece | RN-05, RN-02, RN-03, RN-13 |
| Disponibilidad de `pr1` con un hueco 12:45-13:15 | No aparece (cruza el corte 13:00-15:00) | RN-17, RN-13 |
| Disponibilidad el miércoles 2026-11-25 a las 15:00 | `p1` excluida por su bloqueo 15:00-17:00; se ofrecen `p2`/`s1` y `p2`/`s2` | RN-07, RN-13 |
| Profesional con `prestacionIds` que no incluye la prestación | Nunca aparece en la disponibilidad de esa prestación | RN-13 |
| `ahora` = lunes 10:07 y consulta del lunes | No aparece ningún hueco con inicio anterior a 10:07 | RN-13 |
| Disponibilidad del sábado 2026-11-28 | Lista vacía (sin tramos de atención) | RN-07, RN-13 |
| Rango invertido, vacío o de más de 31 días; `pasoMinutos` 0, 7 o 12,5 | Rechazado como consulta inválida (validación de entrada, sin código RN) | RN-13 |
| Reserva online de `pr2` el lunes 2026-11-23 09:00 con DNI ficticio 00000004: el primer combo es `p1`/`s1` y `p1` está habilitada | Turno `reservado`, `origen: 'online'`, con `p1`/`s1` | RN-19, RN-13 |
| Reserva online donde el combo tomado es de un profesional cuyo `prestacionIds` no incluye la prestación | Rechazado (la verificación explícita no confía solo en el combo) | RN-19 |
| Reserva online con `inicio` lunes 2026-11-23 09:00 y `ahora` lunes 10:07 | Rechazado | RN-20 |
| Reserva online con `inicio` igual a `ahora` | Válido si hay hueco (solo se rechaza `inicio < ahora`, igual que RN-13) | RN-20 |
| Reserva online exitosa para DNI 00000004 | Respuesta con el token en claro una sola vez; el repositorio guarda solo el hash SHA-256; dos reservas distintas generan tokens distintos | RN-21, RN-15 |
| Token de un turno cancelado, o con `ahora` posterior al `fin` del turno | `resolver` no lo acepta (vencido) | RN-21 |
| Reserva online con DNI 00000001 (existe: Carla Prueba) y teléfono distinto | Turno vinculado a `pa1`; el teléfono de `pa1` no se modifica; la respuesta es indistinguible de la de un DNI nuevo | RN-22 |
| Reserva online que choca con un turno de otro paciente (carrera sin combo alternativo) | Error público genérico "horario no disponible", sin `turnoEnConflicto` ni datos del otro paciente | RN-22, RN-12 |
| DNI 00000004 con 2 turnos online activos futuros intenta un tercero | Rechazado | RN-23 |
| DNI 00000004 repite la misma reserva (misma prestación e `inicio`, turno activo) | No crea otro turno ni reentrega el token | RN-23 |

## Dominio: Cancelación y reprogramación

- **RN-08**: el paciente puede cancelar o reprogramar online solo con 24 h o más de anticipación respecto de `inicio`. Con menos de 24 h, solo puede hacerlo la recepción. (Con exactamente 24 h se permite: umbral `>= 24 h`.)
  - Precisión *(explore C-02, 2026-11-22, DD-19)*: la anticipación es `inicio - ahora >= 24 h` medida en milisegundos, con `ahora` del puerto `Reloj`. El rechazo lleva el código `RN-08` y se evalúa después de la transición de estado (RN-10).
- **RN-09**: cancelar un turno libera el horario del profesional y del sillón.
  - Precisión *(explore C-02, 2026-11-22, DD-19)*: se cumple porque un turno `cancelado` no es activo (DD-05); el turno no se borra y registra `canceladoPor` (rol) y `canceladoEn`.

## Dominio: Ciclo de vida del turno (derivadas de D.3, no del checklist)

- **RN-10** *(derivada de D.3)*: todo turno tiene un estado entre `reservado`, `confirmado`, `cancelado`, `ausente` y `atendido`. D.3 lista confirmado, cancelado, ausente y atendido; `reservado` es el estado inicial de la reserva online del paciente; el alta interna nace `confirmado` (DD-11).
  - Precisión *(explore C-02, 2026-11-22, DD-19)*: solo se cancela desde `reservado` o `confirmado`, sin importar si el `inicio` ya pasó; cancelar un turno `cancelado`, `atendido` o `ausente` se rechaza con el código `RN-10`, informando el estado actual del turno.
- **RN-11** *(derivada, suposición)*: reprogramar es atómico: el turno nuevo se valida contra RN-01 a RN-07 ignorando el propio turno; si falla, el turno original queda intacto. Cumple RN-09 al liberar el horario original solo si la reprogramación se concreta.
- **RN-12** *(derivada de RN-04, suposición)*: la validación de solapamiento y la persistencia deben ser atómicas para evitar condiciones de carrera entre dos reservas simultáneas (reserva online más recepción). En memoria: sección crítica; en PostgreSQL: restricción de exclusión o transacción serializable.

## Dominio: Reserva online y recordatorios (derivadas de D.3 y checklist 5 y 8)

- **RN-13** *(derivada; refinada en explore C-07, 2026-11-21, DD-12)*: la consulta de disponibilidad solo ofrece huecos donde existan a la vez un profesional **habilitado** (activo y cuyo `prestacionIds` incluye la prestación) y un sillón activo libres durante toda la duración efectiva, cumpliendo RN-01 a RN-07, RN-17 y RN-18. Precisiones:
  - Es una **lectura instantánea**: no reserva el hueco ni modifica la agenda, y es idempotente. Si el hueco se ocupa entre la consulta y el alta, lo resuelve RN-12 al agendar.
  - Devuelve combinaciones `{inicio, fin, profesionalId, sillonId}` en orden determinista: `inicio`, luego `profesionalId`, luego `sillonId`. Para la vista del paciente se agrupan por horario único; la reserva online toma el primer combo del horario elegido (el paciente no elige el sillón, SU-05 — **Suposición**).
  - Los inicios candidatos se alinean al inicio de cada tramo de atención con un paso `pasoMinutos` (por defecto 15).
  - Se excluyen los huecos cuyo `inicio` es anterior a `ahora` (instante actual informado por quien consulta).
  - El rango consultado `[desde, hasta)` es semiabierto y de hasta 31 días; un hueco pertenece al rango si su `inicio` está dentro.
  - La duración sigue RN-06 y RN-16 (el paciente solo consulta con la duración de la prestación).
  - Rango invertido o vacío, rango de más de 31 días y `pasoMinutos` que no sea entero > 0 múltiplo de 5 son **validación de entrada** de la consulta (no son reglas de agenda y no llevan código RN propio).
  - Errores de la consulta, en orden fijo (se informa solo el primero): consulta inválida (rango, luego paso; `ConsultaInvalidaError`), prestación inexistente, profesional filtrado inexistente (`RecursoNoEncontradoError`), prestación inactiva (RN-18), RN-16 y RN-06. Un profesional filtrado que existe pero no está habilitado o está inactivo da lista vacía, no error. Los rechazos de un candidato puntual (turnos, bloqueos, tramo, recursos inactivos) solo descartan ese combo y nunca lanzan.
  - `Prestacion.requiereSillonIds` no se considera todavía: cualquier sillón activo sirve (pregunta abierta, C-05). `AgendarTurno` (C-01) no exige la habilitación del profesional (pregunta abierta, ver RN-19, que la exige solo en la reserva online).
- **RN-14** *(derivada)*: el recordatorio por e-mail incluye el enlace de confirmación/cancelación; el enlace `wa.me` contiene el mensaje armado y lo envía manualmente la recepción (sin API, costo $0). Momento por defecto: 24 h antes (suposición).
- **RN-15** *(derivada)*: el token de gestión del turno es de un solo turno, no adivinable y no revela datos de otros pacientes.
- **RN-19** *(decisión de explore C-10, 2026-11-21, DD-14)*: en la reserva online solo un profesional **habilitado** (su `prestacionIds` incluye la prestación) puede recibir el turno. `ReservarOnline` lo verifica de forma explícita además de tomar el combo de C-07 (defensa en profundidad); "habilitado" exige además que el profesional esté **activo** (implementado en C-10, también para el `profesionalId` pedido y para las ofertas de nuevos horarios). El alta interna (`AgendarTurno`) no cambia; la pregunta abierta sobre exigirlo también en el alta queda referida a esta regla.
- **RN-20** *(decisión de explore C-10, 2026-11-21, DD-14)*: la reserva online no admite un `inicio` anterior a `ahora` (instante dado por el `Reloj`).
- **RN-21** *(decisión de explore C-10, 2026-11-21, DD-15)*: cada turno online tiene exactamente un token de gestión de alta entropía, almacenado solo como hash y válido hasta el `fin` del turno o su cancelación (sin TTL propio; el vencimiento se calcula al resolver con `ahora >= fin`, sin guardar fecha de expiración). El token en claro se devuelve una única vez en la respuesta de la reserva y nunca se expone en logs ni en listados. Concreta RN-15.
- **RN-22** *(decisión de explore C-10, 2026-11-21, DD-14)*: la ruta pública no modifica los datos de un paciente existente (identificado por DNI), no revela que el DNI ya existía ni expone datos de otros pacientes o turnos (p. ej. nunca devuelve `turnoEnConflicto` ni `bloqueoEnConflicto`). Amplía RN-15 y RN-D-02; los `ReglaNegocioError` se mapean a un error público genérico. Implementación (C-10): todo rechazo se expresa como `ErrorReservaPublica` con un código cerrado (`DATOS_INVALIDOS`, `RESERVA_EN_PASADO`, `PRESTACION_NO_DISPONIBLE`, `PROFESIONAL_NO_DISPONIBLE`, `RESERVA_DUPLICADA`, `LIMITE_DE_TURNOS`, `HORARIO_NO_DISPONIBLE`) evaluados en ese orden, mensaje genérico fijo y sin `cause`; los errores de dominio de C-01/C-07 (`ReglaNegocioError`, `RecursoNoEncontradoError`, `ConsultaInvalidaError`) que escapen de la consulta o del alta se traducen a `HORARIO_NO_DISPONIBLE` con nueva oferta y nunca se propagan, mientras que un error inesperado (p. ej. de infraestructura) **se propaga sin enmascarar**. El paciente nuevo se guarda solo después de crear el turno, así que ningún rechazo deja pacientes huérfanos.
- **RN-23** *(decisión de explore C-10, 2026-11-21, DD-14)*: un DNI no puede tener más de 2 turnos online activos futuros (constante configurable). Una reserva repetida (mismo DNI, misma prestación y mismo `inicio` con turno activo) no crea otro turno ni reentrega el token. Implementación (C-10): el duplicado se evalúa antes que el tope; el tope cuenta los turnos del DNI con `origen: 'online'`, estado activo e `inicio >= ahora` (no cuentan cancelados, ausentes, ya iniciados ni los de recepción).

## Dominio: Datos y cumplimiento (restricciones del checklist, punto 9)

- **RN-D-01** *(restricción)*: nunca se almacenan datos reales de pacientes en el repositorio, tests, fixtures, ejemplos ni capturas; solo datos ficticios.
- **RN-D-02** *(restricción)*: el sistema debe respetar la Ley 25.326 (protección de datos personales; los datos de salud son sensibles) y la Ley 26.529 (derechos del paciente e historia clínica): mínimo dato necesario, consentimiento de contacto, control de acceso por rol y no exponer datos de otros pacientes. La Ley 27.706 es referencia para etapas con ficha clínica.
- **RN-D-03** *(derivada)*: las claves de usuarios se guardan con hash; nunca en texto plano ni en logs.

## Dominio: Excepciones globales

- Ninguna regla de agenda (RN-01 a RN-07, RN-17, RN-18) admite excepción por rol ni por canal (RN-04).
- RN-08 se aplica solo al paciente; la recepción y el administrador pueden cancelar o reprogramar con cualquier anticipación, siempre respetando RN-01 a RN-07, RN-17 y RN-18. Hasta C-09, el caso de uso de cancelación trata al odontólogo como a la recepción (DD-19).
- Bloqueo creado sobre turnos existentes: sin regla confirmada (pregunta abierta; ver DD-06 como suposición provisoria).
