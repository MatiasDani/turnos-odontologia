# Design

## Context

Repositorio greenfield: no hay `src/`, `tests/`, `package.json` ni specs previos. Motivación y alcance en `proposal.md`; comportamiento en `specs/agenda-turnos/spec.md`. Restricciones vinculantes: reglas duras de `AGENTS.md` (sin `any`, `strict`, dominio sin infraestructura, sin `new Date()`/`Date.now()` en el dominio, solo datos ficticios, ningún flag de forzado, escenario = test con el mismo nombre) y decisiones del explore del 2026-11-21 (DD-09, DD-10, DD-11, RN-16..RN-18).

**Governance: MEDIO.** `AGENTS.md` prevalece sobre la etiqueta CRITICO de `CHANGES.md`. Checkpoints del apply (pausar y mostrar al usuario):
1. Tras el scaffolding (`npm test` corre en verde con 0 tests / test humo).
2. Tras `Intervalo` + entidades + reglas puras (secciones 2-4 de `tasks.md`).
3. Tras `AgendarTurno` + repositorio atómico + concurrencia (secciones 5-6).

## Goals / Non-Goals

**Goals:**
- Dominio puro y determinista que todo el equipo reutiliza: `Intervalo`, `esActivo`, tipos de entidades, errores tipados, fixtures.
- Una sola fuente de evaluación de reglas con orden fijo y testeable.
- Atomicidad real en memoria, demostrada con un test de concurrencia.

**Non-Goals:**
- Reloj / turnos en el pasado (C-02), cancelar y reprogramar (C-02/C-03), ABM (C-05), caso de uso de bloqueos y DD-06 (C-06), disponibilidad (C-07), reserva online con token (C-10), recordatorios (C-12, el paso 5 del Flujo 1 queda para C-12), RBAC (C-09), API Fastify.
- Horario de atención por profesional (`HorarioAtencion.profesionalId`): el tipo lo admite pero C-01 solo evalúa el horario del consultorio (ver Open Questions).
- Restricción `Prestacion.requiereSillonIds` (Suposición sin regla RN).

## Decisions

### D1. Errores: excepción tipada `ReglaNegocioError` (no `Result`)
```ts
type CodigoRN = 'RN-02' | 'RN-03' | 'RN-06' | 'RN-07' | 'RN-16' | 'RN-17' | 'RN-18';
class ReglaNegocioError extends Error {
  readonly codigo: CodigoRN;
  readonly turnoEnConflicto?: Turno;          // RN-02 / RN-03
  readonly bloqueoEnConflicto?: BloqueoHorario; // RN-07 por bloqueo
  readonly recursoBloqueado?: 'profesional' | 'sillon';
}
class RecursoNoEncontradoError extends Error { readonly tipo; readonly id; }
```
Las reglas puras en `src/domain/reglas/` devuelven `Violacion | null` (sin lanzar); un único `validarAlta(...)` las recorre en orden y devuelve la primera violación. `AgendarTurno` convierte la violación en `ReglaNegocioError` y la lanza (la promesa se rechaza).
- *Por qué*: reglas puras fáciles de triangular; el caso de uso queda idiomático (`await expect(...).rejects.toMatchObject({ codigo: 'RN-02' })`); los futuros adaptadores HTTP mapean una sola clase.
- *Alternativa*: `Result<Turno, ReglaNegocioError>` discriminado. Descartado para no imponer un tipo de resultado a los 6 integrantes; queda la puerta abierta porque las reglas ya devuelven valores.
- RN-07 por horario no lleva `bloqueoEnConflicto`; RN-07 por bloqueo lleva `bloqueoEnConflicto` + `recursoBloqueado`, lo que distingue bloqueo de profesional vs. de sillón con el mismo código.
- `RN-04` no es un código emitido: es un invariante estructural (D3). Esto difiere del Flujo 1 de `07_flujos_principales.md` (ver Riesgos).

### D2. Orden fijo de evaluación
`RN-18` (inactivos) → `RN-16` (rol que ajusta) → `RN-06` (valor de duración) → `RN-07`/`RN-17` (horario y tramo) → `RN-07` (bloqueo de profesional, luego de sillón) → `RN-02` → `RN-03`. Las validaciones baratas y sin consulta de agenda van primero; se informa solo la primera violación. Inexistencia (`RecursoNoEncontradoError`) se chequea antes de todo, al cargar las entidades.

