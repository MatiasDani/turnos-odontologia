# CHANGES — Secuencia de Implementación

> Índice canónico de todos los changes del proyecto **Sistema de turnos y agenda para consultorios odontológicos chicos (Argentina)**.
> Cada change es atómico: una sola funcionalidad, implementable por una persona en una sesión (~4-6 horas).
> **Leer este archivo antes de ejecutar cualquier `/opsx:propose`.**
>
> Alcance MVP = exactamente la lista **"Imprescindible"** de la sección D.3 de `docs/discovery/informe-discovery.md`. Todo lo "Diferenciador" y "Etapas posteriores" de D.3 está en la sección *Post-MVP / backlog* y **no** es parte de este roadmap.
>
> Stack: TypeScript + Node LTS, dominio hexagonal puro, Vitest (TDD estricto), Fastify opcional, repositorios en memoria (PostgreSQL futuro). Solo datos ficticios (RN-D-01).
> Política visual: `system-and-mockups` con design-system revisión 1 aprobado → todo change con UI (C-14, C-15) exige **aprobar el mockup antes del apply**. Los changes de dominio/API no.

---

## Cómo usar este documento

1. Identificá el change que te toca en la tabla *Equipo y asignación* y verificá que sus dependencias estén en `[x]` (o que el GATE correspondiente esté abierto).
2. Leé los archivos de la sección **Leer antes** del change (y las reglas RN-xx citadas en `knowledge-base/05_reglas_de_negocio.md`).
3. Ejecutá `/opsx:propose C-NN-nombre` (explorá antes con `/opsx:explore` si algo no está claro); si el change tiene UI, cerrá el paso de mockup aprobado antes de `/opsx:apply`.
4. Implementá con `/opsx:apply` (TDD estricto), validá con `openspec-verify` y cerrá con `/opsx:archive`.
5. Marcá el checkbox del change (`[ ]` → `[x]`) en este archivo y avisá al equipo para abrir el siguiente GATE.

---

## Cobertura del MVP (D.3 "Imprescindible")

| Imprescindible (D.3) | Changes que lo cubren |
|---|---|
| Agenda diaria y semanal multi-profesional y multi-sillón | C-08 (consulta), C-15 (UI), C-05 (recursos) |
| Prevención de solapamientos por profesional y sillón, duración por prestación, bloqueos, sin sobreturnos, intervalos semiabiertos | C-01 (núcleo), C-06 (bloqueos), C-07 (disponibilidad) |
| Alta, cancelación y reprogramación con estados (confirmado, cancelado, ausente, atendido); cancelar libera | C-01 (alta), C-02 (cancelar), C-03 (reprogramar), C-04 (estados) |
| Reserva online por enlace 24/7; paciente cancela/reprograma solo con >= 24 h | C-10, C-11, C-14 |
| Recordatorios y confirmación por e-mail + enlace `wa.me` | C-12, C-13 |
| Roles básicos: administrador, odontólogo, recepción, paciente | C-09 (+ token de paciente en C-10/C-11) |

---

## Equipo y asignación

| Persona | Legajo | Changes | Rol sugerido en la fundación / ciclo OPSX |
|---|---|---|---|
| Matías Ibañez | 52006 | C-01, C-07, C-10 | Dueño del ciclo OPSX completo de C-01 (explore → propose → apply → verify → archive; define scaffolding, convenciones de test y fixtures que usa todo el equipo) y del motor de disponibilidad y reserva online (C-07, C-10); referente de RN-13/RN-15 |
| Franco Petri | 52080 | C-02, C-04, C-12 | Dueño de cancelación, estados del turno y recordatorio por e-mail; revisor de `verify` de C-01 (casos RN-02/RN-03/RN-05); referente de la política de 24 h (RN-08) |
| Luka Garro | 51988 | C-03, C-11, C-13 | Dueño de reprogramación atómica (RN-11, RN-12), gestión del turno por token e integración `wa.me`; revisor de tests de concurrencia e invariantes |
| Alejo Carabelli | 51928 | C-05, C-14 | Dueño de la configuración de recursos del consultorio y de la UI del paciente (reserva y gestión), con su mockup (design-system); revisor de los changes ALTO/CRÍTICO |
| Mara Ferrer | 51974 | C-06, C-08 | Dueña de bloqueos de horarios y vistas de agenda diaria/semanal; revisora de los changes ALTO/CRÍTICO |
| Lautaro Medina | 52043 | C-09, C-15 | Dueño de autenticación/RBAC (seguridad, Ley 25.326) y de la UI de agenda de recepción, con su mockup (design-system); revisor de los changes ALTO/CRÍTICO |

Carga: Matías 3, Franco 3, Luka 3, Alejo 2, Mara 2, Lautaro 2 (15 changes). Alejo, Mara y Lautaro, con menos changes, actúan como revisores/pares de los changes ALTO y CRITICO (C-09, C-10, C-11, C-12) sin cambiar la titularidad, y son dueños de las dos aprobaciones de mockup (Alejo: C-14; Lautaro: C-15) y del RBAC (Lautaro: C-09).

---

## Árbol de dependencias

```
C-01 crear-turno-sin-solapamientos            (Matías)  [fundación + núcleo]
 │
 ├── C-02 cancelar-turno-liberando-horario    (Franco)
 │     └── C-03 reprogramar-turno-atomico     (Luka)
 │
 ├── C-04 gestionar-estados-turno             (Franco)
 ├── C-05 configurar-recursos-consultorio     (Alejo)
 ├── C-06 bloquear-horarios-profesional       (Mara)
 │     └── C-08 ver-agenda-diaria-semanal     (Mara)   [también requiere C-01]
 │
 └── C-07 consultar-disponibilidad            (Matías)
       └── C-10 reservar-turno-online         (Matías)
             ├── C-11 gestionar-turno-online-por-token   (Luka)   [+ C-02, C-03]
             │     └── C-14 ui-reserva-y-gestion-paciente (Alejo) [+ C-10] ★UI
             └── C-12 recordatorio-email-confirmacion    (Franco)  [+ C-04]
                   └── C-13 recordatorio-wa-me           (Luka)

C-09 autenticacion-y-roles (Lautaro)  ← C-02, C-03, C-04, C-05, C-06
 └── C-15 ui-agenda-recepcion (Lautaro) ★UI  ← C-08, C-09
```

