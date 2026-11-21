# Descripción General

## Clasificación del sistema

| Atributo | Valor |
|---|---|
| Tipo de sistema | Backend/API de dominio (web app futura) |
| Dominio de negocio | Salud: gestión de turnos y agenda de consultorios odontológicos |
| Escala | Pequeña: consultorios de 1 a 5 profesionales y 1 a 3 sillones |
| Infraestructura | `needs_infra: false` para el MVP (repositorios en memoria, sin servicios pagos; costo $0) |

## Stack tecnológico (decidido por el equipo; ver DD-01)

| Capa | Tecnología | Versión mínima |
|---|---|---|
| Lenguaje | TypeScript | 5.x |
| Runtime | Node.js (LTS) | 20 LTS o superior (**Suposición:** a confirmar al inicializar el proyecto) |
| Gestor de paquetes | npm | el de la LTS |
| Lógica de dominio | Módulos TypeScript puros (sin dependencias de framework) | n/a |
| Tests | Vitest | 1.x o superior |
| API REST (opcional) | Fastify | 4.x o superior |
| Persistencia MVP | Repositorios en memoria (adaptadores) | n/a |
| Persistencia futura | PostgreSQL (free tier) | a definir |
| E-mail | Proveedor SMTP/transaccional con free tier (a confirmar) | n/a |

Estructura de repositorio según el TP: `src/` para la implementación y `tests/` para las pruebas, en la raíz.

## Arquitectura general

Arquitectura hexagonal / clean, con dependencias hacia adentro:

```
 Adaptadores de entrada          Aplicación (casos de uso)          Dominio (puro)
 ┌──────────────────┐          ┌──────────────────────────┐      ┌───────────────────────┐
 │ API REST Fastify │ ───────▶ │ AgendarTurno             │ ───▶ │ Turno, Intervalo      │
 │ (opcional)       │          │ ReprogramarTurno         │      │ Profesional, Sillon   │
 │ Tests / CLI      │          │ CancelarTurno            │      │ Prestacion            │
 └──────────────────┘          │ ReservarOnline           │      │ BloqueoHorario        │
                               │ BloquearHorario          │      │ HorarioAtencion       │
 Adaptadores de salida         │ ConsultarDisponibilidad  │      │ Reglas RN-01..RN-09   │
 ┌──────────────────┐ ◀─────── │ GenerarRecordatorio      │      └───────────────────────┘
 │ Repos en memoria │  puertos └──────────────────────────┘
 │ (PostgreSQL luego)│
 │ Email, wa.me     │
 └──────────────────┘
```

Justificación: el valor diferencial es la **regla de agenda por recursos**; aislarla como dominio puro la hace testeable sin infraestructura (TDD estricto con Vitest) y permite cambiar la persistencia (memoria a PostgreSQL) sin tocar reglas.

## Integraciones externas

| Servicio | Propósito | Etapa | Tipo | Costo |
|---|---|---|---|---|
| E-mail (SMTP o transaccional) | Recordatorios y confirmación | MVP | SMTP/REST detrás de un puerto `Notificador` | Gratis (free tier; proveedor a confirmar) |
| Enlace `wa.me` (click-to-chat) | Mensaje armado que envía la recepción | MVP | URL generada, sin API | Gratis |
| Google Calendar | Sincronización opcional | Opcional | REST | Gratis dentro de cuotas |
| WhatsApp Cloud API (Meta) | Recordatorios automáticos | Post-MVP | REST/webhook | Número de prueba gratis; cobro por mensaje con plantilla en producción (tarifas Argentina: ver `10_preguntas_abiertas.md`) |
| Mercado Pago | Señas | Post-MVP | REST/webhook | Sandbox gratis; comisión por cobro en producción |

## API REST (opcional, Fastify)

Resumen de recursos previstos (no obligatorios para el MVP del TP; los casos de uso se pueden ejercitar solo con tests):

| Recurso | Endpoints principales | Acceso |
|---|---|---|
| `/turnos` | `POST` alta, `PATCH /{id}/reprogramar`, `POST /{id}/cancelar`, `GET` agenda por rango | Recepción, odontólogo (lectura propia), administrador |
| `/disponibilidad` | `GET` huecos por prestación, profesional y fecha | Recepción y público |
| `/bloqueos` | `POST`, `DELETE`, `GET` | Odontólogo (propios), recepción, administrador |
| `/reserva` | `GET` disponibilidad pública, `POST` reserva, `POST /{token}/cancelar`, `POST /{token}/reprogramar` | Público (paciente) con token del turno |
| `/profesionales`, `/sillones`, `/prestaciones`, `/horarios` | CRUD de configuración | Administrador |
| `/recordatorios` | `GET` pendientes y enlace `wa.me` | Recepción |

Convención: los errores de regla de negocio devuelven `409 Conflict` o `422` con el código `RN-XX` violado.

## Hallazgos de mercado que condicionan el diseño

- La garantía de no solapamiento por profesional **y** sillón con duración variable es el diferencial; debe ser **verificable por pruebas automatizadas**.
- Precios y nombres de competidores sirven solo como contexto; ver `docs/discovery/informe-discovery.md` para el detalle y las limitaciones de evidencia.
