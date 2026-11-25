# Tasks

> **Política `system-and-mockups`**: no se empieza el grupo 2 hasta que Lautaro Medina apruebe los mockups de `mockups/` (comentario "Mockup aprobado" en el PR del propose). Governance BAJO: sin otros checkpoints obligatorios.
>
> TDD estricto, de a UNA tarea por vez: RED (test que falla, ejecutado) → GREEN (mínimo código) → TRIANGULATE (≥ 2 casos) → REFACTOR, con los tests en verde después de cada paso. Los tests usan como título el nombre exacto de cada `#### Scenario:` de los specs de este change, agrupados en `describe` por requisito (regla dura 8). Solo datos ficticios (regla dura 4).

## 1. Mockup y baseline

- [x] 1.1 Aprobación de los mockups de `mockups/` (**aprobado por Lautaro Medina el 2026-11-25**, "mockup aprobado") (índice en `mockups/index.html`, capturas en `mockups/previews/`) por el owner; registrar la fecha en `design-system/README.md` si cambia algo del sistema (no se espera)
- [x] 1.2 SAFETY NET: `npm ci`, `npm test`, `npm run typecheck` y `npm run test:ui`; registrar el baseline en verde; si algo falla, detenerse y reportarlo como falla preexistente
- [x] 1.3 Verificar que la KB ya tiene RN-34 y RN-35 (`05`), DD-38 a DD-41 (`09`), las filas de pacientes de la matriz (`03`) y la pregunta abierta de alta de usuarios (`10`), como exige la regla dura 6

## 2. Pacientes desde recepción

- [x] 2.1 RED/GREEN/TRIANGULATE `normalizarBusqueda` y `coincidePaciente` (`src/domain/reglas/pacientes-recepcion.ts`): recorte, minúsculas, tildes (`Simulada`/`simulada`/`SIMULADA`, `Ñ`), 2 y 3 caracteres, solo dígitos como prefijo de DNI, nombre o apellido parcial; verificar `tests/domain/reglas/pacientes-recepcion.test.ts` en verde
- [x] 2.2 Agregar `paciente.buscar` y `paciente.crear` a `ACCIONES` y `MATRIZ` (design D1); actualizar la tabla esperada de `tests/domain/permisos/autorizar.test.ts`; RED/GREEN de los escenarios de "Pacientes por rol" (`specs/control-acceso`); verificar en verde
- [x] 2.3 Agregar `'RN-35'` a `CodigoRN` con `pacienteExistente` en `Violacion`/`ReglaNegocioError` y `listar()` a `PacienteRepositorio` y su adaptador en memoria; tests de `errores.test.ts` y `paciente-repositorio.test.ts` en verde sin editar sus casos existentes
- [x] 2.4 RED/GREEN `BuscarPacientes` (`src/application/buscar-pacientes.ts`): escenarios de "Búsqueda de pacientes", "Texto de búsqueda mínimo", "Resultado de búsqueda con mínimo dato", "Tope de resultados" y "Pacientes solo para recepción y administrador" (búsqueda) en `tests/application/pacientes-recepcion.test.ts`; verificar en verde
- [x] 2.5 RED/GREEN `AltaRapidaPaciente`: escenarios de "Alta rápida de paciente", "DNI único en el alta rápida" y el de alta de "Pacientes solo para recepción y administrador"; verificar que no se modifica `validarDatosPacienteOnline` y que las suites de C-10 siguen en verde

## 3. Vista de la agenda y catálogo interno

- [x] 3.1 RED/GREEN `VistaAgenda` (`src/application/vista-agenda.ts`, design D3) sobre `AgendaDiaria`/`AgendaSemanal`: escenarios de "Vista de la agenda con datos para mostrar" (`specs/consulta-agenda`) en `tests/application/vista-agenda.test.ts`; verificar que un turno con un id de catálogo inexistente no rompe la vista (nombre vacío) y que las suites de C-08 siguen en verde sin cambios
- [x] 3.2 RED/GREEN `ListarCatalogoInterno`: consultorio, recursos activos ordenados por nombre, prestaciones con duración; solo personal (el paciente recibe acceso denegado); verificar en verde

## 4. API interna

