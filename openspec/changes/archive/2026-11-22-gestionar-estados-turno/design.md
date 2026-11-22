# Design

## Context

Ver `proposal.md` (Why) y `specs/estados-turno/spec.md` (requisitos). Las decisiones de negocio están en DD-20 y RN-24 (`knowledge-base/09_decisiones_y_supuestos.md`, `05_reglas_de_negocio.md`). Estado actual relevante:

- `src/domain/turno.ts`: `Turno` inmutable; `esActivo()` es el único predicado de ocupación y ya excluye `cancelado` y `ausente` (DD-05). Lo usan el solapamiento del alta, la disponibilidad y el tope de RN-23.
- `src/domain/reglas/cancelacion.ts` (C-02): `evaluarCancelacion` decide con una lista propia `ESTADOS_CANCELABLES` y `cancelar` produce el turno cancelado.
- `src/domain/errores.ts`: `CodigoRN` incluye `RN-10`; `Violacion` y `ReglaNegocioError` llevan `estadoActual` opcional. No existe `RN-24`.
- `TurnoRepositorio.actualizarSi(id, cambio)` (C-02, DD-19): sección crítica sin `await` que lee, aplica `cambio` y reemplaza; un id inexistente rechaza con `RecursoNoEncontradoError('turno', id)`; una violación rechaza con `ReglaNegocioError` sin modificar.
- `Reloj`, `RelojFijo` (C-10, DD-16) y `crearSistemaCancelacion` en `tests/fixtures/sistema.ts`; `TurnoRepositorioDePrueba.cambiarEstado` arma estados de prueba sin reglas.

## Goals / Non-Goals

**Goals:**
- Una sola fuente de verdad para las transiciones de estado, compartida por la cancelación y los nuevos casos de uso.
- Reglas de confirmación y cierre como funciones puras del dominio, testeables sin repositorio ni reloj.
- Cambios aditivos: las suites de C-01, C-07, C-10 y C-02 siguen en verde sin modificarse (salvo el cableado de fixtures).

**Non-Goals:**
- Control de acceso por rol (C-09); campos de auditoría (`creadoEn`, `actualizadoEn`, `confirmadoEn`, ...).
- Endpoint HTTP y confirmación desde el enlace del recordatorio (C-12).
- Un caso de uso genérico `CambiarEstado` expuesto hacia afuera.

## Decisions

### D1. Capas y archivos

```
src/domain/errores.ts                          + 'RN-24' en CodigoRN
src/domain/reglas/transiciones.ts              NUEVO: TRANSICIONES, puedeTransicionar (puro)
src/domain/reglas/estados.ts                   NUEVO: evaluarCambioDeEstado, cambiarEstado (puras)
src/domain/reglas/cancelacion.ts               usa puedeTransicionar(…, 'cancelado') en vez de ESTADOS_CANCELABLES
src/application/cambiar-estado-turno-input.ts  NUEVO: { turnoId, actor }
src/application/cambiar-estado-turno.ts        NUEVO: función interna aplicarCambioDeEstado (no exportada desde un índice)
src/application/confirmar-turno.ts             NUEVO: ConfirmarTurno
src/application/marcar-atendido.ts             NUEVO: MarcarAtendido
src/application/marcar-ausente.ts              NUEVO: MarcarAusente
tests/fixtures/sistema.ts                      crearSistemaCancelacion suma los tres casos de uso + helpers
```

Las reglas viven en `src/domain/reglas/` y reciben `ahora` como dato (reglas duras 2 y 3). `TurnoRepositorio`, `Turno` y los adaptadores no cambian.

### D2. Tabla única de transiciones (`transiciones.ts`)

```ts
const TRANSICIONES: Readonly<Record<EstadoTurno, readonly EstadoTurno[]>> = {
  reservado:  ['confirmado', 'cancelado'],
  confirmado: ['atendido', 'ausente', 'cancelado'],
  cancelado:  [], atendido: [], ausente: [],
};
puedeTransicionar(desde: EstadoTurno, hacia: EstadoTurno): boolean
```

`Record<EstadoTurno, …>` obliga al compilador a listar todos los estados: si alguien agrega uno, `tsc` exige definir sus transiciones. Repetir una transición (`confirmado → confirmado`) es falso porque ningún estado se lista a sí mismo.

`evaluarCancelacion` reemplaza `ESTADOS_CANCELABLES.includes(turno.estado)` por `puedeTransicionar(turno.estado, 'cancelado')`. Es un refactor sin cambio de comportamiento: los tests de C-02 deben seguir en verde sin tocarlos y son la red de seguridad.

Alternativa descartada: mantener la lista de C-02 y otra lista en C-04 (dos fuentes que pueden divergir).

### D3. Reglas puras de estado (`estados.ts`)

```ts
type EstadoDestino = 'confirmado' | 'atendido' | 'ausente';
evaluarCambioDeEstado(turno: Turno, hacia: EstadoDestino, ahora: Date): Violacion | null
cambiarEstado(turno: Turno, hacia: EstadoDestino): Turno   // { ...turno, estado: hacia }
```

Orden fijo en `evaluarCambioDeEstado` (spec, "Orden de evaluación de los rechazos"):
1. `!puedeTransicionar(turno.estado, hacia)` → `{ codigo: 'RN-10', estadoActual: turno.estado }`.
2. `hacia` es `atendido` o `ausente` y `ahora.getTime() < turno.inicio.getTime()` → `{ codigo: 'RN-24' }` (umbral inclusivo: en el `inicio` exacto se permite).
3. Si no, `null`.

