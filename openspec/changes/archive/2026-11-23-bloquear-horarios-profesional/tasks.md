# Tasks: C-06 Bloquear Horarios del Profesional y del Sillón

> TDD estricto, de a UNA tarea por vez: RED (test que falla) $\rightarrow$ GREEN (mínimo código) $\rightarrow$ TRIANGULATE $\rightarrow$ REFACTOR.
> Los tests de caso de uso usan como título el nombre exacto de cada `#### Scenario:` de los specs de este change. Solo datos ficticios (regla dura 4).

## 1. Safety net y definición de errores

- [x] 1.1 SAFETY NET: ejecutar `npm test` para asegurar que el baseline inicial esté 100% en verde.
- [x] 1.2 RED/GREEN/TRIANGULATE: incorporar `'RN-31'` en `CodigoRN` de `src/domain/errores.ts` y verificar que `ReglaNegocioError` soporte `turnosEnConflicto`. Verificar `tests/domain/errores.test.ts`.

## 2. Reglas de Dominio de Bloqueos (DD-06 / RN-31)

- [x] 2.1 RED/GREEN/TRIANGULATE: función pura `evaluarConflictosBloqueo(bloqueo, turnos)` en `src/domain/reglas/bloqueos.ts` que valide solapamientos con turnos activos (`reservado`, `confirmado`) y descarte contiguos (RN-05) e inactivos (`cancelado`, `ausente`, `atendido`).
- [x] 2.2 Tests unitarios en `tests/domain/reglas/bloqueos.test.ts`.

## 3. Puertos y Adaptadores de Persistencia

- [x] 3.1 Ampliar interfaz `BloqueoRepositorio` en `src/application/puertos/repositorios.ts` con `guardar`, `obtenerPorId`, `eliminar` y `listarTodos`. Actualizar `tests/application/puertos.test.ts`.
- [x] 3.2 Implementar métodos mutables en `BloqueoRepositorioEnMemoria` (`src/adapters/persistence/en-memoria/catalogos.ts`).
- [x] 3.3 Tests de persistencia en `tests/adapters/catalogos.test.ts`.

## 4. Casos de Uso e Integración

- [x] 4.1 RED/GREEN/TRIANGULATE: caso de uso `BloquearHorario` (`src/application/bloquear-horario.ts`) con control de permisos por actor y verificación de conflictos.
- [x] 4.2 RED/GREEN/TRIANGULATE: caso de uso `LiberarBloqueo` (`src/application/liberar-bloqueo.ts`) con validación de existencia y permisos.
- [x] 4.3 Tests completos de casos de uso en `tests/application/bloquear-horario.test.ts` mapeando 1 a 1 cada escenario de `specs/bloqueo-horarios/spec.md`.

## 5. Verificación y Cierre

- [x] 5.1 Ejecutar suite completa `npm test` (verificar todos los tests en verde).
- [x] 5.2 Ejecutar `npx tsc --noEmit` para garantizar tipado estricto.
- [x] 5.3 Actualizar estado de tasks y preparar archivado.
