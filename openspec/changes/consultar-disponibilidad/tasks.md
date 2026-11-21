# Tasks

> TDD estricto, de a UNA tarea por vez: cada comportamiento se implementa RED (test que falla, ejecutado) → GREEN (mínimo código) → TRIANGULATE (≥ 2 casos) → REFACTOR, con los tests en verde después de cada paso. Los tests de caso de uso usan como título el nombre exacto de cada `#### Scenario:` de `specs/disponibilidad-turnos/spec.md`, agrupados en `describe` por requisito (regla dura 8). Solo datos ficticios del seed. `AgendarTurno` y sus tests no se modifican. Checkpoints de governance MEDIO: 2.6, 3.11 y 4.3.

## 1. Puertos, errores y contratos

- [x] 1.1 SAFETY NET: ejecutar `npm test` y `npm run typecheck` y registrar el baseline (N tests en verde); si algo falla, detenerse y reportarlo como falla preexistente
- [x] 1.2 RED/GREEN/TRIANGULATE `listarPorConsultorio(consultorioId)` en `ProfesionalRepositorio` y `SillonRepositorio` (`src/application/puertos/repositorios.ts`) y sus adaptadores en memoria (`catalogos.ts`): devuelve solo los del consultorio (incluidos inactivos) y lista vacía para un consultorio sin recursos; verificar `tests/adapters/catalogos.test.ts` en verde
- [x] 1.3 RED/GREEN `ConsultaInvalidaError` en `src/domain/errores.ts` (`campo: 'rango' | 'paso'`, `motivo`, `name`, `instanceof Error`) sin ampliar `CodigoRN`; verificar `tests/domain/errores.test.ts` en verde
- [x] 1.4 Definir `Hueco` (`src/domain/disponibilidad/hueco.ts`) y `ConsultarDisponibilidadInput` (`src/application/consultar-disponibilidad-input.ts`: `actor`, `prestacionId`, `rango`, `ahora`, `duracionMinutos?`, `pasoMinutos?`, `profesionalId?`) sin `any` ni campo de forzado; verificar con `npm run typecheck` y un `expectTypeOf<ConsultarDisponibilidadInput>().not.toHaveProperty('forzar')`

## 2. Generación pura de candidatos y agrupación (`src/domain/disponibilidad/`)

- [x] 2.1 RED/GREEN/TRIANGULATE `deHoraLocal(fecha, minutos, zona)` en `src/domain/tiempo.ts`: lunes 2026-11-23 540 min en Buenos Aires → `2026-11-23T12:00:00Z`; 23:00 local → 02:00Z del día siguiente; ida y vuelta con `aHoraLocal`; verificar `tests/domain/tiempo.test.ts` en verde
- [x] 2.2 RED/GREEN/TRIANGULATE `generarInicios` con paso: lunes con paso 15 → 09:00..12:45 y 15:00..18:45 (los inicios que no caben los descarta luego `validarAlta`); paso 30 sin 09:15; verificar `tests/domain/disponibilidad/generar-candidatos.test.ts` en verde
- [x] 2.3 RED/GREEN/TRIANGULATE alineación al inicio de cada tramo: paso 25 → la mañana 09:00, 09:25, … y la tarde reinicia en 15:00, 15:25; verificar en verde
- [x] 2.4 RED/GREEN/TRIANGULATE rango semiabierto y `ahora`: rango lunes 09:00-10:00 → último inicio 09:45; `ahora` 10:07 → primer inicio 10:15; `ahora` 10:15 → incluye 10:15; verificar en verde
- [x] 2.5 RED/GREEN/TRIANGULATE varios días y fin de semana: rango sábado-lunes 00:00 → vacío; rango lunes-miércoles 00:00 → inicios del lunes antes que los del martes, sin aritmética de 24 h sobre instantes; luego RED/GREEN/TRIANGULATE `agruparPorHorario` (`agrupar-huecos.ts`): agrupa por `inicio`+`fin` preservando el orden de las opciones; lista vacía → vacía; verificar `tests/domain/disponibilidad/*.test.ts` en verde y REFACTOR con tests en verde
- [x] 2.6 CHECKPOINT: mostrar al usuario puertos, `ConsultaInvalidaError`, `deHoraLocal`, `generarInicios` y `agruparPorHorario` con sus tests; esperar OK antes de seguir

