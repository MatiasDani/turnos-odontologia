# Funcionalidades

Organizadas por épica e historia de usuario (US-NNN). Etapa: **MVP** (D.3 "Imprescindible"), **DIF** (diferenciador), **POST** (etapas posteriores). Los casos de uso 1 a 5 del checklist (punto 3) están mapeados en cada historia. El caso 1 (dar un turno sin solapamiento) **bloquea el MVP y es el primer change**.

## Épica 1: Agenda por recursos y alta de turnos (MVP)

### US-001 — Dar un turno sin solapamientos (primer change)
**Como** recepción
**Quiero** dar un turno asignando profesional, sillón y prestación
**Para** que no se superponga con otro turno

**Criterios de aceptación**:
- [ ] El turno ocupa profesional y sillón durante la duración de la prestación; `fin = inicio + duración`.
- [ ] Se rechaza si se solapa con un turno activo del mismo profesional o del mismo sillón.
- [ ] Turnos contiguos (fin = inicio del otro) son válidos.
- [ ] Se rechaza fuera del horario de atención o sobre un bloqueo.
- [ ] Ningún rol puede forzar el solapamiento (sin sobreturnos).
- [ ] El error informa el código `RN-XX` violado y el turno en conflicto.

**Reglas relacionadas**: RN-01, RN-02, RN-03, RN-04, RN-05, RN-06, RN-07, RN-12

### US-002 — Ver la agenda diaria y semanal
**Como** recepción u odontólogo
**Quiero** ver la agenda por día y por semana, por profesional y por sillón
**Para** conocer la ocupación

**Criterios de aceptación**:
- [ ] El odontólogo ve solo su agenda; recepción y administrador ven todas.
- [ ] Se visualizan estado del turno, prestación, paciente, sillón y bloqueos.
- [ ] Se puede filtrar por profesional y por sillón.

**Reglas relacionadas**: RN-01, RN-10

### US-003 — Consultar disponibilidad
**Como** recepción o paciente
**Quiero** ver los huecos libres para una prestación
**Para** elegir un horario viable

**Criterios de aceptación**:
- [ ] La disponibilidad respeta duración de la prestación, horario de atención, bloqueos y turnos activos.
- [ ] Solo se ofrecen huecos en los que exista un profesional y un sillón libres a la vez.

**Reglas relacionadas**: RN-01 a RN-07, RN-13

## Épica 2: Cancelación y reprogramación (MVP)

### US-004 — Cancelar un turno liberando el horario
**Como** recepción o paciente
**Quiero** cancelar un turno
**Para** liberar el horario

**Criterios de aceptación**:
- [ ] Al cancelar, el horario del profesional y del sillón queda disponible.
- [ ] El paciente solo puede cancelar online con 24 h o más de anticipación; con menos, solo recepción.
- [ ] Queda registrado quién canceló y cuándo.

**Reglas relacionadas**: RN-08, RN-09, RN-10

### US-005 — Reprogramar un turno
**Como** recepción o paciente
**Quiero** mover un turno a otro horario
**Para** adaptarlo sin perder el turno

**Criterios de aceptación**:
- [ ] El nuevo horario se valida con RN-01 a RN-07 ignorando el turno propio.
- [ ] Si falla, el turno original no se modifica.
- [ ] El paciente solo reprograma online con 24 h o más de anticipación.

**Reglas relacionadas**: RN-08, RN-11, RN-04

### US-006 — Gestionar estados del turno
**Como** recepción u odontólogo
**Quiero** marcar un turno como confirmado, ausente o atendido
**Para** mantener el seguimiento

**Criterios de aceptación**:
- [ ] Solo transiciones válidas (`reservado → confirmado`, `confirmado → atendido | ausente`, cancelación desde `reservado` o `confirmado`).
- [ ] Un turno `ausente` o `cancelado` no ocupa recursos.

**Reglas relacionadas**: RN-10

## Épica 3: Bloqueos y horarios (MVP)

### US-007 — Bloquear horarios
**Como** odontólogo
**Quiero** bloquear horarios de mi agenda
**Para** que no se den turnos cuando no atiendo

**Criterios de aceptación**:
- [ ] No se pueden dar turnos nuevos dentro de un bloqueo.
- [ ] Al crear un bloqueo sobre turnos activos, el sistema informa los conflictos y no los cancela en silencio (suposición provisoria DD-06).
- [ ] El odontólogo solo bloquea su propia agenda.

