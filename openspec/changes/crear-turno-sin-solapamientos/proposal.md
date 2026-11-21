# Proposal

## Why

El diferencial del producto es que un consultorio odontológico chico nunca tenga dos turnos activos superpuestos para el mismo profesional ni para el mismo sillón, con duración variable por prestación. Hoy el repositorio no tiene código: C-01 es el GATE 0 del roadmap, abre cinco ramas de trabajo en paralelo y fija el scaffolding, las convenciones de test y los fixtures que usa todo el equipo (US-001).

## What Changes

- Scaffolding mínimo del proyecto TypeScript + Vitest (`package.json`, `tsconfig.json`, `vitest.config.ts`, estructura `src/domain`, `src/application`, `src/adapters/persistence`, `tests/`) y `.env.example` solo con valores ficticios.
- Objeto valor `Intervalo` semiabierto `[inicio, fin)` con la prueba de solapamiento `a1 < b2 && b1 < a2` (RN-05).
- Entidades de dominio: `Turno` (con `EstadoTurno` de 5 estados y `origen`), `Profesional`, `Sillon`, `Prestacion`, `Paciente`, `BloqueoHorario`, `HorarioAtencion`, `Consultorio` (con `zonaHoraria` IANA) y tipos mínimos `Rol`/`Actor` (sin autenticación).
- Cálculo de la duración efectiva: por defecto la de la prestación; ajustable de forma opcional (entero > 0, múltiplo de 5) solo por recepción, odontólogo o administrador (RN-06, RN-16, DD-10). El turno persiste `fin` y `duracionMinutos`.
- Reglas de dominio puras en `src/domain/reglas/`: recursos activos (RN-18), horario de atención en zona horaria del consultorio con un único tramo (RN-07, RN-17, DD-09), bloqueos de profesional y de sillón (RN-07), sin solapamiento por profesional (RN-02) ni por sillón (RN-03), ocupación conjunta (RN-01), sin sobreturnos para ningún rol (RN-04). Solo los turnos activos (`reservado`, `confirmado`, `atendido`) ocupan recursos (DD-05).
- Caso de uso `AgendarTurno` con puertos de repositorio y adaptadores en memoria; validación y persistencia atómicas (RN-12). El alta interna nace `confirmado` (DD-11).
- Errores tipados que informan el código `RN-XX` violado y, cuando corresponde, el turno en conflicto.
- Fixtures compartidos 100 % ficticios tomados del seed de `04_modelo_de_datos.md`.

Fuera de alcance: turnos en el pasado y `Reloj` (C-02), cancelación y reprogramación (C-02/C-03), ABM de recursos (C-05), bloqueos como caso de uso (C-06), recordatorios (C-12), reserva online (C-10), autenticación/RBAC (C-09) y API Fastify.

## Capabilities

### New Capabilities
- `agenda-turnos`: alta de turnos sobre la agenda por recursos (profesional + sillón) sin solapamientos, respetando duración efectiva, horario de atención por tramos, bloqueos, recursos activos y atomicidad. Los changes posteriores (cancelar, reprogramar, disponibilidad, reserva online) extienden esta capacidad.

### Modified Capabilities
(ninguna; `openspec/specs/` está vacío)

## Impact

- Código nuevo: `src/domain/**`, `src/application/agendar-turno.ts`, `src/application/puertos/**`, `src/adapters/persistence/**`, `tests/**` (incluye `tests/fixtures/seed.ts`).
- Archivos de proyecto nuevos: `package.json` (ESM, Node >= 20), `tsconfig.json` (strict), `vitest.config.ts`, `.env.example`, `.gitignore` si falta.
- Dependencias de desarrollo: `typescript`, `vitest`, `@types/node`. Sin dependencias de runtime.
- Todo el equipo consume los tipos, el `Intervalo`, el predicado `esActivo`, los errores tipados y los fixtures definidos acá.
