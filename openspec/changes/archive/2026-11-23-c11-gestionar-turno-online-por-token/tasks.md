# Tasks

## 1. Preparación y decisión registrada

- [x] 1.1 Registrar DD-23 en `knowledge-base/09_decisiones_y_supuestos.md` (traducción de errores públicos de gestión, umbral de 24 h y no rotación al reprogramar) y marcar US-010 como cubierta a nivel de caso de uso en `knowledge-base/06_funcionalidades.md`; verificar con `grep` que ambos textos aparecen
- [x] 1.2 Verificar con `npm run typecheck` y `npm test` que la baseline (740 tests) está en verde antes de escribir código

## 2. Errores públicos y resolución del token

- [x] 2.1 Crear `src/application/errores-gestion-turno-publica.ts` con el conjunto cerrado `CONTACTAR_CONSULTORIO`, `HORARIO_NO_DISPONIBLE` y `DATOS_INVALIDOS`, mensajes fijos y sin datos internos; verificar en `tests/application/errores-gestion-turno-publica.test.ts` que cada serialización contiene solo código y mensaje (rojo → verde)
- [x] 2.2 Crear el helper de resolución compartido sobre `ServicioTokens.resolver` y `TurnoRepositorio.obtenerPorId` que lanza `ErrorEnlacePublico` sin motivo; verificar con los cuatro escenarios de "Resolución previa del token" en `tests/application/gestion-turno-desde-token.test.ts` (rojo → verde)

## 3. Consulta del propio turno

- [x] 3.1 Definir el DTO `TurnoPublico` (sin `token`, `sillonId`, `pacienteId` ni `estado`) e implementar `ConsultarTurnoDesdeToken`; verificar los dos escenarios de "Consulta del propio turno" con un test de contrato que falla si aparece algún campo prohibido (rojo → verde)

## 4. Cancelación por token

- [x] 4.1 Implementar `CancelarTurnoDesdeToken` comprobando RN-08 con la regla pura compartida antes de delegar en `CancelarTurno` con actor `paciente`; verificar los cuatro escenarios de "Cancelación con anticipación suficiente" (incluidos horario liberado y recordatorio anulado) y los dos de "Cancelación con menos de 24 horas" (rojo → verde)

## 5. Reprogramación por token

- [x] 5.1 Definir `ReprogramarDesdeTokenInput` (`token`, `inicio`, `profesionalId?`, `prestacionId?`) y verificar con un test de contrato que no expone `turnoId`, `actor`, `rol`, `sillonId`, `duracionMinutos` ni `forzar`, y que un `inicio` inválido se rechaza con `DATOS_INVALIDOS` sin delegar en C-03
- [x] 5.2 Implementar `ReprogramarDesdeToken` con la misma comprobación de RN-08, delegación en `ReprogramarTurno` con actor `paciente` y sin rotar el token; verificar los cuatro escenarios de "Reprogramación con anticipación suficiente" (incluidos solapamiento, recordatorio movido y token que usa el nuevo `fin`) y el de "Reprogramación con menos de 24 horas" (rojo → verde)

## 6. Integración y verificación

- [x] 6.1 Agregar `crearSistemaGestion` y sus helpers a `tests/fixtures/` cableando tokens, cancelación y reprogramación sobre un mismo reloj y repositorio; verificar los escenarios de "Errores públicos sin filtrado de datos" y "Orden de evaluación de los rechazos" con títulos idénticos a los del spec
- [x] 6.2 Ejecutar `npm run typecheck` y `npm test` completos, confirmar 0 fallos y que las suites de C-02, C-03, C-10 y C-12 siguen en verde sin editarse
- [x] 6.3 Ejecutar `openspec validate c11-gestionar-turno-online-por-token --strict --no-interactive` y verificar 4/4 artefactos y todos los tasks completos antes de archivar

## Workflow follow-up

- Aplicar con `/opsx:apply` respetando TDD estricto y las reglas duras de `AGENTS.md`.
- Archivar con `/opsx:archive` y marcar C-11 como `[x]` en `CHANGES.md`.
- Commitear con mensaje conventional en español y pushear la rama `c11-gestionar-turno-online-por-token`.
