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
| Desactivar `p1` con un turno `confirmado` de `p1` el martes 09:00 y `ahora` lunes 10:00 | Rechazado; informa el turno en conflicto; `p1` sigue activa | RN-27 |
| Desactivar `s2` cuyo único turno es `cancelado`, `ausente` o `atendido`, o empezó antes de `ahora` | Válido; `s2` queda inactivo | RN-27 |
| Turno `reservado` de `pr2` con `inicio` igual a `ahora` y desactivación de `pr2` | Rechazado (umbral inclusivo `inicio >= ahora`) | RN-27 |
| `p2` con tramo propio lunes 14:00-18:00; turno de `p2` lunes 14:00 | Válido (prevalece el horario propio del día) | RN-28 |
| Mismo caso; turno de `p2` lunes 09:00 | Rechazado: el tramo del consultorio no aplica a `p2` ese día | RN-28, RN-07 |
| Mismo caso; turno de `p2` martes 09:00 o de `p1` lunes 09:00 | Válido (sin horario propio ese día: rige el del consultorio) | RN-28 |
| Prestación con `duracionMinutos` 0, -15, 32 o 12,5 | Rechazada como configuración inválida | RN-29 |
| Tramo con `desde` 13:00 y `hasta` 09:00, `diaSemana` 7 u hora `9:00` | Rechazado como configuración inválida | RN-29 |
| Tramo del consultorio lunes 12:00-14:00 con el existente 09:00-13:00 | Rechazado (solapa en el mismo ámbito); 13:00-15:00 es válido (contiguo, RN-05) | RN-29 |
| Tramo de `p2` lunes 09:00-13:00 junto al tramo del consultorio lunes 09:00-13:00 | Válido (ámbitos distintos) | RN-29 |

## Dominio: Cancelación y reprogramación

- **RN-08**: el paciente puede cancelar o reprogramar online solo con 24 h o más de anticipación respecto de `inicio`. Con menos de 24 h, solo puede hacerlo la recepción. (Con exactamente 24 h se permite: umbral `>= 24 h`.)
  - Precisión *(explore C-02, 2026-11-22, DD-19)*: la anticipación es `inicio - ahora >= 24 h` medida en milisegundos, con `ahora` del puerto `Reloj`. El rechazo lleva el código `RN-08` y se evalúa después de la transición de estado (RN-10).
- **RN-09**: cancelar un turno libera el horario del profesional y del sillón.
  - Precisión *(explore C-02, 2026-11-22, DD-19)*: se cumple porque un turno `cancelado` no es activo (DD-05); el turno no se borra y registra `canceladoPor` (rol) y `canceladoEn`.

## Dominio: Ciclo de vida del turno (derivadas de D.3, no del checklist)

- **RN-10** *(derivada de D.3)*: todo turno tiene un estado entre `reservado`, `confirmado`, `cancelado`, `ausente` y `atendido`. D.3 lista confirmado, cancelado, ausente y atendido; `reservado` es el estado inicial de la reserva online del paciente; el alta interna nace `confirmado` (DD-11).
  - Precisión *(explore C-02, 2026-11-22, DD-19)*: solo se cancela desde `reservado` o `confirmado`, sin importar si el `inicio` ya pasó; cancelar un turno `cancelado`, `atendido` o `ausente` se rechaza con el código `RN-10`, informando el estado actual del turno.
  - Precisión *(explore C-04, 2026-11-22, DD-20)*: las únicas transiciones fuera de la cancelación son `reservado → confirmado` (confirmar) y `confirmado → atendido | ausente` (cierre del turno). Cualquier otra, incluida repetir la misma transición (confirmar un turno ya `confirmado`), se rechaza con `RN-10` informando el estado actual, sin modificar el turno. Todas las transiciones salen de una única tabla del dominio.