**Reglas relacionadas**: RN-07

### US-008 — Configurar profesionales, sillones, prestaciones y horarios
**Como** administrador
**Quiero** configurar los recursos y horarios de atención
**Para** que la agenda refleje la realidad del consultorio

**Criterios de aceptación**:
- [ ] ABM de profesionales, sillones y prestaciones (con duración en minutos).
- [ ] Horario de atención por consultorio y, opcionalmente, por profesional.
- [ ] No se desactiva un recurso con turnos activos futuros sin resolver.

**Reglas relacionadas**: RN-06, RN-07

## Épica 4: Reserva online del paciente (MVP)

### US-009 — Reservar un turno online 24/7
**Como** paciente
**Quiero** reservar un turno desde un enlace sin llamar
**Para** hacerlo cuando me convenga

**Criterios de aceptación**:
- [ ] Enlace público; el paciente elige prestación y horario entre la disponibilidad real.
- [ ] Se aplican las mismas reglas que en recepción (sin excepciones por canal).
- [ ] Recibe un enlace con token para gestionar su turno.
- [ ] Identificación mínima (DNI + teléfono o registro: pregunta abierta).

**Reglas relacionadas**: RN-01 a RN-07, RN-13, RN-15, RN-D-02

### US-010 — Cancelar o reprogramar online
**Como** paciente
**Quiero** cancelar o reprogramar desde el enlace de mi turno
**Para** liberar o mover el horario

**Criterios de aceptación**:
- [ ] Permitido solo con 24 h o más; con menos, se indica que debe contactar al consultorio.

**Reglas relacionadas**: RN-08, RN-09, RN-11

## Épica 5: Recordatorios y confirmación (MVP)

### US-011 — Recibir recordatorio y confirmar asistencia
**Como** paciente
**Quiero** recibir un recordatorio y confirmar mi asistencia
**Para** no olvidarme del turno

**Criterios de aceptación**:
- [ ] Se envía e-mail con enlace de confirmación (por defecto 24 h antes).
- [ ] Confirmar pasa el turno a `confirmado`.

**Reglas relacionadas**: RN-14, RN-10

### US-012 — Enviar recordatorio por wa.me
**Como** recepción
**Quiero** un enlace `wa.me` con el mensaje armado
**Para** enviar el recordatorio por WhatsApp sin API ni costo

**Criterios de aceptación**:
- [ ] El sistema genera la URL con teléfono del paciente y texto del turno.
- [ ] La recepción marca el recordatorio como enviado.

**Reglas relacionadas**: RN-14

## Épica 6: Acceso y roles (MVP)

### US-013 — Autenticación y roles básicos
**Como** administrador
**Quiero** que cada usuario acceda según su rol
**Para** proteger los datos

**Criterios de aceptación**:
- [ ] Roles: administrador, odontólogo, recepción y paciente (acceso por token).
- [ ] Matriz de `03_actores_y_roles.md` aplicada en cada caso de uso.
- [ ] Claves con hash.

**Reglas relacionadas**: RN-D-02, RN-D-03

## Épica 7: Diferenciadores (DIF, fuera del MVP)

- **US-020** Lista de espera con oferta automática de huecos liberados (al cancelar, ofrecer el hueco a pacientes compatibles en duración y profesional). Vacío de mercado C.3 punto 2.
- **US-021** Seguimiento de ausentes, mensaje de recuperación y recordatorio de controles periódicos.
- **US-022** Tablero de ocupación por sillón y profesional y tasa de ausentismo.
- **US-023** Recordatorios automáticos por WhatsApp Cloud API (número de prueba en desarrollo; costo por mensaje en producción).
- **US-024** Señas con Mercado Pago (sandbox en desarrollo; comisión en producción).
- **US-025** Precios en pesos publicados y plan gratuito acotado.

## Épica 8: Etapas posteriores (POST)

Ficha del paciente con anamnesis y odontograma básico (FDI); presupuesto, plan de tratamiento y caja; auditoría de accesos, exportación de datos del paciente y backups, consentimiento alineado con la Ley 25.326; facturación ARCA; obras sociales y prepagas; periodontograma e imágenes DICOM; multi-sucursal; chatbot de IA, API pública, Google Calendar; receta electrónica, firma digital, HL7 FHIR; importación desde otros sistemas.
