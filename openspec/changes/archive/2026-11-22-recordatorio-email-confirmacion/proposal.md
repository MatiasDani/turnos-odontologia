# Proposal

## Why

Hoy un turno no genera ningún aviso al paciente: no hay recordatorio ni forma de confirmar la asistencia desde fuera del consultorio, así que US-011 y el Flujo 6 no existen y el ausentismo (el problema que motiva el proyecto) no tiene mitigación. C-12 cierra la fase de recordatorios por e-mail sobre lo que dejaron C-02 (puerto `Recordatorios`), C-04 (`ConfirmarTurno`) y C-10 (`ServicioTokens.rotar`), y habilita C-13 (`wa.me`).

## What Changes

- Entidad `Recordatorio` (canal `email`) con estados `pendiente | enviado | fallido | cancelado`, `programadoPara = inicio - RECORDATORIO_HORAS_ANTES` (24 por defecto, SU-07), `enviadoEn?` y `motivoFallo?`; nunca guarda el token (RN-25, DD-21).
- Puerto `Recordatorios` ampliado con `programar(turnoId)`, idempotente: crea o reemplaza el único recordatorio `pendiente` del turno. No crea nada si el paciente no dio consentimiento de contacto o no tiene e-mail. El adaptador real (persistido en un `RecordatorioRepositorio` nuevo, con adaptador en memoria) reemplaza al no-op sin modificar `CancelarTurno`; `cancelarPendientes` pasa los pendientes a `cancelado`.
- Decorador `AgendarTurnoConRecordatorio`: misma interfaz que `AgendarTurno`, ejecuta el alta y luego `programar`. Se inyecta en `ReservarOnline` y sirve para el alta de recepción. No se modifica código de C-01 ni de C-10.
- Caso de uso `EnviarRecordatoriosPendientes` (barrido con `Reloj`): toma los pendientes con `programadoPara <= ahora`; si el turno ya no está activo o ya empezó lo marca `cancelado`; si no, rota el token (`ServicioTokens.rotar`), arma el mensaje con el mínimo dato y lo entrega al puerto `Notificador`. Éxito → `enviado`; error → `fallido` sin reintento.
- Caso de uso público `ConfirmarDesdeEnlace(token)`: resuelve el token (C-10) y llama a `ConfirmarTurno` (C-04). Un turno ya `confirmado` es éxito sin cambios; cualquier otro rechazo es un error público genérico sin datos del turno (patrón de RN-22).
- Caso de uso `ListarRecordatoriosFallidos` para la recepción (aviso de fallos, Flujo 6).
- Puerto `Notificador` con adaptador falso para tests y adaptador SMTP con `nodemailer` configurado por entorno (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `BASE_URL_PUBLICA`); Ethereal para desarrollo y demo. `.env.example` con valores ficticios.
- `PacienteRepositorio` suma `obtenerPorId` (aditivo) para leer el e-mail y el consentimiento del paciente del turno.

## Capabilities

### New Capabilities
- `recordatorios-turno`: programación, reprogramación y anulación del recordatorio por e-mail de un turno, el barrido de envío con revalidación del turno y rotación del token, el contenido mínimo del mensaje, la confirmación de asistencia desde el enlace y el registro y la consulta de los envíos fallidos.

### Modified Capabilities
<!-- Ninguna: cancelacion-turnos ya exige pedir la cancelación de los recordatorios pendientes (C-12 solo cambia el adaptador), reserva-online ya define la rotación del token y estados-turno ya define ConfirmarTurno. Ninguno de sus requisitos cambia. -->

## Impact

- Código nuevo: `src/domain/recordatorio.ts` y sus reglas puras (`src/domain/reglas/recordatorios.ts`), `src/application/puertos/notificador.ts`, `src/application/agendar-turno-con-recordatorio.ts`, `src/application/enviar-recordatorios-pendientes.ts`, `src/application/confirmar-desde-enlace.ts`, `src/application/listar-recordatorios-fallidos.ts`, `src/application/recordatorios-email.ts` (adaptador de aplicación del puerto), `src/adapters/persistence/en-memoria/recordatorio-repositorio.ts`, `src/adapters/notificador/notificador-smtp.ts`.
- Código modificado (aditivo): `src/application/puertos/recordatorios.ts` (`programar`), `src/application/puertos/repositorios.ts` (`RecordatorioRepositorio`, `PacienteRepositorio.obtenerPorId`), `src/adapters/persistence/en-memoria/paciente-repositorio.ts`, `src/adapters/recordatorios/recordatorios-no-op.ts`, `tests/fixtures/` (sistema de recordatorios, notificador falso, espía con `programar`).
- Dependencias: `nodemailer` (primera dependencia de runtime, solo en `src/adapters/`) y `@types/nodemailer` (dev).
- Configuración: `.env.example` con `SMTP_*`, `BASE_URL_PUBLICA` y `RECORDATORIO_HORAS_ANTES` ficticios.
- KB actualizada en el explore: RN-25 y precisiones de RN-14/RN-21 (`05`), §Recordatorio (`04`), DD-21 (`09`), preguntas abiertas (`10`), notas en CHANGES.md §C-03 y §C-11.
- Governance ALTO (notificaciones con datos personales): propuesta revisada por el owner antes del apply y checkpoints durante el apply.
- Fuera de alcance: el proceso que ejecuta el barrido periódicamente y los endpoints HTTP (C-14), cancelar o reprogramar desde el enlace (C-11), el llamado a `programar` desde `ReprogramarTurno` (C-03), el canal `wa_me` (C-13), control de acceso por rol (C-09), proveedor SMTP de producción.
