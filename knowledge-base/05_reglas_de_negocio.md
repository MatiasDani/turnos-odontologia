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
| Turno de 60 min que termina después del cierre | Rechazado | RN-07, RN-06 |
| Turno sobre un bloqueo del profesional (p1, miércoles 15:00-17:00) | Rechazado | RN-07 |
| Turno de `p2` en `s1` sobre un bloqueo de sillón `s1` (mismo intervalo) | Rechazado (bloqueo de sillón) | RN-07 |
| Turno con `pr1` (30 min) sin `duracionMinutos`, inicio 09:00 | `fin` 09:30 | RN-06 |
| Mismo turno con `duracionMinutos` 45 informada por recepción | `fin` 09:45 | RN-06, RN-16 |
| `duracionMinutos` 32 (no múltiplo de 5), 0 o negativa | Rechazado | RN-06 |
| Reserva online que informa `duracionMinutos` distinta de la prestación | Rechazado | RN-16 |
| Turno 12:30-13:00 (termina justo al cierre del tramo de la mañana) | Válido | RN-17, RN-05 |
| Turno 12:45-13:15 (cruza el corte 13:00-15:00) | Rechazado | RN-17 |
| Turno con profesional, sillón o prestación inactivos | Rechazado | RN-18 |
| Intento del administrador de forzar un solapamiento | Rechazado | RN-04 |

## Dominio: Cancelación y reprogramación

- **RN-08**: el paciente puede cancelar o reprogramar online solo con 24 h o más de anticipación respecto de `inicio`. Con menos de 24 h, solo puede hacerlo la recepción. (Con exactamente 24 h se permite: umbral `>= 24 h`.)
- **RN-09**: cancelar un turno libera el horario del profesional y del sillón.

## Dominio: Ciclo de vida del turno (derivadas de D.3, no del checklist)

- **RN-10** *(derivada de D.3)*: todo turno tiene un estado entre `reservado`, `confirmado`, `cancelado`, `ausente` y `atendido`. D.3 lista confirmado, cancelado, ausente y atendido; `reservado` es el estado inicial de la reserva online del paciente; el alta interna nace `confirmado` (DD-11).
- **RN-11** *(derivada, suposición)*: reprogramar es atómico: el turno nuevo se valida contra RN-01 a RN-07 ignorando el propio turno; si falla, el turno original queda intacto. Cumple RN-09 al liberar el horario original solo si la reprogramación se concreta.
- **RN-12** *(derivada de RN-04, suposición)*: la validación de solapamiento y la persistencia deben ser atómicas para evitar condiciones de carrera entre dos reservas simultáneas (reserva online más recepción). En memoria: sección crítica; en PostgreSQL: restricción de exclusión o transacción serializable.

## Dominio: Reserva online y recordatorios (derivadas de D.3 y checklist 5 y 8)

- **RN-13** *(derivada)*: la reserva online solo ofrece horarios libres que cumplan RN-01 a RN-07; el paciente no elige el sillón (lo asigna el sistema) — **Suposición**.
- **RN-14** *(derivada)*: el recordatorio por e-mail incluye el enlace de confirmación/cancelación; el enlace `wa.me` contiene el mensaje armado y lo envía manualmente la recepción (sin API, costo $0). Momento por defecto: 24 h antes (suposición).
- **RN-15** *(derivada)*: el token de gestión del turno es de un solo turno, no adivinable y no revela datos de otros pacientes.

## Dominio: Datos y cumplimiento (restricciones del checklist, punto 9)

- **RN-D-01** *(restricción)*: nunca se almacenan datos reales de pacientes en el repositorio, tests, fixtures, ejemplos ni capturas; solo datos ficticios.
- **RN-D-02** *(restricción)*: el sistema debe respetar la Ley 25.326 (protección de datos personales; los datos de salud son sensibles) y la Ley 26.529 (derechos del paciente e historia clínica): mínimo dato necesario, consentimiento de contacto, control de acceso por rol y no exponer datos de otros pacientes. La Ley 27.706 es referencia para etapas con ficha clínica.
- **RN-D-03** *(derivada)*: las claves de usuarios se guardan con hash; nunca en texto plano ni en logs.

## Dominio: Excepciones globales

- Ninguna regla de agenda (RN-01 a RN-07, RN-17, RN-18) admite excepción por rol ni por canal (RN-04).
- RN-08 se aplica solo al paciente; la recepción y el administrador pueden cancelar o reprogramar con cualquier anticipación, siempre respetando RN-01 a RN-07, RN-17 y RN-18.
- Bloqueo creado sobre turnos existentes: sin regla confirmada (pregunta abierta; ver DD-06 como suposición provisoria).