### Paralelismo por fase

```
GATE 0: C-01 ✓                                  ← FORK (5 ramas)
  → C-02 cancelar-turno-liberando-horario         [Franco]
  → C-07 consultar-disponibilidad                 [Matías]   (prioridad: camino crítico)
  → C-05 configurar-recursos-consultorio          [Alejo]
  → C-06 bloquear-horarios-profesional            [Mara]
  → C-04 gestionar-estados-turno                  [Franco]

GATE 1: C-02 ✓ / C-07 ✓ / C-06 ✓                ← FORK
  → C-03 reprogramar-turno-atomico                [Luka — si C-02 ✓]
  → C-10 reservar-turno-online                    [Matías — si C-07 ✓]
  → C-08 ver-agenda-diaria-semanal                [Mara — si C-06 ✓]

GATE 2: C-03 ✓ + C-10 ✓ (+ C-02 ✓, C-04 ✓)      ← FORK
  → C-11 gestionar-turno-online-por-token         [Luka — si C-02, C-03, C-10 ✓]
  → C-12 recordatorio-email-confirmacion          [Franco — si C-04, C-10 ✓]
  → C-09 autenticacion-y-roles                    [Lautaro — si C-02, C-03, C-04, C-05, C-06 ✓]

GATE 3: C-11 ✓ / C-12 ✓ / C-09 ✓ + C-08 ✓        ← FORK
  → C-14 ui-reserva-y-gestion-paciente            [Alejo — mockup aprobado antes del apply]
  → C-13 recordatorio-wa-me                       [Luka — si C-12 ✓]
  → C-15 ui-agenda-recepcion                      [Lautaro — si C-08, C-09 ✓; mockup aprobado antes del apply]
```

### Camino crítico (5 changes — mínimo irreducible)

```
C-01 → C-02 → C-03 → C-11 → C-14*
C-01 → C-07 → C-10 → C-11 → C-14*      (rama equivalente: ambas llegan a C-11)
```

`*` Últimos changes alternativos del MVP (todos al mismo nivel, cada uno con una rama de 5): **C-13\*** (vía C-01 → C-07 → C-10 → C-12 → C-13) y **C-15\*** (vía C-01 → C-02 → C-03 → C-09 → C-15) también cierran en 5 pasos. Un retraso en C-01, C-02, C-07 o C-10 retrasa todo el MVP.

### Plan óptimo con 3 agentes

Carriles: **A** = núcleo y reserva online (Matías: C-01 → C-07 → C-10); **B** = cancelación, reprogramación, token y recordatorios (Franco y Luka: C-02, C-04 → C-03, C-12 → C-11 → C-13); **C** = recursos, bloqueos, vistas, roles y UI (Alejo, Mara y Lautaro: C-05, C-06 → C-08 → C-09 → C-14, C-15).

| Paso | Agente A (Núcleo y reserva online) | Agente B (Cancelación, reprogramación, token, recordatorios) | Agente C (Recursos, bloqueos, roles, UI) |
|---|---|---|---|
| 1 | C-01 (Matías) | — | — |
| 2 | C-07 (Matías) | C-02 + C-04 (Franco) | C-05 (Alejo), C-06 (Mara) |
| 3 | C-10 (Matías) | C-03 (Luka) | C-08 (Mara) |
| 4 | — (revisión de C-09/C-11) | C-11 (Luka), C-12 (Franco) | C-09 (Lautaro) |
| 5 | — | C-13 (Luka) | C-14 (Alejo), C-15 (Lautaro) |

---

## FASE 1 — Núcleo de agenda (alta, cancelación, reprogramación, estados)

> C-01 es el único bloqueante del resto y es el change que el equipo lleva por el ciclo OPSX completo. Tras C-01 se abre un FORK.

### [C-01] `crear-turno-sin-solapamientos`
- **Estado**: `[x]` completado (archivado 2026-11-21)
- **Owner**: Matías Ibañez (52006)
- **Scope**:
  - Scaffolding mínimo: `package.json`, `tsconfig.json`, Vitest, estructura `src/domain`, `src/application`, `src/adapters/persistence`, `tests/` (layout de `08_arquitectura_propuesta.md`); `.env.example` solo con valores ficticios
  - Objeto valor `Intervalo` semiabierto `[inicio, fin)`; solapan sii `a1 < b2 && b1 < a2` (RN-05); tests de borde (contiguos válidos, parcial, contención total)
  - Entidades: `Turno` (con `EstadoTurno` y `origen`), `Profesional`, `Sillon`, `Prestacion`, `Paciente`, `BloqueoHorario`, `HorarioAtencion`, tipo `Rol`/`Actor` mínimo (solo tipo, sin auth)
  - `fin = inicio + duracionMinutos`, con duración ajustable por turno de forma opcional: por defecto `prestacion.duracionMinutos`; si se informa, entero > 0 y múltiplo de 5, solo recepción/odontólogo/administrador (RN-06, RN-16; DD-10)
  - Zona horaria IANA por consultorio con instantes en UTC y horario `HH:mm` local vía `Intl.DateTimeFormat` (DD-09); alta interna nace `confirmado` (DD-11)
  - Un turno cabe completo en un único tramo de atención (RN-17); solo profesional, sillón y prestación activos (RN-18); bloqueos de profesional y de sillón (RN-07)
  - Validaciones de dominio puras en `src/domain/reglas/`: sin solapamiento por profesional (RN-02) y por sillón (RN-03), un turno ocupa profesional y sillón (RN-01), sin sobreturnos para ningún rol (RN-04), horario de atención y bloqueos de profesional y sillón (RN-07, RN-17, RN-18); solo turnos activos ocupan recursos (`reservado`, `confirmado`, `atendido`; DD-05)
  - Caso de uso `AgendarTurno` + puertos de repositorios; repositorios en memoria con operación atómica de validar+persistir (RN-12; sección crítica)
  - Fixtures en memoria 100 % ficticios tomados del seed de `04_modelo_de_datos.md` (consultorio demo, p1/p2, s1/s2, pr1..pr4, horario L-V 09-13 y 15-19, bloqueo de p1 los miércoles 15-17, pa1..pa3); **sin ABM**: C-05 reemplaza los fixtures por casos de uso
  - Errores tipados que informan el código `RN-XX` violado y el turno en conflicto
  - Tests (TDD estricto, mínimo 2 casos por comportamiento): tabla de verificación de RN-01..RN-07 y RN-16..RN-18 de `05_reglas_de_negocio.md` (contiguos A 09:00-09:45 / B 09:45-10:15; solapamiento 09:44; mismo sillón con otro profesional; mismo profesional con otro sillón; turno de 60 min que excede el cierre; sobre bloqueo de profesional y de sillón; duración ajustada y duración inválida; turno que cruza el corte 13-15; recurso inactivo; intento de forzar como administrador)
  - Cubre US-001