`EstadoDestino` excluye `cancelado` a nivel de tipos: la cancelación tiene su propia regla (RN-08) y sus campos (`canceladoPor`, `canceladoEn`), así que no pasa por acá. El `actor` no participa (D5).

Alternativa descartada: tres pares de funciones (`evaluarConfirmacion`, `evaluarAtencion`, ...). Duplican la misma lógica con un parámetro distinto.

### D4. Casos de uso

Los tres casos de uso comparten una función de aplicación:

```ts
async function aplicarCambioDeEstado(deps: { turnos; reloj }, turnoId: string, hacia: EstadoDestino): Promise<Turno> {
  const ahora = deps.reloj.ahora();                 // una sola lectura, antes de la sección crítica
  return deps.turnos.actualizarSi(turnoId, (actual) => {
    const violacion = evaluarCambioDeEstado(actual, hacia, ahora);
    return violacion === null ? { ok: true, turno: cambiarEstado(actual, hacia) } : { ok: false, violacion };
  });
}
```

`ConfirmarTurno`, `MarcarAtendido` y `MarcarAusente` son clases con `ejecutar(input: CambiarEstadoTurnoInput): Promise<Turno>` que llaman a esa función con su destino fijo. Se mantienen tres casos de uso (como pide el scope de C-04) porque C-09 va a asignar permisos distintos a cada uno y C-12 cablea solo `ConfirmarTurno`. Dependencias: `{ turnos: TurnoRepositorio; reloj: Reloj }`. Sin hook de recordatorios (DD-20).

El turno inexistente lo informa `actualizarSi` con `RecursoNoEncontradoError` antes de evaluar reglas, lo que da el primer lugar del orden.

### D5. Entrada y roles

`CambiarEstadoTurnoInput { turnoId: string; actor: Actor }`, igual que `CancelarTurnoInput`. Ninguna regla de C-04 usa el `actor`: viaja para que C-09 agregue el control de acceso sin cambiar la firma. Se documenta en el JSDoc del input.

### D6. Errores

`CodigoRN` suma `'RN-24'`. No hay clase nueva ni campos nuevos: `RN-10` ya lleva `estadoActual`.

### D7. Atomicidad y concurrencia

Reutiliza `actualizarSi` tal cual. Dos cambios concurrentes sobre el mismo turno (atendido y ausente, o cancelar y ausente) se serializan: el segundo evalúa sobre el estado que dejó el primero y se rechaza con `RN-10` porque los estados terminales no tienen transiciones. No requiere código nuevo, solo los escenarios de la spec.

### D8. Estrategia de pruebas (TDD estricto)

- `tests/domain/reglas/transiciones.test.ts`: cada par permitido → `true`; cada estado consigo mismo y los terminales hacia cualquier estado → `false`.
- `tests/domain/reglas/estados.test.ts`: `evaluarCambioDeEstado` con al menos dos casos por comportamiento (cada transición inválida con su `estadoActual`, umbral RN-24 en 08:59 y 09:00, confirmar sin restricción horaria, orden RN-10 antes que RN-24) y `cambiarEstado` (estado nuevo, resto igual, original inmutable).
- `tests/domain/reglas/cancelacion.test.ts` y `tests/application/cancelar-turno.test.ts`: sin cambios; deben seguir en verde tras el refactor de D2.
- `tests/domain/errores.test.ts`: `ReglaNegocioError` con `RN-24`.
- `tests/application/estados-turno.test.ts`: un test por `#### Scenario:` de la spec con el mismo nombre, agrupados en `describe` por requisito (regla dura 8), sobre `crearSistemaCancelacion({ ahora: lunes 10:00 })` con `turnoBaseCancelacion`. Los turnos `reservado`, `cancelado`, `atendido` y `ausente` se arman con `turnos` del `Entorno` o con `cambiarEstado` del repositorio de prueba, o mediante los propios casos de uso cuando el escenario dice "marcado".
- Concurrencia con `Promise.allSettled` sobre el mismo sistema.
- Solo datos ficticios del seed (`pa1`, `pa2`), regla dura 4.

## Risks / Trade-offs

- [Hasta C-09 cualquier rol, incluido el paciente, puede cerrar un turno desde el caso de uso] → Ninguna ruta pública lo expone; registrado en `10_preguntas_abiertas.md` para Lautaro (C-09).
- [El refactor de `cancelacion.ts` toca código ya archivado de C-02] → Sin cambio de comportamiento; los 21 escenarios de C-02 son la red de seguridad y se corren antes y después.
- [`creadoEn`/`actualizadoEn` siguen sin implementarse y el modelo de la KB no coincide con el código] → Documentado en `04` y `10`, asignado al change de persistencia real.
- [Un `ausente` marcado por error libera un horario que otro puede ocupar, y no hay transición de vuelta] → RN-24 impide marcarlo antes del turno; corregirlo después queda fuera del MVP (sin transición `ausente → atendido`).
- [Un adaptador PostgreSQL futuro necesita la misma atomicidad] → Mismo contrato de `actualizarSi` que C-02 (`UPDATE … WHERE estado = …` en transacción).

## UI Mockups

- Design system revision: 1 (no aplica)
- Decision: no (no UI) — 2026-11-22. C-04 es un caso de uso de dominio sin pantallas; la agenda de recepción con las acciones de estado es C-15.
- Mockups: n/a
- Approval: n/a
- Preview: n/a
- Visual verify: n/a

## Migration Plan

Cambios aditivos (un código RN nuevo, módulos nuevos y un refactor interno de la cancelación sin cambio de comportamiento). Las suites de C-01, C-07, C-10 y C-02 deben seguir en verde. Rollback: revertir el commit del change.
