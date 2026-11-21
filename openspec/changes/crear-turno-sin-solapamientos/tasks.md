# Tasks

> TDD estricto: cada comportamiento se implementa RED (test que falla, ejecutado) → GREEN (mínimo código) → TRIANGULATE (≥ 2 casos) → REFACTOR. Los tests de caso de uso usan como título el nombre exacto del escenario de `specs/agenda-turnos/spec.md` (regla dura 8). Solo datos ficticios. Checkpoints de governance MEDIO al final de las secciones 1, 4 y 6.

## 1. Scaffolding

- [x] 1.1 Crear `package.json` (`type: module`, `engines.node >= 20`, scripts `test`, `test:watch`, `typecheck`, `coverage`; devDeps `typescript`, `vitest`, `@types/node`, `@vitest/coverage-v8`) y verificar que `npm install` termina sin errores
- [x] 1.2 Crear `tsconfig.json` (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `NodeNext`, `ES2022`, `noEmit`) y `vitest.config.ts` (`include: tests/**/*.test.ts`, `environment: node`, coverage v8 sobre `src/**`); verificar con un test humo en `tests/humo.test.ts` que `npm test` y `npm run typecheck` pasan
- [x] 1.3 Crear la estructura `src/domain/reglas`, `src/application/puertos`, `src/adapters/persistence/en-memoria`, `tests/domain`, `tests/application`, `tests/adapters`, `tests/fixtures`; `.env.example` (solo valores ficticios, `TZ_CONSULTORIO=America/Argentina/Buenos_Aires`) y `.gitignore` (`node_modules`, `coverage`, `.env`); verificar con `git status` que `.env` no aparece y que no hay datos reales
- [x] 1.4 CHECKPOINT: mostrar scaffolding al usuario y esperar OK antes de seguir

## 2. Intervalo y tiempo

- [ ] 2.1 RED/GREEN/TRIANGULATE `Intervalo` semiabierto (`src/domain/intervalo.ts`): `seSolapa` con contiguos (falso en ambos sentidos), parcial, contención total, idénticos; rechaza `fin <= inicio`; verificar `tests/domain/intervalo.test.ts` en verde
- [ ] 2.2 RED/GREEN/TRIANGULATE `aHoraLocal(instante, zona)` (`src/domain/tiempo.ts`) con `Intl.DateTimeFormat`: 12:00Z → lunes 540 min en Buenos Aires; 02:00Z del martes → lunes 23:00 local; verificar `tests/domain/tiempo.test.ts` en verde
- [ ] 2.3 Crear `tests/fixtures/seed.ts` con el seed ficticio de `04` (c1, p1/p2, s1/s2, pr1..pr4, horario L-V 09-13 y 15-19, bloqueo p1 miércoles 2026-11-25 15-17, pa1..pa3), helper `local(fecha, 'HH:mm')` con `-03:00` y fábrica `crearEntorno(overrides)`; verificar con un test que `local('2026-11-23','09:00')` es `2026-11-23T12:00:00Z`

## 3. Entidades y estados

- [ ] 3.1 Tipos de entidades (`consultorio`, `profesional`, `sillon`, `prestacion`, `paciente`, `horario-atencion`, `bloqueo-horario` con `profesionalId?`/`sillonId?`, `actor` con `Rol`) sin `any`; verificar con `npm run typecheck`
- [ ] 3.2 RED/GREEN/TRIANGULATE `EstadoTurno`, `esActivo` (`test.each` de los 5 estados) y `estadoInicial(rol)` (paciente → reservado/online; recepción, odontólogo, administrador → confirmado/recepcion); verificar `tests/domain/turno.test.ts` en verde
- [ ] 3.3 Definir `ReglaNegocioError` (`codigo`, `turnoEnConflicto?`, `bloqueoEnConflicto?`, `recursoBloqueado?`) y `RecursoNoEncontradoError` en `src/domain/errores.ts`; verificar con test que `instanceof` y campos se preservan

## 4. Reglas de dominio puras (`src/domain/reglas/`)