- **Dependencias**: ninguna
- **Governance**: CRITICO (modelo core que todo el resto referencia; invariante RN-04)
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` §Agenda por recursos y ejemplos de verificación (RN-01..RN-07, RN-12)
  - `knowledge-base/04_modelo_de_datos.md` §Turno, §Prestacion, §HorarioAtencion, §BloqueoHorario, §Seed data
  - `knowledge-base/06_funcionalidades.md` §US-001
  - `knowledge-base/07_flujos_principales.md` §Flujo 1
  - `knowledge-base/08_arquitectura_propuesta.md` §Orden de implementación sugerido, §Estrategia de pruebas

### [C-02] `cancelar-turno-liberando-horario`
- **Estado**: `[x]` completado (archivado 2026-11-22)
- **Owner**: Franco Petri (52080)
- **Scope**:
  - Caso de uso `CancelarTurno`: estado → `cancelado`, registra `canceladoPor` (Rol) y `canceladoEn`; rechaza si ya está cancelado o atendido (transiciones de `04_modelo_de_datos.md`)
  - **Reutiliza** el puerto `Reloj` (`ahora(): Date`), su adaptador de sistema y el reloj fijo de tests creados por C-10 (DD-16); no lo redefine. Política de anticipación: actor paciente solo con `inicio - ahora >= 24 h` (umbral inclusivo, RN-08); recepción y administrador sin restricción de anticipación
  - Liberación efectiva de profesional y sillón: un nuevo turno puede ocupar el hueco (RN-09); cancelación de recordatorios pendientes si existen (hook no-op hasta C-12)
  - Tests: cancelación libera y permite agendar en el mismo horario, umbral exacto de 24 h (23:59 rechaza, 24:00 permite), paciente con < 24 h rechazado con `RN-08`, recepción con < 24 h permitido, doble cancelación rechazada
  - Cubre US-004 (parte de dominio; el acceso del paciente por token llega en C-11)
- **Dependencias**: `C-01`
- **Governance**: MEDIO (máquina de estados)
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` §Cancelación y reprogramación (RN-08, RN-09)
  - `knowledge-base/04_modelo_de_datos.md` §Turno (estados y transiciones)
  - `knowledge-base/06_funcionalidades.md` §US-004
  - `knowledge-base/07_flujos_principales.md` §Flujo 4

### [C-03] `reprogramar-turno-atomico`
- **Estado**: `[x]` completado (archivado 2026-11-23)
- **Owner**: Luka Garro (51988)
- **Scope**:
  - Caso de uso `ReprogramarTurno`: conserva el `id`; nuevo `inicio`/`fin` y recursos validados con RN-01..RN-07 **excluyendo el propio turno** (RN-11)
  - Atomicidad: si la validación falla el turno original queda intacto; el horario original solo se libera si la reprogramación se concreta (RN-09, RN-11, RN-12)
  - Reutiliza la política de 24 h de C-02 para el actor paciente (RN-08); sin excepciones por rol para el solapamiento (RN-04)
  - Reprograma el recordatorio asociado si existe: después de concretar el cambio llama a `Recordatorios.programar(turnoId)`, que es idempotente y reemplaza el pendiente con el nuevo `programadoPara` (puerto ampliado por C-12, DD-21, RN-25; con el no-op o el adaptador real según el cableado)
  - Tests: mover a un hueco libre, mover sobre sí mismo parcialmente solapado (permitido), mover sobre otro turno (rechazado y original intacto), cambio de sillón/profesional, paciente < 24 h rechazado
  - Cubre US-005
  - **Implementado en el apply (2026-11-23)**: reglas puras `anticipacion.ts` (RN-08 compartida con cancelación) y `reprogramacion.ts` (RN-10/RN-08 y `moverTurno`); `actualizarSi` pasa los turnos de los recursos destino al callback dentro de la sección crítica sin romper C-02/C-04; `ReprogramarTurno` conserva identidad, re-valida con `validarAlta` excluyendo el propio turno, serializa reprogramaciones concurrentes con control optimista y llama a `Recordatorios.programar` fuera de la sección crítica; DD-22 en la KB y spec `openspec/specs/reprogramacion-turnos` (7 requisitos, un test por escenario); 740 tests en verde y `typecheck` limpio
