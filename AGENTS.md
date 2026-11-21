# Turnos Odontología (Gestión de turnos para consultorios odontológicos) — Instrucciones para Agentes

> Este archivo (y su copia idéntica `CLAUDE.md`) es lo PRIMERO que todo agente lee al entrar al repo.
> Generado a partir de `knowledge-base/` y `CHANGES.md`. No editar a mano sin re-sincronizar ambos archivos.

**Proyecto**: backend de gestión de turnos para consultorios odontológicos chicos de Argentina (1 a 5 profesionales, 1 a 3 sillones). Diferencial: prevenir solapamientos por profesional y por sillón con duración variable por prestación. Costo $0, solo datos ficticios. TP de Metodología I (equipo de 6).

---

## Stack Tecnológico

| Capa | Tecnología | Versión mínima |
|------|------------|----------------|
| Lenguaje | TypeScript | 5.x |
| Runtime | Node.js (LTS) | 20 LTS o superior (a confirmar al inicializar) |
| Gestor de paquetes | npm | el de la LTS |
| Lógica de dominio | Módulos TypeScript puros (sin framework) | n/a |
| Tests | Vitest | 1.x o superior |
| API REST (opcional) | Fastify | 4.x o superior |
| Persistencia MVP | Repositorios en memoria (adaptadores) | n/a |
| Persistencia futura | PostgreSQL (free tier) | a definir |
| E-mail | SMTP/transaccional con free tier | a confirmar |

Estructura según el TP: `src/` (implementación) y `tests/` (pruebas) en la raíz. Arquitectura hexagonal / clean.

Detalle completo: [knowledge-base/02_descripcion_general.md](knowledge-base/02_descripcion_general.md)

---

## Base de Conocimiento

La fuente de verdad del dominio vive en `knowledge-base/` (índice: [README](knowledge-base/README.md)). **Leé el archivo relevante ANTES de implementar.**

| Archivo | Cuándo leerlo |
|---------|---------------|
| [01_vision_y_objetivos.md](knowledge-base/01_vision_y_objetivos.md) | Propósito, alcance MVP, fuera de alcance |
| [02_descripcion_general.md](knowledge-base/02_descripcion_general.md) | Stack, arquitectura hexagonal, integraciones |
| [03_actores_y_roles.md](knowledge-base/03_actores_y_roles.md) | Auth, RBAC, permisos, rutas públicas |
| [04_modelo_de_datos.md](knowledge-base/04_modelo_de_datos.md) | Entidades, estados del turno, seed ficticio |
| [05_reglas_de_negocio.md](knowledge-base/05_reglas_de_negocio.md) | Reglas codificadas (RN-xx), fuente de verdad |
| [06_funcionalidades.md](knowledge-base/06_funcionalidades.md) | Historias de usuario y criterios de aceptación |
| [07_flujos_principales.md](knowledge-base/07_flujos_principales.md) | Flujos E2E (agendar, reservar, reprogramar, cancelar) |
| [08_arquitectura_propuesta.md](knowledge-base/08_arquitectura_propuesta.md) | Patrones, estructura `src/`/`tests/`, TDD, env vars |
| [09_decisiones_y_supuestos.md](knowledge-base/09_decisiones_y_supuestos.md) | Decisiones (DD-xx) y supuestos (SU-xx) |
| [10_preguntas_abiertas.md](knowledge-base/10_preguntas_abiertas.md) | Inconsistencias a resolver ANTES de codear |

**Discovery (origen de la KB)**: `docs/discovery/` contiene el [informe](docs/discovery/informe-discovery.md) (competidores, alcance D.3) y el [checklist](docs/discovery/checklist-discovery.md) (mayor autoridad ante conflicto).

> Resolver las preguntas de prioridad **Alta** de `10_preguntas_abiertas.md` antes de codear el change que las bloquea:
> - Zona horaria (SU-04) y duración fija vs ajustable por turno (RN-06): bloquean **C-01**.
> - ¿El odontólogo puede dar turno sobre su propio bloqueo? y qué pasa con los turnos existentes al crear un bloqueo encima (provisoria: rechazar y listar conflictos, DD-06): bloquean **C-06**.

---

## Equipo

| Nombre | Legajo | Changes |
|--------|--------|---------|
| Matías Ibañez | 52006 | C-01, C-07, C-10 |
| Franco Petri | 52080 | C-02, C-04, C-12 |
| Luka Garro | 51988 | C-03, C-11, C-13 |
| Alejo Carabelli | 51928 | C-05, C-14 |
| Mara Ferrer | 51974 | C-06, C-08 |
| Lautaro Medina | 52043 | C-09, C-15 |

---

## Skills Disponibles

<!-- Fuente de verdad: .atl/skill-registry.md (generado por skill-registry). -->

| Agente | Rol | Skills que carga |
|--------|-----|------------------|
| **Dominio / Backend** | Dominio hexagonal TypeScript, casos de uso, API Fastify opcional | `vitest`, `spec-driven-development` (complementaria) |
| **Tests** | Vitest, TDD estricto, escenarios del spec | `vitest` |
| **Frontend / UI** | UI de C-14 y C-15, siempre sobre el design-system aprobado | `design-system`, `design-taste-frontend-v1`, `emil-design-eng` |
| **Orquestación OPSX** | Ciclo explore → propose → apply → archive | `openspec-explore`, `openspec-propose`, `openspec-apply-change`, `openspec-update-change`, `openspec-sync-specs`, `openspec-archive-change` |
| **Fundación / Docs** | Discovery, KB, roadmap, reglas del proyecto, registry | `active-orchestrator`, `discovery-research`, `web-scraper`, `kb-creator`, `roadmap-generator`, `agent-instruction`, `find-skill`, `skill-creator` |

