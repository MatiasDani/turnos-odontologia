# Design: C-06 Bloquear Horarios del Profesional y del Sillón

## Architecture Overview

El change C-06 se implementa en arquitectura hexagonal limpia (dominio puro $\rightarrow$ casos de uso en aplicación $\rightarrow$ puertos y adaptadores de persistencia).

```
[ Application: BloquearHorario / LiberarBloqueo ]
           │                         │
           ▼                         ▼
   [ Domain Reglas ]         [ Application Puertos ]
  - evaluarConflictosBloqueo    - BloqueoRepositorio
  - validarBloqueoValido        - TurnoRepositorio
  - validarBloqueos (RN-07)     - GeneradorId
                                     │
                                     ▼
                            [ In-Memory Adapters ]
                            - BloqueoRepositorioEnMemoria
```

## D1. Reglas de Dominio y Conflictos (DD-06 / RN-31)

En `src/domain/reglas/bloqueos.ts`:
- Función pura `evaluarConflictosBloqueo(bloqueo: { profesionalId?: string; sillonId?: string; inicio: Date; fin: Date }, turnos: readonly Turno[]): Violacion | null`:
  - Filtra turnos que pertenezcan a los recursos del bloqueo:
    - Si el bloqueo tiene `profesionalId`, compara con `turno.profesionalId`.
    - Si el bloqueo tiene `sillonId`, compara con `turno.sillonId`.
  - Solo considera turnos en estado **activo**: `reservado` o `confirmado` (`esEstadoActivo(t.estado)`). Los estados `cancelado`, `ausente` y `atendido` se ignoran.
  - Evalúa solapamiento de intervalos semiabiertos `[inicio, fin)` con `seSolapa(bloqueo, turno)`.
  - Si hay turnos solapados, los ordena cronológicamente por `inicio` y luego por `id`.
  - Devuelve `{ codigo: 'RN-31', turnosEnConflicto: turnosOrdenados }`.
  - Si no hay turnos solapados, devuelve `null`.
- Función de validación de estructura `validarDatosBloqueo(datos: { profesionalId?: string; sillonId?: string; inicio: Date; fin: Date })`:
  - Al menos uno de `profesionalId` o `sillonId` debe estar presente y no vacío.
  - `inicio < fin` (intervalo con duración positiva).

## D2. Errores (`src/domain/errores.ts`)

- Ampliar `CodigoRN`:
  ```typescript
  export type CodigoRN =
    | 'RN-02'
    | 'RN-03'
    | 'RN-06'
    | 'RN-07'
    | 'RN-08'
    | 'RN-10'
    | 'RN-16'
    | 'RN-17'
    | 'RN-18'
    | 'RN-24'
    | 'RN-27'
    | 'RN-31'; // C-06: Bloqueo sobre turnos activos existentes (DD-06)
  ```
- Reutilizar `ReglaNegocioError`, `AccesoDenegadoError` y `RecursoNoEncontradoError`.

## D3. Puertos de Persistencia (`src/application/puertos/repositorios.ts`)

Extender `BloqueoRepositorio`:
```typescript
export interface BloqueoRepositorio {
  /** Bloqueos del profesional o del sillón que se solapan con el intervalo. */
  listarPorRecursos(
    profesionalId: string,
    sillonId: string,
    intervalo: Intervalo,
  ): Promise<readonly BloqueoHorario[]>;
  /** Alta o actualización del bloqueo por id. */
  guardar(bloqueo: BloqueoHorario): Promise<void>;
  /** Bloqueo por id, o undefined si no existe. */
  obtenerPorId(id: string): Promise<BloqueoHorario | undefined>;
  /** Elimina el bloqueo por id; si no existe no hace nada. */
  eliminar(id: string): Promise<void>;
  /** Lista todos los bloqueos registrados (para vistas y consultas). */
  listarTodos(): Promise<readonly BloqueoHorario[]>;
}
```

En `src/adapters/persistence/en-memoria/catalogos.ts`:
- `BloqueoRepositorioEnMemoria` gestiona un array mutable `items: BloqueoHorario[]`.
- Implementa `guardar` (inserta o reemplaza por `id`), `obtenerPorId`, `eliminar` y `listarTodos`.

## D4. Casos de Uso

### `BloquearHorario` (`src/application/bloquear-horario.ts`)
- **Entrada (`BloquearHorarioInput`)**:
  ```typescript
  export interface BloquearHorarioInput {
    readonly actor: Actor;
    readonly profesionalId?: string;
    readonly sillonId?: string;
    readonly inicio: Date;
    readonly fin: Date;
    readonly motivo?: string;
  }
  ```
- **Flujo**:
  1. **Control de acceso**:
     - Si `actor.rol === 'paciente'` $\rightarrow$ `throw new AccesoDenegadoError('paciente', 'bloquear horarios')`.
     - Si `actor.rol === 'odontologo'`: debe cumplirse `input.profesionalId === actor.profesionalId`. Si intenta bloquear a otro profesional o sólo un sillón sin indicar su profesionalId $\rightarrow$ `throw new AccesoDenegadoError('odontologo', 'bloquear recursos ajenos')`.
  2. **Validación de datos**:
     - `validarDatosBloqueo` $\rightarrow$ si faltan recursos o `inicio >= fin`, lanza `Error` de validación.
  3. **Comprobación de conflictos (DD-06 / RN-31)**:
     - Consulta los turnos existentes a través de `turnoRepositorio.listarPorRecurso(...)` o `listarPorRecursos(...)`.
     - Ejecuta `evaluarConflictosBloqueo(...)`.
     - Si hay violación, lanza `new ReglaNegocioError(violacion)`.
  4. **Persistencia**:
     - Genera `id` con `generadorId.generar()`.
     - Persiste el `BloqueoHorario` con `bloqueoRepositorio.guardar(bloqueo)`.
     - Retorna el bloqueo creado.

### `LiberarBloqueo` (`src/application/liberar-bloqueo.ts`)
- **Entrada (`LiberarBloqueoInput`)**:
  ```typescript
  export interface LiberarBloqueoInput {
    readonly actor: Actor;
    readonly bloqueoId: string;
  }
  ```
- **Flujo**:
  1. Busca el bloqueo con `bloqueoRepositorio.obtenerPorId(input.bloqueoId)`.
  2. Si no existe $\rightarrow$ `throw new RecursoNoEncontradoError('bloqueo', input.bloqueoId)`.
  3. **Control de acceso**:
     - Si `actor.rol === 'paciente'` $\rightarrow$ `AccesoDenegadoError`.
     - Si `actor.rol === 'odontologo'` y el bloqueo tiene `profesionalId !== actor.profesionalId` $\rightarrow$ `AccesoDenegadoError`.
  4. Ejecuta `bloqueoRepositorio.eliminar(input.bloqueoId)`.