- **Dependencias**: `C-01`, `C-02`
- **Governance**: MEDIO
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` RN-04, RN-08, RN-11, RN-12
  - `knowledge-base/07_flujos_principales.md` §Flujo 3
  - `knowledge-base/06_funcionalidades.md` §US-005
  - `knowledge-base/08_arquitectura_propuesta.md` §Estrategia de pruebas (reprogramación atómica)

### [C-04] `gestionar-estados-turno`
- **Estado**: `[x]` completado (archivado 2026-11-22)
- **Owner**: Franco Petri (52080)
- **Scope**:
  - Casos de uso `ConfirmarTurno`, `MarcarAtendido`, `MarcarAusente` con transiciones válidas únicamente: `reservado → confirmado`, `confirmado → atendido | ausente` (cancelación en C-02)
  - Rechazo de transiciones inválidas con error tipado; `ausente` y `cancelado` no ocupan recursos (DD-05, RN-10)
  - Tests: cada transición válida e inválida, `ausente` libera el hueco, estados activos vs inactivos
  - Cubre US-006
- **Dependencias**: `C-01`
- **Governance**: MEDIO
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` §Ciclo de vida del turno (RN-10)
  - `knowledge-base/04_modelo_de_datos.md` §Turno (transiciones)
  - `knowledge-base/06_funcionalidades.md` §US-006
  - `knowledge-base/07_flujos_principales.md` §Flujo 7
  - `knowledge-base/09_decisiones_y_supuestos.md` DD-05, SU-03

---

## FASE 2 — Recursos, bloqueos y consulta de agenda

> C-05, C-06 y C-07 son independientes entre sí y se abren juntos con el GATE 0.

### [C-05] `configurar-recursos-consultorio`
- **Estado**: `[x]` completado (archivado 2026-11-23)
- **Owner**: Alejo Carabelli (51928)
- **Scope**:
  - Casos de uso de alta/modificación/baja lógica de `Profesional`, `Sillon`, `Prestacion` (`duracionMinutos` entero > 0) y `HorarioAtencion` por consultorio y opcional por profesional (el del profesional prevalece, SU-09)
  - Reemplaza los fixtures de C-01 por carga vía casos de uso (los fixtures quedan como seed para tests/demo)
  - ~~**Extiende** el puerto `PacienteRepositorio`~~: ya satisfecho por C-10 y C-12 (`obtenerPorDni`, `obtenerPorId`, `guardar`); C-05 no lo modifica (DD-28, explore 2026-11-23)
  - Regla: no se desactiva un recurso con turnos activos futuros sin resolver (RN-27); un profesional inactivo no recibe turnos nuevos (RN-18); horario propio por día (RN-28) y validez de la configuración (RN-29)
  - Tests: ABM, desactivación bloqueada con turnos futuros, prevalencia del horario por profesional
  - Cubre US-008
- **Dependencias**: `C-01`
- **Governance**: BAJO
- **Leer antes**:
  - `knowledge-base/04_modelo_de_datos.md` §Profesional, §Sillon, §Prestacion, §HorarioAtencion
  - `knowledge-base/06_funcionalidades.md` §US-008
  - `knowledge-base/05_reglas_de_negocio.md` RN-06, RN-07
  - `knowledge-base/09_decisiones_y_supuestos.md` DD-10, SU-08, SU-09

### [C-06] `bloquear-horarios-profesional`
- **Estado**: `[x]` completado (archivado 2026-11-23)
- **Owner**: Mara Ferrer (51974)
- **Scope**:
  - Caso de uso `BloquearHorario` / `LiberarBloqueo` sobre `BloqueoHorario` (`profesionalId?` y/o `sillonId?`, al menos uno; ver 04), intervalo semiabierto
  - Conflicto con turnos activos existentes: se informa la lista de conflictos y **no** se crea el bloqueo (DD-06, suposición provisoria; pregunta abierta en `10_preguntas_abiertas.md`)
  - El odontólogo solo bloquea su propia agenda (la verificación por usuario se aplica en C-09; aquí se valida `profesionalId` del actor)
  - Los turnos nuevos que toquen el bloqueo son rechazados (RN-07, ya garantizado por C-01; test de integración)
  - Tests: bloqueo sin conflictos, con conflicto (rechazo + listado), bloqueo contiguo a un turno (permitido, RN-05), turno nuevo sobre bloqueo rechazado
  - Cubre US-007
- **Dependencias**: `C-01`
- **Governance**: MEDIO
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` RN-05, RN-07
  - `knowledge-base/04_modelo_de_datos.md` §BloqueoHorario
  - `knowledge-base/07_flujos_principales.md` §Flujo 5
  - `knowledge-base/09_decisiones_y_supuestos.md` DD-06
  - `knowledge-base/10_preguntas_abiertas.md` (bloqueo sobre turnos existentes)

### [C-07] `consultar-disponibilidad`
- **Estado**: `[x]` completado (archivado 2026-11-21)
- **Owner**: Matías Ibañez (52006)
- **Scope**:
  - Caso de uso `ConsultarDisponibilidad({actor, prestacionId, rango, ahora, duracionMinutos?, pasoMinutos?, profesionalId?})`: devuelve huecos donde existen a la vez un profesional habilitado (que realiza la prestación) y un sillón libres para toda la duración (RN-13)
  - Respeta horario de atención, bloqueos y turnos activos; reutiliza las reglas de dominio de C-01 (sin duplicar lógica)
  - Granularidad de huecos configurable con el parámetro `pasoMinutos` (por defecto 15 min; DD-12)
  - Tests: hueco contiguo a un turno aparece (RN-05), hueco que excede el cierre no aparece, solo un recurso libre no basta, bloqueo excluye huecos
  - Cubre US-003
- **Dependencias**: `C-01`
- **Governance**: MEDIO
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` RN-01..RN-07, RN-13
  - `knowledge-base/06_funcionalidades.md` §US-003
  - `knowledge-base/07_flujos_principales.md` §Flujo 2 (paso 2)
  - `knowledge-base/04_modelo_de_datos.md` §Profesional (prestacionIds), §Prestacion

### [C-08] `ver-agenda-diaria-semanal`
- **Estado**: `[x]` completado en la rama de C-08 (archivado 2026-11-23)
- **OpenSpec**: [C-08](openspec/changes/archive/2026-11-23-c08-ver-agenda-diaria-semanal/proposal.md)
- **Owner**: Mara Ferrer (51974)
- **Scope**:
  - Casos de uso de consulta `AgendaDiaria` y `AgendaSemanal` (modelo de lectura: turnos con estado, prestación, paciente, sillón, y bloqueos), filtros por profesional y por sillón
  - Visibilidad por rol: odontólogo solo su agenda; recepción y administrador todas (la identidad real llega con C-09; aquí se parametriza por `Actor`)
  - Opcional: endpoints Fastify de lectura `GET /agenda?fecha=&profesionalId=&sillonId=` si el equipo implementa la capa HTTP
  - Tests: agrupación por día/semana, filtros, turnos cancelados/ausentes marcados y sin ocupar, odontólogo no ve agenda ajena
  - Cubre US-002 (la vista visual es C-15)