Cargá la skill correspondiente al contexto ANTES de escribir código. Con la política visual vigente, `design-system/tokens.css` prevalece sobre los defaults de `design-taste-frontend-v1`.

> Los compact rules de cada skill los resuelve el orquestador desde `.atl/skill-registry.md` (generado por `skill-registry`). En este proyecto el archivo **sí está versionado en el repo** porque el TP lo exige. Esta tabla solo mapea skill→rol.

---

## Roadmap de Changes

El plan completo está en [CHANGES.md](CHANGES.md). Resumen:

- **Total**: 15 changes (C-01 a C-15) en 6 fases: 1 Núcleo de agenda (C-01..C-04), 2 Recursos, bloqueos y consulta (C-05..C-08), 3 Acceso y roles (C-09), 4 Reserva online (C-10, C-11), 5 Recordatorios (C-12, C-13), 6 Interfaces de usuario (C-14, C-15).
- **Gates de paralelismo**: GATE 0 (C-01) abre 5 ramas; GATE 1 (C-02/C-07/C-06) abre C-03, C-10, C-08; GATE 2 (C-03 + C-10) abre C-11, C-12, C-09; GATE 3 abre C-14, C-13, C-15.
- **Camino crítico (5)**: `C-01 → C-02 → C-03 → C-11 → C-14` (rama equivalente vía `C-01 → C-07 → C-10 → C-11 → C-14`).
- **Primer change**: `C-01` `crear-turno-sin-solapamientos` (Matías Ibañez; define scaffolding, convenciones de test y fixtures de todo el equipo).
- **Changes con UI**: C-14 y C-15 exigen mockup aprobado ANTES del apply (política `system-and-mockups`, design-system revisión 1 aprobado).

**Antes de cualquier `/opsx:propose`**: leé [CHANGES.md](CHANGES.md), verificá que las dependencias del change estén en `[x]` (o el GATE abierto) y leé sus archivos "Leer antes".

### Governance de este proyecto

Rige la tabla de niveles del `~/.claude/CLAUDE.md` global, con estas precisiones:

- **C-01** es lógica de negocio de dominio: se trata como **MEDIO** (implementar con checkpoints), aunque `CHANGES.md` lo etiquete CRÍTICO.
- **C-09** (autenticación y RBAC) se mantiene **CRÍTICO**: solo análisis hasta aprobación humana explícita.
- C-10, C-11 y C-12 (datos personales en ruta pública / notificaciones) son ALTO: proponer y esperar revisión antes de escribir.

---

## Reglas Duras (específicas del proyecto)

> Reglas globales ya definidas en `~/.claude/CLAUDE.md` (orquestador, governance, TDD, engram): el proyecto las hereda. Acá viven solo las reglas **específicas de este proyecto** + las universales que el global no cubra. Son contrato; romperlas es un defecto.

### TypeScript

1. NUNCA usar `any` → tipos explícitos o `unknown`; `tsconfig` con `strict: true`.
2. NUNCA importar Fastify, DB ni librerías de infraestructura desde `src/domain` → puertos y adaptadores (arquitectura hexagonal).
3. NUNCA usar `new Date()` / `Date.now()` en el dominio → recibir un `Reloj` inyectado (testeable; RN-08).

### Dominio

4. NUNCA almacenar datos reales de pacientes en código, tests, fixtures, ejemplos ni capturas → solo datos ficticios ("Paciente Ficticio N"). (Regla propia del dominio; Ley 25.326 / 26.529.)
5. NUNCA agregar un flag u opción para forzar un solapamiento, ni siquiera para administrador → no existen sobreturnos (RN-04).
6. Toda regla de negocio nueva se agrega primero a `knowledge-base/05_reglas_de_negocio.md` con su código RN-xx y recién después se implementa.

### Proceso

7. NUNCA implementar en apply algo que no esté en el spec aprobado → volver a `/opsx:propose` (o actualizar el change).
8. Cada escenario dado/cuando/entonces del spec tiene su test Vitest con el mismo nombre; no se archiva un change con tests en rojo.
9. NUNCA commitear claves, tokens ni `.env` → usar `.env.example` con valores ficticios.
10. Conventional commits en español; cada integrante commitea su propio change con su usuario de git (trazabilidad del TP).

---

## Flujo de Trabajo

```
1. Leer la KB relevante (knowledge-base/)        → entender el dominio
2. Identificar el change en CHANGES.md           → respetar dependencias y gates
3. /opsx:explore (opcional) → /opsx:propose C-NN-nombre
                                                 → proposal + design + specs + tasks
4. Si el change tiene UI (C-14, C-15)            → mockup aprobado antes del apply
5. /opsx:apply (TDD estricto, cargando skills)   → respetando las reglas duras
6. openspec-verify → /opsx:archive C-NN-nombre   → marcar [x] en CHANGES.md y avisar al equipo
```

Aplicar TODAS las reglas duras en cada paso. Ante conflicto entre la KB y este archivo, las reglas duras prevalecen.
