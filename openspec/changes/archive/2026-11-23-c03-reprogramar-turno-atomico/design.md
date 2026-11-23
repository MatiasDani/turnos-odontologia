# Design

## Context

Ver `proposal.md` (Why) y `specs/reprogramacion-turnos/spec.md` (requisitos). Las decisiones de negocio se registran como DD-22 en `knowledge-base/09_decisiones_y_supuestos.md`. Estado actual relevante:

- `validarAlta` (`src/domain/reglas/validar-alta.ts`) es la única fuente de evaluación de reglas del alta, con orden fijo RN-18 → RN-16 → RN-06 → RN-07/RN-17 → bloqueos → RN-02 → RN-03, y devuelve un `ResultadoValidacion` discriminado.
- `TurnoRepositorio.actualizarSi` (`src/application/puertos/repositorios.ts`) es atómico sin `await`, pero su callback solo recibe el turno propio: el design de C-02 (D4, riesgo) dejó pendiente extenderlo para validar solapamiento contra los recursos de destino.
- `AgendarTurno` hace pre-validación fuera de la sección crítica y re-validación dentro de `agregarSiDisponible` con los turnos leídos atómicamente; es el patrón a replicar.
- `evaluarCancelacion` (`src/domain/reglas/cancelacion.ts`) contiene la transición a `cancelado` (RN-10) y la anticipación de 24 h (RN-08) en una sola función; RN-08 necesita reutilizarse sin arrastrar la transición de cancelación.
- `Recordatorios.programar(turnoId)` ya existe desde C-12 (DD-21), es idempotente y recalcula `programadoPara` desde el `inicio` actual del turno.
- `Turno` es inmutable, `esActivo()` es el único predicado de ocupación y C-02/C-04 ya usan `actualizarSi`.
- Los tests usan `crearSistemaCancelacion` y `RecordatoriosEspia` de `tests/fixtures/sistema.ts`; `TurnoRepositorioDePrueba` extiende al adaptador real y hereda `actualizarSi`.

## Goals / Non-Goals

**Goals:**
- Reprogramar conservando identidad, estado y origen, convalidando el nuevo horario como un alta que se ignora a sí misma.
- Hacer atómicas la validación del solapamiento en destino y la persistencia, sin `await` dentro de la sección crítica.
- Reutilizar RN-08 y `validarAlta` sin duplicar reglas ni tocar el comportamiento de changes archivados.
- Mantener las suites de C-01, C-02, C-04, C-10 y C-12 en verde sin editar sus tests.

**Non-Goals:**
- Control de acceso por rol (C-09) ni verificación de propiedad por token (C-11).
- Endpoints HTTP o pantallas (C-14, C-15).
- Restricción de `inicio >= ahora` para el personal: RN-20 es exclusiva de la reserva online y C-02/C-04 ya operan sobre turnos pasados.
- Cambios en el token de gestión: la rotación la sigue haciendo C-12 al enviar el recordatorio (RN-21).
- `creadoEn`/`actualizadoEn` en `Turno` (pospuesto en DD-20).

## Decisions

### D1. Capas y archivos

```
src/domain/reglas/anticipacion.ts            NUEVO: evaluarAnticipacionPaciente (RN-08), pura
src/domain/reglas/cancelacion.ts             + delega RN-08 a anticipacion.ts (sin cambio de resultado)
src/domain/reglas/reprogramacion.ts          NUEVO: evaluarReprogramacion (RN-10, RN-08) y moverTurno (puro)
src/application/reprogramar-turno-input.ts   NUEVO: contrato de entrada
src/application/reprogramar-turno.ts         NUEVO: caso de uso
src/application/puertos/repositorios.ts      + callback con turnos de destino en actualizarSi (aditivo)
src/adapters/persistence/en-memoria/turno-repositorio.ts  + pasa turnos de los recursos de destino
tests/fixtures/sistema.ts                    + crearSistemaReprogramacion y helpers
tests/application/reprogramar-turno.test.ts  NUEVO: un test por escenario del spec
```

Las reglas nuevas son funciones puras: no importan infraestructura ni leen la hora (reglas duras 2 y 3). No se agregan códigos RN ni dependencias.

### D2. Estados y reglas puras

`evaluarReprogramacion(turno, rol, ahora)` devuelve la primera violación:

1. Estado no `reservado` ni `confirmado` → `{ codigo: 'RN-10', estadoActual: turno.estado }`.
2. `rol === 'paciente'` y `turno.inicio - ahora < 24 h` → `{ codigo: 'RN-08' }` vía `evaluarAnticipacionPaciente`.
3. Si no, `null`.

La reprogramación **no cambia el estado**: `moverTurno(turno, datosNuevos)` devuelve una copia con el mismo `id`, paciente, estado, origen y campos de cancelación, reemplazando `inicio`, `fin`, `duracionMinutos` y los recursos informados. Se usa la tabla de transiciones de DD-20 solo como referencia de estados terminales; no se inventa una transición `reprogramado`.

Alternativa descartada: reutilizar `evaluarCancelacion` directamente (evalúa la transición a `cancelado`, no aplica). También se descartó agregar un estado `reprogramado`: rompería la identidad del turno y el vínculo con el token.

### D3. Extracción de RN-08

Se extrae `evaluarAnticipacionPaciente(turno, rol, ahora): Violacion | null` a `src/domain/reglas/anticipacion.ts` con la constante de 24 h en milisegundos. `evaluarCancelacion` llama a esa función en el mismo punto del orden actual, así que sus tests y su comportamiento no cambian. `evaluarReprogramacion` la reutiliza.

Alternativa descartada: duplicar la constante en `reprogramacion.ts` (dos fuentes de verdad para la misma regla de negocio).

### D4. Atomicidad sobre los recursos de destino