### D3. RN-04 sin flag de forzado
`AgendarTurnoInput` = `{ actor, pacienteId, profesionalId, sillonId, prestacionId, inicio, duracionMinutos? }`. No existe `forzar` ni similar en ningún tipo. Tests: (a) escenario con `Actor` administrador recibe `RN-02`; (b) `expectTypeOf<AgendarTurnoInput>().not.toHaveProperty('forzar')` para el escenario "La entrada no admite opción de forzar".

### D4. Tiempo y zona horaria (DD-09)
- Instantes `Date` UTC. `Consultorio.zonaHoraria` IANA. `HorarioAtencion.desde/hasta` `'HH:mm'` locales, `diaSemana` 0..6 (0 = domingo).
- `src/domain/tiempo.ts`: `aHoraLocal(instante, zona) → { diaSemana, minutosDelDia }` con `Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', weekday, hour, minute })` + `formatToParts`. La comparación se hace en minutos locales del día; no hace falta convertir local→UTC en C-01.
- `fin` se calcula en UTC: `new Date(inicio.getTime() + dur * 60_000)`. Esto no es "ahora": `new Date(ms)` construido desde un instante dado está permitido; lo prohibido es leer el reloj del sistema (regla dura 3).
- Regla de tramo (RN-07/RN-17): sea T el tramo del día local que contiene `inicio` (`desde <= inicio < hasta`). Sin T → `RN-07`. Si `fin > T.hasta`: si T es el último tramo del día → `RN-07`; si no → `RN-17`. Un turno que no termina el mismo día local cae en el mismo caso.
- Tests deterministas con ISO `-03:00` (Buenos Aires sin horario de verano).

### D5. Duración (DD-10, RN-06, RN-16)
`duracionEfectiva(actor, prestacion, informada?)`: sin informada → `prestacion.duracionMinutos`. Con informada: si `actor.rol === 'paciente'` y `informada !== prestacion.duracionMinutos` → `RN-16`; si no es entero, `<= 0` o `% 5 !== 0` → `RN-06`. El turno persiste `duracionMinutos` efectiva y `fin`.

### D6. Estados y estado inicial (DD-05, DD-11)
`EstadoTurno = 'reservado' | 'confirmado' | 'cancelado' | 'ausente' | 'atendido'`. Un único predicado exportado `esActivo(estado)` (reservado, confirmado, atendido) usado por toda consulta de ocupación. `estadoInicial(rol)`: paciente → `reservado`/`online`; resto → `confirmado`/`recepcion`.

### D7. Atomicidad (RN-12): sección crítica síncrona en el repositorio
Puerto `TurnoRepositorio` con `agregarSiDisponible(candidato, validar: (activosEnConflictoPotencial) => Violacion | null): Promise<Turno>`. El adaptador en memoria ejecuta lectura + `validar` + inserción **sin ningún `await` intermedio** (el event loop de Node garantiza que no se intercala otra alta). Toda la parte asíncrona (carga de profesional, sillón, prestación, consultorio, bloqueos) ocurre antes; lo que depende del estado mutable de la agenda (RN-02/RN-03) se evalúa dentro de la sección crítica. Las validaciones previas (RN-18, duración, horario, bloqueos) se vuelven a ejecutar adentro también, vía la misma función `validarAlta`, para que el orden de errores sea único.
- *Alternativa*: mutex por cola de promesas. Descartado: más código, y no aporta en un adaptador en memoria; el adaptador PostgreSQL futuro usará restricción de exclusión o transacción serializable con el mismo puerto.
- Test: `Promise.allSettled` de dos `AgendarTurno` de `p1` a las 09:00 → 1 `fulfilled`, 1 `rejected` con `RN-02`, repositorio con 1 turno.
- Ids: el caso de uso recibe un puerto `GeneradorId` (fixture determinista en tests, `crypto.randomUUID` en el adaptador) para no introducir aleatoriedad en el dominio. `creadoEn`/`actualizadoEn` del modelo se posponen a C-02, que introduce `Reloj` (campos opcionales en C-01).

