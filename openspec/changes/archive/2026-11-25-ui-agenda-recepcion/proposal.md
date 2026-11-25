# Proposal

## Why

La secretaria es quien más usa el sistema (SU-02, riesgo R-9), y hoy no tiene pantalla. La agenda (C-08), los turnos (C-01 a C-04), los bloqueos (C-06), los recordatorios `wa.me` (C-13) y la sesión con permisos (C-09) existen como casos de uso, pero no hay rutas internas ni interfaz. Tampoco hay forma de elegir o registrar a un paciente desde recepción, aunque el Flujo 1 lo pide ("paciente existente o alta rápida"). C-15 es el último change del MVP y cierra US-002 y la parte interna de US-013.

## What Changes

- **Pacientes desde recepción** (decisión del explore, opción A):
  - Búsqueda por DNI o por nombre y apellido, con resultados mínimos (RN-34).
  - Alta rápida con los mismos datos y validaciones que la reserva online (DD-17) y rechazo del DNI repetido (RN-35).
  - Solo para recepción y administrador: acciones nuevas `paciente.buscar` y `paciente.crear` en la matriz de C-09.
- **Agenda con datos para mostrar**: una vista de la agenda diaria y semanal que agrega a cada turno el nombre del paciente, de la prestación, del profesional y del sillón. Así el navegador nunca descarga la lista de pacientes (mínimo dato, RN-D-02).
- **API interna `/interno/*`**, todas las rutas con la sesión de C-09:
  - Lectura: agenda, catálogo interno (profesionales, sillones y prestaciones activos), disponibilidad, pacientes y pendientes `wa.me`.
  - Escritura: dar, cancelar y reprogramar turnos, confirmar, marcar atendido y ausente, bloquear y liberar horarios, marcar enviado un `wa.me` y alta rápida de paciente.
  - Los casos de uso existentes no cambian.
- **Interfaz de recepción `/recepcion`**:
  - Login, más la agenda del día por sillón o por profesional, y la de la semana de un solo recurso (DD-39).
  - Filtros, y acciones sobre el turno elegido: dar turno con búsqueda y alta rápida, cancelar, reprogramar, confirmar, marcar atendido o ausente, bloquear y liberar, y el panel de pendientes `wa.me`.
  - El odontólogo ve solo su agenda y solo las acciones que la matriz le permite.
  - El token se guarda en `sessionStorage` (DD-38).
- **Mockups** de 10 pantallas con sus estados (cargando, vacío, error, sin permiso, conflicto), sobre `design-system/tokens.css` revisión 1, para aprobar **antes** del apply.

## Capabilities

### New Capabilities
- `pacientes-recepcion`: búsqueda y alta rápida de pacientes por el personal del consultorio.
- `api-interna`: contrato HTTP de las rutas `/interno/*` para la interfaz de recepción (formato, sesión, errores y mínimo dato).
- `interfaz-recepcion`: comportamiento observable de la interfaz `/recepcion` (login, vistas de agenda, acciones, estados, accesibilidad y permisos por rol).

### Modified Capabilities
- `consulta-agenda`: la agenda informa, para cada turno, los nombres del paciente, la prestación, el profesional y el sillón.
- `control-acceso`: se agregan las acciones de búsqueda y alta de pacientes a la matriz.

## Impact

- **Código nuevo:**
  - Reglas puras de búsqueda y alta (`src/domain/reglas/`).
  - Casos de uso `BuscarPacientes`, `AltaRapidaPaciente`, `VistaAgenda` y `ListarCatalogoInterno`.
  - Rutas `src/adapters/http/rutas-recepcion.ts` con sus validadores y serializadores.
  - Interfaz en `src/adapters/http/web/recepcion/` (HTML y módulos ES con `// @ts-check`, sin build).
- **Código modificado:**
  - `PacienteRepositorio` y su adaptador en memoria suman `buscar`.
  - La matriz de permisos suma dos acciones.
  - `composicion.ts` y `main.ts` registran las rutas de recepción.
  - `seed-demo.ts` suma pacientes y turnos ficticios para la demo.
- **Dependencias:** ninguna nueva (Fastify, `jose` y Playwright ya están).
- **KB:** RN-34 y RN-35 (`05`), DD-38 a DD-41 (`09`), filas de pacientes en la matriz (`03`) y preguntas abiertas (`10`).
- **Governance BAJO**, con la política `system-and-mockups`: el mockup aprobado es requisito del apply.

## Non-goals

- Pantallas de administración: gestión de usuarios y configuración de recursos (sus casos de uso existen, pero no hay rutas HTTP).
- Editar los datos de un paciente existente o darlo de baja.
- La vista de 3 días, y la semana con todos los recursos juntos (DD-39).
- Uso cómodo en celular: la interfaz es de escritorio y en pantallas chicas solo no se rompe.
- Notificaciones en tiempo real o refresco automático de la agenda.
- Límite de intentos de login y cierre de sesión en el servidor (siguen abiertos desde C-09; el botón "Salir" borra el token del navegador).