- **Dependencias**: `C-01`, `C-06`
- **Governance**: BAJO
- **Leer antes**:
  - `knowledge-base/06_funcionalidades.md` §US-002
  - `knowledge-base/03_actores_y_roles.md` §RBAC — Matriz de permisos
  - `knowledge-base/04_modelo_de_datos.md` §Turno, §BloqueoHorario
  - `knowledge-base/08_arquitectura_propuesta.md` §Estructura de directorios

---

## FASE 3 — Acceso y roles

### [C-09] `autenticacion-y-roles`
- **Estado**: `[ ]` pendiente
- **Owner**: Lautaro Medina (52043)
- **Scope**:
  - Entidades `Usuario` (con `profesionalId?`) y `Rol` (administrador, odontólogo, recepción, paciente); clave con hash adaptativo (scrypt/argon2, a confirmar) — nunca en texto plano ni en logs (RN-D-03)
  - Login con sesión por token firmado (JWT) y `JWT_SECRET` por entorno; `POST /auth/login` si se implementa la capa HTTP
  - `PoliticaPermisos` según la matriz de `03_actores_y_roles.md`, aplicada **en los casos de uso** (no solo en HTTP): se aplica a C-01..C-08 (agendar, cancelar, reprogramar, estados, ABM, bloqueos, agendas)
  - El paciente no tiene usuario: opera con el token de su turno (C-10/C-11); aquí se define su rol y alcance
  - Verificación de que ningún rol puede forzar solapamientos (RN-04) ni acceder a datos de otros pacientes (RN-D-02)
  - Tests: matriz rol x acción (permitido/denegado), hash verificado, odontólogo limitado a su agenda y a sus bloqueos, token expirado/ inválido
  - Cubre US-013
- **Dependencias**: `C-02`, `C-03`, `C-04`, `C-05`, `C-06`
- **Governance**: CRITICO (autenticación, autorización, datos de salud)
- **Leer antes**:
  - `knowledge-base/03_actores_y_roles.md` (actores, RBAC, rutas públicas)
  - `knowledge-base/05_reglas_de_negocio.md` RN-04, RN-D-01..RN-D-03
  - `knowledge-base/08_arquitectura_propuesta.md` §Seguridad, §Variables de entorno
  - `knowledge-base/04_modelo_de_datos.md` §Usuario, §Rol
  - `knowledge-base/06_funcionalidades.md` §US-013

---

## FASE 4 — Reserva online del paciente

### [C-10] `reservar-turno-online`
- **Estado**: `[x]` completado (archivado 2026-11-21)
- **Owner**: Matías Ibañez (52006)
- **Scope**:
  - Caso de uso `ReservarOnline` que **reutiliza** `AgendarTurno` (mismas reglas, sin excepciones por canal); el sistema asigna el sillón (RN-13, SU-05); `origen: 'online'`
  - Pedido `{prestacionId, inicio, profesionalId?, paciente}` sin `duracionMinutos` ni `sillonId`; consulta `ConsultarDisponibilidad` (C-07) y toma el primer combo del horario; reglas nuevas RN-19 a RN-23 (DD-14)
  - Alta mínima de `Paciente` sin cuenta (DNI + nombre + apellido + teléfono + consentimiento de contacto; e-mail opcional; DD-17); si el DNI existe se vincula sin modificarlo ni revelarlo (RN-22); **crea** el puerto `PacienteRepositorio` (`obtenerPorDni`, `guardar`) con adaptador en memoria, que C-05 extiende (DD-16)
  - Token de gestión (RN-15, RN-21): 32 bytes aleatorios, solo el hash SHA-256 en la entidad `TokenGestion` separada de `Turno`; se devuelve en claro una única vez; servicio `emitir`/`resolver`/`rotar` reutilizable por C-11 y C-12 (DD-15)
  - Manejo de la carrera: un reintento con el siguiente combo; si falla, error público "horario no disponible" y nueva oferta del día (RN-12); errores públicos genéricos sin datos de otros pacientes
  - Capa HTTP sin Fastify ni dependencias: solo DTO de entrada y validador puro de frontera en `src/adapters/http/` (DD-13); endpoints, rate limit y logs redactados quedan para C-14 o el change que integre HTTP
  - Respuesta con `inicio`, `fin`, nombre de la prestación y nombre y apellido del profesional asignado, sin sillón (DD-18)
  - El e-mail de confirmación queda fuera de C-10 (el token va en la respuesta; envíos en C-12); `ahora` viene del puerto `Reloj` que **crea** C-10 (con adaptador de sistema y reloj fijo de tests), que C-02 reutiliza (DD-16)
  - Tests: reserva exitosa, hueco ocupado entre consulta y reserva (carrera), mismas reglas que recepción, token único y solo hash almacenado, datos inválidos, DNI existente sin modificación, límite de 2 turnos y reserva repetida, sin fuga de datos de otros pacientes
  - Cubre US-009 (parte de dominio/API; la pantalla es C-14)
  - **Implementado en el apply (2026-11-21)**: `ReservarOnline` y `reservarDesdePedido` (frontera pura), `ServicioTokens` (`emitir`/`resolver`/`rotar`), puertos `Reloj` y `PacienteRepositorio` con sus adaptadores, `TurnoRepositorio.obtenerPorId`/`listarPorPaciente` (aditivos), 55 escenarios con test de título idéntico. Disponible para C-02 (reutilizar `Reloj`), C-05 (extender `PacienteRepositorio`), C-11 (`resolver`) y C-12 (`rotar`). Pendiente para la integración HTTP (C-14): endpoints, rate limit, logs redactados, unicidad de DNI y atomicidad de RN-23 con persistencia real (ver `10_preguntas_abiertas.md`).
