# Tasks

> TDD estricto: en cada tarea de código primero el test en rojo (ejecutado y fallando por la razón esperada), después el mínimo código para el verde y recién entonces el refactor. Cada escenario de los deltas tiene un test Vitest con **el mismo título** (regla dura 8). Solo datos ficticios (regla dura 4).

## 1. Preparación y decisiones registradas

- [x] 1.1 Verificar con `npm run typecheck` y `npm test` que la baseline está en verde antes de escribir código y anotar el número de archivos y tests; si algo falla, frenar y reportarlo como falla previa
- [x] 1.2 Agregar DD-32 a `knowledge-base/09_decisiones_y_supuestos.md` (puerto `recordatorios` obligatorio en `ReservarOnline`, orden alta → paciente nuevo → programar → token, error sin traducir con 500 en HTTP, eliminación de `EmitirTokenConRecordatorio`, `AgendarTurnoConRecordatorio` solo para recepción) y sumar "(enmendado por DD-32)" al punto "Enganche al alta" de DD-21; verificar con `grep -n "DD-32" knowledge-base/09_decisiones_y_supuestos.md`
- [x] 1.3 Agregar a RN-22 en `knowledge-base/05_reglas_de_negocio.md` la precisión de que la falla al programar los recordatorios de la reserva se propaga sin traducir y la ruta HTTP la responde como error inesperado (no es una regla nueva); verificar con `grep`

## 2. `ReservarOnline` programa los recordatorios (capacidad `reserva-online`)

- [x] 2.1 RED: crear `tests/application/reservar-online-recordatorio.test.ts` con `describe('Recordatorio programado al reservar')` y el test "Reserva de un paciente nuevo programa el recordatorio" sobre `crearSistemaRecordatorios()` (fixture actual, con el decorador de DD-21 como `agendar`); ejecutar con `npx vitest run tests/application/reservar-online-recordatorio.test.ts` y confirmar que falla con `HORARIO_NO_DISPONIBLE` (el bug)
- [x] 2.2 GREEN: sumar `readonly recordatorios: Pick<Recordatorios, 'programar'>` (obligatoria) a `ReservarOnlineDependencias` y llamar a `programar(turno.id)` después de guardar el paciente nuevo y antes de `tokens.emitir`, fuera de `agendarConReintento`. En el mismo paso, actualizar los tres puntos de construcción: `tests/fixtures/sistema-recordatorios.ts` (la reserva usa `AgendarTurno` simple y `recordatorios: recordatoriosConWaMe ?? recordatorios`, y expone el repositorio de tokens), `tests/fixtures/sistema.ts` (`crearSistemaReserva` con la opción `recordatorios?`, `RecordatoriosNoOp` por defecto) y `src/composicion.ts` (provisoriamente `new RecordatoriosNoOp()`, sin tocar todavía `EmitirTokenConRecordatorio`, que se reemplaza en el grupo 3); verificar el test 2.1 en verde, `npx tsc --noEmit` limpio y las suites de C-10, C-12 y C-13 en verde sin editar sus tests
- [x] 2.3 TRIANGULAR: agregar los tests "Reserva de un paciente existente programa el recordatorio", "Paciente nuevo sin e-mail reserva sin recordatorio por e-mail", "Paciente existente sin consentimiento reserva sin recordatorios", "Reserva de un paciente nuevo programa también el `wa.me`" (fixture `conWaMe: true`) y "Reserva rechazada no programa recordatorios ni deja paciente huérfano"; ejecutar y confirmar que todos pasan (si alguno pasa sin código nuevo, verificar que su aserción falla al quitar temporalmente la llamada a `programar`)
- [x] 2.4 RED → GREEN: agregar `describe('Falla al programar el recordatorio de la reserva')` con "Falla al programar no deshace la reserva" y "Falla al programar no emite token", usando `RecordatorioRepositorioQueFalla` en `crearSistemaRecordatorios({ recordatorios: repo })`; verificar que el error es el del registro (no `ErrorReservaPublica`), que el turno `reservado` online y el paciente `00000004` existen y que no hay token del turno
- [x] 2.5 REFACTOR: actualizar el comentario de los pasos de `ejecutar` en `src/application/reservar-online.ts` (paso de programación y motivo del orden) y verificar que `npx vitest run tests/application` sigue en verde, incluidas las suites de C-10 (`reservar-online.test.ts`), C-12 (`recordatorios-turno.test.ts`) y C-13 (`recordatorios-wa-me.test.ts`) sin editar sus tests

