# Design

## Context

Ver `proposal.md` (Why) y los specs de `specs/` (requisitos). Las decisiones de negocio están en RN-26, RN-27 y RN-28 (`knowledge-base/05_reglas_de_negocio.md`) y en DD-24 a DD-27 (`09_decisiones_y_supuestos.md`). Estado actual relevante:

- `Profesional`, `Sillon`, `Prestacion` y `HorarioAtencion` (`src/domain/*.ts`) son interfaces `readonly`; `HorarioAtencion.profesionalId?` existe pero ningún código lo evalúa.
- `src/domain/reglas/horario.ts`: `validarHorario(intervalo, zona, horarios)` filtra `h.profesionalId === undefined`. Lo llama solo `validarAlta`, que ya recibe el `profesional` y es la única fuente de reglas del alta (C-01), la disponibilidad (C-07, DD-12) y la reprogramación (C-03).
- `src/domain/disponibilidad/generar-candidatos.ts`: `generarInicios` arma la grilla con el mismo filtro de tramos del consultorio, una vez para todos los profesionales.
- `src/application/puertos/repositorios.ts`: los puertos de catálogo son de solo lectura; `PrestacionRepositorio` solo tiene `obtenerPorId` y `HorarioAtencionRepositorio` solo `listarPorConsultorio` (incluye los tramos con `profesionalId`). `TurnoRepositorio` lista por par profesional/sillón o por paciente, no por un solo recurso.
- `src/adapters/persistence/en-memoria/catalogos.ts`: clases genéricas `PorId` / `PorIdYConsultorio` sobre un arreglo `readonly` recibido en el constructor. `PacienteRepositorioEnMemoria` ya es mutable (copia el arreglo y `guardar` hace alta o reemplazo): es el patrón a imitar.
- `src/domain/errores.ts`: `CodigoRN` llega a `RN-24`; `Violacion` y `ReglaNegocioError` llevan un único `turnoEnConflicto`; existen `RecursoNoEncontradoError` y `ConsultaInvalidaError` (validación de entrada sin código RN). Ningún caso de uso controla roles todavía.
- `GeneradorId` (puerto) y `RelojFijo` (tests) ya existen. `tests/fixtures/seed.ts` crea el seed y `tests/fixtures/sistema*.ts` cablea los casos de uso sobre repositorios en memoria.

## Goals / Non-Goals

**Goals:**
- Reglas de configuración y de desactivación como funciones puras del dominio, testeables sin repositorio ni reloj.
- Una sola función de selección de tramos (RN-27) usada por el alta, la disponibilidad y la reprogramación.
- Cambios aditivos: las suites existentes (C-01, C-02, C-03, C-04, C-07, C-10, C-11, C-12) siguen en verde sin editar sus tests; solo se tocan fixtures de cableado.

**Non-Goals:**
- Transacción común entre la desactivación y el alta (ver Riesgos).
- Caché o índices en los adaptadores en memoria.
- Exponer la configuración por HTTP o UI.

## Decisions

### D1. Capas y archivos

```
src/domain/errores.ts                        + 'RN-26', turnosEnConflicto, AccesoDenegadoError, ConfiguracionInvalidaError
src/domain/reglas/horario.ts                 + tramosDelDia(horarios, diaSemana, profesionalId?) ; validarHorario(…, profesionalId?)
src/domain/reglas/validar-alta.ts            pasa profesional.id a validarHorario
src/domain/disponibilidad/generar-candidatos.ts  GenerarIniciosEntrada.profesionalId? ; usa tramosDelDia
src/domain/reglas/configuracion.ts           NUEVO: normalizarNombre, validarProfesional/Sillon/Prestacion/Tramo, tramoEnConflicto (puras)
src/domain/reglas/desactivacion.ts           NUEVO: evaluarDesactivacion(turnos, ahora) (pura)
src/application/puertos/repositorios.ts      + escrituras de catálogo, PrestacionRepositorio.listarPorConsultorio, TurnoRepositorio.listarPorRecurso
src/application/control-acceso.ts            NUEVO: exigirAdministrador(actor, operacion)
src/application/configurar-profesionales.ts  NUEVO
src/application/configurar-sillones.ts       NUEVO
src/application/configurar-prestaciones.ts   NUEVO
src/application/configurar-horarios.ts       NUEVO
src/application/configuracion-input.ts       NUEVO: tipos de entrada de los cuatro
src/application/consultar-disponibilidad.ts  inicios por profesional (D4)
src/adapters/persistence/en-memoria/catalogos.ts   colecciones mutables + escrituras
src/adapters/persistence/en-memoria/turno-repositorio.ts  + listarPorRecurso
tests/fixtures/sistema-configuracion.ts      NUEVO: cableado compartido configuración + alta + disponibilidad + reprogramación
```

