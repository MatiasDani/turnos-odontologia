# Tasks

## 1. Preparación y reglas puras

- [x] 1.1 Instalar dependencias con `npm install` y verificar que `npm test` ejecuta la suite actual en verde antes de tocar código
- [x] 1.2 Extraer `evaluarAnticipacionPaciente` a `src/domain/reglas/anticipacion.ts` y verificar que `tests/domain/reglas/cancelacion.test.ts` sigue pasando sin modificarse
- [x] 1.3 Implementar `evaluarReprogramacion` y `moverTurno` en `src/domain/reglas/reprogramacion.ts` y verificar con `tests/domain/reglas/reprogramacion.test.ts` los casos de estados, umbral de 24 h, inmutabilidad y orden de rechazos (rojo → verde)

## 2. Atomicidad del repositorio

- [x] 2.1 Extender el contrato de `TurnoRepositorio.actualizarSi` con el callback de turnos de destino y el parámetro `recursos` opcional, y verificar que `npm run typecheck` pasa sin editar C-02 ni C-04
- [x] 2.2 Pasar los turnos de los recursos destino en `TurnoRepositorioEnMemoria` sin `await` interno, y verificar en `tests/adapters/turno-repositorio.test.ts` el filtrado, la compatibilidad sin `recursos` y la serialización de dos llamadas concurrentes

## 3. Caso de uso

- [x] 3.1 Definir `src/application/reprogramar-turno-input.ts` y verificar con un test de contrato que no expone ningún campo para forzar solapamientos (RN-04)
- [x] 3.2 Implementar `ReprogramarTurno` con carga de entidades destino, pre-validación y re-validación atómica mediante `validarAlta`, y verificar los escenarios de "Validación del nuevo horario" y "Atomicidad y liberación del horario original" en `tests/application/reprogramar-turno.test.ts`
- [x] 3.3 Llamar a `recordatorios.programar(turnoId)` fuera de la sección crítica y verificar los tres escenarios de "Reprogramación del recordatorio", incluido que un fallo no deshace el movimiento

## 4. Cableado y verificación integral

- [x] 4.1 Agregar `crearSistemaReprogramacion` y sus helpers a `tests/fixtures/sistema.ts`, y verificar que las suites de C-01, C-02, C-04, C-10 y C-12 pasan sin editarse
- [x] 4.2 Cubrir con título idéntico al spec los escenarios de "Estados reprogramables", "Anticipación mínima del paciente" y "Orden de evaluación de los rechazos", y verificar que `npm test` queda en verde
- [x] 4.3 Verificar que DD-22 quedó registrado en `knowledge-base/09_decisiones_y_supuestos.md`, la precisión de RN-11 en `knowledge-base/05_reglas_de_negocio.md` y la pregunta N° 84 cerrada en `knowledge-base/10_preguntas_abiertas.md` (hecho durante el explore), y que `openspec validate c03-reprogramar-turno-atomico --strict` pasa sin hallazgos
- [x] 4.4 Ejecutar `npm run typecheck` y `npm test` completos y verificar 0 fallos antes de archivar

## Workflow follow-up

- Aplicar con `/opsx:apply` respetando TDD estricto y las reglas duras de `AGENTS.md`.
- Ejecutar `openspec-verify` y archivar con `/opsx:archive`.
- Marcar C-03 como `[x]` en `CHANGES.md` y avisar al equipo para abrir el GATE 2 (C-11 y C-09).
