# Decisiones y Supuestos

## Decisiones documentadas

### DD-01 — Stack tecnológico
**Decisión**: TypeScript sobre Node.js (LTS); lógica de dominio como módulos TypeScript puros (hexagonal/clean: dominio, aplicación/casos de uso, adaptadores); pruebas con **Vitest**; API REST opcional con **Fastify**; persistencia en **repositorios en memoria** para el MVP y pruebas, con **PostgreSQL** (free tier) como destino futuro; gestor de paquetes npm; layout `src/` y `tests/` en la raíz, según el TP.
**Contexto**: el stack no venía impuesto (checklist, punto 9); lo decidió el equipo de 6 estudiantes.
**Alternativas consideradas**: no se registraron alternativas formales en las fuentes. **Suposición:** se evaluó mantener el dominio independiente de framework frente a un backend acoplado a ORM.
**Justificación**: el diferencial es la regla de agenda por recursos; como dominio puro es verificable con TDD sin infraestructura, con costo $0.
**Trade-offs aceptados**: sin persistencia durable en el MVP; la migración a PostgreSQL es trabajo posterior; Fastify es opcional.

### DD-02 — Ajuste del MVP: reducción del alcance propuesto por el agente
**Decisión**: el MVP queda como en D.3 ajustado (agenda por recursos, turnos con estados, reserva online por enlace, recordatorios por e-mail y `wa.me`, roles básicos). Ficha clínica y odontograma, presupuesto y caja, y auditoría de accesos pasaron a **etapas posteriores**; WhatsApp Cloud API y Mercado Pago pasaron a **diferenciadores**.
**Contexto**: la primera versión del informe (generada por el agente) incluía como imprescindibles ficha con odontograma, presupuesto con caja y señas, auditoría y recordatorios por WhatsApp API. El equipo lo redujo el 2026-11-21 (protocolo de inspección, opción Ajustar) para alinearlo con el checklist confirmado.
**Alternativas consideradas**: el MVP amplio del agente (paridad con DentalCore, AgendaPro y otros).
**Justificación**: el problema priorizado es la agenda desordenada de consultorios chicos; hay restricción de costo $0 y el plazo del TP permite un change completo.
**Trade-offs aceptados**: menor paridad funcional con la competencia (que ya ofrece ficha, caja y ARCA); se compensa con el diferencial verificable de agenda sin solapamientos.

### DD-03 — Alternativas gratuitas para WhatsApp y Mercado Pago
**Decisión**: en el MVP, recordatorios por **e-mail** más enlace **`wa.me`** (click-to-chat, sin API, costo $0). **WhatsApp Cloud API** (número de prueba gratis en desarrollo) y **Mercado Pago** (sandbox) se incorporan después como diferenciadores.
**Contexto**: la restricción de costo $0 y que WhatsApp cobra por mensaje con plantilla en producción; Mercado Pago cobra comisión por cobro en producción.
**Alternativas consideradas**: WhatsApp vinculado por QR con el número propio (lo hace ZYRA); se descarta por el riesgo de incumplimiento de los términos de WhatsApp señalado en el informe. WhatsApp Cloud API desde el MVP.
**Justificación**: costo $0 y sin dependencia de terceros en el MVP.
**Trade-offs aceptados**: el envío por `wa.me` es manual (lo hace la recepción); supuesto no probado de que e-mail + `wa.me` reduzcan el ausentismo tanto como WhatsApp automático (ver SU-01).

### DD-04 — Intervalos semiabiertos [inicio, fin)
**Decisión**: todo intervalo de turno, bloqueo y horario es semiabierto; un turno que empieza cuando termina otro no se solapa (RN-05). Dos intervalos se solapan si y solo si `a1 < b2` y `b1 < a2`.
**Contexto**: evitar ambigüedad en turnos contiguos (09:00-09:45 y 09:45-10:30).
**Alternativas consideradas**: intervalos cerrados (rechazarían contiguos) o abiertos.
**Justificación**: convención estándar; permite agenda sin huecos artificiales y casos de borde bien definidos para TDD.
**Trade-offs aceptados**: la interfaz debe mostrar `fin` como hora exclusiva.

### DD-05 — Estados activos y ocupación de recursos
**Decisión**: son *activos* (ocupan profesional y sillón) los turnos `reservado`, `confirmado` y `atendido`; `cancelado` y `ausente` no ocupan recursos.
**Contexto**: D.3 lista confirmado, cancelado, ausente y atendido sin definir ocupación; RN-09 exige que cancelar libere el horario.
**Alternativas consideradas**: que `ausente` siga ocupando el hueco.
**Justificación**: coherencia con RN-02/RN-03 ("turnos activos") y RN-09.
**Trade-offs aceptados**: `reservado` es un estado añadido por el equipo (ver DD-11).

