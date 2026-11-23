# Design

## Context

Ver `proposal.md` (Why) para el problema. El estado actual del código que condiciona la solución:

- `ReservarOnline.ejecutar` (`src/application/reservar-online.ts`) sigue el orden 1-4 validar pedido, 5 buscar paciente por DNI, 6 combos libres, 7-8 `agendarConReintento` (que traduce `ReglaNegocioError`, `RecursoNoEncontradoError` y `ConsultaInvalidaError` a `HORARIO_NO_DISPONIBLE`), 9 guardar paciente nuevo, 10 `tokens.emitir`. Cualquier error de dominio que salga **dentro** de `agendar` se traduce, y por eso el `RecursoNoEncontradoError('paciente')` de `RecordatoriosEmail.programar` terminaba como `HORARIO_NO_DISPONIBLE`.
- `RecordatoriosEmail.programar` (C-12) y `RecordatoriosConWaMe.programar` (C-13) leen el turno y el paciente del repositorio y lanzan `RecursoNoEncontradoError` si falta alguno. Ambos implementan el puerto `Recordatorios` (`src/application/puertos/recordatorios.ts`) y son idempotentes (RN-25, RN-26).
- `RecordatoriosNoOp` (`src/adapters/recordatorios/recordatorios-no-op.ts`) ya existe para cableados sin recordatorios.
- Puntos que construyen `ReservarOnline`: `src/composicion.ts` (C-14, con `AgendarTurno` simple y `EmitirTokenConRecordatorio`), `tests/fixtures/sistema.ts` (`crearSistemaReserva`, sin recordatorios) y `tests/fixtures/sistema-recordatorios.ts` (con `AgendarTurnoConRecordatorio` como `agendar`, el cableado de DD-21 que falla con un DNI nuevo).
- `EmitirTokenConRecordatorio` no tiene test unitario; solo lo ejercita de forma indirecta `tests/application/reserva-con-recordatorio.test.ts` (dos tests de composición con títulos que no son escenarios de spec).
- La frontera HTTP (`traducirError` en `src/adapters/http/errores-http.ts`) ya convierte todo error que no sea público en `500 ERROR_INTERNO` con mensaje fijo y lo registra como inesperado (requisito "Códigos HTTP de los errores públicos").
- `src/composicion.ts` cablea solo `RecordatoriosEmail`: el decorador `wa.me` de C-13 no está cableado en el sistema real (solo en el fixture con `conWaMe: true`).

Contexto de los escenarios de los deltas: el común de cada spec principal (`reserva-online`: pedido base con DNI `00000004`, e-mail `paciente4@ejemplo.test`, teléfono `+54 9 11 0000-0004`, `pr2` el lunes 09:00-09:45, `ahora` el domingo 08:00; `api-publica-paciente`: `ahora` el domingo 08:00). La anticipación es la de por defecto (24 h). Los datos extra (`pa1` con e-mail, `pa3` sin consentimiento) van como `GIVEN` en cada escenario y coinciden con `pacientesRecordatorios()` de `tests/fixtures/sistema-recordatorios.ts`, el fixture previsto para los tests de `reserva-online`.

## Goals / Non-Goals

**Goals:**

- Que el cableado por defecto (puerto inyectado en `ReservarOnline`) funcione para DNI nuevos y existentes, en cualquier composición, sin depender de un decorador que hay que acordarse de poner.
- Un solo punto de programación para la reserva online, válido para ambos canales.
- Conservar sin cambios "Sin pacientes huérfanos", el orden de errores públicos, la respuesta pública y el contrato HTTP.

**Non-Goals:**

- Cablear `RecordatoriosConWaMe` en `src/composicion.ts` (decisión de C-13/C-15, ver Open Questions).
- Deshacer el turno o compensar cuando programar falla (DD-19 lo descarta).
- Cambiar `AgendarTurno`, `RecordatoriosEmail`, `RecordatoriosConWaMe` o el alta de recepción.
- Atomicidad de turno + paciente + recordatorio con persistencia real (queda para el change de PostgreSQL).

## Decisions

### D1. Dependencia `recordatorios` obligatoria en `ReservarOnline`