Las reglas viven en `src/domain/reglas/` y reciben `ahora` como dato (reglas duras 2 y 3). `Profesional`, `Sillon`, `Prestacion`, `HorarioAtencion` y `Turno` no cambian de forma.

### D2. Horario efectivo por día (RN-27)

```ts
tramosDelDia(horarios, diaSemana, profesionalId?: string): { desde: number; hasta: number }[]
// propios = horarios con profesionalId === profesionalId && diaSemana
// si profesionalId !== undefined && propios.length > 0 → propios; si no → los del consultorio (profesionalId undefined)
// ordenados por desde
```

`validarHorario(intervalo, zona, horarios, profesionalId?)` usa `tramosDelDia` en lugar de su filtro; el resto de la lógica (RN-07 vs RN-17 según el tramo sea el último del día) no cambia. El parámetro es opcional para que `tests/domain/reglas/horario.test.ts` siga compilando y en verde: sin él el resultado es idéntico al actual. `validarAlta` pasa siempre `profesional.id`, así que el alta, la disponibilidad y la reprogramación quedan cubiertas sin tocar `AgendarTurno` ni `ReprogramarTurno`: ambos ya cargan todos los horarios del consultorio, propios incluidos.

`aMinutos` se comparte desde `horario.ts` (hoy está duplicado en `generar-candidatos.ts`).

Alternativa descartada: resolver el horario efectivo en cada caso de uso y pasar solo los tramos resultantes a `validarAlta` (tres lugares que pueden divergir).

### D3. Generación de inicios por profesional

`GenerarIniciosEntrada` suma `profesionalId?: string` y usa `tramosDelDia(horarios, diaSemana, profesionalId)`. En `ConsultarDisponibilidad` los inicios se generan **por profesional** habilitado: `Map<profesionalId, Set<number>>`. El bucle externo recorre la unión ordenada de los inicios y solo evalúa a un profesional en los inicios de su propia grilla. Así se mantiene el orden determinista (inicio → profesional → sillón, D6 de C-07) y cada profesional queda alineado a sus propios tramos (escenario "Inicios alineados al tramo propio del profesional"). Sin horarios propios todas las grillas son iguales a la actual, así que la salida no cambia.

Alternativa descartada: unión de inicios evaluada para todos los profesionales. Ofrecería a un profesional inicios desalineados respecto de su propio tramo, contra RN-13.

### D4. Errores nuevos

```ts
type CodigoRN = … | 'RN-26';
interface Violacion { …; readonly turnosEnConflicto?: readonly Turno[] }   // también en ReglaNegocioError
class AccesoDenegadoError extends Error { readonly rol: Rol; readonly operacion: string }
type CampoConfiguracion = 'nombre' | 'apellido' | 'matricula' | 'prestacionIds' | 'duracionMinutos'
                        | 'diaSemana' | 'desde' | 'hasta' | 'tramo';
class ConfiguracionInvalidaError extends Error {
  readonly campo: CampoConfiguracion; readonly motivo: string; readonly tramoEnConflicto?: HorarioAtencion;
}
```