- [ ] 4.1 RED/GREEN/TRIANGULATE `recursos-activos` (RN-18): profesional, sillón y prestación inactivos → violación; todos activos → null; verificar test en verde
- [ ] 4.2 RED/GREEN/TRIANGULATE `duracion` (RN-06, RN-16): default de prestación; ajuste por recepción/odontólogo/administrador; 0, 37, -5, 12.5 → RN-06; paciente con duración distinta → RN-16; paciente con duración igual → válida; verificar test en verde
- [ ] 4.3 RED/GREEN/TRIANGULATE `horario` (RN-07, RN-17) con zona del consultorio: antes de apertura, corte 13:30, sábado, exceder cierre de la tarde → RN-07; 12:45 + 30 → RN-17; 12:30 + 30 → válido; verificar test en verde
- [ ] 4.4 RED/GREEN/TRIANGULATE `bloqueos` (RN-07): solapa bloqueo de profesional → violación con `recursoBloqueado: 'profesional'`; de sillón → `'sillon'`; contiguo 17:00 → null; otro profesional → null; verificar test en verde
- [ ] 4.5 RED/GREEN/TRIANGULATE `solapamiento` (RN-02, RN-03): mismo profesional → RN-02 con turno en conflicto; mismo sillón → RN-03; contiguos → null; ignora cancelado/ausente vía `esActivo`; verificar test en verde
- [ ] 4.6 RED/GREEN/TRIANGULATE `validarAlta` con orden fijo RN-18 → RN-16 → RN-06 → RN-07/RN-17 → bloqueos → RN-02 → RN-03; casos con violaciones múltiples devuelven solo la primera; REFACTOR de duplicación entre reglas con tests en verde
- [ ] 4.7 CHECKPOINT: mostrar al usuario reglas y orden de errores; esperar OK

## 5. Caso de uso `AgendarTurno` y puertos

- [ ] 5.1 Definir puertos en `src/application/puertos/` (`TurnoRepositorio.agregarSiDisponible`, `ProfesionalRepositorio`, `SillonRepositorio`, `PrestacionRepositorio`, `ConsultorioRepositorio`, `HorarioAtencionRepositorio`, `BloqueoRepositorio`, `GeneradorId`) y `AgendarTurnoInput` sin campo de forzado; verificar con `npm run typecheck`
- [ ] 5.2 Implementar adaptadores en memoria en `src/adapters/persistence/en-memoria/` con `agregarSiDisponible` como sección crítica síncrona (sin `await` entre leer, validar e insertar, con comentario); verificar con tests de adaptador en verde
- [ ] 5.3 RED/GREEN escenarios de "Ocupación conjunta de profesional y sillón", "Sin solapamiento por profesional" y "Sin solapamiento por sillón" en `tests/application/agendar-turno.test.ts`; verificar en verde
- [ ] 5.4 RED/GREEN escenarios de "Solo los turnos activos ocupan recursos" y "Sin sobreturnos para ningún rol" (incluye `expectTypeOf<AgendarTurnoInput>().not.toHaveProperty('forzar')`); verificar en verde
- [ ] 5.5 RED/GREEN escenarios de "Duración efectiva del turno" y "Ajuste de duración solo por personal del consultorio"; verificar en verde
- [ ] 5.6 RED/GREEN escenarios de "Horario de atención en la zona del consultorio", "Turno en un único tramo de atención" y "Bloqueos de profesional y de sillón"; verificar en verde
- [ ] 5.7 RED/GREEN escenarios de "Solo recursos activos", "Estado inicial según el origen" y "Errores tipados con orden de evaluación fijo" (incluye recurso inexistente); verificar en verde

## 6. Atomicidad (RN-12)

- [ ] 6.1 RED/GREEN "Dos altas simultáneas al mismo horario" con `Promise.allSettled`: 1 fulfilled, 1 rejected RN-02, repositorio con 1 turno; verificar en verde
- [ ] 6.2 RED/GREEN "Un rechazo no persiste nada"; verificar en verde
- [ ] 6.3 CHECKPOINT: mostrar al usuario el caso de uso completo; esperar OK

## 7. Verificación integral

- [ ] 7.1 Verificar que cada escenario del spec tiene un test con el mismo nombre (listar con `npx vitest list` y comparar con los `#### Scenario:`) y que `npm test`, `npm run typecheck` y `npm run coverage` pasan
- [ ] 7.2 Verificar reglas duras: `grep` sin `any`, sin `new Date()`/`Date.now()` sin argumentos en `src/domain`, sin imports de infraestructura en `src/domain`, sin datos reales en fixtures

## Workflow follow-up

- Alinear la KB antes del archive: `04_modelo_de_datos.md` (`BloqueoHorario.profesionalId` opcional, al menos uno de profesional/sillón) y `07_flujos_principales.md` Flujo 1 (forzar → RN-02/RN-03, RN-04 por diseño).
- `openspec-verify`, luego `/opsx:archive crear-turno-sin-solapamientos` y marcar `[x]` C-01 en `CHANGES.md`.
