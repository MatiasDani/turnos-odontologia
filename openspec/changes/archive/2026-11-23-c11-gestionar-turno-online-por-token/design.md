# Design

## Context

`ServicioTokens` (C-10) ya resuelve un token por hash y devuelve el `turnoId` sin explicar el motivo de un rechazo; C-12 lo usa en `ConfirmarDesdeEnlace` con `ErrorEnlacePublico`. `CancelarTurno` (C-02) y `ReprogramarTurno` (C-03) ya aplican RN-08 con actor `paciente`, cancelan/anulan recordatorios y revalidan el movimiento dentro de la sección crítica. Falta una capa pública que traduzca esos contratos a operaciones del paciente y a errores sin filtrado (ver `proposal.md` para la motivación y el spec para el comportamiento observable).

## Goals / Non-Goals

**Goals:**
- Un único punto de resolución del token, reutilizado por consultar, cancelar y reprogramar.
- Cero duplicación de RN-08/RN-09/RN-10/RN-11/RN-12: delegar en los casos de uso existentes con actor `paciente`.
- Un conjunto cerrado de errores públicos con mensajes fijos, sin códigos RN ni datos internos.
- DTOs públicos que no exponen sillón, paciente, estado ni token.

**Non-Goals:**
- Servidor HTTP, rutas `GET/POST /public/turnos/:token` ni validación de cuerpo `unknown` (C-14).
- Rotar tokens, emitirlos de nuevo o recuperar un token perdido.
- Control de acceso RBAC (C-09), pantallas (C-14/C-15) o cambios en `reserva-online`/`recordatorios-turno`.

## Decisions

**D1 — Resolución compartida.** Un helper de aplicación resuelve el token con `ServicioTokens.resolver` y lee el turno con `TurnoRepositorio.obtenerPorId`; si falta, lanza `ErrorEnlacePublico`. Los tres casos de uso lo invocan al comenzar. *Alternativa:* resolver dentro de cada caso de uso, que duplicaría el manejo de token inválido y el riesgo de filtrar el motivo.

**D2 — Un caso de uso por operación.** `ConsultarTurnoDesdeToken`, `CancelarTurnoDesdeToken` y `ReprogramarDesdeToken`, cada uno con su DTO de entrada y salida. Cancelar y reprogramar delegan en `CancelarTurno`/`ReprogramarTurno` con `{ rol: 'paciente' }`. *Alternativa:* un caso de uso con un parámetro `accion`, que mezclaría respuestas y errores distintos y dificultaría el test por escenario.

**D3 — Traducción centralizada de errores.** Se agrega `ErrorGestionTurnoPublica` con códigos `CONTACTAR_CONSULTORIO`, `HORARIO_NO_DISPONIBLE` y `DATOS_INVALIDOS`, cada uno con mensaje fijo; un traductor convierte `ReglaNegocioError` y `RecursoNoEncontradoError` en el código público correspondiente (`RN-08` → `CONTACTAR_CONSULTORIO`; reglas de horario/recursos → `HORARIO_NO_DISPONIBLE`; `RN-10` o turno inexistente → `ENLACE_INVALIDO`). Los errores que no son de dominio se propagan sin enmascarar. `ErrorEnlacePublico` (C-12) se reutiliza para todo problema de token. *Alternativa:* devolver los errores de dominio, que expondrían `turnoEnConflicto`, ids y códigos RN.

**D4 — Anticipación antes de delegar.** El caso de uso público comprueba RN-08 con la regla pura `evaluarAnticipacionPaciente` (24 h inclusivas) antes de invocar a cancelación o reprogramación; la respuesta es siempre `CONTACTAR_CONSULTORIO`. El traductor de D3 cubre además un `RN-08` que aparezca por carrera dentro del caso de uso delegado. *Alternativa:* delegar primero y traducir después, que haría I/O innecesaria aunque el rechazo ya esté decidido.

**D5 — El token no se rota al reprogramar.** `resolver` calcula la vigencia contra el `fin` actual del turno, así que el mismo token sigue sirviendo y pasa a vencer con el nuevo horario. RN-21 exige rotación solo en cada envío de recordatorio. *Alternativa:* rotar y devolver el token nuevo, que rompería DD-15 (entrega única) y obligaría a incluir el token en la respuesta.

**D6 — Entrada mínima para reprogramar.** `{ token, inicio, profesionalId?, prestacionId? }`: sin `turnoId`, `actor`, `rol`, `sillonId`, `duracionMinutos` ni `forzar`. Un `inicio` que no sea una `Date` válida se rechaza con `DATOS_INVALIDOS` antes de delegar en C-03. El sillón se conserva o lo resuelve C-03. *Alternativa:* exponer sillón y duración, prohibido por RN-16/DD-18 y que permitiría elegir recursos internos.

**D7 — DTO de salida compartido.** `TurnoPublico` con los campos de `ReservaOnlineConfirmada` salvo `token`: `turnoId`, `inicio`, `fin`, `prestacion` y `profesional`. Es lo que devuelven consultar y reprogramar; cancelar devuelve el mismo DTO del turno ya cancelado. *Alternativa:* devolver la entidad `Turno` y filtrar en cada llamada.

**D8 — Sin capa HTTP en este change.** Los DTOs viven en `src/application` y el cableo de rutas es C-14, igual que en C-10/C-12. No se agrega un validador de pedido `unknown`; la única validación de forma es la de `inicio` (D6).

**D9 — Fixture de cableado.** Un `crearSistemaGestion` en `tests/fixtures/` reúne los repos de reserva, el servicio de tokens y los casos de uso de cancelación y reprogramación sobre el mismo reloj. *Alternativa:* armar el cableado dentro de cada test, repitiendo configuración y dificultando los escenarios de rotación.

## Risks / Trade-offs

- **El token se rota entre la consulta y la acción (C-12)** → resolver al inicio de cada operación, sin guardar el `turnoId` entre peticiones; el enlace viejo siempre da `ENLACE_INVALIDO`.
- **Dos acciones concurrentes sobre el mismo turno** → las operaciones delegadas usan `actualizarSi` con control optimista (C-03) y anulación atómica (C-02); el perdedor recibe un error traducido sin datos ajenos.
- **Filtrado por diferencia de respuesta** → mismos mensajes y códigos para todos los motivos de token; la consulta nunca incluye estado, sillón ni paciente.
- **Umbral de 24 h en el borde** → reutilizar la regla pura de C-03 en vez de reescribir la comparación.
- **C-14 podría querer el token en la respuesta** → el DTO público lo prohíbe; si hiciera falta, sería un change nuevo con decisión explícita.
- **Sin HTTP todavía** → los escenarios se validan a nivel de caso de uso; la frontera `unknown` se cubre en C-14.

## Migration Plan

Change aditivo: no hay datos que migrar ni contratos que romper. Se despliega con el commit del change y se revierte revertilo; las suites de C-02, C-03, C-10 y C-12 quedan intactas.
