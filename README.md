# Turnos Odonto

Sistema de gestión de turnos para consultorios odontológicos chicos de Argentina (1 a 5 profesionales, 1 a 3 sillones). Su diferencial es que **nunca deja solapar turnos**, ni por profesional ni por sillón, aunque cada prestación dure distinto. Incluye reserva online para el paciente, agenda para la recepción, bloqueos de horario, roles y recordatorios.

Trabajo práctico de Metodología I (Desarrollo de Software), hecho con desarrollo guiado por especificaciones: **OpenSpec + Active Stack + agentes de IA**. Todos los datos del proyecto son **ficticios**.

| Integrante | Legajo | Changes |
|---|---|---|
| Matías Ibañez | 52006 | C-01, C-07, C-10, FIX-01, MEJ-01 |
| Franco Petri | 52080 | C-02, C-04, C-12 |
| Luka Garro | 51988 | C-03, C-11, C-13 |
| Alejo Carabelli | 51928 | C-05, C-14 |
| Mara Ferrer | 51974 | C-06, C-08 |
| Lautaro Medina | 52043 | C-09, C-15 |

## Requisitos

- [Node.js](https://nodejs.org/) **20 o superior** (incluye npm).
- Git.
- Solo para los tests de interfaz: Microsoft Edge o Google Chrome instalados (o el Chromium de Playwright, ver más abajo).

No hace falta base de datos ni ningún servicio externo: el sistema guarda todo en memoria.

## Instalación

```bash
git clone https://github.com/MatiasDani/turnos-odontologia.git
cd turnos-odontologia
npm ci
```

## Correr los tests

```bash
npm test             # tests de dominio, casos de uso y API (Vitest)
npm run typecheck    # chequeo de tipos de TypeScript (backend y frontend)
```

Cada escenario de los specs (`openspec/specs/`) tiene un test con el mismo nombre.

### Tests de interfaz (opcional)

Abren las pantallas en un navegador real con Playwright. Usan el Chromium de Playwright, que se instala una vez con `npx playwright install chromium`, o el navegador que ya tengas instalado:

```powershell
# Windows (PowerShell), con Microsoft Edge
$env:UI_NAVEGADOR = "msedge"
npm run test:ui
```

```bash
# Linux / macOS, con Google Chrome
UI_NAVEGADOR=chrome npm run test:ui
```

## Levantar el sistema

1. Compilar:

   ```bash
   npm run build
   ```

2. Definir las variables de entorno y arrancar. `JWT_SECRET` es obligatoria (32 caracteres o más) y el administrador inicial se crea con `ADMIN_EMAIL_INICIAL` y `ADMIN_CLAVE_INICIAL` (clave de 10 a 128 caracteres). **Usá valores propios y no los subas al repositorio.**

   ```powershell
   # Windows (PowerShell)
   $env:JWT_SECRET = "reemplazar-por-un-secreto-largo-de-32-caracteres-o-mas"
   $env:ADMIN_EMAIL_INICIAL = "admin@demo.test"
   $env:ADMIN_CLAVE_INICIAL = "reemplazar-por-una-clave"
   npm start
   ```

   ```bash
   # Linux / macOS
   export JWT_SECRET="reemplazar-por-un-secreto-largo-de-32-caracteres-o-mas"
   export ADMIN_EMAIL_INICIAL="admin@demo.test"
   export ADMIN_CLAVE_INICIAL="reemplazar-por-una-clave"
   npm start
   ```

3. Abrir en el navegador:

   | Pantalla | Dirección |
   |---|---|
   | Portada | http://localhost:3000/ |
   | Reserva online del paciente | http://localhost:3000/public/reservar |
   | Agenda de recepción (pide iniciar sesión) | http://localhost:3000/recepcion |

Al arrancar se carga un consultorio de demostración con profesionales, sillones, prestaciones y turnos ficticios. Como todo vive en memoria, al reiniciar el servidor los datos vuelven a cero.

### Variables de entorno

| Variable | Obligatoria | Por defecto | Para qué |
|---|---|---|---|
| `JWT_SECRET` | Sí | — | Firma de las sesiones del personal (32 caracteres o más) |
| `ADMIN_EMAIL_INICIAL` / `ADMIN_CLAVE_INICIAL` | Para poder ingresar | — | Administrador que se crea al arrancar (las dos o ninguna) |
| `PORT` | No | `3000` | Puerto del servidor |
| `HOST` | No | `127.0.0.1` | Interfaz donde escucha |
| `BASE_URL_PUBLICA` | No | `http://HOST:PORT` | Base de los enlaces que recibe el paciente |
| `LOG_LEVEL` | No | `info` | Nivel de log |

`.env.example` documenta además las variables SMTP de los recordatorios por e-mail, que solo se usan si se conecta un proveedor de correo (para desarrollo, [Ethereal](https://ethereal.email)).

## Cómo está organizado

```
src/                 implementación (arquitectura hexagonal)
  domain/            reglas de negocio puras (sin frameworks ni fecha del sistema)
  application/       casos de uso y puertos
  adapters/          HTTP (Fastify), interfaz web, persistencia en memoria, e-mail, configuración
tests/               tests de Vitest (y tests/ui con Playwright)
openspec/            specs vigentes y changes archivados (propuesta, diseño, tareas, mockups)
knowledge-base/      base de conocimiento: reglas (RN-xx), decisiones (DD-xx), modelo, flujos
docs/discovery/      informe de Discovery y checklist
design-system/       tokens, marca y componentes visuales
CHANGES.md           roadmap de changes con dependencias y estado
AGENTS.md            instrucciones y reglas duras para los agentes de IA
.engram/             memoria compartida del proyecto (Engram)
```

## Metodología

1. **Discovery** de 19 sistemas del mercado con verificación de fuentes (`docs/discovery/`).
2. **Fundación** con Active Stack: base de conocimiento, design system, roadmap y reglas para los agentes.
3. **Ciclo OpenSpec** por change: `explore` → `propose` (proposal, design, specs y tasks) → `apply` con TDD → `verify` → `archive`. Cada integrante trabajó sus changes en una rama propia e integró por pull request.
4. **Memoria con Engram**: las decisiones se guardan como memoria y viajan en `.engram/`. Para importarlas después de un `git pull`: `engram sync --import`.