- [x] 4.1 RED/GREEN validadores y serializadores internos (`validadores-internos.ts`, `serializadores-internos.ts`): fecha `YYYY-MM-DD`, `inicio` ISO con zona, ids, cuerpos de turno, reprogramación, bloqueo y paciente; serialización ISO UTC; verificar `tests/adapters/http/validadores-internos.test.ts` en verde
- [x] 4.2 RED/GREEN mapeo de `ReglaNegocioError` (409 con mensaje fijo por código y `conflicto`/`turnos`/`paciente`), `RecursoNoEncontradoError` (404), `ConfiguracionInvalidaError` y `ConsultaInvalidaError` (400) en `errores-http.ts`; agregar el test de que ninguna ruta `/public/*` responde 409 con un código `RN-XX`; verificar las suites HTTP de C-14 en verde
- [x] 4.3 RED/GREEN `rutasRecepcion` (plugin con `crearExigirSesion`) y fixture `tests/fixtures/sistema-http-recepcion.ts`: escenarios de "Sesión obligatoria en las rutas internas", "Agenda del día", "Agenda de la semana de un recurso" y "Catálogo interno"; verificar en verde
- [x] 4.4 RED/GREEN escenarios de "Disponibilidad interna", "Pacientes por HTTP" y "Turnos por HTTP" (`POST /interno/turnos` con `AgendarTurnoConRecordatorio`); verificar en verde
- [x] 4.5 RED/GREEN escenarios de "Reglas de negocio por HTTP", "Bloqueos por HTTP", "Recordatorios wa.me por HTTP" y "Mínimo dato en las respuestas internas"; verificar en verde
- [x] 4.6 Cablear `rutasRecepcion` en `composicion.ts` y `main.ts` y sumar pacientes y turnos ficticios a `seed-demo.ts` (design D6); verificar con `npm run build` y el servidor real que `GET /interno/agenda` responde con sesión del administrador inicial

## 5. Interfaz de recepción

- [x] 5.1 Estáticos y páginas: `login.html`, `agenda.html`, `recepcion.css` (componentes del design system sin cambios de valores) y la lista blanca `/recepcion/assets/*`; `tsconfig.web.json` incluye `web/recepcion/*.js`; verificar `npm run typecheck`
- [x] 5.2 RED/GREEN `api.js` y `sesion.js` + login: escenarios de "Inicio de sesión" y "Sesión en la pestaña" en `tests/ui/recepcion.ui.test.ts` (un solo archivo para todos los escenarios, con el arnés `tests/ui/arnes-recepcion.ts`); verificar `npm run test:ui` en verde
- [x] 5.3 RED/GREEN `grilla.js` y `agenda.js`: escenarios de "Agenda del día por sillón o por profesional", "Semana de un recurso", "Navegación de fechas y filtros" y "Estados de carga, vacío y error"; verificar en verde
- [x] 5.4 RED/GREEN `detalle.js`: escenarios de "Detalle y acciones de un turno", "Cancelar con confirmación" y "Reprogramar eligiendo un hueco"; verificar en verde
- [x] 5.5 RED/GREEN `dar-turno.js`: escenarios de "Dar turno con búsqueda y alta rápida" y "Mensajes de reglas de negocio"; verificar en verde
- [x] 5.6 RED/GREEN `bloqueo.js` y `wa-me.js`: escenarios de "Bloquear y liberar horarios" y "Pendientes de WhatsApp"; verificar en verde
- [x] 5.7 RED/GREEN escenarios de "Lo que ve el odontólogo" y "Accesibilidad de la agenda" (Tab y Enter, nombres accesibles, foco que vuelve al cerrar diálogos, objetivos de 44 px, sin scroll horizontal a 1440 px); verificar en verde

## 6. Verificación visual e integración

- [x] 6.1 Capturas de 1440 × 900 de las pantallas implementadas en `verify/` y comparación con los mockups aprobados; anotar diferencias y corregirlas o justificarlas
- [x] 6.2 Suite completa, `npm run test:ui`, `npm run typecheck`, `npm run build` y `openspec validate ui-agenda-recepcion --strict` en verde; `grep` de `any`, `innerHTML` con datos y `localStorage` en `web/recepcion/` (reglas duras 1 y design D5)
- [x] 6.3 Actualizar la KB con lo que precise el apply (mensajes por código RN, rutas) y marcar como resueltas las preguntas de `10` que cierra C-15

## Workflow follow-up

- Archivar con `openspec-archive-change` cuando el PR esté aprobado y mergeado, y marcar C-15 como `[x]` en `CHANGES.md` (último change del MVP).