- **RN-24** *(derivada del Flujo 7; decisión de explore C-04, 2026-11-22, DD-20)*: un turno solo se marca `atendido` o `ausente` cuando su `inicio` ya llegó (`ahora >= inicio`, umbral inclusivo, con `ahora` del puerto `Reloj`). Antes del `inicio` se rechaza con `RN-24`. Se evalúa después de la transición de estado (RN-10). Confirmar no tiene restricción horaria.
- **RN-11** *(derivada, suposición)*: reprogramar es atómico: el turno nuevo se valida contra RN-01 a RN-07 ignorando el propio turno; si falla, el turno original queda intacto. Cumple RN-09 al liberar el horario original solo si la reprogramación se concreta.
  - Precisión *(explore C-03, 2026-11-23, DD-22)*: solo se reprograman turnos `reservado` o `confirmado`; otro estado se rechaza con `RN-10`. El paciente además necesita `inicio - ahora >= 24 h` (RN-08, umbral inclusivo). El turno conserva `id`, paciente, estado y origen. El orden de rechazos es turno inexistente → `RN-10` → `RN-08` → reglas del nuevo horario en el orden del alta. Tras concretarse se programa el recordatorio con el nuevo `programadoPara` (RN-25).
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
  - Precisión *(explore C-12, 2026-11-22, DD-21)*: el e-mail de un turno `reservado` incluye el enlace para confirmar asistencia y el de gestión; el de un turno `confirmado` (p. ej. el alta interna, DD-11) incluye solo el de gestión. Confirmar desde el enlace un turno que ya está `confirmado` se trata como éxito sin cambios (la ruta pública no muestra el rechazo `RN-10`). Cancelar desde el enlace es C-11 y respeta RN-08.
  - Precisión *(explore C-13, 2026-11-23, DD-24)*: el enlace `wa.me` lleva solo el mensaje armado y **no** el enlace de gestión con token; lo abre la recepción y lo envía manualmente (RN-26), sin API ni costo.
- **RN-15** *(derivada)*: el token de gestión del turno es de un solo turno, no adivinable y no revela datos de otros pacientes.
- **RN-19** *(decisión de explore C-10, 2026-11-21, DD-14)*: en la reserva online solo un profesional **habilitado** (su `prestacionIds` incluye la prestación) puede recibir el turno. `ReservarOnline` lo verifica de forma explícita además de tomar el combo de C-07 (defensa en profundidad); "habilitado" exige además que el profesional esté **activo** (implementado en C-10, también para el `profesionalId` pedido y para las ofertas de nuevos horarios). El alta interna (`AgendarTurno`) no cambia; la pregunta abierta sobre exigirlo también en el alta queda referida a esta regla.
- **RN-20** *(decisión de explore C-10, 2026-11-21, DD-14)*: la reserva online no admite un `inicio` anterior a `ahora` (instante dado por el `Reloj`).
- **RN-21** *(decisión de explore C-10, 2026-11-21, DD-15)*: cada turno online tiene exactamente un token de gestión de alta entropía, almacenado solo como hash y válido hasta el `fin` del turno o su cancelación (sin TTL propio; el vencimiento se calcula al resolver con `ahora >= fin`, sin guardar fecha de expiración). El token en claro se devuelve una única vez en la respuesta de la reserva y nunca se expone en logs ni en listados. Concreta RN-15.
  - Precisión *(explore C-12, 2026-11-22, DD-21)*: cada envío de recordatorio rota el token (`rotar`): el token anterior, incluido el de la respuesta de la reserva, deja de ser válido y el vigente es el del último e-mail. Un turno interno sin token recibe el suyo en el primer envío, así que el token de gestión no es exclusivo de los turnos online. La rotación ocurre antes del envío; si el envío falla, el token anterior ya quedó invalidado.