- **Dependencias**: `C-07`
- **Governance**: ALTO (datos personales sensibles en ruta pública)
- **Leer antes**:
  - `knowledge-base/07_flujos_principales.md` §Flujo 2
  - `knowledge-base/05_reglas_de_negocio.md` RN-12, RN-13, RN-15, RN-19 a RN-23, RN-D-02
  - `knowledge-base/06_funcionalidades.md` §US-009
  - `knowledge-base/03_actores_y_roles.md` §Rutas públicas
  - `knowledge-base/09_decisiones_y_supuestos.md` SU-05, DD-13, DD-14, DD-15, DD-16, DD-17, DD-18

### [C-11] `gestionar-turno-online-por-token`
- **Estado**: `[x]` completado (archivado 2026-11-23)
- **Owner**: Luka Garro (51988)
- **Scope**:
  - Casos de uso de paciente por token de gestión (resuelto por hash, DD-15): ver el propio turno, cancelar (reutiliza `CancelarTurno` de C-02) y reprogramar (reutiliza `ReprogramarTurno` de C-03)
  - Regla RN-08: con menos de 24 h el sistema indica que debe contactar al consultorio (sin cancelar ni mover)
  - El token solo expone su propio turno (RN-15, RN-21, RN-D-02); se resuelve con el servicio de C-10 (`resolver`, DD-15); token inválido/ajeno devuelve error sin filtrar datos
  - El token vigente es el del último recordatorio: cada envío de C-12 rota el token e invalida el de la reserva (RN-21, DD-21); los turnos internos también tienen token desde su primer recordatorio
  - Endpoints públicos `GET/POST /public/turnos/:token` (cancelar, reprogramar) si se implementa la capa HTTP — **fuera de este change: los casos de uso viven en `src/application` y el cableo HTTP queda para C-14**
  - Tests: cancelar con >= 24 h, umbral exacto, < 24 h rechazado con mensaje de contacto, reprogramación atómica vía token, token de otro turno no accede
  - Cubre US-010
  - **Implementado en el apply (2026-11-23)**: `ResolverTurnoDesdeToken` comparte la resolución por hash con los tres casos de uso; `ConsultarTurnoDesdeToken`, `CancelarTurnoDesdeToken` y `ReprogramarTurnoDesdeToken` delegan en C-02/C-03 con actor `paciente` y reutilizan la regla pura de RN-08; `ErrorEnlacePublico` para token inválido y `ErrorGestionTurnoPublica` con códigos fijos (`CONTACTAR_CONSULTORIO`, `HORARIO_NO_DISPONIBLE`, `DATOS_INVALIDOS`) traducidos desde dominio sin filtrar datos; `TurnoPublico` sin token/sillón/paciente/estado; reprogramar no rota el token; DD-23 en la KB, US-010 marcada, spec `openspec/specs/gestion-turno-online-por-token` (9 requisitos, un test por escenario); 773 tests en verde y `typecheck` limpio
- **Dependencias**: `C-02`, `C-03`, `C-10`
- **Governance**: ALTO
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` RN-08, RN-09, RN-11, RN-15
  - `knowledge-base/07_flujos_principales.md` §Flujo 3, §Flujo 4
  - `knowledge-base/06_funcionalidades.md` §US-010
  - `knowledge-base/03_actores_y_roles.md` §Rutas públicas

---

## FASE 5 — Recordatorios y confirmación

### [C-12] `recordatorio-email-confirmacion`
- **Estado**: `[x]` completado (archivado 2026-11-22)
- **Owner**: Franco Petri (52080)
- **Scope**:
  - Entidad `Recordatorio` (canal `email`, `programadoPara` = `inicio - RECORDATORIO_HORAS_ANTES`, por defecto 24 h, SU-07; estados `pendiente | enviado | fallido`)
  - Puerto `Notificador` + adaptador SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` por entorno) y adaptador falso para tests; free tier, costo $0
  - Caso de uso `GenerarRecordatorio` que programa/reprograma/cancela con alta, reprogramación y cancelación (completa los hooks de C-02 y C-03)
  - E-mail con enlace de confirmación/cancelación basado en el token de gestión de C-10 (RN-21, DD-15: solo se guarda el hash; **reutiliza** el servicio de tokens de C-10 y en cada envío llama a `rotar(turnoId)`, que emite un token nuevo para el enlace e invalida el anterior); confirmar desde el enlace pasa el turno a `confirmado` (usa C-04)
  - No envía a pacientes sin `consentimientoContacto`; fallo de envío → estado `fallido` y aviso a recepción
  - Tests: programación por defecto 24 h, reprogramación mueve el recordatorio, cancelación lo anula, confirmación cambia estado, sin consentimiento no envía, fallo registrado
  - Cubre US-011
  - **Decisiones del explore (2026-11-22, DD-21, RN-25)**: estado `cancelado` en `Recordatorio`; puerto `Recordatorios.programar(turnoId)` idempotente (C-03 lo llama); decorador `AgendarTurnoConRecordatorio` inyectado en `ReservarOnline` y en el alta de recepción, sin modificar C-01 ni C-10; barrido `EnviarRecordatoriosPendientes` (revalida el estado del turno, rota el token y envía); `ConfirmarDesdeEnlace(token)` sobre `ConfirmarTurno` (ya confirmado = éxito sin cambios); `ListarRecordatoriosFallidos` como aviso a recepción; sin e-mail o sin consentimiento no se programa; `Notificador` con adaptador falso y SMTP con `nodemailer` (Ethereal para demo). Fuera de alcance: el proceso que ejecuta el barrido periódicamente (C-14), cancelar desde el enlace (C-11) y el canal `wa_me` (C-13)
  - **Implementado en el apply (2026-11-22)**: modelo `Recordatorio` y reglas puras (`src/domain/reglas/recordatorios.ts`), `RecordatoriosEmail` (adaptador real del puerto `Recordatorios`), decorador `AgendarTurnoConRecordatorio`, `EnviarRecordatoriosPendientes`, `ConfirmarDesdeEnlace` con `ErrorEnlacePublico` (`ENLACE_INVALIDO`), `ListarRecordatoriosFallidos`, `RecordatorioRepositorio` en memoria, `PacienteRepositorio.obtenerPorId` (aditivo), `NotificadorSmtp` con `nodemailer` y lectura validada de variables de entorno; spec `openspec/specs/recordatorios-turno` (15 requisitos, 35 escenarios con test de título idéntico), 690 tests. Disponible para C-03 (`Recordatorios.programar`), C-11 (token vigente = el del último e-mail), C-13 (puerto `Recordatorios`, `CanalRecordatorio` a extender con `wa_me`) y C-14 (cablear el decorador y `RecordatoriosEmail`, ejecutar el barrido periódicamente, endpoint de confirmación).
