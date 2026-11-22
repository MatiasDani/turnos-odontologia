# Tasks

> TDD estricto, de a UNA tarea por vez: RED (test que falla, ejecutado) → GREEN (mínimo código) → TRIANGULATE (≥ 2 casos) → REFACTOR, con los tests en verde después de cada paso. Los tests de caso de uso usan como título el nombre exacto de cada `#### Scenario:` de `specs/recordatorios-turno/spec.md`, agrupados en `describe` por requisito (regla dura 8), en `tests/application/recordatorios-turno.test.ts`. Solo datos ficticios (`pa1` con `carla.prueba@demo.test`, `pa2` sin e-mail, `pa3` sin consentimiento); ningún test usa la red. `src/` y `tests/` usan CRLF: editar con la herramienta de edición, no con reemplazos multilínea por shell. Governance ALTO: checkpoints 2.5, 3.6, 4.7 y 5.5 con aprobación explícita del owner antes de seguir. Sin commits intermedios: el commit se hace al cerrar el change completo.

## 1. Safety net y modelo

- [x] 1.1 SAFETY NET: ejecutar `npm test` y `npm run typecheck` y registrar el baseline (588 tests en verde esperados); si algo falla, detenerse y reportarlo como falla preexistente
- [x] 1.2 Crear `src/domain/recordatorio.ts` (`Recordatorio`, `EstadoRecordatorio`, `CanalRecordatorio`, design D2) y `MensajeEmail` en `src/application/puertos/notificador.ts` junto al puerto `Notificador` (D4); verificar con `npm run typecheck`

## 2. Reglas puras del dominio

- [x] 2.1 RED/GREEN/TRIANGULATE `calcularProgramadoPara(inicio, horasAntes)` (`src/domain/reglas/recordatorios.ts`, D3): lunes 09:00 con 24 → domingo 09:00; con 48 → sábado 09:00; con 1 → lunes 08:00; verificar `tests/domain/reglas/recordatorios.test.ts` en verde
- [x] 2.2 RED/GREEN/TRIANGULATE `debeProgramarse(paciente)`: con consentimiento y e-mail → `true`; sin consentimiento, sin e-mail o con e-mail vacío → `false`; verificar en verde
- [x] 2.3 RED/GREEN/TRIANGULATE `evaluarEnvio(recordatorio, turno, ahora)`: `esperar` con `programadoPara` 1 ms después de `ahora`; `enviar` en el instante exacto y con turno `reservado` o `confirmado`; `anular` con turno inexistente, `cancelado`, `ausente`, `atendido` y con `ahora >= inicio` (umbral inclusivo); verificar en verde
- [x] 2.4 RED/GREEN/TRIANGULATE `formatearFechaHoraLocal(instante, zona)` en `src/domain/tiempo.ts` (lunes 23/11/2026 09:00 en `America/Argentina/Buenos_Aires`; un instante UTC que cae en otro día local) y `armarMensajeRecordatorio(datos)` (destinatario, asunto, texto con fecha, prestación, profesional y consultorio; enlace de gestión con la base sin barra doble y el token codificado; enlace de confirmación solo para `reservado`); verificar `tests/domain/tiempo.test.ts` y `tests/domain/reglas/recordatorios.test.ts` en verde; REFACTOR con tests en verde
- [x] 2.5 CHECKPOINT (governance ALTO): revisar con el owner el modelo, las reglas puras, el formato del mensaje y sus tests; confirmar que `src/domain` no importa infraestructura ni usa `new Date()` / `Date.now()` (reglas duras 2 y 3) y que el mensaje no puede recibir DNI, teléfono ni sillón; aprobar antes de seguir

## 3. Programación, cancelación y enganche al alta