- **RN-22** *(decisión de explore C-10, 2026-11-21, DD-14)*: la ruta pública no modifica los datos de un paciente existente (identificado por DNI), no revela que el DNI ya existía ni expone datos de otros pacientes o turnos (p. ej. nunca devuelve `turnoEnConflicto` ni `bloqueoEnConflicto`). Amplía RN-15 y RN-D-02; los `ReglaNegocioError` se mapean a un error público genérico. Implementación (C-10): todo rechazo se expresa como `ErrorReservaPublica` con un código cerrado (`DATOS_INVALIDOS`, `RESERVA_EN_PASADO`, `PRESTACION_NO_DISPONIBLE`, `PROFESIONAL_NO_DISPONIBLE`, `RESERVA_DUPLICADA`, `LIMITE_DE_TURNOS`, `HORARIO_NO_DISPONIBLE`) evaluados en ese orden, mensaje genérico fijo y sin `cause`; los errores de dominio de C-01/C-07 (`ReglaNegocioError`, `RecursoNoEncontradoError`, `ConsultaInvalidaError`) que escapen de la consulta o del alta se traducen a `HORARIO_NO_DISPONIBLE` con nueva oferta y nunca se propagan, mientras que un error inesperado (p. ej. de infraestructura) **se propaga sin enmascarar**. El paciente nuevo se guarda solo después de crear el turno, así que ningún rechazo deja pacientes huérfanos. *(Precisión, DD-32)*: la falla al programar los recordatorios de la reserva (RN-25, RN-26), que ocurre con el turno ya creado, no es un error de la consulta ni del alta: se propaga sin traducir y la ruta HTTP la responde como error inesperado (500 `ERROR_INTERNO`, sin token ni detalle).
- **RN-23** *(decisión de explore C-10, 2026-11-21, DD-14)*: un DNI no puede tener más de 2 turnos online activos futuros (constante configurable). Una reserva repetida (mismo DNI, misma prestación y mismo `inicio` con turno activo) no crea otro turno ni reentrega el token. Implementación (C-10): el duplicado se evalúa antes que el tope; el tope cuenta los turnos del DNI con `origen: 'online'`, estado activo e `inicio >= ahora` (no cuentan cancelados, ausentes, ya iniciados ni los de recepción).
- **RN-25** *(decisión de explore C-12, 2026-11-22, DD-21)*: programación y envío del recordatorio por e-mail.
  - Al dar de alta un turno (por cualquier canal) o reprogramarlo se programa su recordatorio con `programadoPara = inicio - RECORDATORIO_HORAS_ANTES` (24 por defecto). Programar es idempotente: si ya hay uno `pendiente` lo reemplaza con el nuevo `programadoPara`, sin duplicar.
  - No se crea recordatorio por e-mail si el paciente no dio `consentimientoContacto` o no tiene e-mail (el canal `wa_me` es C-13).
  - Al cancelar el turno, sus recordatorios `pendiente` pasan a `cancelado`.
  - El envío lo hace un barrido con `ahora` del `Reloj`: toma los `pendiente` con `programadoPara <= ahora`. Si el turno ya no está activo (cancelado, atendido o ausente) o `ahora >= inicio`, el recordatorio pasa a `cancelado` sin enviarse; si no, se envía. Un turno creado con menos anticipación que `RECORDATORIO_HORAS_ANTES` sale en el primer barrido.
  - Envío exitoso → `enviado` con `enviadoEn`. Envío fallido → `fallido` con `motivoFallo` y sin reintento automático; la recepción consulta la lista de fallidos (aviso a recepción).
  - El e-mail lleva el mínimo dato (RN-D-02): fecha y hora local, prestación, profesional, consultorio y enlaces. Nunca DNI, teléfono ni datos clínicos; el token en claro solo va en el enlace y nunca en logs ni en el registro del recordatorio.
  - Precisión *(explore C-13, 2026-11-23, DD-24)*: la búsqueda del pendiente a reemplazar y el barrido se acotan al canal `email`, para no sobrescribir ni enviar por e-mail los recordatorios `wa_me`. `cancelarPendientes` sigue anulando ambos canales.
- **RN-26** *(decisión de explore C-13, 2026-11-23, DD-24)*: programación y marca manual del recordatorio por `wa.me`.
  - Se programa al dar de alta o reprogramar un turno, con `programadoPara = inicio - RECORDATORIO_HORAS_ANTES` (24 h por defecto, SU-07), si y solo si el paciente dio `consentimientoContacto` y tiene teléfono argentino válido (10 a 13 dígitos, `+54` opcional). No exige e-mail. Programar es idempotente: reemplaza el `wa_me` `pendiente` conservando su `id`; no toca `enviado`, `fallido` ni `cancelado`.
  - El `enlaceWaMe` es `https://wa.me/<digitos>?text=<mensaje codificado con encodeURIComponent>`, con fecha y hora local, prestación, profesional y consultorio. Nunca incluye el token de gestión, el enlace de gestión, DNI, e-mail ni datos clínicos (RN-21, RN-D-02).
  - No hay envío automático ni API: la recepción ve todos los `wa_me` `pendientes` ordenados por `programadoPara` (`id`, `turnoId`, `enlaceWaMe`, `programadoPara`), abre el enlace y marca el recordatorio como enviado por `id`. La marca es idempotente sobre `enviado` (conserva `enviadoEn`), asienta `enviadoEn` desde el `Reloj` sobre `pendiente`, y rechaza con error tipado un id inexistente o un estado `cancelado`/`fallido`.
  - Los canales son independientes: programar el e-mail no reemplaza el `wa_me` pendiente, el barrido de e-mail no envía los `wa_me`, y cancelar el turno anula los pendientes de ambos canales (RN-25). Costo $0 (DD-03, SU-01).
