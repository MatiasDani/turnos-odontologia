# Tasks

> TDD estricto, de a UNA tarea por vez: RED (test que falla, ejecutado) → GREEN (mínimo código) → TRIANGULATE (≥ 2 casos) → REFACTOR, con los tests en verde después de cada paso. Los tests de caso de uso usan como título el nombre exacto de cada `#### Scenario:` de `specs/reserva-online/spec.md`, agrupados en `describe` por requisito (regla dura 8). Solo datos ficticios (DNI `0000000N`, "Paciente Ficticio N", e-mails `*.test`). `AgendarTurno`, `ConsultarDisponibilidad` y sus tests no se modifican. Governance ALTO: checkpoints 3.6, 5.10 y 6.4.

## 1. Safety net y puertos base

- [x] 1.1 SAFETY NET: ejecutar `npm test` y `npm run typecheck` y registrar el baseline (N tests en verde); si algo falla, detenerse y reportarlo como falla preexistente
- [x] 1.2 RED/GREEN/TRIANGULATE puerto `Reloj` (`src/application/puertos/reloj.ts`), adaptador `RelojSistema` (`src/adapters/reloj/reloj-sistema.ts`: dos llamadas no decrecientes y cercanas a un instante tomado en el test) y `RelojFijo` (`tests/fixtures/reloj-fijo.ts`: devuelve el instante fijado y cambia con `fijar`); verificar `tests/adapters/reloj.test.ts` en verde
- [x] 1.3 RED/GREEN/TRIANGULATE `PacienteRepositorio` (`obtenerPorDni`, `guardar`) en `repositorios.ts` y `PacienteRepositorioEnMemoria`: DNI inexistente → `undefined`; guardado y lectura; los pacientes iniciales del seed se encuentran por DNI; verificar `tests/adapters/paciente-repositorio.test.ts` en verde
- [x] 1.4 RED/GREEN/TRIANGULATE `TurnoRepositorio.obtenerPorId` y `listarPorPaciente` en el puerto y en `TurnoRepositorioEnMemoria` (colección `protected`), incluidos turnos de cualquier estado; verificar `tests/adapters/turno-repositorio.test.ts` y las suites de C-01/C-07 en verde

## 2. Reglas de formato y frontera pura

- [x] 2.1 RED/GREEN/TRIANGULATE `validarDatosPacienteOnline` (`src/domain/datos-paciente-online.ts`) para DNI (puntos, 7 y 8 dígitos, 6/9 dígitos y letras inválidos) y nombre/apellido (trim, vacío, 80 y 81 caracteres) según design D3; verificar `tests/domain/datos-paciente-online.test.ts` en verde
- [x] 2.2 RED/GREEN/TRIANGULATE teléfono (separadores, `+54`, `+1` inválido, `+` intermedio inválido, 9 y 14 dígitos inválidos, 10 y 13 válidos), e-mail (ausente, vacío, sin dominio, > 254) y consentimiento (`true`, `false`, ausente); varios campos inválidos se informan todos en orden; verificar en verde
- [x] 2.3 RED/GREEN/TRIANGULATE `validarPedidoReserva(unknown)` (`src/adapters/http/pedido-reserva.ts`): pedido no objeto o `null`, campos obligatorios, `inicio` ISO con zona (válido, sin zona, texto libre, fecha imposible), `profesionalId` opcional, claves desconocidas de primer nivel (`duracionMinutos`, `sillonId`, `forzar`, `rol`) y del paciente (`paciente.id`) con su ruta, orden de `campos` de D2; verificar `tests/adapters/pedido-reserva.test.ts` en verde
- [x] 2.4 RED/GREEN `ErrorReservaPublica` (`src/application/errores-reserva-publica.ts`): `codigo`, `campos?`, `nuevaOferta?`, `name`, `instanceof Error`, mensaje genérico fijo por código, sin `cause`; `expectTypeOf` de que el input tipado `ReservarOnlineInput` no tiene `actor`, `duracionMinutos`, `sillonId` ni `forzar`; verificar `tests/application/errores-reserva-publica.test.ts` en verde y `npm run typecheck`

## 3. Tokens de gestión

- [x] 3.1 RED/GREEN/TRIANGULATE adaptadores `GeneradorTokenCrypto` (43 caracteres base64url, dos llamadas distintas) y `HasherSha256` (vector conocido: SHA-256 hex de `"abc"`; misma entrada mismo hash) en `src/adapters/crypto/`; verificar `tests/adapters/crypto.test.ts` en verde
- [x] 3.2 RED/GREEN/TRIANGULATE entidad `TokenGestion` y `TokenGestionRepositorioEnMemoria` (`guardar` rechaza hash repetido, `obtenerPorHash`, `obtenerPorTurno` solo vigente, `invalidar`); verificar `tests/adapters/token-gestion-repositorio.test.ts` en verde
- [x] 3.3 RED/GREEN/TRIANGULATE `ServicioTokens.emitir` (`src/application/servicio-tokens.ts`): guarda solo `{turnoId, hash, creadoEn}`, devuelve el token en claro, turno inexistente rechazado, segundo `emitir` con token vigente → `TokenYaEmitidoError`; verificar `tests/application/servicio-tokens.test.ts` en verde
- [x] 3.4 RED/GREEN/TRIANGULATE `resolver`: token propio → `turnoId`; inventado, vacío o con un carácter cambiado → `undefined`; `ahora` 09:44 resuelve y 09:45 no (`fin` exclusivo); turno `cancelado` no resuelve; verificar en verde
- [x] 3.5 RED/GREEN/TRIANGULATE `rotar`: T2 resuelve, T1 no, T1 ≠ T2; rotar sin token previo emite uno; REFACTOR del servicio con tests en verde
- [x] 3.6 CHECKPOINT (governance ALTO): revisar puertos, `RelojSistema` (único `new Date()` sin argumentos), validador de frontera, `ErrorReservaPublica` y `ServicioTokens` con sus tests; confirmar que ningún registro guarda el token en claro; aprobar antes de seguir