- [x] 3.1 Puertos y adaptadores en memoria: `RecordatorioRepositorio` y `PacienteRepositorio.obtenerPorId` (`src/application/puertos/repositorios.ts`, D4), `RecordatorioRepositorioEnMemoria` y `obtenerPorId` en `PacienteRepositorioEnMemoria`, con tests de adaptador (`tests/adapters/recordatorio-repositorio.test.ts`: reemplazo por id, `listarPendientesHasta` filtrado y ordenado, `listarPorEstado`); `Recordatorios.programar` en el puerto, `RecordatoriosNoOp.programar` y `RecordatoriosEspia.programar` (registro aparte); verificar `npm run typecheck` y que las suites de C-02 siguen en verde sin modificar sus tests
- [x] 3.2 `ConfiguracionRecordatorios` (`src/application/configuracion-recordatorios.ts`), `RecordatoriosEmail` (`src/application/recordatorios-email.ts`, D5), decorador `AgendarTurnoConRecordatorio` (D6) y fixtures (`tests/fixtures/sistema-recordatorios.ts`, `NotificadorFalso`, `RecordatorioRepositorioQueFalla`, `moverTurno` en `TurnoRepositorioDePrueba`, D11); verificar `npm run typecheck` y la suite completa en verde
- [x] 3.3 RED/GREEN escenarios de "Programación del recordatorio al dar de alta un turno" (recepción con el decorador, reserva online con el decorador inyectado en `ReservarOnline`, anticipación 48 h, alta rechazada) y "Falla al programar no deshace el alta"; verificar en verde
- [x] 3.4 RED/GREEN escenarios de "Programación idempotente" y "Sin consentimiento o sin e-mail no hay recordatorio"; verificar en verde
- [x] 3.5 RED/GREEN escenarios de "La cancelación anula el recordatorio pendiente" con `CancelarTurno` cableado con `RecordatoriosEmail` (el escenario del barrido usa el barrido de la tarea 4.1: dejar ese test en rojo controlado no está permitido, así que se escribe en 4.2); validar con una mutación (p. ej. que `programar` no reemplace el pendiente) que los tests fallan; verificar en verde
- [x] 3.6 CHECKPOINT (governance ALTO): revisar con el owner el puerto ampliado, el decorador (sin cambios en `AgendarTurno`, `ReservarOnline` ni `CancelarTurno`: `git diff --stat src/application/agendar-turno.ts src/application/reservar-online.ts src/application/cancelar-turno.ts` vacío) y los escenarios de los grupos 3; aprobar antes de seguir

## 4. Barrido, confirmación por enlace y fallidos

- [x] 4.1 `EnviarRecordatoriosPendientes` (`src/application/enviar-recordatorios-pendientes.ts`, D7) con `ResumenBarrido`; RED/GREEN escenarios de "Envío de los recordatorios vencidos" y el escenario pendiente de "Cancelar el turno anula el pendiente"; verificar en verde
- [x] 4.2 RED/GREEN escenarios de "El barrido revalida el turno antes de enviar" (con `RecordatoriosEspia`/doble que falla en `cancelarPendientes` para dejar el pendiente sin anular) y "Cada envío rota el token de gestión" (resolver T1 y T2 con `ServicioTokens.resolver`); verificar en verde
- [x] 4.3 RED/GREEN escenarios de "Contenido mínimo del mensaje", "Enlace de confirmación según el estado del turno" y "El token nunca se guarda en el recordatorio" (inspeccionar todos los campos serializados del recordatorio guardado contra el token y su hash SHA-256); verificar en verde
- [x] 4.4 RED/GREEN escenarios de "Registro del envío fallido" (`NotificadorFalso` que rechaza con un mensaje que incluye el e-mail y el token, para probar que el motivo no los copia) y `ListarRecordatoriosFallidos` (D9) con "Lista de recordatorios fallidos para la recepción"; verificar en verde
- [x] 4.5 `ErrorEnlacePublico` (`src/application/errores-enlace-publico.ts`) y `ConfirmarDesdeEnlace` (D8); RED/GREEN escenarios de "Confirmación de asistencia desde el enlace" y "Enlace inválido sin revelar datos" (el error tiene solo código y mensaje fijos, sin `cause`, sin `estadoActual` ni ids); verificar en verde
- [x] 4.6 Validar con mutaciones que los tests detectan: rotar después de enviar, usar `error.message` como motivo, enviar sin revalidar el estado del turno, propagar `RN-10` en la doble confirmación; revertir cada mutación y verificar la suite completa en verde
- [x] 4.7 CHECKPOINT (governance ALTO): revisar con el owner el barrido, la confirmación por enlace, los fallidos y sus tests; verificar que cada `#### Scenario:` de la spec tiene su test con el mismo nombre y que ningún test, fixture ni mensaje usa datos reales (regla dura 4); aprobar antes de seguir

