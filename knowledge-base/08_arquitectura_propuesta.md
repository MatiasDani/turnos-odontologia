# Arquitectura Propuesta

## Patrones aplicados

| Patrón | Dónde se usa | Por qué |
|---|---|---|
| Hexagonal / Clean (puertos y adaptadores) | Todo el sistema: dominio, aplicación, adaptadores | Aislar la regla de agenda por recursos de la infraestructura; testeable sin servidores |
| Dominio puro (funciones y entidades sin I/O) | `src/domain` | Las reglas RN-01 a RN-07 se prueban con TDD estricto |
| Casos de uso (application services) | `src/application` | Una operación de negocio por caso (agendar, cancelar, reprogramar) |
| Repositorio (puerto + adaptador en memoria) | `src/adapters/persistence` | MVP en memoria; PostgreSQL después sin tocar el dominio |
| Objeto valor `Intervalo` | `src/domain` | Encapsula `[inicio, fin)` y la prueba de solapamiento |
| Inyección de dependencias manual | Composición en la raíz | Sin framework de DI; costo $0 y simplicidad |
| Reloj inyectable (`Reloj`) | Puerto | Probar RN-08 (24 h) de forma determinista |

## Estructura de directorios (layout según el TP: `src/` y `tests/` en la raíz)

```
Global-desarrollo/
├── src/
│   ├── domain/            # entidades, objetos valor, reglas (puro, sin I/O)
│   │   ├── intervalo.ts
│   │   ├── turno.ts
│   │   ├── profesional.ts, sillon.ts, prestacion.ts, paciente.ts
│   │   ├── bloqueo-horario.ts, horario-atencion.ts
│   │   └── reglas/        # validaciones RN-01..RN-07
│   ├── application/       # casos de uso y puertos
│   │   ├── agendar-turno.ts, reprogramar-turno.ts, cancelar-turno.ts
│   │   ├── reservar-online.ts, consultar-disponibilidad.ts, bloquear-horario.ts
│   │   ├── generar-recordatorio.ts
│   │   └── puertos/       # Repositorios, Notificador, Reloj
│   └── adapters/
│       ├── persistence/   # repos en memoria (PostgreSQL luego)
│       ├── http/          # Fastify (opcional)
│       └── notifications/ # email, generador wa.me
├── tests/                 # Vitest: unit (dominio), use-cases, integración
├── docs/                  # fuentes (discovery)
├── knowledge-base/
└── openspec/
```

## Orden de implementación sugerido (primer change)

1. `Intervalo` y regla de solapamiento semiabierto (RN-05) con tests de borde.
2. `Turno` con `fin` derivado de la prestación (RN-06) y estados.
3. Validación por profesional y por sillón (RN-01 a RN-04).
4. Horario de atención y bloqueos (RN-07).
5. Caso de uso `AgendarTurno` con repositorios en memoria.
Luego: cancelar, reprogramar, disponibilidad, reserva online, recordatorios.

## Estrategia de pruebas

- **TDD estricto** con Vitest: rojo, verde, triangulación (mínimo dos casos por comportamiento), refactor.
- Capas: unitarias del dominio (puras), de casos de uso con repos en memoria, y de la API con `fastify.inject` (si se implementa).
- Casos obligatorios: contiguos válidos, solapamiento parcial, contención total, mismo profesional con distinto sillón, mismo sillón con distinto profesional, cancelación que libera, reprogramación atómica, umbral exacto de 24 h.
- Datos de test: solo ficticios (RN-D-01).

## Seguridad

- **Autenticación**: usuarios internos con e-mail y clave con hash (algoritmo adaptativo, p. ej. scrypt/argon2; a confirmar); sesión por token firmado (JWT) en la API. Pacientes: token de gestión no adivinable por turno.
- **Autorización**: RBAC según `03_actores_y_roles.md`, aplicado en los casos de uso (no solo en la capa HTTP).
- **Validación de input**: esquemas en la frontera (Fastify schemas o validador equivalente); el dominio revalida invariantes.
- **Datos personales**: mínimo dato necesario; sin datos clínicos en el MVP; sin datos reales en el repositorio; Ley 25.326 y Ley 26.529 como restricciones (RN-D-02).
- **Secrets**: variables de entorno; nunca en el repositorio; `.env` fuera del control de versiones; solo `.env.example` con valores ficticios.
- **Concurrencia**: atomicidad de validación y escritura (RN-12).
- **Etapas posteriores**: auditoría de accesos, exportación de datos del paciente y backups.

## Variables de entorno

| Variable | Descripción | Ejemplo | Sensible |
|---|---|---|---|
| `PORT` | Puerto de la API | `3000` | N |
| `TZ_CONSULTORIO` | Zona horaria por defecto | `America/Argentina/Buenos_Aires` | N |
| `JWT_SECRET` | Secreto de firma de sesiones | `cambiar-en-local` | Y |
| `SMTP_HOST` / `SMTP_PORT` | Servidor de e-mail (free tier) | `smtp.ejemplo.test` / `587` | N |
| `SMTP_USER` / `SMTP_PASS` | Credenciales del e-mail | (vacío en ejemplo) | Y |
| `BASE_URL_PUBLICA` | Base para enlaces de reserva y gestión | `http://localhost:3000` | N |
| `RECORDATORIO_HORAS_ANTES` | Anticipación del recordatorio | `24` | N |
| `DATABASE_URL` | PostgreSQL (post-MVP) | `postgres://usuario:clave@localhost:5432/turnos` | Y |
