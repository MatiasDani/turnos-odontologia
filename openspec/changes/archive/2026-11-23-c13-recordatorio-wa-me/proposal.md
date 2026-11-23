# Proposal

## Why

C-12 dejó programado el recordatorio por e-mail y su token de gestión, pero US-012 (enviar el recordatorio por `wa.me`) sigue sin implementarse: la KB ya define el canal `wa_me`, `enlaceWaMe` y el Flujo 6 lo describe, mientras que el tipo `Recordatorio` y el código solo aceptan `email`. Sin este change, los pacientes que no tienen e-mail (p. ej. `pa2`) no reciben ningún recordatorio y la recepción no tiene una lista de enlaces para enviar por WhatsApp. La restricción del proyecto es explícita: sin WhatsApp Cloud API y con costo $0 (DD-03, SU-01), así que el envío es manual y el sistema solo arma la URL y registra el resultado.

## What Changes

- `Recordatorio.canal` pasa a `'email' | 'wa_me'` y el registro incorpora `enlaceWaMe?`; el enlace se guarda en el recordatorio `pendiente`, nunca el token ni datos clínicos (RN-D-02, RN-21).
- Al programar un turno (alta de recepción, reserva online o reprogramación) se genera también un recordatorio `wa_me` `pendiente` con `programadoPara = inicio - horasAntes` y `enlaceWaMe = https://wa.me/<telefono>?text=<mensaje codificado>`. Lo agrega un decorador del puerto `Recordatorios`, sin modificar C-01, C-10 ni el comportamiento de C-12 salvo el filtro por canal.
- Elegibilidad del `wa_me`: `consentimientoContacto` y teléfono argentino válido (10 a 13 dígitos, `+54` opcional), sin exigir e-mail. La normalización de teléfono de C-10 se extrae a una regla pura compartida, sin cambiar la validación de la reserva online.
- El mensaje contiene fecha y hora local, prestación, profesional y consultorio, codificado con `encodeURIComponent`. No incluye token ni enlace de gestión (RN-21, RN-D-02).
- `ListarRecordatoriosPendientesWaMe` expone a recepción todos los `wa_me` `pendientes` ordenados por `programadoPara`, con `id`, `turnoId`, `enlaceWaMe` y `programadoPara`, sin datos del paciente.
- `MarcarRecordatorioEnviado({ recordatorioId, reloj })` cambia `pendiente → enviado` con `enviadoEn = reloj.ahora()`; es idempotente si ya está `enviado` y rechaza con error tipado si no existe o está `cancelado`/`fallido`.
- Ajustes de canal en C-12: `RecordatoriosEmail.programar` reemplaza solo el pendiente `email` y el barrido de `EnviarRecordatoriosPendientes` ignora los `wa_me` (la recepción los envía a mano). `cancelarPendientes` sigue anulando ambos canales, como ya hace.
- Se registran RN-26 y DD-24 en la KB antes de implementar; US-012 queda cubierta a nivel de caso de uso. Sin HTTP, sin RBAC (C-09) y sin API de WhatsApp.

## Capabilities

### New Capabilities

- `recordatorio-wa-me`: generación del enlace `wa.me` con mensaje mínimo codificado, lista de pendientes para recepción y marca manual de envío, con independencia de canales.

### Modified Capabilities

- `recordatorios-turno`: la programación idempotente y el barrido se acotan explícitamente al canal `email`; los pendientes `wa_me` no se sobrescriben ni se envían por e-mail. El resto de sus requisitos y escenarios se conservan.

## Impact

- **Dominio**: `Recordatorio` amplía `canal` y suma `enlaceWaMe`; nueva regla pura de normalización de teléfono compartida con la reserva online y reglas puras de elegibilidad, URL, mensaje y transición de envío.
- **Aplicación**: decorador `RecordatoriosConWaMe` sobre el puerto `Recordatorios`, más dos casos de uso nuevos (`ListarRecordatoriosPendientesWaMe`, `MarcarRecordatorioEnviado`) y un error tipado de transición. Sin cambios en los DTOs públicos de C-10/C-11.
- **Adaptadores**: sin servidor, dependencias ni proveedor nuevo; se reutilizan los repositorios en memoria y el `Reloj` inyectado.
- **Tests**: un test por escenario del spec con títulos idénticos; las suites de C-01, C-10, C-11 y C-12 siguen en verde sin cambiar su comportamiento. Baseline: 773 tests.
- **KB y roadmap**: RN-26 en `knowledge-base/05_reglas_de_negocio.md`, DD-24 en `knowledge-base/09_decisiones_y_supuestos.md`, US-012 marcada como cubierta en `knowledge-base/06_funcionalidades.md`; `CHANGES.md` se marca `[x]` recién al archivar.
- **Sin UI**: las pantallas de recepción son C-15; este change expone solo casos de uso, reglas y DTOs.