- **RN-30** *(decisión del propose de C-14, 2026-11-23, DD-30; numeración desde RN-30 porque C-05 reserva RN-27 a RN-29)*: horizonte de la reserva online. Por las rutas públicas solo se ofrecen y admiten horarios cuyo día local (zona del consultorio) esté entre hoy y hoy + 30 días, ambos inclusive, según el `Reloj`. Se valida en el servidor (disponibilidad pública, reserva y reprogramación por token), no solo en la pantalla. Fuera del horizonte: la disponibilidad responde `DATOS_INVALIDOS` (`fecha`) y la reserva o reprogramación `HORARIO_NO_DISPONIBLE`, sin crear ni mover turnos. No aplica a la recepción ni al administrador.

## Dominio: Configuración del consultorio (US-008)

- **RN-27** *(decisión de explore C-05, 2026-11-23, DD-25)*: un profesional, un sillón o una prestación no se pueden desactivar mientras tengan **turnos activos futuros**: turnos con ese recurso en estado `reservado` o `confirmado` e `inicio >= ahora` (umbral inclusivo, con `ahora` del puerto `Reloj`). El rechazo lleva el código `RN-27` y lista todos los turnos en conflicto ordenados por `inicio`, sin modificar el recurso. La desactivación es lógica (`activo`/`activa` en `false`; nunca se borra) y se puede revertir (reactivación). Los turnos `cancelado`, `ausente` o `atendido`, y los que empezaron antes de `ahora`, no impiden desactivar. Que un recurso inactivo no reciba turnos nuevos ya lo garantiza RN-18.
- **RN-28** *(decisión de explore C-05, 2026-11-23, DD-26; resuelve SU-09)*: el horario propio del profesional prevalece **por día de la semana**: si el profesional tiene al menos un tramo propio para el `diaSemana` del turno, ese día solo valen sus tramos; si no tiene, valen los tramos del consultorio. Rige en todo lugar donde se evalúa el horario (alta, disponibilidad y reprogramación), con RN-07 y RN-17 aplicados sobre los tramos resultantes. Un profesional sin horario propio se comporta exactamente como antes de C-05.
- **RN-29** *(decisión de explore C-05, 2026-11-23, DD-27)*: validez de la configuración. Una prestación tiene `duracionMinutos` entero > 0 y múltiplo de 5 (alineado con RN-06). Un tramo de `HorarioAtencion` tiene `diaSemana` entero de 0 a 6, `desde` y `hasta` con formato `HH:mm` de 24 h (00:00 a 23:59) y `desde < hasta`, y no puede solaparse (intervalo semiabierto, RN-05) con otro tramo del mismo día y del mismo ámbito (el del consultorio, o el del mismo profesional); tramos contiguos son válidos. Los nombres (y el apellido del profesional) son obligatorios: se recortan los espacios de los extremos y el resultado no puede quedar vacío ni superar 80 caracteres; la matrícula es opcional, pero si se informa sigue la misma regla. Igual que en RN-13, estas comprobaciones son validación de entrada: se informan con un error de configuración inválida que indica el campo, sin ampliar `CodigoRN`.

## Dominio: Datos y cumplimiento (restricciones del checklist, punto 9)

- **RN-D-01** *(restricción)*: nunca se almacenan datos reales de pacientes en el repositorio, tests, fixtures, ejemplos ni capturas; solo datos ficticios.
- **RN-D-02** *(restricción)*: el sistema debe respetar la Ley 25.326 (protección de datos personales; los datos de salud son sensibles) y la Ley 26.529 (derechos del paciente e historia clínica): mínimo dato necesario, consentimiento de contacto, control de acceso por rol y no exponer datos de otros pacientes. La Ley 27.706 es referencia para etapas con ficha clínica.
- **RN-D-03** *(derivada)*: las claves de usuarios se guardan con hash; nunca en texto plano ni en logs.

## Dominio: Excepciones globales

- Ninguna regla de agenda (RN-01 a RN-07, RN-17, RN-18) admite excepción por rol ni por canal (RN-04).
- RN-08 se aplica solo al paciente; la recepción y el administrador pueden cancelar o reprogramar con cualquier anticipación, siempre respetando RN-01 a RN-07, RN-17 y RN-18. Hasta C-09, el caso de uso de cancelación trata al odontólogo como a la recepción (DD-19).
- Bloqueo creado sobre turnos existentes: sin regla confirmada (pregunta abierta; ver DD-06 como suposición provisoria).