## 3. Composición real y HTTP (capacidad `api-publica-paciente`)

- [x] 3.1 SAFETY NET: agregar en `tests/adapters/http/reservas-http.test.ts` `describe('Recordatorio de la reserva por HTTP')` con "Reserva por HTTP de un paciente nuevo deja su recordatorio pendiente" y "Falla al programar el recordatorio por HTTP"; para el segundo, sumar a `OpcionesComposicion` el gancho opcional `repoRecordatorios?` (por defecto el repositorio en memoria) y pasarlo desde `tests/fixtures/sistema-publico.ts`. Con el cableado provisorio (`EmitirTokenConRecordatorio` todavía programa) ambos deben pasar: fijan el comportamiento HTTP antes de recablear. Verificar que fallan si se reemplaza temporalmente el `recordatorios` de `EmitirTokenConRecordatorio` por un no-op (el primero) o si se quita el gancho (el segundo), y volver atrás
- [x] 3.2 GREEN: en `src/composicion.ts` inyectar `recordatorios` en `ReservarOnline` con `tokens: servicioTokens` y `AgendarTurno` simple, usar `opciones.repoRecordatorios` cuando venga y actualizar el comentario del cableado; borrar `src/application/emitir-token-con-recordatorio.ts`; verificar que los dos tests de 3.1 siguen en verde (ahora el recordatorio lo programa `ReservarOnline`), que "Falla al programar no emite token" sigue en verde y que `grep -rn "EmitirTokenConRecordatorio" src tests` no devuelve nada
- [x] 3.3 REFACTOR: actualizar el comentario de cabecera de `tests/application/reserva-con-recordatorio.test.ts` (ya no programa al emitir el token) sin cambiar sus aserciones, y el docstring de `src/application/agendar-turno-con-recordatorio.ts` (solo alta de recepción; `ReservarOnline` recibe el puerto, DD-32); verificar con `npx vitest run tests/application/reserva-con-recordatorio.test.ts tests/adapters/http`

## 4. Roadmap y pregunta abierta

- [x] 4.1 Marcar como `Resuelta` la fila "Bug de integración C-10 + C-12" de `knowledge-base/10_preguntas_abiertas.md` con fecha, referencia a este change y a DD-32; verificar con `grep -n "Bug de integración" knowledge-base/10_preguntas_abiertas.md`
- [x] 4.2 Agregar en `CHANGES.md` la entrada corta del fix `programar-recordatorio-reserva-online` (owner Matías Ibañez 52006; dependencias C-10, C-12, C-14; governance ALTO; scope: puerto en `ReservarOnline`, eliminación de `EmitirTokenConRecordatorio`, DD-32) en la sección acordada en el design; verificar con `grep -n "programar-recordatorio-reserva-online" CHANGES.md`

## 5. Verificación integral

- [x] 5.1 Ejecutar `npm test` y `npx tsc --noEmit` (y `npm run typecheck`, que incluye los tsconfig de web y UI); confirmar 0 fallos, que el total de tests es la baseline de 1.1 más los 10 nuevos y que ningún test previo cambió de aserciones
- [x] 5.2 Verificar con `grep` que cada uno de los 10 títulos de escenario de `specs/reserva-online/spec.md` y `specs/api-publica-paciente/spec.md` aparece como título de un `test(...)` en `tests/`
- [x] 5.3 Ejecutar `openspec validate programar-recordatorio-reserva-online --strict` y confirmar que pasa

## Workflow follow-up

- Revisión humana del propose antes del apply (governance ALTO).
- Aplicar con `/opsx:apply programar-recordatorio-reserva-online` respetando TDD estricto y las reglas duras de `AGENTS.md`.
- Verificar con `openspec-verify` y archivar con `/opsx:archive`, que sincroniza los deltas de `reserva-online` y `api-publica-paciente`.
- Avisar a Alejo Carabelli (owner de la composición de C-14) y a Franco Petri (C-12) del cambio de cableado.
- Commitear con conventional commits en español con el usuario de Matías Ibañez.
