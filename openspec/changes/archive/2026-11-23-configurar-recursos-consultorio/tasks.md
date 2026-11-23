# Tasks

> TDD estricto, de a UNA tarea por vez: RED (test que falla, ejecutado) → GREEN (mínimo código) → TRIANGULATE (≥ 2 casos) → REFACTOR, con los tests en verde después de cada paso. Los tests de caso de uso usan como título el nombre exacto de cada `#### Scenario:` de los specs de este change, agrupados en `describe` por requisito (regla dura 8). Solo datos ficticios del seed y nombres inventados (regla dura 4). Governance BAJO: sin checkpoints obligatorios. Sin commits intermedios: el commit se hace al cerrar el change completo.

## 1. Safety net y errores

- [x] 1.1 SAFETY NET: instalar dependencias si faltan (`npm ci`), ejecutar `npm test` y `npm run typecheck` y registrar el baseline de tests en verde; si algo falla, detenerse y reportarlo como falla preexistente
- [x] 1.2 RED/GREEN/TRIANGULATE `'RN-27'` en `CodigoRN` y `turnosEnConflicto` en `Violacion` y `ReglaNegocioError` (`src/domain/errores.ts`, design D4): el error conserva la lista completa y no tiene `turnoEnConflicto`; verificar `tests/domain/errores.test.ts` en verde
- [x] 1.3 RED/GREEN/TRIANGULATE `AccesoDenegadoError` (`rol`, `operacion`) y `ConfiguracionInvalidaError` (`campo`, `motivo`, `tramoEnConflicto?`) sin código RN (design D4); verificar `tests/domain/errores.test.ts` en verde

## 2. Horario efectivo por día (RN-28)

- [x] 2.1 RED/GREEN/TRIANGULATE `tramosDelDia(horarios, diaSemana, profesionalId?)` en `src/domain/reglas/horario.ts` (design D2): con tramos propios del día solo esos; sin propios ese día, los del consultorio; tramos de otro profesional nunca; sin `profesionalId`, los del consultorio; ordenados por `desde`; verificar `tests/domain/reglas/horario.test.ts` en verde
- [x] 2.2 RED/GREEN/TRIANGULATE `validarHorario(…, profesionalId?)` usando `tramosDelDia`: turno dentro del tramo propio, `RN-07` con el tramo del consultorio el día con horario propio, `RN-07` al exceder el último tramo propio, `RN-17` al cruzar el corte entre tramos propios; verificar que los casos existentes de `horario.test.ts` siguen en verde SIN modificarlos
- [x] 2.3 Pasar `profesional.id` a `validarHorario` desde `validarAlta` (`src/domain/reglas/validar-alta.ts`); RED/GREEN de los seis escenarios de "Horario propio del profesional por día" (`specs/agenda-turnos/spec.md`) en un `describe` nuevo de `tests/application/agendar-turno.test.ts` con el tramo propio sembrado por `overrides.horarios`; verificar que `validar-alta.test.ts` y `agendar-turno.test.ts` existentes siguen en verde
- [x] 2.4 RED/GREEN de los tres escenarios de "Horario propio del profesional al reprogramar" (`specs/reprogramacion-turnos/spec.md`) en un `describe` nuevo de `tests/application/reprogramar-turno.test.ts` (no requiere código nuevo si 2.3 está hecho); verificar en verde junto con la suite de C-03
- [x] 2.5 RED/GREEN/TRIANGULATE `profesionalId?` en `GenerarIniciosEntrada` (`src/domain/disponibilidad/generar-candidatos.ts`, design D3), reutilizando `tramosDelDia` y `aMinutos`: grilla del tramo propio (14:00..17:45 con paso 15), alineación a 14:10 y 14:25, sin `profesionalId` igual que hoy; verificar `tests/domain/disponibilidad/generar-candidatos.test.ts` en verde sin editar sus casos existentes
- [x] 2.6 Generar los inicios por profesional en `ConsultarDisponibilidad` (design D3, unión ordenada y evaluación solo en la grilla de cada profesional); RED/GREEN de los cuatro escenarios de "Horario propio del profesional en la disponibilidad" en un `describe` nuevo de `tests/application/consultar-disponibilidad.test.ts`; validar con una mutación (evaluar la unión para todos los profesionales) que "Inicios alineados al tramo propio del profesional" falla; verificar en verde junto con las suites de C-07, C-10 y C-11

## 3. Puertos y adaptadores en memoria

- [x] 3.1 Sumar a `src/application/puertos/repositorios.ts` las escrituras de catálogo, `PrestacionRepositorio.listarPorConsultorio`, `HorarioAtencionRepositorio.obtenerPorId`/`guardar`/`eliminar` y `TurnoRepositorio.listarPorRecurso` con `RecursoDeTurno` (design D7); actualizar `tests/application/puertos.test.ts` con `expectTypeOf` de las firmas nuevas; verificar `npm run typecheck` (fallará hasta 3.2–3.3)
- [x] 3.2 RED/GREEN/TRIANGULATE adaptadores de catálogo mutables (`src/adapters/persistence/en-memoria/catalogos.ts`): `guardar` como alta al final y como reemplazo por `id` para profesionales, sillones, prestaciones y horarios; `listarPorConsultorio` de prestaciones; `obtenerPorId` y `eliminar` de horarios (id inexistente no hace nada); modificar el arreglo pasado al constructor no altera el repositorio; verificar `tests/adapters/catalogos.test.ts` en verde sin editar sus casos existentes
- [x] 3.3 RED/GREEN/TRIANGULATE `TurnoRepositorioEnMemoria.listarPorRecurso` para `profesional`, `sillon` y `prestacion`, devolviendo turnos de cualquier estado y solo del recurso pedido; verificar `tests/adapters/turno-repositorio.test.ts` en verde, `npm run typecheck` y la suite completa sin regresiones

