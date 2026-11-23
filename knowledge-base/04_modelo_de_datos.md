# Modelo de Datos

> Modelo del MVP. Es agnóstico de la persistencia: en el MVP vive en repositorios en memoria; PostgreSQL es el destino futuro. Los tipos están expresados en TypeScript. **Todos los datos de ejemplo y seed son ficticios.**

## Dominios

- **Configuración del consultorio**: Consultorio, Profesional, Sillon, Prestacion, HorarioAtencion.
- **Agenda**: Turno, BloqueoHorario.
- **Personas y acceso**: Paciente, Usuario, Rol.
- **Comunicación**: Recordatorio.

## Convenciones de tiempo

- Un intervalo es **semiabierto [inicio, fin)** (RN-05). `fin = inicio + duración efectiva` (la de la prestación, o la informada en el turno; RN-06).
- Los instantes se guardan como `Date`/ISO 8601 en UTC; cada Consultorio define su `zonaHoraria` (IANA; por defecto `America/Argentina/Buenos_Aires`, UTC-3 sin horario de verano). **Decisión DD-09** (2026-11-21): el horario de atención `HH:mm` se interpreta en esa zona y la conversión se hace con `Intl.DateTimeFormat({ timeZone })`, sin dependencias.
- Los horarios de atención se expresan en hora local del consultorio (`HH:mm`) y se convierten al comparar.

## ERD (texto)

```
Consultorio 1 ──── * Profesional
Consultorio 1 ──── * Sillon
Consultorio 1 ──── * Prestacion
Consultorio 1 ──── * HorarioAtencion
Consultorio 1 ──── * Usuario
Profesional * ──── * Prestacion          (qué prestaciones realiza cada profesional)
Profesional 1 ──── * HorarioAtencion     (horario propio, opcional)
Profesional 1 ──── * BloqueoHorario      (opcional: bloqueo de un profesional)
Sillon      1 ──── * BloqueoHorario      (opcional: bloqueo de un sillón; al menos uno de los dos)
Profesional 1 ──── * Turno
Sillon      1 ──── * Turno
Prestacion  1 ──── * Turno
Paciente    1 ──── * Turno
Turno       1 ──── * Recordatorio
Turno       1 ──── 0..1 TokenGestion   (solo turnos online; se guarda el hash)
Usuario     * ──── 1 Rol
Usuario     0..1 ── 1 Profesional        (un usuario odontólogo se vincula a su profesional)
```

## Entidades

### Consultorio
- `id: string`, `nombre: string`, `zonaHoraria: string`, `telefonoContacto: string`, `email: string`.
- Relaciones: 1 a N con Profesional, Sillon, Prestacion, HorarioAtencion, Usuario.
- Constraint: tamaño objetivo 1 a 5 profesionales y 1 a 3 sillones (no se impone por código; es el segmento de diseño).
- MVP: un solo consultorio por instalación (multi-sucursal es etapa posterior).

### Profesional
- `id`, `consultorioId`, `nombre`, `apellido`, `matricula?: string` (ficticia en seed), `activo: boolean`, `prestacionIds: string[]`.
- Relaciones: N a N con Prestacion; 1 a N con Turno, BloqueoHorario.
- Constraint: un profesional inactivo no recibe turnos nuevos (RN-18). Baja lógica y reactivación; no se desactiva con turnos activos futuros (RN-26, DD-24). `nombre` y `apellido` obligatorios (recortados, no vacíos, hasta 80 caracteres) y `prestacionIds` sin repetidos, que existan (RN-28, DD-26). La consulta de disponibilidad (C-07) solo lo ofrece para las prestaciones de su `prestacionIds` (RN-13, DD-12); el alta de C-01 no lo exige (pregunta abierta).

### Sillon (Box)
- `id`, `consultorioId`, `nombre` (ej. "Sillón 1"), `activo: boolean`.
- Relaciones: 1 a N con Turno y BloqueoHorario.
- Constraint: no se admiten dos turnos activos solapados en el mismo sillón (RN-03). Baja lógica y reactivación; no se desactiva con turnos activos futuros (RN-26). `nombre` obligatorio (RN-28).

### Prestacion
- `id`, `consultorioId`, `nombre`, `duracionMinutos: number` (entero > 0 y múltiplo de 5, RN-28), `activa: boolean`, `requiereSillonIds?: string[]` (**Suposición**: opcional, para prestaciones que solo pueden hacerse en ciertos sillones; C-07 no lo evalúa: cualquier sillón activo sirve, DD-12 y pregunta abierta).
- Constraint: `duracionMinutos` es la duración por defecto del turno (RN-06). Cada turno puede ajustarla de forma opcional (DD-10, RN-16). Una prestación inactiva no puede usarse para dar turnos (RN-18). Baja lógica y reactivación; no se desactiva con turnos activos futuros (RN-26). Cambiar `duracionMinutos` no altera los turnos existentes. `requiereSillonIds` no existe en el código (C-05 no lo agrega; pregunta abierta).