### DD-06 — Bloqueo sobre turnos existentes (provisoria)
**Decisión provisoria**: si al crear un bloqueo hay turnos activos debajo, el sistema informa los conflictos y no crea el bloqueo hasta que se reprogramen o cancelen.
**Contexto**: pregunta abierta del checklist (punto 11).
**Alternativas consideradas**: crear el bloqueo y marcar los turnos para reprogramar; cancelarlos automáticamente.
**Justificación**: no destruye turnos en silencio; es el comportamiento más conservador.
**Trade-offs aceptados**: más fricción para el odontólogo. A confirmar con el equipo.

### DD-07 — Datos ficticios únicamente y cumplimiento normativo
**Decisión**: nunca se almacenan datos reales de pacientes en el repositorio, tests ni ejemplos; solo datos ficticios. Se toman como restricción las Leyes 25.326 y 26.529.
**Contexto**: riesgo principal del checklist: datos sensibles de salud.
**Justificación**: obligación legal y de buena práctica; el MVP además evita datos clínicos.
**Trade-offs aceptados**: los tests y demos usan datos inventados.

### DD-08 — Un change completo de punta a punta
**Decisión**: el TP implementa un change completo; el primer change es "dar un turno sin solapamiento" (caso de uso 1, bloquea el MVP). El resto se documenta como roadmap.
**Justificación**: plazo del TP.

### DD-09 — Zona horaria IANA por consultorio
**Decisión** (2026-11-21, explore de C-01): cada consultorio define `Consultorio.zonaHoraria` (IANA), por defecto `America/Argentina/Buenos_Aires`. Los instantes se guardan en UTC (`Date`); el horario de atención se expresa `HH:mm` en hora local del consultorio. La conversión usa `Intl.DateTimeFormat({ timeZone })`, sin dependencias.
**Contexto**: antes era el supuesto SU-04 y la pregunta abierta del checklist (IN-04).
**Alternativas consideradas**: librería de fechas (luxon, date-fns-tz); offset fijo UTC-3.
**Justificación**: costo $0, sin dependencias y robusto ante cambios de offset.
**Trade-offs aceptados**: el dominio debe convertir hora local a UTC con cuidado en los bordes de cambio de offset.

### DD-10 — Duración del turno ajustable de forma opcional
**Decisión** (2026-11-21, explore de C-01): la duración puede ajustarse por turno. Sin `duracionMinutos`, `fin = inicio + prestacion.duracionMinutos`; con `duracionMinutos`, `fin = inicio + duracionMinutos`. Debe ser un entero > 0 y múltiplo de 5, sin tope (lo limita el horario de atención). Solo recepción, odontólogo y administrador pueden informarla; el paciente usa siempre la de la prestación (RN-06, RN-16).
**Contexto**: reemplaza el supuesto SU-06 (duración fija) y cierra la pregunta abierta del checklist.
**Alternativas consideradas**: duración fija por prestación; tope máximo por prestación.
**Justificación**: los casos reales varían (p. ej. una consulta que se extiende); el solapamiento sigue protegido porque se valida con `fin` efectivo.
**Trade-offs aceptados**: `Turno` persiste la duración efectiva además de `fin`.

### DD-11 — Estados del turno y estado inicial
**Decisión** (2026-11-21, explore de C-01): se mantienen los 5 estados (`reservado`, `confirmado`, `cancelado`, `ausente`, `atendido`). El turno creado por recepción, odontólogo o administrador nace `confirmado`; la reserva online del paciente (C-10) nace `reservado`. Activos: `reservado`, `confirmado`, `atendido` (DD-05).
**Contexto**: cierra SU-03 y la pregunta abierta sobre `reservado`.
**Alternativas consideradas**: eliminar `reservado`.
**Justificación**: la reserva online necesita una instancia de confirmación; el alta interna no.
**Trade-offs aceptados**: dos estados iniciales según el origen.