## 5. Notificador SMTP y configuración

- [x] 5.1 Instalar `nodemailer` (dependencia) y `@types/nodemailer` (dev) con versión fijada en `package-lock.json`; verificar `npm ls nodemailer` y que `src/domain` y `src/application` no lo importan (`grep -r nodemailer src/domain src/application` vacío)
- [x] 5.2 RED/GREEN/TRIANGULATE `NotificadorSmtp` y `crearNotificadorSmtp` (`src/adapters/notificador/notificador-smtp.ts`, D10): con `jsonTransport` mapea `from`, `to`, `subject` y `text`; un transporte que rechaza propaga el error; `secure` solo con el puerto 465; verificar `tests/adapters/notificador-smtp.test.ts` en verde sin abrir conexiones
- [x] 5.3 RED/GREEN/TRIANGULATE `leerConfiguracionRecordatorios(env)` y `leerConfiguracionSmtp(env)` (`src/adapters/config/configuracion-entorno.ts`): valores por defecto (24 h, puerto 587), `RECORDATORIO_HORAS_ANTES` no entero o ≤ 0 rechazado, `BASE_URL_PUBLICA` ausente o no `http(s)` rechazada, el error nombra la variable y nunca incluye su valor; verificar `tests/adapters/configuracion-entorno.test.ts` en verde
- [x] 5.4 Actualizar el `.env.example` versionado (ya existe y está exceptuado en `.gitignore`; leerlo con el owner porque esta sesión no puede leerlo) para que tenga `SMTP_HOST=smtp.ethereal.email`, `SMTP_PORT=587`, `SMTP_USER`/`SMTP_PASS` vacíos, `BASE_URL_PUBLICA=http://localhost:3000` y `RECORDATORIO_HORAS_ANTES=24`; verificar que `.env` está en `.gitignore` y que `git status` no muestra `.env` (regla dura 9)
- [x] 5.5 CHECKPOINT (governance ALTO): revisar con el owner la dependencia nueva, el adaptador SMTP, la configuración y `.env.example`; aprobar antes de cerrar

## 6. Integración y documentación

- [x] 6.1 Ejecutar `npm test` y `npm run typecheck` completos: todo en verde con el baseline de 1.1 más los tests nuevos; `openspec validate recordatorio-email-confirmacion --strict` sin errores
- [x] 6.2 Alinear la KB con la implementación (`knowledge-base/04_modelo_de_datos.md` §Recordatorio, `08_arquitectura_propuesta.md` §Variables de entorno y casos de uso si los lista, `02_descripcion_general.md` fila E-mail del stack con `nodemailer` y Ethereal, DD-21 y RN-25 si cambió algún detalle) y la tabla de stack de `AGENTS.md`/`CLAUDE.md` (ambos idénticos); verificar que la KB no contradice la spec ni el design

## Workflow follow-up

- Verificar el change (`openspec-verify`).
- Archivar con `/opsx:archive recordatorio-email-confirmacion`, marcar C-12 como `[x]` en `CHANGES.md` y avisar al equipo: C-13 (Luka) queda habilitado; C-03 debe llamar a `Recordatorios.programar`; C-11 y C-14 deben considerar la rotación del token.
- Hacer un único commit `feat` del change completo con el usuario de Franco Petri (conventional commit en español, línea en blanco entre asunto y cuerpo), sincronizar Engram en un commit `chore(engram)`, pushear la rama `feat/c-12-recordatorio-email-confirmacion` y abrir el PR con `gh` para que Matías lo mergee.