### D8. Bloqueos
`BloqueoHorario` se modela con `profesionalId?` y `sillonId?` (al menos uno). Con `profesionalId` bloquea a ese profesional; con `sillonId` bloquea ese sillón; cada campo se evalúa por separado. Difiere de `04_modelo_de_datos.md`, que lista `profesionalId` como obligatorio (ver Riesgos). Puerto `BloqueoRepositorio.listarPorRecursos(profesionalId, sillonId, intervalo)`.

### D9. Estructura y scaffolding
```
src/domain/            intervalo.ts, tiempo.ts, turno.ts (EstadoTurno, esActivo, estadoInicial),
                       profesional.ts, sillon.ts, prestacion.ts, paciente.ts, consultorio.ts,
                       bloqueo-horario.ts, horario-atencion.ts, actor.ts (Rol, Actor), errores.ts
src/domain/reglas/     recursos-activos.ts, duracion.ts, horario.ts, bloqueos.ts,
                       solapamiento.ts, validar-alta.ts
src/application/       agendar-turno.ts
src/application/puertos/ repositorios.ts, generador-id.ts
src/adapters/persistence/ en-memoria/*.ts
tests/domain/**, tests/application/**, tests/adapters/**, tests/fixtures/seed.ts
```
- `package.json`: `"type": "module"`, `engines.node >= 20`, scripts `test` (`vitest run`), `test:watch`, `typecheck` (`tsc --noEmit`), `coverage`; devDependencies solo `typescript`, `vitest`, `@types/node` (y `@vitest/coverage-v8` para `coverage`).
- `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `module/moduleResolution: NodeNext`, `target ES2022`, `noEmit`.
- `vitest.config.ts`: `include: ['tests/**/*.test.ts']`, `environment: 'node'`, coverage v8 sobre `src/**`.
- `tests/fixtures/seed.ts`: seed de `04` + helper `local('2026-11-23', '09:00')` → `Date` con `-03:00`, y fábrica `crearEntorno(overrides)` que arma repos en memoria con el seed. `.env.example` con `TZ_CONSULTORIO` y valores ficticios; `.gitignore` con `node_modules`, `coverage`, `.env`.

### D10. Estrategia de pruebas (TDD estricto)
Capas: unit puras (`Intervalo`, `tiempo`, cada regla, `validarAlta`), caso de uso con repos en memoria (escenarios del spec, nombre exacto como título de `test`), adaptador (atomicidad). Cada comportamiento: RED → GREEN → triangulación (mínimo 2 casos; `test.each` para tablas) → REFACTOR. Sin `vi.useFakeTimers` (no hay reloj en C-01).

## UI Mockups

- Design system revision: 1 (no aplica)
- Decision: no (no UI) — 2026-11-21. C-01 es dominio puro sin pantallas.
- Mockups: n/a
- Approval: n/a
- Preview: n/a
- Visual verify: n/a

## Risks / Trade-offs

- [Flujo 1 de `07` dice "intento de forzar → RN-04"; el diseño emite RN-02/RN-03] → RN-04 se garantiza por tipo; reportar al equipo para alinear `07` (o agregar el aclaratorio) antes del archive.
- [`04` define `BloqueoHorario.profesionalId` obligatorio, pero RN-07 y la tabla de verificación piden bloqueo de solo sillón] → D8 hace ambos opcionales (al menos uno); actualizar `04` junto con el change.
- [Tabla de `05` cita "RN-07, RN-06" para el turno que excede el cierre] → se emite solo `RN-07` (primer error); el escenario lo fija.
- [Sección crítica depende de no usar `await` dentro del adaptador] → comentario explícito + test de concurrencia que falla si se agrega un `await`.
- [Conversión de zona con `Intl` sensible a la data ICU del runtime] → Node 20 trae ICU completo; tests con `-03:00` y un escenario en `Z`.
- [`creadoEn` sin Reloj en C-01] → campos opcionales; C-02 los completa.

## Migration Plan

No aplica (greenfield). Rollback = revertir el commit del change.

## Open Questions

- Horario por profesional (`HorarioAtencion.profesionalId`, "prevalece", Suposición): se evalúa recién cuando C-05 permita cargarlo; no cambia este spec.