## 4. Fixtures del caso de uso

- [ ] 4.1 Extender `tests/fixtures/sistema.ts` con `crearSistemaReserva({ ahora, ...overrides })` (repos en memoria, `RelojFijo`, `ConsultarDisponibilidad`, `AgendarTurno`, `ServicioTokens` con adaptadores crypto reales, `ReservarOnline`), `pedidoBase(overrides)` (pedido base del spec como `unknown`) y `reservar(sistema, cuerpo)` vía `reservarDesdePedido`; `TurnoRepositorioDePrueba` con `cambiarEstado` y gancho `antesDeAgregar` (design D12); verificar que `crearSistema` y las suites de C-01/C-07 siguen en verde

## 5. Caso de uso `ReservarOnline`

- [ ] 5.1 RED/GREEN escenarios de "Reserva online exitosa" y "Respuesta pública de la reserva" en `tests/application/reservar-online.test.ts` (`src/application/reservar-online.ts` + `reservar-online-input.ts`: actor paciente interno, primer combo, guardado del paciente nuevo, emisión del token, respuesta de 6 claves); verificar en verde
- [ ] 5.2 RED/GREEN escenarios de "Validación estricta del pedido público", "Datos mínimos del paciente" (incluida la revalidación en el caso de uso) y "No existe opción de forzar" a nivel de `reservarDesdePedido`; verificar en verde
- [ ] 5.3 RED/GREEN escenarios de "Sin reservas en el pasado" y "Prestación y profesional públicos válidos" (pasos 2-4 de design D5); verificar en verde
- [ ] 5.4 RED/GREEN escenarios de "Mismas reglas de agenda que la recepción", "Nueva oferta ante horario no disponible" (design D8) y "Solo profesionales habilitados reciben el turno" (doble de `consultar`); verificar en verde
- [ ] 5.5 RED/GREEN escenarios de "Carrera entre la consulta y el alta" con `TurnoRepositorioDePrueba.antesDeAgregar` (reconsulta y un solo reintento, design D7; contar dos intentos de alta); verificar en verde
- [ ] 5.6 RED/GREEN escenarios de "Paciente existente por DNI" y "Sin pacientes huérfanos" (guardado posterior al alta, design D6); verificar en verde
- [ ] 5.7 RED/GREEN escenarios de "Tope de turnos online por DNI", "Reserva duplicada" (con `cambiarEstado` para el cancelado) y "Orden de los errores públicos"; verificar en verde
- [ ] 5.8 RED/GREEN escenarios de "Errores públicos sin datos de otros pacientes" (serialización del error sin ids ni conflictos) y de "Token de gestión de alta entropía", "Solo se almacena el hash del token", "Resolución del token de gestión" y "Rotación del token de gestión" a nivel de reserva; verificar en verde
- [ ] 5.9 REFACTOR de `ReservarOnline` (extraer traducción de errores internos a públicos y armado de la respuesta) con todos los tests en verde y `npm run typecheck`
- [ ] 5.10 CHECKPOINT (governance ALTO): revisar el caso de uso completo, el orden de errores, la política de paciente huérfano, la carrera y la cobertura de escenarios; aprobar antes de la verificación integral

## 6. Verificación integral

- [ ] 6.1 Verificar que cada `#### Scenario:` del spec tiene un test con el mismo nombre (`npx vitest list` comparado con el spec) y que `npm test`, `npm run typecheck` y `npm run coverage` pasan, incluidas las suites de C-01 y C-07 sin cambios
- [ ] 6.2 Verificar reglas duras con `grep`: sin `any`; `new Date()` sin argumentos solo en `src/adapters/reloj/reloj-sistema.ts`; sin `Date.now()` ni imports de infraestructura (`node:crypto`, Fastify) en `src/domain`; sin campo de forzado; sin datos reales en fixtures
- [ ] 6.3 Verificar privacidad: `grep` de que ningún adaptador ni test guarda o registra el token en claro (salvo la respuesta), y de que `ErrorReservaPublica` no recibe `turnoEnConflicto`, `bloqueoEnConflicto` ni `cause`
- [ ] 6.4 CHECKPOINT (governance ALTO): revisar el resultado de 6.1-6.3 antes de `openspec-verify`

## Workflow follow-up

- `openspec-verify`, luego `/opsx:archive reservar-turno-online` y marcar `[x]` C-10 en `CHANGES.md`.
- Avisar a C-02 (reutilizar `Reloj`), C-05 (extender `PacienteRepositorio`), C-11 (`resolver`) y C-12 (`rotar`) que las piezas están disponibles.
- Pendiente para la integración HTTP (C-14): endpoints, rate limit, logs redactados, unicidad de DNI y atomicidad de RN-23 con persistencia real.