- `AccesoDenegadoError` sigue el patrón de `RecursoNoEncontradoError` (sin código RN): el permiso no es una regla de agenda y C-09 lo reutiliza. `operacion` es un string estable (`'configurar-profesional'`, …) para mensajes y logs.
- `ConfiguracionInvalidaError` sigue el patrón de `ConsultaInvalidaError` (DD-12). `desde >= hasta` se informa en el campo `hasta`; el solapamiento en `tramo` con el tramo en conflicto (el primero por `desde`).
- RN-26 reutiliza `ReglaNegocioError` con `turnosEnConflicto` (lista completa, por `inicio` y luego `id`); `turnoEnConflicto` queda sin valor. Se elige un campo nuevo y no reutilizar el singular porque la recepción necesita todos los turnos para resolverlos.

### D5. Reglas puras de configuración (`configuracion.ts`)

- `normalizarNombre(valor): string | null`: `trim`; `null` si queda vacío o supera 80 caracteres. Se usa para `nombre`, `apellido` y `matricula` (si se informa).
- `validarProfesional`, `validarSillon`, `validarPrestacion`, `validarTramo` devuelven `{ ok: true, valor normalizado } | { ok: false, campo, motivo }` comprobando los campos en el orden del requisito "Orden de evaluación de los rechazos de configuración". `prestacionIds` repetidos → `prestacionIds`. Duración: `Number.isInteger(d) && d > 0 && d % 5 === 0` (misma condición que RN-06 en `duracion.ts`, sin reutilizar `validarDuracion` porque esa mezcla RN-16). `diaSemana`: `Number.isInteger(d) && 0 <= d <= 6`. Hora: `/^([01]\d|2[0-3]):[0-5]\d$/`; luego `aMinutos(desde) < aMinutos(hasta)`.
- `tramoEnConflicto(tramo, existentes, excluirId?)`: primer tramo del mismo `diaSemana` y mismo ámbito (`profesionalId` igual, ambos `undefined` incluido) que se solapa con `a1 < b2 && b1 < a2` sobre minutos; `excluirId` evita el choque consigo mismo al modificar.
- Para la modificación, el caso de uso combina la entidad actual con los cambios informados y valida la entidad resultante con la misma función del alta, así no hay dos caminos de validación.

### D6. Regla pura de desactivación (`desactivacion.ts`)

```ts
evaluarDesactivacion(turnos: readonly Turno[], ahora: Date): Violacion | null
// conflictos = turnos con estado 'reservado' | 'confirmado' e inicio.getTime() >= ahora.getTime()
// vacío → null ; si no → { codigo: 'RN-26', turnosEnConflicto: ordenados por inicio, luego id }
```

No usa `esActivo` porque `atendido` es activo para la ocupación (DD-05) pero no cuenta para RN-26 (un `atendido` futuro no puede existir por RN-24; se excluye de forma explícita para no depender de esa invariante).

### D7. Puertos y adaptadores

```ts
interface ProfesionalRepositorio { …lectura actual; guardar(p: Profesional): Promise<void> }
interface SillonRepositorio      { …; guardar(s: Sillon): Promise<void> }
interface PrestacionRepositorio  { obtenerPorId; listarPorConsultorio(consultorioId); guardar(p: Prestacion): Promise<void> }
interface HorarioAtencionRepositorio {
  listarPorConsultorio; obtenerPorId(id): Promise<HorarioAtencion | undefined>;
  guardar(h: HorarioAtencion): Promise<void>; eliminar(id: string): Promise<void>;
}
type RecursoDeTurno = { readonly tipo: 'profesional' | 'sillon' | 'prestacion'; readonly id: string };
interface TurnoRepositorio { …; listarPorRecurso(recurso: RecursoDeTurno): Promise<readonly Turno[]> }  // cualquier estado
```

- `guardar` es alta o reemplazo por `id` (mismo contrato que `PacienteRepositorio.guardar`); `eliminar` de un id inexistente no hace nada (el caso de uso ya verificó la existencia).
- `listarPorRecurso` devuelve turnos de cualquier estado y el dominio filtra (D6): la regla queda en un solo lugar. Un adaptador PostgreSQL futuro puede filtrar por estado e `inicio` en la consulta sin cambiar el contrato observable de RN-26.
- Adaptadores en memoria: `PorId`/`PorIdYConsultorio` pasan a guardar una copia mutable (`[...iniciales]`) y suman `guardar`; `PrestacionRepositorioEnMemoria` pasa a extender `PorIdYConsultorio`; `HorarioAtencionRepositorioEnMemoria` suma `obtenerPorId`, `guardar` y `eliminar`. Los constructores conservan su firma, así que `crearSistema*` y `tests/adapters/catalogos.test.ts` no cambian. Las listas conservan el orden de carga y un alta se agrega al final.
- `PacienteRepositorio` no cambia (DD-27).