`ReservarOnlineDependencias` suma `readonly recordatorios: Pick<Recordatorios, 'programar'>`, **obligatoria**. Quien no quiera recordatorios pasa `new RecordatoriosNoOp()`.

- *Por qué obligatoria*: el bug nació de un cableado que dependía de recordar poner un decorador. Con una dependencia opcional, olvidarla compila y la reserva online queda sin recordatorio en silencio (rompe US-011 sin ningún test rojo). Obligatoria, el compilador obliga a cada composición a decidir, y el no-op deja esa decisión explícita en el código.
- *Costo*: tres puntos de construcción. `crearSistemaReserva` usa `RecordatoriosNoOp` por defecto, con una opción para inyectar uno, así que las suites de C-10 no cambian.
- *Alternativas*: opcional con no-op por defecto (más cómodo, pero repite la causa del bug); corregir el decorador para que tolere un paciente inexistente (oculta el problema y no programa nada para el DNI nuevo); guardar el paciente antes del alta (rompe "Sin pacientes huérfanos" o exige compensación).

### D2. Orden: alta → paciente nuevo → programar → token

`ejecutar` queda: 1-8 sin cambios; 9 guardar el paciente nuevo si corresponde; **9b `await deps.recordatorios.programar(turno.id)`** (siempre, paciente nuevo o existente); 10 `tokens.emitir`; respuesta.

- *Después del paciente*: `programar` lee el paciente del repositorio; es la causa del bug.
- *Antes del token*: si programar falla, no queda un hash de token huérfano de un token en claro que nadie recibió. La rotación del token ocurre recién al enviar el recordatorio (RN-21, DD-21), así que programar antes o después de emitir no cambia qué token vale. `EmitirTokenConRecordatorio` hacía el orden inverso (emitir y después programar); se cambia a propósito.
- *Fuera de `agendarConReintento`*: la llamada queda fuera del `try` que traduce errores de dominio, así que nunca se convierte en `HORARIO_NO_DISPONIBLE` ni dispara un reintento de alta.
- *Alternativa*: programar después de emitir (lo que hace hoy C-14). Funciona, pero ante falla deja un token emitido que nadie recibe.

### D3. La falla al programar se propaga sin traducir

Si `programar` lanza (incluido un `RecursoNoEncontradoError`, que es de dominio), `ReservarOnline` lo deja salir tal cual: no lo envuelve en `ErrorReservaPublica`.

- *Por qué no `HORARIO_NO_DISPONIBLE`*: el turno existe y el horario está ocupado por esa misma reserva; informar "no disponible" con una nueva oferta sería falso e invitaría a reservar otro turno con el mismo DNI.
- *Por qué no un código nuevo*: el conjunto cerrado de C-10 no cambia (lo usan C-14 y su UI) y no existe una acción útil para el paciente distinta de "probá de nuevo".
- *RN-22 se cumple en la frontera*: `traducirError` ya responde `500 ERROR_INTERNO` con mensaje fijo, sin detalle, y lo registra como inesperado. Coincide con lo que RN-22 dice para errores inesperados ("se propaga sin enmascarar"); la traducción a código público de RN-22 cubre los errores de la consulta y del alta, y programar no es ninguna de las dos. Se agrega una precisión a RN-22 que lo explicita (no es regla nueva).
- *Consecuencia aceptada* (DD-19, DD-21): el turno y el paciente nuevo quedan guardados, sin token. Si el paciente reintenta el mismo pedido recibe `RESERVA_DUPLICADA`; la recepción ve el turno en la agenda. Es el mismo criterio que el alta de recepción ("Falla al programar con el turno ya creado").

### D4. "Sin pacientes huérfanos" se conserva

El paciente se sigue guardando solo después de crear el turno. Ante una falla de `programar`, el paciente guardado tiene turno, así que no es huérfano. Ningún rechazo previo al alta llega a `programar`. El escenario "Reserva rechazada no programa recordatorios ni deja paciente huérfano" lo verifica con los recordatorios reales cableados.

### D5. Se elimina `EmitirTokenConRecordatorio` y se recablea la composición