- **Dependencias**: `C-04`, `C-10`
- **Governance**: ALTO (notificaciones con datos personales)
- **Leer antes**:
  - `knowledge-base/07_flujos_principales.md` §Flujo 6
  - `knowledge-base/05_reglas_de_negocio.md` RN-14, RN-15, RN-10, RN-21, RN-25, RN-D-02
  - `knowledge-base/09_decisiones_y_supuestos.md` DD-15, DD-19, DD-20, DD-21, SU-07
  - `knowledge-base/04_modelo_de_datos.md` §Recordatorio
  - `knowledge-base/06_funcionalidades.md` §US-011
  - `knowledge-base/08_arquitectura_propuesta.md` §Variables de entorno

### [C-13] `recordatorio-wa-me`
- **Estado**: `[x]` completado (archivado 2026-11-23)
- **Owner**: Luka Garro (51988)
- **Scope**:
  - Generador de URL `https://wa.me/<telefono>?text=<mensaje>` con codificación segura y mensaje armado con datos del turno (sin datos clínicos)
  - Recordatorio canal `wa_me` con `enlaceWaMe`; lista de pendientes para recepción y caso de uso `MarcarRecordatorioEnviado` (envío manual por la recepción, sin API, costo $0)
  - Respeta `consentimientoContacto`; normalización de teléfono argentino ficticio
  - Tests: URL bien formada y codificada, mensaje con fecha/hora/prestación, marcar enviado, sin consentimiento no se genera
  - Cubre US-012
  - **Implementado en el apply (2026-11-23)**: `RecordatoriosConWaMe` decora el puerto `Recordatorios` y agrega el `wa_me` al programar el turno (24 h antes por defecto) sin tocar C-01/C-10/C-12; `debeProgramarseWaMe` exige consentimiento y teléfono válido sin e-mail, con normalización compartida extraída a `src/domain/reglas/telefono.ts`; `armarEnlaceWaMe` codifica el mensaje con `encodeURIComponent` y nunca incluye token ni enlace de gestión; `ListarRecordatoriosPendientesWaMe` y `MarcarRecordatorioEnviado` con `ErrorMarcarRecordatorio` (`RECORDATORIO_NO_ENCONTRADO`, `ESTADO_NO_ENVIABLE`) e idempotencia sobre `enviado`; `RecordatorioRepositorio.obtenerPorId` aditivo; C-12 filtra por canal en la programación y en el barrido, sin cambios de comportamiento; RN-26 y DD-24 en la KB, US-012 marcada, specs `openspec/specs/recordatorio-wa-me` (5 requisitos) y delta de `recordatorios-turno` (2 requisitos), 38 escenarios con test de título idéntico; 816 tests en verde y `typecheck` limpio
- **Dependencias**: `C-12`
- **Governance**: MEDIO
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` RN-14, RN-25, RN-26, RN-D-02
  - `knowledge-base/04_modelo_de_datos.md` §Recordatorio, §Paciente
  - `knowledge-base/06_funcionalidades.md` §US-012
  - `knowledge-base/07_flujos_principales.md` §Flujo 6
  - `knowledge-base/09_decisiones_y_supuestos.md` DD-03, DD-24, SU-01

---

## FASE 6 — Interfaces de usuario (requieren mockup aprobado antes del apply)

> Política visual `system-and-mockups`, design-system rev. 1 aprobado. Para cada change: leer `design-system/README.md`, crear mockups locales responsive (390x844 y 1440x900) en `openspec/changes/<name>/mockups/`, registrar `## UI Mockups` en `design.md` y esperar aprobación explícita del usuario antes de `/opsx:apply`.

### [C-14] `ui-reserva-y-gestion-paciente`
- **Estado**: `[x]` completado (archivado 2026-11-23)
- **Owner**: Alejo Carabelli (51928)
- **Scope**:
  - Pantalla pública de reserva por enlace: elegir prestación, ver huecos reales (C-07), cargar DNI + nombre + apellido + teléfono + consentimiento (e-mail opcional), confirmar y mostrar profesional asignado (C-10, DD-17, DD-18)
  - Pantalla de gestión por enlace con token: ver turno, cancelar, reprogramar; mensaje de contacto cuando faltan menos de 24 h (C-11)
  - Estados vacío/error/carga, accesibilidad y responsive; uso de `design-system/tokens.css` y `brand.js`; marcar `(TBD)` provisorios
  - Paso previo obligatorio: mockup aprobado (`Approval: approved`) y verificación visual contra el mockup en `verify`
  - Tests: de contrato con la API pública y de los estados de UI relevantes
- **Dependencias**: `C-10`, `C-11`
- **Governance**: MEDIO (UI pública con datos personales)
- **Leer antes**:
  - `design-system/README.md` (revisión 1, aprobada) y `design-system/components.html`
  - `knowledge-base/07_flujos_principales.md` §Flujo 2, §Flujo 3
  - `knowledge-base/06_funcionalidades.md` §US-009, §US-010
  - `knowledge-base/03_actores_y_roles.md` §Rutas públicas
  - `knowledge-base/08_arquitectura_propuesta.md` §Estructura de directorios (adapters/http)

