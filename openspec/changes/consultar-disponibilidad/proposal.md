# Proposal

## Why

Hoy el sistema solo sabe validar un turno puntual (C-01): ni la recepción ni el paciente pueden ver qué horarios están libres para una prestación sin probar a ciegas. La reserva online (C-10) y la vista de UI (C-14) dependen de una consulta de huecos confiable, y C-07 está en el camino crítico del MVP (US-003, RN-13).

## What Changes

- Nuevo caso de uso de **solo lectura** `ConsultarDisponibilidad`: dada una prestación, un rango `[desde, hasta)` de hasta 31 días y el instante `ahora`, devuelve las combinaciones libres `{inicio, fin, profesionalId, sillonId}` donde un profesional habilitado (que realiza la prestación) y un sillón activo están libres a la vez durante toda la duración efectiva.
- Cada candidato se evalúa con las mismas reglas del alta de C-01 (RN-02, RN-03, RN-05, RN-06, RN-07, RN-16, RN-17, RN-18), de modo que todo hueco ofrecido se puede agendar con `AgendarTurno` sin error.
- Parámetros opcionales: `duracionMinutos` (con `actor`, reutiliza RN-06/RN-16), `pasoMinutos` (entero > 0 múltiplo de 5, por defecto 15, alineado al inicio de cada tramo) y filtro `profesionalId`.
- Salida en orden determinista (inicio, profesional, sillón) y una función pura que agrupa los combos por horario único para la vista del paciente.
- Errores: prestación o profesional filtrado inexistentes (`RecursoNoEncontradoError`), prestación inactiva (RN-18), duración inválida (RN-06/RN-16) y consulta inválida (rango o paso) con un error de validación tipado nuevo.
- Puertos de repositorio ampliados con listado de profesionales y sillones por consultorio (y sus adaptadores en memoria).
- `AgendarTurno` (C-01) **no** se modifica.

## Capabilities

### New Capabilities
- `disponibilidad-turnos`: consulta de huecos libres por prestación y rango, combinando profesional habilitado y sillón, con orden determinista, agrupación por horario y validación del rango y del paso.

### Modified Capabilities
<!-- Ninguna: el comportamiento de `agenda-turnos` no cambia. -->

## Impact

- Código nuevo en `src/application` (caso de uso, input y tipos de salida) y `src/domain` (generación de candidatos y agrupación, puras).
- `src/application/puertos/repositorios.ts` y `src/adapters/persistence/en-memoria/catalogos.ts`: métodos de listado por consultorio (aditivos, no rompen C-01).
- `src/domain/errores.ts`: nuevo error de validación de la consulta.
- Tests nuevos en `tests/domain/disponibilidad/` y `tests/application/consultar-disponibilidad.test.ts`; `tests/fixtures/sistema.ts` cablea el nuevo caso de uso.
- Sin dependencias nuevas; sin UI; sin cambios en la capa HTTP (opcional, fuera de este change).
- Habilita C-10 (reserva online) y C-14 (UI).
