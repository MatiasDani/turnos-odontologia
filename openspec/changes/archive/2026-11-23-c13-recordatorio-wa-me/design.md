# Design

## Context

La KB ya describe el canal `wa_me` (RN-14, DD-03, Flujo 6) y el modelo prevé `enlaceWaMe`, pero C-12 implementó solo e-mail: `Recordatorio.canal` es `'email'` y `RecordatoriosEmail.programar` toma el primer pendiente sin mirar el canal. `AgendarTurnoConRecordatorio` y `CancelarTurno` ya hablan con el puerto `Recordatorios`, y `ReservarOnline` recibe ese decorador por inyección, así que hay un punto de enganche único. La validación de teléfono argentino vive privada en `datos-paciente-online.ts` (C-10) y debe reutilizarse sin alterar la reserva (ver `proposal.md` para el alcance y el spec para el comportamiento observable).

## Goals / Non-Goals

**Goals:**
- Un turno con paciente elegible tiene un pendiente `email` y uno `wa_me`, independientes e idempotentes.
- URL `wa.me` bien formada, con teléfono de solo dígitos y mensaje codificado, sin token.
- La recepción ve todos los `wa_me` pendientes y registra el envío manual por id de forma idempotente.
- Cero cambios funcionales en C-01/C-10/C-11/C-12 salvo el filtro por canal.

**Non-Goals:**
- WhatsApp Cloud API, notificador, reintentos ni costo (DD-03, SU-01).
- Rotar tokens, incluir el enlace de gestión en el mensaje ni exponer datos clínicos o del paciente en la lista.
- RBAC (C-09), endpoint HTTP o pantallas (C-15).
- Cambiar la validación de `telefono` de la reserva online ni el mensaje del e-mail.

## Decisions

**D1 — Decorador sobre el puerto `Recordatorios`.** `RecordatoriosConWaMe implements Recordatorios` envuelve a `RecordatoriosEmail`: en `programar` llama al interno y después agrega/reemplaza el `wa_me`; en `cancelarPendientes` delega (el interno cancela todos los pendientes del turno, ambos canales). Se inyecta en `AgendarTurnoConRecordatorio`, en el `agendar` de `ReservarOnline` y en `CancelarTurno`. *Alternativa:* tocar `AgendarTurno`, `ReservarOnline` y `AgendarTurnoConRecordatorio` para llamar a un caso de uso nuevo, que duplicaría el punto de programación y rompería los tests de C-12.

**D2 — Filtro por canal en C-12.** `RecordatoriosEmail.programar` busca el pendiente con `canal === 'email'`; `EnviarRecordatoriosPendientes` omite los `wa_me` del barrido. Sin este par de filtros, el `wa_me` sería sobrescrito por el e-mail y el barrido intentaría enviarlo por `nodemailer`. `cancelarPendientes` no se filtra: anular los dos canales al cancelar el turno es el comportamiento deseado (RN-25). *Alternativa:* agregar un parámetro `canal` a `listarPendientesHasta`, que cambiaría la firma de un puerto usado por C-12.

**D3 — Normalización compartida.** Se extrae `normalizarTelefonoArgentino` a `src/domain/reglas/telefono.ts` y `datos-paciente-online.ts` pasa a importarla. Quita separadores, acepta `+54` opcional y devuelve entre 10 y 13 dígitos; cualquier prefijo `+` distinto de `+54` se rechaza. No se agrega `54` a un número de 10 dígitos: la URL usa exactamente los dígitos normalizados. *Alternativa:* duplicar la expresión regular en la regla nueva, con riesgo de divergencia.

**D4 — Elegibilidad propia.** `debeProgramarseWaMe(paciente)` exige `consentimientoContacto` y teléfono normalizable, sin mirar `email` (RN-26). Se agrega junto a `debeProgramarse` en `src/domain/reglas/recordatorios.ts`, que sigue siendo la regla del e-mail. *Alternativa:* reutilizar `debeProgramarse`, que excluiría justo a los pacientes sin e-mail que motivan el canal.