### DD-12 — Consulta de disponibilidad: combos, `ahora`, paso y estrategia
**Decisión** (2026-11-21, explore de C-07, Matías Ibañez): `ConsultarDisponibilidad` solo ofrece profesionales habilitados (su `prestacionIds` incluye la prestación) y cualquier sillón activo (no evalúa `requiereSillonIds`); `AgendarTurno` (C-01) no se modifica. Además:
- **Salida**: combinaciones `{inicio, fin, profesionalId, sillonId}` ordenadas de forma determinista (inicio, luego `profesionalId`, luego `sillonId`), con filtro opcional `profesionalId`, y un helper puro que las agrupa por horario único para la vista del paciente. C-10 toma el primer combo del horario elegido y llama a `AgendarTurno`; la carrera la resuelve RN-12.
- **Pasado y rango**: el input recibe `ahora: Date` (quien llama pasa `reloj.ahora()` cuando exista el `Reloj` de C-02); se excluyen huecos con `inicio < ahora`. Rango `{desde, hasta}` semiabierto, de hasta 31 días; rango invertido o vacío, o de más de 31 días, es error de validación.
- **Duración**: `duracionMinutos` opcional más `actor`, reutilizando RN-06 y RN-16 (el paciente solo con la duración de la prestación).
- **Granularidad**: `pasoMinutos` (entero > 0, múltiplo de 5, por defecto 15); los candidatos se alinean al inicio de cada tramo de atención.
- **Estrategia**: cada candidato (profesional habilitado × sillón × inicio) se evalúa con `validarAlta` de C-01, única fuente de verdad. La consulta es de solo lectura, no reserva el hueco y es idempotente.
**Contexto**: RN-13 y US-003 no definían formato de salida, granularidad, tratamiento del pasado ni límite del rango; C-10 necesita una salida estable para asignar el sillón.
**Alternativas consideradas**: devolver solo horarios agregados (pierde el recurso a asignar); calcular huecos por resta de intervalos libres (duplica la lógica de C-01); leer el reloj dentro del caso de uso (no hay `Reloj` hasta C-02); granularidad fija en fixture.
**Justificación**: una sola fuente de verdad garantiza que todo hueco ofrecido se pueda agendar; el orden determinista hace reproducibles los tests y la asignación de C-10; el tope de 31 días acota el costo de enumerar candidatos.
**Trade-offs aceptados**: la enumeración por candidato es O(días × inicios × profesionales × sillones), aceptable para 1-5 profesionales y 1-3 sillones; la disponibilidad y el alta pueden discrepar en la habilitación del profesional hasta resolver la pregunta abierta (posible RN-19).

## Supuestos inferidos

### SU-01 — E-mail + `wa.me` es suficiente frente a WhatsApp automático
**Supuesto**: reducen el ausentismo de forma comparable.
**Origen**: checklist, punto 10 (supuesto no probado).
**Riesgo si es falso**: el MVP pierde valor percibido frente a la competencia con WhatsApp automático.
**Cómo validar**: pilotear con un consultorio real (fuera del repositorio) o entrevistar usuarios.

### SU-02 — La secretaria adoptará el sistema en lugar de WhatsApp y papel
**Origen**: checklist, punto 10.
**Riesgo si es falso**: el sistema no se usa.
**Cómo validar**: entrevistas y prueba de usabilidad con una secretaria.

### SU-03 — Estado `reservado` previo a `confirmado` *(resuelto: DD-11, 2026-11-21)*
**Supuesto**: el alta crea el turno sin confirmar.
**Origen**: D.3 solo enumera confirmado, cancelado, ausente, atendido.
**Riesgo si es falso**: estados sobrantes; simplificable a `confirmado` en el alta.
**Cómo validar**: decisión del equipo antes del primer change.

### SU-04 — Zona horaria única por consultorio *(confirmado: DD-09, 2026-11-21)*
**Supuesto**: `America/Argentina/Buenos_Aires` (UTC-3, sin horario de verano) como valor por defecto, almacenada por consultorio.
**Origen**: contexto argentino; pregunta abierta del checklist.
**Riesgo si es falso**: errores de horario.
**Cómo validar**: confirmar con el equipo.

### SU-05 — El sistema asigna el sillón en la reserva online
**Supuesto**: el paciente elige prestación y horario; el sillón lo asigna el sistema.
**Origen**: inferido de D.3 ("respetando disponibilidad real, duración y recursos").
**Riesgo si es falso**: hace falta exponer el sillón al paciente.
**Cómo validar**: revisar con el equipo.

### SU-06 — Duración fija por prestación *(rechazado: reemplazado por DD-10, 2026-11-21)*
**Supuesto**: hasta resolver la pregunta abierta, la duración es la de la prestación (RN-06). El equipo decidió que sea ajustable por turno de forma opcional.
**Origen**: RN-06 del checklist.

### SU-07 — Recordatorio por defecto 24 h antes
**Supuesto**: el recordatorio se programa 24 h antes del turno (configurable).
**Origen**: inferido del umbral de RN-08 y de las prácticas del mercado (DentalCore 48 y 24 h; AgendaPro 1, 2 o 3 días).
**Cómo validar**: confirmar con el equipo.

### SU-08 — Un consultorio por instalación en el MVP
**Supuesto**: multi-sucursal queda fuera (etapa posterior).
**Origen**: D.3.

### SU-09 — Horario por profesional prevalece sobre el del consultorio
**Supuesto**: si existe horario propio del profesional, se usa ese; si no, el del consultorio.
**Origen**: inferido; el checklist solo habla de "horario de atención".