### D8. Casos de uso

Cuatro clases, una por recurso, con métodos por operación. Dependencias: los repositorios de catálogo necesarios, `consultorios` (alta), `turnos` y `reloj` (desactivación) e `ids: GeneradorId` (alta).

| Clase | Métodos |
|---|---|
| `ConfigurarProfesionales` | `alta`, `modificar`, `desactivar`, `reactivar` |
| `ConfigurarSillones` | `alta`, `modificar`, `desactivar`, `reactivar` |
| `ConfigurarPrestaciones` | `alta`, `modificar`, `desactivar`, `reactivar` |
| `ConfigurarHorarios` | `agregarTramo`, `modificarTramo`, `eliminarTramo` |

Todas las entradas llevan `actor: Actor`. Alta: `{ actor, consultorioId, …datos }`; modificación: `{ actor, id, cambios: Partial<…> }` donde `cambios` no admite `id`, `consultorioId`, `activo`/`activa` ni `profesionalId` del tramo (lo impide el tipo); desactivar/reactivar/eliminar: `{ actor, id }`. Cada método devuelve la entidad resultante (`eliminarTramo` devuelve `void`).

Secuencia fija (orden del requisito de rechazos):
1. `exigirAdministrador(actor, operacion)` → `AccesoDenegadoError`, antes de cualquier I/O.
2. Validación pura de los campos informados (D5) → `ConfiguracionInvalidaError`.
3. Lecturas: recurso a modificar, consultorio, prestaciones de `prestacionIds` (deben existir y pertenecer al mismo consultorio), profesional del tramo → `RecursoNoEncontradoError('profesional' | 'sillon' | 'prestacion' | 'consultorio' | 'horario', id)`.
4. Modificación: se valida de nuevo la entidad combinada (D5). Tramos: `tramoEnConflicto` sobre `listarPorConsultorio` → `ConfiguracionInvalidaError('tramo')`.
5. Desactivación: si ya está inactivo, devuelve sin cambios; si no, `evaluarDesactivacion(await turnos.listarPorRecurso(…), reloj.ahora())` → `ReglaNegocioError` RN-26; si no hay conflicto, `guardar({ …actual, activo: false })`.
6. `guardar` y devolver.

Se eligen clases por recurso (y no una clase por operación, como en C-04) porque las operaciones comparten dependencias y validaciones, y toda la configuración tiene el mismo permiso en la matriz RBAC; C-09 puede envolver cada método si llega a necesitarlo.

`exigirAdministrador` vive en `src/application/` (no en el dominio) porque es control de acceso, no regla de negocio; recibe solo el `Actor` y no lee nada.

### D9. Fixtures y seed

- `tests/fixtures/seed.ts` no cambia: sigue siendo el seed de tests y demo.
- `tests/fixtures/sistema-configuracion.ts`: `crearSistemaConfiguracion(opciones)` crea **una sola instancia** de cada repositorio en memoria (con el seed o con `overrides`, incluido un catálogo vacío) y cablea sobre ellas los cuatro casos de uso de configuración, `AgendarTurno`, `ConsultarDisponibilidad` y `ReprogramarTurno`, con `RelojFijo` (por defecto lunes 2026-11-23 10:00) y `GeneradorIdConPrefijo` por recurso (`pn-`, `sn-`, `prn-`, `hn-`). Usa `TurnoRepositorioDePrueba` para sembrar turnos en cualquier estado. Helpers con valores por defecto (`actor` administrador) para mantener los tests cortos.
- Los escenarios "Consultorio configurado desde cero" y "Consultorio sin tramos configurados no tiene agenda" usan el catálogo vacío y cargan todo por casos de uso: es la forma en que C-05 "reemplaza los fixtures por carga vía casos de uso" sin romper el seed.