**D5 — URL y mensaje como reglas puras.** `armarEnlaceWaMe` concatena `https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`, donde el mensaje se arma con `formatearFechaHoraLocal` (DD-09), prestación, profesional y consultorio. Sin `token`, sin `baseUrlPublica`, sin DNI. `encodeURIComponent` se aplica al mensaje completo, no dato por dato. *Alternativa:* interpolar el texto sin codificar, que rompe la URL con espacios, acentos y `/`.

**D6 — Reemplazo idempotente por canal.** El decorador busca el `wa_me` `pendiente` del turno y lo reemplaza conservando su `id` y recalculando `enlaceWaMe`; si no hay, genera un id con `GeneradorId`. `enviado`, `fallido` y `cancelado` no se tocan, igual que en RN-25. *Alternativa:* agregar siempre uno nuevo, que dejaría varios pendientes por turno.

**D7 — Lista acotada y ordenada.** `ListarRecordatoriosPendientesWaMe` filtra `listarPorEstado('pendiente')` por `canal === 'wa_me'` y ordena por `programadoPara` en el caso de uso. El DTO de salida es `RecordatorioWaMePendiente` con `id`, `turnoId`, `enlaceWaMe` y `programadoPara`; no hay `pacienteId`, `estado`, `motivoFallo` ni token. *Alternativa:* ampliar el puerto `RecordatorioRepositorio` con un método por canal, que obligaría a tocar todos sus adaptadores.

**D8 — Transición tipada e idempotente.** `MarcarRecordatorioEnviado` lee por `id` desde `RecordatorioRepositorio`; si no existe lanza `ErrorMarcarRecordatorio('RECORDATORIO_NO_ENCONTRADO')`; si el estado no es `pendiente` ni `enviado`, lanza `ErrorMarcarRecordatorio('ESTADO_NO_ENVIABLE')`; si ya está `enviado`, devuelve el registro sin escribir; si está `pendiente`, guarda `{ ...r, estado: 'enviado', enviadoEn: reloj.ahora() }`. No se revalida el turno: el envío ya ocurrió fuera del sistema. *Alternativa:* buscar por `turnoId` y canal, que no distingue entre varios recordatorios y rompe la idempotencia por id.

**D9 — KB antes que código.** RN-26 y DD-24 se escriben en la KB en el primer task; US-012 se marca como cubierta a nivel de caso de uso. Cumple la regla dura 6 de `AGENTS.md`.

**D10 — Fixture con opción `conWaMe`.** Se extiende `crearSistemaRecordatorios` con una opción que, cuando es `true`, inyecta el decorador en alta, reserva y cancelación y expone los dos casos de uso nuevos. Por defecto sigue `false`, de modo que las suites de C-12 no cambien. *Alternativa:* un fixture nuevo que reconstruya `ReservarOnline` desde cero, duplicando el cableo de tokens y catálogos.

## Risks / Trade-offs

- **El barrido y la programación comparten repositorio con `wa_me`** → D2 filtra en los dos puntos; se cubre con tests que comprueban que un `wa_me` pendiente sigue igual después de programar el e-mail y después de un barrido.
- **Teléfono de 10 dígitos sin código de país** → se usa tal cual (D3); se documenta en el spec y se valida solo el rango acordado, no la existencia real del número.
- **Enlace `wa.me` con acentos** → `encodeURIComponent` produce `%C3%A1` etc.; el spec lo fija con un ejemplo.
- **Doble alta/reserva con el mismo turno** → RN-25 y D6 mantienen un único pendiente por canal con `id` estable; no se crean duplicados.
- **Marcar enviado sin RBAC** → C-09 queda fuera de alcance; el caso de uso no recibe actor ni rol.
- **Sin HTTP** → la recepción consumirá estos casos de uso en C-15; hoy solo se validan a nivel de aplicación.

## Migration Plan

Change aditivo sobre un repositorio en memoria: no hay datos que migrar. El tipo `CanalRecordatorio` se amplía y `enlaceWaMe` es opcional, así que los registros `email` existentes siguen siendo válidos. Se despliega con el commit del change y se revierte revertilo; las suites de C-01, C-10, C-11 y C-12 quedan intactas.