### Paciente
- `id`, `nombre`, `apellido`, `dni: string`, `telefono: string` (para `wa.me`), `email?: string`, `consentimientoContacto: boolean`.
- Relaciones: 1 a N con Turno.
- Constraint: **solo datos ficticios en el repositorio** (Ley 25.326). Datos de salud: sensibles; en el MVP no se almacenan datos clínicos. La reserva online hace un alta mínima sin cuenta (DNI de 7-8 dígitos, nombre y apellido no vacíos de hasta 80 caracteres, teléfono normalizado y `consentimientoContacto` verdadero; e-mail opcional con formato válido; DD-17); si el DNI ya existe se reutiliza el paciente sin modificarlo (DD-14, RN-22). Puerto `PacienteRepositorio` (`obtenerPorDni`, `guardar`) creado por C-10 y extendido con `obtenerPorId` por C-12 (DD-16); C-05 no necesita extenderlo (DD-27).
- Índice: (`dni`) y (`telefono`) para búsqueda por recepción.

### Turno
- `id`, `pacienteId`, `profesionalId`, `sillonId`, `prestacionId`, `inicio: Date`, `fin: Date`, `duracionMinutos: number` (duración efectiva; entero > 0 y múltiplo de 5), `estado: EstadoTurno`, `origen: 'recepcion' | 'online'`, `creadoEn`, `actualizadoEn`, `canceladoEn?`, `canceladoPor?: Rol`.
  - Implementado (C-02, DD-19): `canceladoEn?: Date` y `canceladoPor?: Rol`, que solo tienen valor en los turnos `cancelado`; un turno cancelado no se borra. `creadoEn` y `actualizadoEn` todavía no existen en el código: C-04 los pospuso (DD-20) y quedan para el change que integre la persistencia real (ver `10_preguntas_abiertas.md`). C-04 no agrega campos al turno.
- `EstadoTurno`: `reservado` (reserva online del paciente, aún sin confirmar; **Decisión DD-11**), `confirmado` (nace así el turno creado por recepción, odontólogo o administrador), `cancelado`, `ausente`, `atendido`. D.3 del informe lista confirmado, cancelado, ausente y atendido.
- Estados **activos** (ocupan profesional y sillón): `reservado`, `confirmado`, `atendido`. Ver DD-05.
- Constraints: `fin = inicio + duracionMinutos` efectiva, que por defecto es `prestacion.duracionMinutos` (RN-06, RN-16); profesional, sillón y prestación activos (RN-18); contenido en un único tramo de atención (RN-17); sin solapamiento activo por `profesionalId` (RN-02) ni por `sillonId` (RN-03); dentro de HorarioAtencion y fuera de BloqueoHorario de su profesional y de su sillón (RN-07).
- Índices: (`profesionalId`, `inicio`), (`sillonId`, `inicio`), (`pacienteId`).
- Transiciones permitidas: `reservado → confirmado | cancelado`, `confirmado → atendido | ausente | cancelado`. Reprogramar conserva el `id` y cambia `inicio`/`fin`/recursos (ver flujo 3). Toda transición no permitida (incluida repetir la misma) se rechaza con `RN-10` informando el estado actual (C-02, DD-19; C-04, DD-20). Pasar a `atendido` o `ausente` exige además `ahora >= inicio` (RN-24). Implementado (C-04): las transiciones viven en una única tabla del dominio (`src/domain/reglas/transiciones.ts`) que usan la cancelación y los casos de uso `ConfirmarTurno`, `MarcarAtendido` y `MarcarAusente`.
- Modificación atómica: `TurnoRepositorio.actualizarSi(id, cambio)` lee el turno, aplica `cambio` y lo reemplaza sin intercalar otra operación (RN-12); `cambio` devuelve el turno nuevo (con el mismo `id`) o una violación. La usa la cancelación (C-02) y la reutilizan C-03 y C-04.

### TokenGestion
- `turnoId`, `hash: string` (SHA-256 del token, hexadecimal en minúsculas), `creadoEn`, `invalidadoEn?` (lo fija `rotar`; un token invalidado no resuelve).
- El token son 32 bytes aleatorios en base64url; solo se persiste su hash, nunca el valor en claro (DD-15, RN-21). Un token por turno; vence al pasar el `fin` del turno o al cancelarse (sin TTL propio).
- Relaciones: 1 a 1 con Turno. Índice: (`hash`) único.
- Servicio reutilizable por C-11 y C-12: `emitir(turnoId)`, `resolver(tokenPlano)` y `rotar(turnoId)` (emite uno nuevo e invalida el anterior; C-12 lo usa en cada recordatorio, DD-15).