### D10. Estrategia de pruebas (TDD estricto)

- `tests/domain/reglas/horario.test.ts`: casos nuevos de `tramosDelDia` y `validarHorario` con `profesionalId` (propio del día, otro día, otro profesional, RN-07 y RN-17 sobre tramos propios); los casos existentes sin `profesionalId` quedan intactos.
- `tests/domain/disponibilidad/generar-candidatos.test.ts`: grilla con tramos propios y alineación (14:10, 14:25).
- `tests/domain/reglas/configuracion.test.ts` y `tests/domain/reglas/desactivacion.test.ts`: tablas con `test.each` (mínimo dos casos por comportamiento: límites 80/81, 5 min, horas inválidas, contiguos, mismo id, umbral `inicio == ahora`, estados que no cuentan).
- `tests/domain/errores.test.ts`: `RN-26` con `turnosEnConflicto`, `AccesoDenegadoError`, `ConfiguracionInvalidaError`.
- `tests/adapters/catalogos.test.ts` y `tests/adapters/turno-repositorio.test.ts`: `guardar` alta/reemplazo, copia defensiva del arreglo inicial, `eliminar`, `listarPorRecurso` por cada tipo.
- `tests/application/configuracion-recursos.test.ts`: un test por `#### Scenario:` de `specs/configuracion-recursos/spec.md` con el mismo nombre, agrupados en `describe` por requisito (regla dura 8).
- Los escenarios ADDED de `agenda-turnos`, `disponibilidad-turnos` y `reprogramacion-turnos` van en `describe` nuevos de `tests/application/agendar-turno.test.ts`, `consultar-disponibilidad.test.ts` y `reprogramar-turno.test.ts`, con un tramo propio sembrado por `overrides.horarios`; los `describe` existentes no se editan.
- Solo datos ficticios del seed y nombres inventados ("Franco" "Ficticio", "Sillón 3", "Blanqueamiento"), regla dura 4.

## Risks / Trade-offs

- [Una desactivación y un alta concurrentes no comparten sección crítica: un alta que ya leyó el recurso activo puede crear un turno sobre el recurso recién desactivado] → Riesgo bajo (configuración poco frecuente, Node de un hilo en memoria); documentado en DD-24 y en `10_preguntas_abiertas.md` para el change de persistencia real (transacción o `SELECT … FOR UPDATE`).
- [Eliminar o acortar un tramo puede dejar turnos futuros fuera de horario] → Fuera de alcance por decisión (DD-26); pregunta abierta nueva en `10`.
- [Cambiar `validarHorario` y `generarInicios` toca código de C-01 y C-07] → Parámetro opcional y sin horarios propios el resultado es idéntico; las suites de C-01, C-03, C-07 y C-10 se corren antes y después sin editarlas.
- [Los puertos que leen el alta y la disponibilidad ahora también escriben] → Aceptado (DD-27); el único adaptador es el en memoria.
- [Un profesional puede atender fuera del horario del consultorio con un tramo propio] → Decisión del administrador (DD-25); para quitarle un día del consultorio se usa un bloqueo (C-06).
- [Un `AccesoDenegadoError` propio puede chocar con lo que diseñe C-09] → Clase mínima (`rol`, `operacion`) que C-09 puede ampliar sin romper a C-05.

## UI Mockups

- Design system revision: 1 (no aplica)
- Decision: no (no UI) — 2026-11-23. C-05 son casos de uso de dominio sin pantallas; la configuración desde la interfaz no está en el alcance de C-14 ni de C-15.
- Mockups: n/a
- Approval: n/a
- Preview: n/a
- Visual verify: n/a

## Migration Plan

Cambios aditivos: un código RN nuevo, dos clases de error, módulos nuevos, escrituras en puertos y adaptadores en memoria, y un parámetro opcional en dos funciones del dominio. Sin datos persistidos que migrar. Rollback: revertir el commit del change.