## 3. Caso de uso `ConsultarDisponibilidad`

- [x] 3.1 Extender `tests/fixtures/sistema.ts`: `crearSistema` cablea `ConsultarDisponibilidad` con los mismos repos en memoria y agrega un helper `consultar(sistema, {...})` con los valores por defecto del contexto común del spec (recepción, `pr1`, paso 15, `ahora` domingo 08:00, rango del día); verificar que los tests de `agendar-turno.test.ts` siguen en verde
- [x] 3.2 RED/GREEN escenarios de "Rango de consulta acotado", "Paso de los inicios candidatos" (solo "Paso inválido rechazado") y "Errores de la consulta con orden fijo" en `tests/application/consultar-disponibilidad.test.ts` (`src/application/consultar-disponibilidad.ts`: validaciones previas en el orden de design D2); verificar en verde
- [x] 3.3 RED/GREEN escenarios de "Solo recursos activos" (prestación inexistente e inactiva), "Duración efectiva de la consulta" (RN-16 y RN-06) y "Filtro opcional por profesional" (profesional inexistente); verificar en verde
- [x] 3.4 RED/GREEN escenarios de "Huecos con profesional y sillón libres a la vez" (enumeración profesional habilitado × sillón × inicio evaluada con `validarAlta`, sin duplicar reglas); verificar en verde
- [x] 3.5 RED/GREEN escenarios de "Solo los turnos activos bloquean huecos" y "Huecos dentro de un único tramo de atención"; verificar en verde
- [x] 3.6 RED/GREEN escenarios de "Bloqueos excluyen solo al recurso bloqueado" (bloqueos cargados por par con `listarPorRecursos`); verificar en verde
- [x] 3.7 RED/GREEN escenarios restantes de "Solo profesionales habilitados para la prestación", "Solo recursos activos" (recursos inactivos excluidos), "Duración efectiva de la consulta" (duración ajustada) y "Filtro opcional por profesional" (filtro por `p1`); verificar en verde
- [x] 3.8 RED/GREEN escenarios restantes de "Paso de los inicios candidatos", "Sin huecos en el pasado" y "Rango de consulta acotado" (semiabierto y 31 días exactos) a nivel de caso de uso; verificar en verde
- [x] 3.9 RED/GREEN escenarios de "Orden determinista de los combos" (repos cargados en orden `p2`,`p1` / `s2`,`s1`) y "Agrupación por horario único"; verificar en verde
- [x] 3.10 RED/GREEN escenarios de "Consistencia con el alta de turnos" (cada combo agendado por separado con `AgendarTurno` sobre un sistema nuevo con la misma agenda) y "Consulta de solo lectura"; REFACTOR del caso de uso con tests en verde
- [x] 3.11 CHECKPOINT: mostrar al usuario el caso de uso completo, el orden de errores y la cobertura de escenarios; esperar OK

## 4. Verificación integral

- [ ] 4.1 Verificar que cada `#### Scenario:` del spec tiene un test con el mismo nombre (`npx vitest list` comparado con el spec) y que `npm test`, `npm run typecheck` y `npm run coverage` pasan, incluidos los tests de C-01
- [ ] 4.2 Verificar reglas duras con `grep`: sin `any`, sin `new Date()`/`Date.now()` sin argumentos en `src/domain`, sin imports de infraestructura en `src/domain`, sin flag de forzado, sin datos reales en fixtures
- [ ] 4.3 CHECKPOINT: mostrar al usuario el resultado de 4.1 y 4.2; esperar OK antes de `openspec-verify`

## Workflow follow-up

- `openspec-verify`, luego `/opsx:archive consultar-disponibilidad` y marcar `[x]` C-07 en `CHANGES.md`.
- Avisar a C-10 (reserva online) y C-14 (UI) que el contrato `Hueco` / agrupación está disponible.