Se extiende de forma compatible el contrato de `actualizarSi`:

```ts
actualizarSi(
  id: string,
  cambio: (actual: Turno, turnosDeLosRecursos: readonly Turno[]) => ResultadoCambio,
  recursos?: { readonly profesionalId: string; readonly sillonId: string },
): Promise<Turno>;
```

- Sin `recursos`, el segundo argumento del callback es `[]`: C-02 y C-04 siguen funcionando sin cambios.
- Con `recursos`, el adaptador filtra los turnos por profesional **o** sillón destino antes de ejecutar `cambio`, dentro de la misma sección crítica sin `await`.
- El caso de uso excluye el propio turno por `id` antes de pasarlos a `validarAlta` (RN-11).
- Se mantiene el rechazo de `RecursoNoEncontradoError` para id inexistente y de error de programación si el cambio altera el `id`.

Alternativa descartada: un método `reprogramarSi` nuevo y separado: duplicaría la sección crítica y dejaría dos contratos de atomicidad que pueden divergir en PostgreSQL. También se descartó validar solo fuera de la sección crítica: permitiría una carrera entre la consulta y la escritura (RN-12).

### D5. Reutilización de `validarAlta` y carga de entidades

El caso de uso sigue el patrón de `AgendarTurno`:

1. Carga profesional, sillón, prestación, consultorio, horarios y bloqueos **del destino**; un recurso inexistente se rechaza con `RecursoNoEncontradoError` antes que cualquier RN.
2. Pre-validación con `validarAlta({ ...entrada, turnos: [] })` para rechazar temprano y obtener intervalo y duración efectiva.
3. `actualizarSi` con los recursos destino; dentro del callback se ejecuta otra vez `evaluarReprogramacion` y `validarAlta` con los turnos ajenos filtrados, devolviendo `Violacion` o el turno movido.
4. Fuera de la sección crítica, `await recordatorios.programar(turnoId)`.

`validarAlta` se reutiliza tal cual, incluido el orden de errores; no se crea una variante "de reprogramación".

### D6. Contrato de entrada y salida

```ts
interface ReprogramarTurnoInput {
  readonly turnoId: string;
  readonly actor: Actor;
  readonly inicio: Date;
  readonly profesionalId?: string;
  readonly sillonId?: string;
  readonly prestacionId?: string;
  readonly duracionMinutos?: number;
}
```

Devuelve el `Turno` movido. Si no se informan recursos, se conservan los del turno; la duración sigue RN-06 y RN-16 (un paciente no puede informar una distinta). No existe ningún campo para forzar solapamientos (RN-04). El `actor` viaja por contrato, igual que en C-02/C-04; su interpretación RBAC es de C-09.

Alternativa descartada: exigir todos los recursos en cada llamada (obliga a C-11 a reenviar datos que el paciente no posee, p. ej. el sillón).

### D7. Recordatorios

Se llama a `programar` **después** de `actualizarSi`, igual que C-02 llama a `cancelarPendientes`: si el puerto falla, el error se propaga y el turno ya movido no se deshace (DD-19/DD-21). No se cancela ni se crea un recordatorio nuevo: el adaptador real reemplaza el pendiente conservando su `id` (RN-25). Con el cableado de C-02 se usa el no-op; con el de C-12, `RecordatoriosEmail`.

### D8. Estrategia de pruebas (TDD estricto)

- `tests/domain/reglas/anticipacion.test.ts` y `reprogramacion.test.ts`: al menos dos casos por comportamiento (estados, 24 h exactas y 1 min menos, roles, inmutabilidad del turno original, orden de violaciones).
- `tests/adapters/turno-repositorio.test.ts`: `actualizarSi` con `recursos` pasa solo los turnos de destino; sin `recursos` sigue igual; dos llamadas concurrentes se serializan.
- `tests/application/reprogramar-turno.test.ts`: un test por escenario del spec con el mismo nombre, sobre `crearSistemaReprogramacion` con `RelojFijo` y `RecordatoriosEspia`.
- Concurrencia con `Promise.allSettled`; fixtures 100 % ficticios del seed (regla dura 4); sin red.
- Verificación final: `npm install` (el workspace clonado no tiene `node_modules`), `npm run typecheck` y `npm test`.

## UI Mockups

- Design system revision: 1 (no aplica)
- Decision: no (no UI) — 2026-11-23. La pantalla pública de gestión es C-14 y la agenda de recepción es C-15.
- Mockups: n/a
- Approval: n/a
- Preview: n/a
- Visual verify: n/a

## Risks / Trade-offs

- [Extender la firma de `actualizarSi` afecta a C-02 y C-04] → Parámetro opcional y callback con argumento extra; TypeScript permite callbacks con menos parámetros, y sus suites deben seguir en verde sin editarse.
- [Carrera con un alta de recepción en el horario destino] → Re-validación dentro de la sección crítica con los turnos de destino (D4).
- [Falla del puerto de recordatorios tras mover el turno] → Error propagado sin deshacer, criterio ya aceptado en DD-19/DD-21.
- [RBAC: hasta C-09 cualquier rol puede invocar el caso de uso] → Documentado en DD-22 y en la pregunta abierta existente de Lautaro (C-09); no se cambia el alcance.
- [Persistencia real futura] → El contrato de `actualizarSi` define explícitamente la lectura de los turnos de destino dentro de la misma transacción (`SELECT ... FOR UPDATE` o equivalente).

## Migration Plan

Cambios aditivos: un módulo de reglas, un caso de uso, un parámetro opcional en el puerto y su adaptador, y nuevos tests. Sin migración de datos ni dependencias nuevas. Rollback: revertir el commit del change. Secuencia de verificación: `npm install`, `npm run typecheck`, `npm test`, `openspec validate c03-reprogramar-turno-atomico --strict`.
