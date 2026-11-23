# Tasks

## 0. Gate de mockup (bloqueante)

- [x] 0.1 Esperar la aprobación explícita del mockup por el owner (Alejo Carabelli): no escribir código hasta que `design.md` § UI Mockups diga `Approval: approved (<fecha>, <quién>)`; verificar con `grep -n "Approval: approved" openspec/changes/archive/2026-11-23-ui-reserva-y-gestion-paciente/design.md`
- [x] 0.2 Confirmar con el owner los supuestos marcados en `design.md` (campo `asistenciaConfirmada` en la vista HTTP, D6; reprogramación online solo de horario, D7; barrido periódico de recordatorios fuera de C-14, Non-Goals) y registrar la respuesta en `design.md`; verificar que no queda ningún "a confirmar" sin respuesta

## 1. Preparación, KB y dependencias

- [x] 1.1 Verificar la baseline: `npm run typecheck` y `npm test` en verde antes de tocar código; anotar la cantidad de tests
- [x] 1.2 Revisar que RN-30 (`05`), DD-29..DD-31 (`09`), la sección HTTP/UI de `08`, las rutas de `03` y las preguntas de `10` del propose siguen vigentes (rebase sobre C-05 si ya se archivó: numeración y `PrestacionRepositorio`); verificar con `grep -n "RN-30\|DD-29\|DD-30\|DD-31" knowledge-base/*.md`
- [x] 1.3 Agregar `fastify` 5.x a `dependencies` y `playwright` a `devDependencies` (versiones fijadas por `package-lock`), scripts `build`, `start`, `test:ui` y `typecheck` (que cubra `tsconfig.web.json`); crear `tsconfig.build.json` (emite `src/` a `dist/`), `tsconfig.web.json` (`checkJs`, `lib: DOM`) y `vitest.ui.config.ts`; excluir `tests/ui/**` de `vitest.config.ts` y agregar `dist/` a `.gitignore`; verificar con `npm ci`, `npm run typecheck` y `npm test` (mismo conteo que 1.1)

## 2. Dominio y aplicación públicos (TDD con repos en memoria)

- [x] 2.1 Regla pura RN-30 en `src/domain/reglas/horizonte-reserva.ts` (`diasReservables`, `dentroDelHorizonte`, días locales de hoy a hoy + 30 inclusive): tests de borde (último día, día 31, cambio de mes, `ahora` cerca de medianoche local) en `tests/domain/reglas/horizonte-reserva.test.ts` (rojo → verde)
- [x] 2.2 Extender `PrestacionRepositorio` con `listarPorConsultorio` y su adaptador en memoria; implementar `ListarCatalogoPublico` y `ListarProfesionalesPublicos` (solo activos/habilitados, campos mínimos, `PRESTACION_NO_DISPONIBLE`); verificar con tests de aplicación que fallan si aparece un campo no público (rojo → verde)
- [x] 2.3 Implementar `ConsultarDisponibilidadPublica` (día local → rango, actor paciente, filtro RN-19, agrupado `{inicio, fin}`, RN-30 y validación de `fecha`); verificar con tests de aplicación de horario cubierto por otro profesional, filtro por profesional, día sin atención y fuera de horizonte (rojo → verde)
- [x] 2.4 Implementar `ReservarOnlinePublica` (RN-30 antes de delegar en `ReservarOnline`, `HORARIO_NO_DISPONIBLE` con `nuevaOferta` vacía, sin crear turno ni paciente); verificar con tests y con la suite de C-10 intacta (rojo → verde)
- [x] 2.5 Implementar `ConsultarGestionDesdeToken` (vista D6 con `asistenciaConfirmada`, `gestionOnline` por `evaluarAnticipacionPaciente`, contacto del consultorio, `diasReservables`, sin `turnoId`); verificar umbral de 24 h exacto e inválido con tests (rojo → verde)
- [x] 2.6 Implementar `ConsultarDisponibilidadParaReprogramar` (mismo profesional y sillón, RN-08, RN-30) y `ReprogramarDesdeTokenPublica` (token → RN-08 → RN-30 → delegación en C-11); verificar con tests que el sillón nunca sale en la respuesta y que la suite de C-11 sigue en verde (rojo → verde)

## 3. Servidor HTTP y contrato de la API

