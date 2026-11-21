# Gestión de turnos para consultorios odontológicos — Base de Conocimiento

Base de conocimiento generada a partir de los documentos de Discovery (`docs/discovery/checklist-discovery.md` e `informe-discovery.md`) y de las decisiones del equipo. Trabajo práctico de Metodología I (equipo de 6 estudiantes).

## Índice de Archivos

| Archivo | Contenido |
|---|---|
| [01_vision_y_objetivos.md](01_vision_y_objetivos.md) | Propósito, hallazgo de mercado, objetivos por actor, alcance MVP, fuera de alcance |
| [02_descripcion_general.md](02_descripcion_general.md) | Stack, arquitectura hexagonal, integraciones, API REST opcional |
| [03_actores_y_roles.md](03_actores_y_roles.md) | Actores, matriz RBAC, rutas públicas |
| [04_modelo_de_datos.md](04_modelo_de_datos.md) | Entidades, ERD, estados del turno, seed ficticio |
| [05_reglas_de_negocio.md](05_reglas_de_negocio.md) | RN-01 a RN-09 (checklist), RN-10 a RN-18 (derivadas y decisiones del explore de C-01), reglas derivadas y casos de verificación |
| [06_funcionalidades.md](06_funcionalidades.md) | Épicas e historias de usuario con criterios de aceptación |
| [07_flujos_principales.md](07_flujos_principales.md) | Agendar, reserva online, reprogramar, cancelar, bloquear, recordar |
| [08_arquitectura_propuesta.md](08_arquitectura_propuesta.md) | Patrones, estructura `src/` y `tests/`, TDD, seguridad, variables de entorno |
| [09_decisiones_y_supuestos.md](09_decisiones_y_supuestos.md) | Stack, ajuste del MVP, wa.me/Mercado Pago, intervalo semiabierto, supuestos |
| [10_preguntas_abiertas.md](10_preguntas_abiertas.md) | Inconsistencias, preguntas del checklist y datos "No evidenciado" |

## Quick Start para Desarrolladores

1. Entender el dominio → [01](01_vision_y_objetivos.md), [03](03_actores_y_roles.md)
2. Entender las reglas → [05](05_reglas_de_negocio.md) (RN-01 a RN-09 son la fuente de verdad)
3. Entender los datos → [04](04_modelo_de_datos.md)
4. Entender la arquitectura → [02](02_descripcion_general.md), [08](08_arquitectura_propuesta.md)
5. Implementar → [07](07_flujos_principales.md), [06](06_funcionalidades.md); el primer change es US-001 (dar un turno sin solapamiento)
6. Antes de codificar → [09](09_decisiones_y_supuestos.md), [10](10_preguntas_abiertas.md)

## Resumen Ejecutivo

Sistema backend de gestión de turnos para consultorios odontológicos chicos de Argentina (1 a 5 profesionales, 1 a 3 sillones), con el diferencial de **prevenir solapamientos por profesional y por sillón con duración variable por prestación**, algo que ningún competidor relevado documenta de punta a punta. El MVP incluye agenda multi-recurso, alta, cancelación y reprogramación, reserva online por enlace, recordatorios por e-mail y `wa.me`, y roles básicos, con costo $0. Stack: TypeScript, Node.js, dominio puro hexagonal, Vitest, Fastify opcional y repositorios en memoria. Solo datos ficticios; Leyes 25.326 y 26.529 como restricción.

Fuentes: `docs/discovery/checklist-discovery.md` (mayor autoridad) e `docs/discovery/informe-discovery.md`.
