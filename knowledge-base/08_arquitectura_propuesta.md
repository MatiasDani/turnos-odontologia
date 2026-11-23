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
| Reloj inyectable (`Reloj`) | Puerto | Probar RN-08 (24 h) y RN-20 de forma determinista; lo crea C-10 y lo reutiliza C-02 (DD-16) |
| Modificación atómica (`TurnoRepositorio.actualizarSi`) | Puerto + adaptador en memoria | Sección crítica sin `await` para cambiar un turno existente sin que dos operaciones se pisen (RN-12); la crea C-02 y la reutilizan C-03 y C-04 (DD-19) |
| Puerto de recordatorios (`Recordatorios`) | `src/application/puertos/recordatorios.ts` + `src/adapters/recordatorios/` | C-02 lo crea con un adaptador no-op y cancela los pendientes al cancelar; C-12 implementa el adaptador real (DD-19) |

## Estructura de directorios (layout según el TP: `src/` y `tests/` en la raíz)

```
Global-desarrollo/
├── src/
│   ├── domain/            # entidades, objetos valor, reglas (puro, sin I/O)
│   │   ├── intervalo.ts
│   │   ├── turno.ts
│   │   ├── profesional.ts, sillon.ts, prestacion.ts, paciente.ts
│   │   ├── bloqueo-horario.ts, horario-atencion.ts
│   │   ├── recordatorio.ts (C-12)
│   │   └── reglas/        # validaciones RN-01..RN-07; transiciones.ts (tabla única de estados, DD-20), cancelacion.ts, estados.ts (RN-10, RN-24), recordatorios.ts (RN-25), horario.ts (RN-07, RN-17, tramosDelDia RN-28), configuracion.ts (RN-29), desactivacion.ts (RN-27)
│   ├── application/       # casos de uso y puertos
│   │   ├── agendar-turno.ts, reprogramar-turno.ts, cancelar-turno.ts
│   │   ├── confirmar-turno.ts, marcar-atendido.ts, marcar-ausente.ts (C-04, sobre cambiar-estado-turno.ts)
│   │   ├── reservar-online.ts, consultar-disponibilidad.ts, bloquear-horario.ts
│   │   ├── recordatorios-email.ts, agendar-turno-con-recordatorio.ts, enviar-recordatorios-pendientes.ts,
│   │   │   confirmar-desde-enlace.ts, listar-recordatorios-fallidos.ts (C-12, DD-21)
│   │   ├── configurar-profesionales.ts, configurar-sillones.ts, configurar-prestaciones.ts,
│   │   │   configurar-horarios.ts, control-acceso.ts (C-05, DD-25..DD-28; solo administrador)
│   │   └── puertos/       # Repositorios (con escrituras de catálogo, C-05), Notificador, Reloj, Recordatorios
│   └── adapters/
│       ├── persistence/   # repos en memoria (PostgreSQL luego)
│       ├── recordatorios/ # no-op para cableados sin recordatorios (C-02, C-12)
│       ├── http/          # DTO y validador puro de frontera (C-10, sin framework); Fastify opcional después
│       ├── notificador/   # SMTP con nodemailer (C-12); generador wa.me (C-13)
│       └── config/        # lectura y validación de variables de entorno (C-12)
├── tests/                 # Vitest: unit (dominio), use-cases, integración
├── docs/                  # fuentes (discovery)
├── knowledge-base/
└── openspec/
```

## Orden de implementación sugerido (primer change)

1. `Intervalo` y regla de solapamiento semiabierto (RN-05) con tests de borde.
2. `Turno` con `fin` derivado de la duración efectiva (prestación o ajuste por turno; RN-06) y estados.
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

- **Autenticación**: usuarios internos con e-mail y clave con hash (algoritmo adaptativo, p. ej. scrypt/argon2; a confirmar); sesión por token firmado (JWT) en la API. Pacientes: token de gestión no adivinable por turno, de 32 bytes aleatorios, almacenado solo como hash SHA-256 en la entidad `TokenGestion` (DD-15, RN-21).
- **Autorización**: RBAC según `03_actores_y_roles.md`, aplicado en los casos de uso (no solo en la capa HTTP).
- **Validación de input**: esquemas en la frontera (validador puro en `src/adapters/http/` desde C-10, DD-13; Fastify schemas si se integra HTTP); el dominio revalida invariantes.
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
| `SMTP_HOST` / `SMTP_PORT` | Servidor de e-mail (free tier); TLS directo solo con el puerto 465 | `smtp.ethereal.email` / `587` | N |
| `SMTP_USER` / `SMTP_PASS` | Credenciales del e-mail; `SMTP_USER` es también el remitente. Obligatorias al usar SMTP | (vacío en ejemplo) | Y |
| `BASE_URL_PUBLICA` | Base para enlaces de reserva y gestión | `http://localhost:3000` | N |
| `RECORDATORIO_HORAS_ANTES` | Anticipación del recordatorio en horas (entero de 1 a 720; 24 si falta) | `24` | N |
| `DATABASE_URL` | PostgreSQL (post-MVP) | `postgres://usuario:clave@localhost:5432/turnos` | Y |
