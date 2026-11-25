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
| Turno (alta) | CRU | CRU | `-` (no da turnos; DD-34) | C (vía reserva online) |
| Turno (cancelar/reprogramar) | siempre | siempre (incluye < 24 h) | `-` (DD-34) | propio, solo con >= 24 h (RN-08) |
| Turno (confirmar) | sí | sí | `-` (DD-34) | propio, por su enlace |
| Turno (marcar atendido o ausente) | sí | sí | solo los de su profesional (DD-34) | `-` |
| Disponibilidad (huecos) | sí | sí | sí | sí (ruta pública) |
| Agenda (lectura) | toda | toda | propia | `-` (solo disponibilidad pública y su turno) |
| BloqueoHorario | CRUD | CRUD | CRUD propios | `-` |
| Profesional, Sillón, Prestación, HorarioAtención | CRUD | R | R | R (solo catálogo público de prestaciones) |
| Paciente (datos de contacto) | CRUD | CRU | R de sus turnos | RU propio |
| Paciente: búsqueda y alta rápida (C-15) | sí | sí | `-` (en la agenda ve solo el nombre de sus pacientes) | `-` |
| Usuario / Rol | CRUD | `-` | `-` | `-` |
| Recordatorios | R (listar `wa.me` pendientes y fallidos) | RU (listar y marcar enviado) | `-` | `-` |

Reglas transversales de permisos:

- **Dónde se aplica** (DD-33): en los casos de uso, con una única política `autorizar(actor, accion)` / `autorizarSobre(actor, accion, recurso)`. Si el rol no puede hacer la acción se rechaza antes de leer datos; si depende del recurso ("propio"), después de leerlo y antes de cualquier regla RN. El rechazo es `AccesoDenegadoError` sin código RN (DD-28), con el rol y la acción, nunca con datos del recurso.
- **Identidad del actor** (DD-33): el actor interno sale de la sesión del usuario (DD-37); el odontólogo siempre trae su `profesionalId`. El paciente no tiene usuario: su actor lo arman las rutas públicas y, cuando opera sobre un turno, trae el `turnoId` de su token.

- **Ningún rol puede forzar un solapamiento** (RN-04); el administrador tampoco.
- Si el odontólogo puede dar un turno sobre su propio bloqueo es una pregunta abierta (ver `10_preguntas_abiertas.md`). Por defecto, no (RN-07).
- No hay datos clínicos en el MVP; en etapas posteriores, recepción no verá lo clínico (patrón observado en DentalCore, con 4 roles).

## Rutas públicas (sin autenticación)

- Enlace de reserva online del consultorio: consulta de prestaciones, profesionales y disponibilidad. Se puede mostrar el nombre y apellido de los profesionales (personal del consultorio); nunca el sillón interno ni datos de pacientes (DD-18).
- Alta de reserva por el paciente: identificación mínima sin cuenta (DNI, nombre, apellido, teléfono y consentimiento de contacto; e-mail opcional; DD-14, DD-17). La respuesta incluye `inicio`, `fin`, el nombre de la prestación y el nombre y apellido del profesional asignado (DD-18). La ruta pública no modifica pacientes existentes ni revela datos de otros (RN-22).
- Enlace de gestión del turno con **token no adivinable** (confirmar, cancelar, reprogramar), sujeto a RN-08. Cada recordatorio rota el token: solo el último enlace recibido es válido (DD-15).

- Rutas concretas (C-14, DD-29): páginas `GET /public/reservar` y `GET /public/turnos/:token` (y `.../confirmar`); API `GET /public/prestaciones`, `GET /public/prestaciones/:prestacionId/profesionales`, `GET /public/disponibilidad`, `POST /public/reservas`, `GET /public/turnos/:token` (JSON), `POST /public/turnos/:token/{confirmar,cancelar,reprogramar}` y `GET /public/turnos/:token/disponibilidad`. Ningún `GET` modifica un turno; los logs redactan el token; reserva y reprogramación limitadas a 30 días (RN-30).

Todo lo demás requiere autenticación (usuario con rol).