- [x] 3.1 Crear `src/adapters/http/app.ts` (`crearApp` con plugins de rutas, cabeceras de seguridad, `setErrorHandler` con el mapeo de D3, 404 JSON/HTML, límite de cuerpo) y `src/composicion.ts` (cableado en memoria con `Reloj` inyectado); crear `tests/fixtures/sistema-http.ts` con `RelojFijo` y seed; verificar los escenarios "Error inesperado sin detalles" y "Límite de turnos online por HTTP" en `tests/adapters/http/errores-http.test.ts` (rojo → verde)
- [x] 3.2 Validadores puros de frontera (`validarConsultaDisponibilidad`, `validarPedidoReprogramacion`, forma del token) y rutas de catálogo y disponibilidad con schemas de respuesta `additionalProperties: false`; verificar con `app.inject` los escenarios de "Catálogo público de prestaciones", "Profesionales habilitados de una prestación", "Disponibilidad pública por día" y "Horizonte de reserva online de 30 días" con nombres idénticos al spec (rojo → verde)
- [x] 3.3 Ruta `POST /public/reservas` reutilizando `validarPedidoReserva` de C-10; verificar los escenarios de "Alta de reserva por HTTP" (rojo → verde)
- [x] 3.4 Rutas por token (`GET` JSON, `confirmar`, `cancelar`, `disponibilidad`, `reprogramar`) con negociación por `Accept` y `Vary: Accept`; verificar los escenarios de "Consulta del turno por token", "Confirmación de asistencia por HTTP", "Cancelación por HTTP" y "Reprogramación por HTTP" (rojo → verde)
- [x] 3.5 Logger con serializadores redactados y estáticos por lista blanca (`/public/assets/*`, `/public/design-system/*`); verificar los escenarios de "Navegación segura de los enlaces" y "Logs sin token ni datos personales" capturando el log en memoria (rojo → verde)
- [x] 3.6 `src/main.ts` con seed demo ficticio (`seed-demo.ts`) y lectura de `PORT`, `HOST`, `BASE_URL_PUBLICA`, `LOG_LEVEL` (sumar a `.env.example` y a la tabla de `08`); verificar con `npm run build && npm start` y un `curl` a `/public/prestaciones` que responde 200, y detener el proceso

## 4. Interfaz del paciente (sobre el mockup aprobado)

- [x] 4.1 Llevar `mockups/paciente.css` a `src/adapters/http/web/paciente.css` y crear `reserva.html`, `gestion.html` y los módulos `api.js`, `formato.js`, `dialogo.js` con `// @ts-check`; crear el arnés `tests/ui/arnes.ts` (app en puerto efímero, Chromium, `page.route` para demoras y fallos); verificar con `npm run typecheck` y un test de humo de UI que carga ambas páginas sin errores de consola (rojo → verde)
- [x] 4.2 Implementar `reserva.js` (cuatro pasos, "Cualquiera", días reservables del servidor, horarios, formulario, confirmación con enlace y copia); verificar los escenarios de "Reserva guiada en pasos", "Validación del formulario de datos" y "Confirmación con enlace de gestión" en `tests/ui/reserva.ui.test.ts` (rojo → verde)
- [x] 4.3 Estados de carga, vacío y error de la reserva; verificar los escenarios de "Estados de carga, vacío y error en la reserva" (rojo → verde)
- [x] 4.4 Implementar `gestion.js` (vista, confirmar, cancelar con `<dialog>`, reprogramar, menos de 24 h, enlace inválido, foco en confirmar al venir de `/confirmar`); verificar los escenarios de "Página de gestión del turno", "Gestión con menos de 24 horas" y "Enlace inválido o vencido" en `tests/ui/gestion.ui.test.ts` (rojo → verde)
- [x] 4.5 Accesibilidad y responsive: verificar los escenarios de "Accesibilidad y diseño adaptable" (teclado, foco visible, 44 px, sin scroll horizontal a 390 px) y, con `reducedMotion: 'reduce'`, que no hay transiciones activas (rojo → verde)

## 5. Integración y verificación

- [x] 5.1 Capturar las pantallas implementadas a 390x844 y 1440x900 y compararlas con `mockups/previews/`; registrar diferencias aceptadas en `design.md`; verificar que cada mockup tiene su captura de implementación
- [x] 5.2 Ejecutar `npm run typecheck`, `npm test` y `npm run test:ui` completos con 0 fallos, y confirmar que las suites de C-10, C-11 y C-12 no se editaron (`git diff --stat tests/application`)
- [x] 5.3 Marcar US-009 (enlace público) y US-010 (pantalla y HTTP) como cubiertas en `knowledge-base/06_funcionalidades.md`; ejecutar `openspec validate ui-reserva-y-gestion-paciente --strict --no-interactive` sin errores

## Workflow follow-up

- `openspec-verify` con verificación visual contra el mockup aprobado; luego `/opsx:archive ui-reserva-y-gestion-paciente` y marcar C-14 `[x]` en `CHANGES.md`.
- Avisar al equipo (en especial a Lautaro Medina, C-15) que la fábrica `crearApp` queda disponible para registrar rutas internas.
- Commit conventional en español con el usuario de git de Alejo Carabelli.