## 4. Reglas puras de configuración y desactivación

- [x] 4.1 RED/GREEN/TRIANGULATE `normalizarNombre` y `validarProfesional`, `validarSillon`, `validarPrestacion` (`src/domain/reglas/configuracion.ts`, design D5): recorte de extremos, vacío y solo espacios, límites 80/81, matrícula opcional, `prestacionIds` repetidos, duraciones 5 y 30 válidas, 0, -15, 32 y 12,5 inválidas, primer campo inválido en el orden del requisito; verificar `tests/domain/reglas/configuracion.test.ts` en verde
- [x] 4.2 RED/GREEN/TRIANGULATE `validarTramo` y `tramoEnConflicto` (design D5): `diaSemana` 7, -1, 1,5; horas "9:00", "24:00", "12:60", "0900"; `desde == hasta` y `desde > hasta` en el campo `hasta`; 00:00-23:59 válido; solapado en el mismo ámbito, contiguo válido, otro día válido, ámbitos distintos válidos, exclusión del propio id; verificar `tests/domain/reglas/configuracion.test.ts` en verde
- [x] 4.3 RED/GREEN/TRIANGULATE `evaluarDesactivacion(turnos, ahora)` (`src/domain/reglas/desactivacion.ts`, design D6): `reservado` y `confirmado` futuros en conflicto, umbral `inicio == ahora` en conflicto, `cancelado`, `ausente`, `atendido` y ya iniciados no cuentan, lista ordenada por `inicio` y luego `id`, sin conflictos → `null`; verificar `tests/domain/reglas/desactivacion.test.ts` en verde y que `src/domain` no importa infraestructura ni usa `new Date()` / `Date.now()` (reglas duras 2 y 3)

## 5. Casos de uso de configuración

- [x] 5.1 Crear `exigirAdministrador` (`src/application/control-acceso.ts`), los tipos de entrada (`src/application/configuracion-input.ts`) y `tests/fixtures/sistema-configuracion.ts` (design D8, D9: una instancia por repositorio compartida por configuración, alta, disponibilidad y reprogramación; `RelojFijo` lunes 10:00; ids con prefijo; opción de catálogo vacío); verificar `npm run typecheck`
- [x] 5.2 RED/GREEN `ConfigurarSillones` (`src/application/configurar-sillones.ts`): escenarios de "Alta y modificación de sillón" y los de "Solo el administrador configura recursos" sobre sillones, en `tests/application/configuracion-recursos.test.ts`; verificar en verde
- [x] 5.3 RED/GREEN `ConfigurarPrestaciones`: escenarios de "Alta y modificación de prestación", "Duración válida de la prestación" y "Paciente no puede modificar una prestación"; verificar en verde
- [x] 5.4 RED/GREEN `ConfigurarProfesionales`: escenarios de "Alta de profesional", "Modificación de profesional" y "Odontólogo no puede desactivar un profesional"; verificar en verde
- [x] 5.5 RED/GREEN `desactivar` y `reactivar` en las tres clases: escenarios de "Desactivación lógica de recursos", "Desactivación bloqueada por turnos activos futuros" (turnos sembrados con `TurnoRepositorioDePrueba`) y "Reactivación de recursos"; validar con una mutación (quitar el chequeo RN-27 o usar `esActivo`) que los tests fallan; verificar en verde
- [x] 5.6 RED/GREEN `ConfigurarHorarios` (`agregarTramo`, `modificarTramo`, `eliminarTramo`): escenarios de "Tramos del horario de atención", "Validez de los tramos de horario", "Sin tramos solapados en el mismo ámbito" y "Recepción no puede agregar un tramo de horario"; verificar en verde
- [x] 5.7 RED/GREEN escenarios de "Orden de evaluación de los rechazos de configuración"; verificar en verde

## 6. Integración con la agenda

- [x] 6.1 RED/GREEN escenarios de "Un recurso desactivado no recibe turnos nuevos" (desactivación por caso de uso y luego `AgendarTurno` / `ConsultarDisponibilidad` sobre el mismo sistema; sin código nuevo, RN-18 ya lo cubre); verificar en verde
- [x] 6.2 RED/GREEN escenarios de "Agenda operativa con recursos configurados por casos de uso" con el catálogo vacío de `crearSistemaConfiguracion`; verificar en verde
- [x] 6.3 Ejecutar `npm test` y `npm run typecheck` completos: todo en verde con el baseline de 1.1 más los tests nuevos; `git diff --stat tests/` solo muestra archivos nuevos, `describe` agregados y los fixtures/tests de puertos y adaptadores previstos; verificar que cada `#### Scenario:` de los cuatro specs tiene su test con el mismo nombre (p. ej. con `grep`)
- [x] 6.4 Alinear la KB con la implementación (`knowledge-base/04_modelo_de_datos.md`, `08_arquitectura_propuesta.md` si lista casos de uso, puertos o reglas del dominio, RN-27/RN-28/RN-29 y DD-25..DD-28 si cambió algún detalle) y actualizar el comentario de `src/domain/horario-atencion.ts` que dice que C-01 solo evalúa el horario del consultorio; verificar que la KB no contradice los specs ni el design
- [x] 6.5 Ejecutar `openspec validate configurar-recursos-consultorio --strict --no-interactive` y verificar que el change es válido

## Workflow follow-up

- Verificar el change (`openspec-verify`).
- Archivar con `/opsx:archive configurar-recursos-consultorio`, marcar C-05 como `[x]` en `CHANGES.md` y avisar al equipo (C-09 sigue esperando C-06).
- Hacer un único commit del change completo con el usuario de Alejo Carabelli (conventional commit en español), sincronizar Engram, pushear la rama y abrir el PR.