- Se borra `src/application/emitir-token-con-recordatorio.ts`. `src/composicion.ts` pasa `tokens: servicioTokens` y `recordatorios` a `ReservarOnline`, con `agendar` = `AgendarTurno` simple; se actualiza el comentario del cableado.
- `OpcionesComposicion` suma `repoRecordatorios?: RecordatorioRepositorio` (gancho de test como el `turnos?` existente) para poder probar la falla por HTTP. Por defecto sigue el repositorio en memoria.
- `tests/application/reserva-con-recordatorio.test.ts` se mantiene como regresión de composición y se actualiza su comentario de cabecera (ya no habla de programar al emitir).

### D6. `AgendarTurnoConRecordatorio` queda solo para recepción

Se corrige su docstring: lo usa el alta de recepción; `ReservarOnline` recibe el puerto directamente (DD-32). En `tests/fixtures/sistema-recordatorios.ts` la reserva pasa a usar `AgendarTurno` simple y `recordatorios: recordatoriosConWaMe ?? recordatorios`. Inyectar el decorador además del puerto programaría dos veces (es idempotente, pero vuelve a fallar para un DNI nuevo dentro del alta), por eso el fixture no lo hace y DD-32 lo deja escrito.

### D7. Canal `wa.me`

No se agrega código: `RecordatoriosConWaMe` implementa el mismo puerto y se inyecta como `recordatorios`. El escenario "Reserva de un paciente nuevo programa también el `wa.me`" se prueba con el fixture `conWaMe: true`, que hoy tiene el mismo bug que el e-mail para un DNI nuevo.

### D8. Registro en la KB

- **DD-32** (siguiente número libre) en `knowledge-base/09_decisiones_y_supuestos.md`: puerto obligatorio en `ReservarOnline`, orden D2, error D3, eliminación de `EmitirTokenConRecordatorio`, decorador solo para recepción. En DD-21, "Enganche al alta" suma "(enmendado por DD-32)".
- **RN-22**: precisión sobre la falla al programar (D3). No hay RN nueva: RN-25 y RN-26 ya piden el recordatorio de la reserva online.
- `knowledge-base/10_preguntas_abiertas.md`: la fila "Bug de integración C-10 + C-12" pasa a `Resuelta` con referencia a este change y a DD-32.
- `CHANGES.md`: entrada corta del fix (owner Matías Ibañez 52006; dependencias C-10, C-12, C-14; governance ALTO). D13 del design archivado de C-14 no se edita.

## Risks / Trade-offs

- [Turno sin token cuando programar falla] → Aceptado por DD-19/DD-21. Se documenta en DD-32; el paciente ve un error genérico y la recepción ve el turno. Con persistencia real se puede revisar con una transacción.
- [Dependencia obligatoria rompe la compilación de otros cableados] → Son tres puntos, todos en este repo y en este change; `npm run typecheck` los detecta.
- [Otro integrante vuelve a inyectar `AgendarTurnoConRecordatorio` en `ReservarOnline`] → Docstring, DD-32 y el escenario de paciente nuevo en el fixture de recordatorios fallan en rojo si se repite.
- [Cambio del orden token/programar respecto de C-14] → No es observable: el token de la respuesta sigue valiendo hasta el primer envío (RN-21); lo cubre "Reserva por HTTP de un paciente nuevo deja su recordatorio pendiente".
- [El sistema real sigue sin `wa.me`] → Fuera de alcance; queda como pregunta abierta.

## Migration Plan

Sin datos persistidos ni contrato público que migrar. El apply modifica el código en un solo commit lógico (o en pasos TDD) en la rama `fix/c-10-recordatorio-reserva-online`. Rollback: revertir el commit; vuelve el cableado de C-14 con `EmitirTokenConRecordatorio`.

## Open Questions

- ¿Se cablea `RecordatoriosConWaMe` en `src/composicion.ts` para que el sistema real genere los `wa.me`? Hoy no está cableado; no lo bloquea este change porque basta con inyectarlo como `recordatorios`. Corresponde a C-13 (Luka Garro) o a C-15 (pantalla de recepción).
- Formato de la entrada en `CHANGES.md`: se propone una sección "Correcciones de integración" con un identificador `FIX-01`, sin renumerar C-01..C-15. Se puede cambiar al archivar sin tocar specs ni tareas de código.