### BloqueoHorario
- `id`, `profesionalId?`, `sillonId?` (al menos uno de los dos), `inicio: Date`, `fin: Date`, `motivo?: string`, `creadoPor: usuarioId`.
- Constraint: al menos uno de `profesionalId` / `sillonId` (cada campo se evalúa por separado; decisión de diseño de C-01); intervalo semiabierto; un bloqueo impide turnos nuevos que lo toquen: con `profesionalId`, los de ese profesional; con `sillonId`, los de ese sillón (RN-07). Qué pasa con turnos existentes bajo un bloqueo nuevo: pregunta abierta (por defecto, rechazar el bloqueo si hay turnos activos debajo y listar los conflictos; **Suposición**).

### HorarioAtencion
- `id`, `consultorioId`, `profesionalId?` (si es nulo, aplica al consultorio), `diaSemana: 0..6`, `desde: 'HH:mm'`, `hasta: 'HH:mm'`.
- Constraint: sin turnos fuera de horario de atención (RN-07). Si el profesional tiene tramos propios para un día de la semana, ese día solo valen sus tramos; si no, los del consultorio (RN-27, DD-25; resuelve SU-09). `diaSemana` entero 0..6, `desde`/`hasta` en `HH:mm` de 24 h con `desde < hasta`, sin solapar con otro tramo del mismo día y ámbito (consultorio, o el mismo profesional) (RN-28). Los tramos se agregan, modifican (sin cambiar de ámbito) y eliminan; no tienen baja lógica.

### Usuario
- `id`, `consultorioId`, `email`, `hashClave: string` (nunca en texto plano), `rolId`, `profesionalId?`, `activo`.
- Constraint: `email` único. Los pacientes no tienen usuario en el MVP: operan con el token de su turno (**Suposición**; DD-15).

### Rol
- `id`, `nombre: 'administrador' | 'odontologo' | 'recepcion' | 'paciente'`.
- Los permisos están en `03_actores_y_roles.md`.

### Recordatorio
- `id`, `turnoId`, `canal: 'email' | 'wa_me'`, `programadoPara: Date` (por defecto 24 h antes, **Suposición**), `estado: 'pendiente' | 'enviado' | 'fallido' | 'cancelado'`, `enlaceWaMe?: string`, `enviadoEn?`, `motivoFallo?: string`.
- Precisión *(explore C-12, 2026-11-22, DD-21)*: `programadoPara = inicio - RECORDATORIO_HORAS_ANTES` (24 por defecto, SU-07). Un turno tiene a lo sumo un recordatorio `email` `pendiente`: reprogramar el turno reemplaza el pendiente. `cancelado` registra un recordatorio anulado (turno cancelado, ya no activo o ya iniciado al momento del envío). `motivoFallo` describe el error de envío sin datos personales ni token. El recordatorio nunca guarda el token de gestión (ni en claro ni su hash).
- Para `wa_me`, no hay envío automático: el sistema genera la URL `https://wa.me/<telefono>?text=<mensaje>` y la recepción la abre y envía.

## Seed data inicial (100 % ficticia)

Un consultorio ficticio con datos de ejemplo para tests y demos. Los teléfonos usan un prefijo no real y los nombres son inventados.

| Entidad | Datos |
|---|---|
| Consultorio | `c1` "Consultorio Odontológico Demo", zona `America/Argentina/Buenos_Aires` |
| Roles | administrador, odontologo, recepcion, paciente |
| Usuarios | `admin@demo.test` (administrador), `recepcion@demo.test` (recepción), `dra.ejemplo@demo.test` (odontólogo, vinculada a `p1`) |
| Profesionales | `p1` Ana Ejemplo (matrícula ficticia 0001), `p2` Bruno Muestra (matrícula ficticia 0002) |
| Sillones | `s1` "Sillón 1", `s2` "Sillón 2" |
| Prestaciones | `pr1` Consulta/control 30 min, `pr2` Limpieza 45 min, `pr3` Extracción simple 60 min, `pr4` Endodoncia 90 min |
| Horario de atención | Lunes a viernes 09:00 a 13:00 y 15:00 a 19:00 (hora local) |
| Pacientes | `pa1` Carla Prueba (DNI ficticio 00000001, tel `+54 9 11 0000-0001`), `pa2` Diego Modelo (DNI 00000002, tel `+54 9 11 0000-0002`), `pa3` Eva Simulada (DNI 00000003, tel `+54 9 11 0000-0003`) |
| Bloqueo de ejemplo | `p1` bloqueada los miércoles de 15:00 a 17:00 (motivo "capacitación") |
| Turnos de ejemplo | `pa1` con `p1` en `s1`, `pr2` lunes 09:00 a 09:45; `pa2` con `p2` en `s2`, `pr1` lunes 09:45 a 10:15 (borde contiguo válido por RN-05) |

Regla: nunca cargar nombres, DNI, teléfonos, e-mails ni datos de salud reales en el repositorio, fixtures, capturas ni ejemplos (ver RN-D-01).
