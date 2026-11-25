# Proposal: C-06 Bloquear Horarios del Profesional y del Sillón

## Why

Hoy los bloqueos de horario (`BloqueoHorario`) solo existen como fixtures estáticos de lectura en el seed de tests para validar `RN-07` en el alta de turnos (C-01) y en la disponibilidad (C-07). Los odontólogos, la recepción y los administradores no cuentan con casos de uso para registrar nuevos bloqueos (por vacaciones, licencias, congresos, almuerzos o mantenimiento de sillones) ni para liberarlos.
Además, la pregunta abierta del Discovery (checklist punto 11, resuelta provisoriamente como DD-06) exige definir el comportamiento ante turnos preexistentes: si se intenta bloquear un horario donde ya existen turnos activos citados, no se deben cancelar ni destruir en silencio; el sistema debe rechazar el bloqueo e informar la lista de conflictos para su reprogramación previa.

C-06 cubre la historia de usuario US-007, resuelve DD-06 con la regla RN-31, habilita la gestión de bloqueos por actor y destraba a C-08 (vistas de agenda) y a C-09 (roles).

## What Changes

- **Caso de uso `BloquearHorario`**:
  - Permite a la recepción, al administrador o al odontólogo bloquear un intervalo semiabierto `[inicio, fin)`.
  - El bloqueo puede aplicar a un `profesionalId`, a un `sillonId` o a ambos a la vez (al menos uno obligatorio).
  - Valida el intervalo (`inicio < fin`) y los recursos especificados.
- **Detección de conflictos con turnos activos (DD-06 / RN-31)**:
  - Antes de persistir el bloqueo, el sistema consulta los turnos del profesional y/o del sillón en el intervalo.
  - Si existen turnos activos (`reservado` o `confirmado`) solapados con el bloqueo según `RN-05` (intervalos semiabiertos), se rechaza la creación del bloqueo con el código `RN-31` y se devuelve la lista completa de `turnosEnConflicto` ordenados por `inicio`.
  - Turnos cancelados, ausentes o atendidos, así como turnos contiguos (que terminan exactamente al inicio del bloqueo o empiezan al fin del mismo), no generan conflicto.
- **Caso de uso `LiberarBloqueo`**:
  - Permite eliminar un bloqueo existente mediante su `id`, liberando inmediatamente los recursos para turnos y disponibilidad.
  - Si el bloqueo no existe, lanza `RecursoNoEncontradoError('bloqueo', id)`.
- **Control de acceso y permisos por rol (US-007, KB 03)**:
  - `administrador` y `recepcion`: pueden bloquear y liberar cualquier profesional o sillón.
  - `odontologo`: solo puede bloquear y liberar su propia agenda (`profesionalId` debe coincidir con `actor.profesionalId`). No puede bloquear sillones a secas ni a otros profesionales (`AccesoDenegadoError`).
  - `paciente`: no tiene permisos de bloqueo (`AccesoDenegadoError`).
- **Persistencia**:
  - Ampliación de `BloqueoRepositorio` con `guardar`, `obtenerPorId`, `eliminar` y `listarTodos`.
  - Adaptador mutable `BloqueoRepositorioEnMemoria`.

## Capabilities

### New Capabilities
- `bloqueo-horarios`: Registro y liberación de bloqueos de agenda por profesional y sillón, prevención de solapamientos con turnos existentes (DD-06, RN-31) y control de acceso por rol.

### Modified Capabilities
- `agenda-turnos`: Ya valida bloqueos mediante `validarBloqueos` (`RN-07`); se añade verificación de integración de que un bloqueo recién creado impide agendar turnos de inmediato.

## Impact

- **Código nuevo**:
  - `src/domain/reglas/bloqueos.ts`: Función de dominio puro `evaluarConflictosBloqueo(bloqueo, turnos)`.
  - `src/application/bloquear-horario.ts`: Caso de uso `BloquearHorario` con DTOs de entrada/salida.
  - `src/application/liberar-bloqueo.ts`: Caso de uso `LiberarBloqueo`.
  - `src/application/puertos/repositorios.ts`: Métodos de escritura en `BloqueoRepositorio`.
  - `src/domain/errores.ts`: Incorporación de `'RN-31'` en `CodigoRN`.
- **Código modificado**:
  - `src/adapters/persistence/en-memoria/catalogos.ts`: Implementación de métodos mutables en `BloqueoRepositorioEnMemoria`.
- **Dependencias**: Ninguna nueva.
- **Governance**: MEDIO. TDD estricto con tests por cada escenario del spec.

## Non-goals

- Cancelación o reprogramación automática en cascada de los turnos en conflicto (queda explícitamente descartada por DD-06 para no alterar turnos sin intervención humana).
- Permitir al odontólogo agendar turnos sobre su propio bloqueo (pregunta abierta resuelta: no se permite, RN-07 estricto).
- Endpoints HTTP y vistas gráficas (corresponden a C-08 y C-15).
