# Actores y Roles

## Actores del sistema

| Actor | Descripción | Cómo interactúa |
|---|---|---|
| Recepción / secretaria | Personal administrativo del consultorio | Da, mueve y cancela turnos para todos los profesionales; envía recordatorios por `wa.me`; atiende cancelaciones con menos de 24 h |
| Odontólogo | Profesional que atiende | Consulta su agenda; bloquea sus horarios |
| Paciente | Persona que se atiende | Reserva online por enlace público; confirma, cancela o reprograma (solo con 24 h o más de anticipación); recibe recordatorios |
| Administrador / dueño | Responsable del consultorio | Configura profesionales, sillones, prestaciones, horarios de atención y usuarios |
| Sistema (proceso) | Tareas automáticas | Genera recordatorios por e-mail y el enlace `wa.me` |

Segmento v1: consultorio de 1 a 5 profesionales y 1 a 3 sillones.

## RBAC — Matriz de permisos (MVP)

Leyenda: C crear, R leer, U actualizar, D eliminar/cancelar, `-` sin acceso, "propio" = solo recursos propios.

| Recurso | Administrador | Recepción | Odontólogo | Paciente |
|---|---|---|---|---|
| Turno (alta) | CRU | CRU | `-` (**Suposición**: solo lectura de los propios) | C (vía reserva online) |
| Turno (cancelar/reprogramar) | siempre | siempre (incluye < 24 h) | `-` | propio, solo con >= 24 h (RN-08) |
| Agenda (lectura) | toda | toda | propia | `-` (solo disponibilidad pública y su turno) |
| BloqueoHorario | CRUD | CRUD | CRUD propios | `-` |
| Profesional, Sillón, Prestación, HorarioAtención | CRUD | R | R | R (solo catálogo público de prestaciones) |
| Paciente (datos de contacto) | CRUD | CRU | R de sus turnos | RU propio |
| Usuario / Rol | CRUD | `-` | `-` | `-` |
| Recordatorios | R | RU (marcar enviado, generar `wa.me`) | `-` | `-` |

Reglas transversales de permisos:

- **Ningún rol puede forzar un solapamiento** (RN-04); el administrador tampoco.
- Si el odontólogo puede dar un turno sobre su propio bloqueo es una pregunta abierta (ver `10_preguntas_abiertas.md`). Por defecto, no (RN-07).
- No hay datos clínicos en el MVP; en etapas posteriores, recepción no verá lo clínico (patrón observado en DentalCore, con 4 roles).

## Rutas públicas (sin autenticación)

- Enlace de reserva online del consultorio: consulta de prestaciones, profesionales y disponibilidad (pregunta abierta: si se exponen nombres de profesionales).
- Alta de reserva por el paciente: identificación mínima sin cuenta (DNI, teléfono y consentimiento de contacto; DD-14). La ruta pública no modifica pacientes existentes ni revela datos de otros (RN-22).
- Enlace de gestión del turno con **token no adivinable** (confirmar, cancelar, reprogramar), sujeto a RN-08.

Todo lo demás requiere autenticación (usuario con rol).
