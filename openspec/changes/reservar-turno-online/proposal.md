# Proposal

## Why

El paciente todavía no puede sacar un turno sin llamar al consultorio: existen el alta interna (`AgendarTurno`, C-01) y la consulta de disponibilidad (`ConsultarDisponibilidad`, C-07), pero no hay un caso de uso público que los combine con identificación mínima sin cuenta, protección de datos personales (Ley 25.326) y un token de gestión del turno. C-10 está en el camino crítico (`C-07 → C-10 → C-11 → C-14`) y desbloquea C-11 (gestión por token) y C-12 (recordatorios).

## What Changes

- Caso de uso nuevo `ReservarOnline` que reutiliza `ConsultarDisponibilidad` y `AgendarTurno` sin excepciones por canal: el sistema asigna profesional y sillón (primer combo del horario, SU-05), el turno nace `reservado` con `origen: 'online'` (DD-11) y el actor es siempre paciente (nunca sale del pedido).
- Validador puro de frontera en `src/adapters/http/` (sin Fastify, DD-13) que convierte el pedido `unknown` en un DTO tipado y rechaza campos desconocidos (`duracionMinutos`, `sillonId`, `forzar`, `rol`, etc.); reglas de formato del paciente compartidas con el dominio (DD-17).
- Reglas nuevas aplicadas: RN-19 (profesional habilitado), RN-20 (sin `inicio` pasado), RN-21 (token solo como hash), RN-22 (no modificar ni revelar pacientes existentes) y RN-23 (tope de 2 turnos online activos futuros por DNI y reserva duplicada).
- Manejo de la carrera (RN-12): un reintento con el siguiente combo del mismo horario; si falla, error público "horario no disponible" con nueva oferta del día.
- Error público tipado único `ErrorReservaPublica` con un conjunto cerrado de códigos; nunca expone `turnoEnConflicto`, `bloqueoEnConflicto` ni datos de otros pacientes.
- Servicio de tokens de gestión `ServicioTokens` (`emitir`, `resolver`, `rotar`) con entidad `TokenGestion` separada de `Turno`, almacenando solo el hash SHA-256 (DD-15); `rotar` queda listo para C-12.
- Piezas aditivas autorizadas para C-10 (DD-16): puerto `Reloj` + adaptador de sistema + reloj fijo de tests (C-02 lo reutiliza); puerto `PacienteRepositorio` + adaptador en memoria (C-05 lo extiende); puertos `GeneradorToken`, `Hasher` y `TokenGestionRepositorio` con adaptadores `node:crypto` y en memoria; métodos de lectura nuevos en `TurnoRepositorio` (`obtenerPorId`, `listarPorPaciente`).
- Sin cambios de comportamiento en `AgendarTurno` ni `ConsultarDisponibilidad`: sus specs no cambian.

## Capabilities

### New Capabilities
- `reserva-online`: reserva pública de un turno por el paciente sin cuenta (validación de frontera, alta o vínculo del paciente por DNI, asignación de recursos con las mismas reglas que recepción, carrera, límites por DNI, errores públicos sin fuga de datos) y emisión, resolución y rotación del token de gestión del turno.

### Modified Capabilities
<!-- Ninguna: agenda-turnos y disponibilidad-turnos no cambian de requisitos. -->

## Impact

- Código nuevo: `src/application/reservar-online.ts` (+ input y errores públicos), `src/application/servicio-tokens.ts`, `src/application/puertos/{reloj,generador-token,hasher}.ts`, `src/domain/{token-gestion,datos-paciente-online}.ts`, `src/adapters/http/pedido-reserva.ts`, `src/adapters/reloj/reloj-sistema.ts`, `src/adapters/crypto/{generador-token-crypto,hasher-sha256}.ts`, `src/adapters/persistence/en-memoria/{paciente-repositorio,token-gestion-repositorio}.ts`.
- Código modificado (aditivo): `src/application/puertos/repositorios.ts` (puertos nuevos y dos lecturas en `TurnoRepositorio`), `src/adapters/persistence/en-memoria/turno-repositorio.ts`, `tests/fixtures/sistema.ts` (cableado de la reserva) y fixture nuevo `tests/fixtures/reloj-fijo.ts`.
- Dependencias: ninguna nueva (`node:crypto` del runtime).
- Governance ALTO (datos personales en ruta pública): checkpoints de revisión en las tareas.
- Fuera de alcance: endpoints HTTP, rate limit y logs redactados (C-14 o el change que integre HTTP), e-mail de confirmación (C-12), gestión por token (C-11).