### [C-15] `ui-agenda-recepcion`
- **Estado**: `[ ]` pendiente
- **Owner**: Lautaro Medina (52043)
- **Scope**:
  - Vista diaria y semanal de la agenda por profesional y por sillón (C-08), con estados, bloqueos y filtros
  - Acciones de recepción desde la agenda: dar turno (C-01), cancelar (C-02), reprogramar (C-03), cambiar estado (C-04), bloquear (C-06), ver pendientes de recordatorio `wa.me` (C-13 cuando esté disponible)
  - Login y navegación por rol (C-09); el odontólogo solo ve su agenda
  - Paso previo obligatorio: mockup aprobado y verificación visual posterior; usa `design-system/tokens.css`
  - Tests: contrato con la API de lectura/escritura y estados de UI
- **Dependencias**: `C-08`, `C-09`
- **Governance**: BAJO
- **Leer antes**:
  - `design-system/README.md` (revisión 1, aprobada)
  - `knowledge-base/06_funcionalidades.md` §US-002, §US-013
  - `knowledge-base/03_actores_y_roles.md` §RBAC — Matriz de permisos
  - `knowledge-base/07_flujos_principales.md` §Flujo 1, §Flujo 5
  - `knowledge-base/08_arquitectura_propuesta.md` §Estructura de directorios

---

## Riesgos

| # | Riesgo | Impacto | Mitigación | Changes afectados |
|---|---|---|---|---|
| R-1 | C-01 mal modelado (Intervalo, Turno, estados activos) obliga a reescribir los demás | Alto: todo el MVP depende de él | TDD estricto con la tabla de verificación de `05_reglas_de_negocio.md`; revisión de Franco y Luka antes de abrir el GATE 0; no abrir GATE 0 sin `verify` | C-01 y todos |
| R-2 | Condiciones de carrera entre reserva online y recepción (RN-12) | Turnos solapados en producción | Sección crítica en repos en memoria; diseño que mapea a exclusión/transacción en PostgreSQL | C-01, C-03, C-10 |
| R-3 | Preguntas abiertas sin resolver (bloqueo sobre turnos, registro del paciente resuelto el 2026-11-21 en C-10 (DD-14); duración, zona horaria y estados resueltos el 2026-11-21) | Retrabajo de scope | Adoptar la suposición provisoria DD-06 (duración, estados y zona horaria ya resueltos: DD-09, DD-10, DD-11); resolverlas en `/opsx:explore` del change afectado | C-06, C-10, C-01 |
| R-4 | Datos sensibles de salud y datos personales (Ley 25.326, Ley 26.529) | Incumplimiento normativo | Solo datos ficticios (RN-D-01), mínimo dato, consentimiento de contacto, RBAC en casos de uso; revisión de seguridad en C-09/C-10/C-11 | C-09, C-10, C-11, C-12, C-13 |
| R-5 | C-09 (RBAC) llega tarde y deja casos de uso sin control de permisos | Brecha de seguridad temporal | C-01 define el tipo `Actor`; todos los casos de uso lo reciben desde el inicio; C-09 aplica y verifica la matriz completa | C-02..C-08, C-09 |
| R-6 | Cuello de botella en el camino crítico (C-02, C-07, C-10, C-11 concentran 5 pasos) | Retraso del MVP | Matías concentra C-01, C-07 y C-10: Alejo y Mara actúan como pares/revisores de C-07 y C-10 y Franco y Luka cubren C-02/C-11; priorizar C-07 en el GATE 0 | C-02, C-07, C-10, C-11 |
| R-7 | Mockup no aprobado a tiempo bloquea las UIs | Retraso de C-14/C-15 | Preparar mockups en paralelo durante las fases 4-5; usar design-system rev. 1 ya aprobado | C-14, C-15 |
| R-8 | Efectividad de e-mail + `wa.me` vs WhatsApp automático (SU-01) | Menor adopción de recordatorios | Decisión documentada (costo $0); WhatsApp Cloud API queda en el backlog | C-12, C-13 |
| R-9 | Adopción por la secretaria (SU-02) | Baja utilidad real | Agenda simple y rápida (C-15) y mínima fricción en alta de turnos | C-15 |

---

## Post-MVP / backlog (FUERA DE ALCANCE del MVP)

> Ítems de D.3 clasificados como "Diferenciador" o "Etapas posteriores". **No** son changes de este roadmap, no tienen C-NN ni responsable y no deben proponerse hasta cerrar el MVP.

**Diferenciador (D.3)**
- Lista de espera con oferta automática de huecos liberados (US-020)
- Seguimiento de ausentes y recordatorio de controles periódicos (US-021)
- Tablero de ocupación por sillón y profesional y tasa de ausentismo (US-022)
- Recordatorios automáticos por WhatsApp Cloud API (US-023)
- Cobro de señas con Mercado Pago (US-024)
- Precios en pesos publicados y plan gratuito acotado (US-025)

**Etapas posteriores (D.3)**
- Ficha del paciente con anamnesis y odontograma básico (FDI)
- Presupuesto y plan de tratamiento; seguimiento de presupuestos pendientes; caja
- Registro de auditoría de accesos; exportación de datos del paciente y backups; consentimiento alineado con la Ley 25.326
- Facturación electrónica ARCA
- Obras sociales y prepagas: padrón, coberturas y liquidaciones
- Periodontograma e imágenes (DICOM) con visor
- Multi-sucursal y cuenta de cadena
- Chatbot o asistente de IA, API pública y sincronización con Google Calendar
- Receta electrónica, firma digital y HL7 FHIR
- Importación desde otros sistemas
- Persistencia PostgreSQL (el MVP usa repositorios en memoria)

---

## Resumen

| Métrica | Valor |
|---|---|
| Changes MVP | 15 |
| Fases | 6 |
| Camino crítico | 5 changes |
| Gates de paralelismo | 4 (GATE 0 a GATE 3) |
| Changes con UI (mockup obligatorio) | 2 (C-14, C-15) |

**Primer change recomendado**: `C-01` (`crear-turno-sin-solapamientos`, Matías Ibañez). Para arrancar: `/opsx:propose C-01-crear-turno-sin-solapamientos`.
