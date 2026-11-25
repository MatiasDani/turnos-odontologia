# Tasks

> **Governance CRÍTICO**: no se empieza ninguna tarea hasta que el equipo apruebe este propose de forma explícita (comentario en el PR). Durante el apply, cada **CHECKPOINT** se detiene y espera la revisión de Lautaro Medina antes de seguir.
>
> TDD estricto, de a UNA tarea por vez: RED (test que falla, ejecutado) → GREEN (mínimo código) → TRIANGULATE (≥ 2 casos) → REFACTOR, con los tests en verde después de cada paso. Los tests de caso de uso usan como título el nombre exacto de cada `#### Scenario:` de los specs de este change, agrupados en `describe` por requisito (regla dura 8). Solo datos ficticios (`@demo.test`, `clave-ficticia-NN`; regla dura 4). Nunca una clave, hash o token real en el código ni en `.env.example` (regla dura 9).

## 1. Safety net, KB y dependencia

- [ ] 1.1 SAFETY NET: `npm ci`, `npm test` y `npm run typecheck`; registrar el baseline en verde. Si algo falla, detenerse y reportarlo como falla preexistente
- [ ] 1.2 Verificar que la KB ya tiene (se actualizó en el propose) RN-31 y RN-32 (`05`), DD-33 a DD-37 (`09`), la matriz completa (`03`), `Usuario` (`04`), las variables (`08`) y las preguntas cerradas (`10`), como exige la regla dura 6; si falta algo, completarlo antes de codear
- [ ] 1.3 `npm install jose` (6.2.x) y verificar que queda en `dependencies` y en `package-lock.json`, y que `npm test` sigue en verde

## 2. Política de permisos pura (dominio)

- [ ] 2.1 RED/GREEN/TRIANGULATE `Actor` discriminado (`src/domain/actor.ts`, design D2) con `expectTypeOf`: odontólogo sin `profesionalId` y recepción con `profesionalId` no compilan; crear helpers de actores en `tests/fixtures/actores.ts` y migrar los fixtures y tests que arman actores literales, sin cambiar sus títulos ni expectativas; verificar `npm run typecheck` y la suite completa en verde
- [ ] 2.2 RED/GREEN/TRIANGULATE `Accion`, `MATRIZ` y `autorizar` (`src/domain/permisos/`, design D3): test tabular de las 13 acciones × 4 roles contra la tabla del design; verificar `tests/domain/permisos/autorizar.test.ts` en verde
- [ ] 2.3 RED/GREEN/TRIANGULATE `autorizarSobre`: odontólogo propio y ajeno, paciente con su `turnoId`, con otro y sin `turnoId`, celdas `si` que no miran el recurso; el mensaje del error no contiene datos del recurso; verificar en verde y que `src/domain` no importa infraestructura ni usa `new Date()` / `Date.now()`
- [ ] 2.4 Hacer que `exigirAdministrador`, `exigirPermisoBloqueo`, `exigirPermisoLiberarBloqueo` y el control de `AgendaDiaria`/`AgendaSemanal` deleguen en `autorizar`/`autorizarSobre` (design D4); verificar que las suites de C-05, C-06 y C-08 siguen en verde SIN modificar sus casos
- [ ] 2.5 **CHECKPOINT 1**: mostrar la matriz implementada y el diff de `src/domain/permisos/`; esperar la revisión antes de tocar casos de uso

## 3. Control de acceso en los casos de uso de turnos

- [ ] 3.1 RED/GREEN `AgendarTurno`: escenarios de "Alta de turnos por rol" (`specs/control-acceso`) y "Ajuste de duración por recepción y administrador" y "Estado inicial según el origen" (`specs/agenda-turnos`); renombrar en `agendar-turno.test.ts` el test "Odontólogo ajusta la duración" a "Recepción ajusta la duración"; verificar en verde junto con las suites de C-01, C-07 y C-10
- [ ] 3.2 RED/GREEN `CancelarTurno` con `autorizar` antes de leer y `autorizarSobre` dentro de la sección crítica: escenarios de cancelación de "Cancelación y reprogramación por rol" y "Recepción y administrador sin restricción de anticipación" (`specs/cancelacion-turnos`); reemplazar el test "Odontólogo con menos de 24 h puede cancelar" por "Odontólogo no puede cancelar"; verificar en verde con las suites de C-02 y C-11
- [ ] 3.3 RED/GREEN `ReprogramarTurno`: escenarios de reprogramación de "Cancelación y reprogramación por rol" y "Odontólogo no puede reprogramar" (`specs/reprogramacion-turnos`); verificar en verde con las suites de C-03 y C-11
- [ ] 3.4 RED/GREEN `ConfirmarTurno`, `MarcarAtendido` y `MarcarAusente`: escenarios de "Confirmación por rol", "Cierre del turno por rol" y "Odontólogo de otro profesional no cierra el turno" (`specs/estados-turno`); verificar en verde con las suites de C-04 y C-12
- [ ] 3.5 Flujos públicos con actor paciente acotado: `cancelar-turno-desde-token`, `reprogramar-turno-desde-token` y `confirmar-desde-enlace` pasan `{ rol: 'paciente', turnoId }` del turno resuelto; `reservar-online` y `horarios-del-dia` siguen sin `turnoId`; RED/GREEN de "Paciente cancela su propio turno" y "Paciente no cancela un turno ajeno"; verificar que las suites de C-10, C-11, C-12 y C-14 (incluida la HTTP) siguen en verde
- [ ] 3.6 RED/GREEN escenarios de "El acceso se evalúa antes que las reglas de negocio" y "Error de acceso denegado"; validar con una mutación (mover `autorizarSobre` después de RN-10) que "El alcance propio prevalece sobre el estado" falla; verificar en verde
- [ ] 3.7 RED/GREEN `ConsultarDisponibilidad` con `autorizar(actor, 'disponibilidad.consultar')`: escenario "Odontólogo consulta disponibilidad"; verificar en verde con las suites de C-07 y C-14
- [ ] 3.8 RED/GREEN escenarios de "Bloqueos y agenda conservan sus permisos"; verificar en verde

## 4. Recordatorios con actor

- [ ] 4.1 Sumar `actor` a la entrada de `ListarRecordatoriosPendientesWaMe`, `ListarRecordatoriosFallidos` y `MarcarRecordatorioEnviado` (design D5) y actualizar sus fixtures (`sistema-recordatorios.ts`, `sistema-wa-me.ts`) con `actores.recepcion`; verificar `npm run typecheck` y las suites de C-12 y C-13 en verde sin cambiar sus títulos
- [ ] 4.2 RED/GREEN escenarios de "Recordatorios por rol"; verificar que `EnviarRecordatoriosPendientes` sigue sin actor y su suite en verde
- [ ] 4.3 **CHECKPOINT 2**: suite completa en verde; mostrar la lista de casos de uso protegidos contra la matriz y avisar a Franco y Luka del cambio de firma; esperar la revisión

## 5. Usuarios y claves

- [ ] 5.1 RED/GREEN/TRIANGULATE `Usuario`, `normalizarEmail`, `validarDatosUsuario` y `validarClave` (`src/domain/usuario.ts`, `src/domain/reglas/usuario.ts`) con los campos nuevos de `CampoConfiguracion`: límites 9/10/128/129 de la clave, e-mail con espacios, mayúsculas y sin dominio, rol `paciente`, `profesionalId` faltante y sobrante, primer campo inválido en el orden de D8; el `motivo` nunca contiene la clave; verificar `tests/domain/reglas/usuario.test.ts` en verde
- [ ] 5.2 RED/GREEN/TRIANGULATE `HasherClavesScrypt` (design D6) con costo bajo: verifica la clave correcta, rechaza la incorrecta, misma clave da hashes distintos, el hash no contiene la clave, hash mal formado devuelve `false`, respeta los parámetros guardados; un test con el costo por defecto; verificar `tests/adapters/hasher-claves-scrypt.test.ts` en verde
- [ ] 5.3 RED/GREEN `UsuarioRepositorioEnMemoria` (alta, reemplazo, `obtenerPorEmail`, `listarPorConsultorio`, copia del arreglo del constructor) y fixture `tests/fixtures/sistema-autenticacion.ts` con `u-admin`, `u-rec` y `u-odo1` del contexto del spec; verificar en verde
- [ ] 5.4 RED/GREEN `GestionarUsuarios.crear`: escenarios de "Usuarios internos con rol interno", "Profesional vinculado solo al odontólogo", "E-mail único y normalizado", "Política de clave" y "La clave nunca se guarda ni se expone en claro"; verificar en verde
- [ ] 5.5 RED/GREEN `desactivar`, `reactivar` y `restablecerClave`: escenarios de "Solo el administrador gestiona usuarios", "Desactivación y reactivación de usuarios" y "Restablecimiento de clave por el administrador" (este último junto con 6.2); verificar en verde
- [ ] 5.6 RED/GREEN `CrearAdministradorInicial` y la lectura de `ADMIN_EMAIL_INICIAL`/`ADMIN_CLAVE_INICIAL` en `configuracion-servidor.ts`: escenarios de "Administrador inicial"; el error nombra la variable sin su valor; verificar en verde

## 6. Sesión

- [ ] 6.1 RED/GREEN/TRIANGULATE `EmisorSesionJose` (design D7) con un `JWT_SECRET` ficticio de 32 caracteres: emite y verifica, `exp` exclusivo (17:59:59 válido, 18:00 vencido), firma de otro secreto, token alterado, `alg: none` y texto basura devuelven `null`; el payload solo trae `sub`, `iat`, `exp`, `iss`, `aud`; verificar `tests/adapters/emisor-sesion-jose.test.ts` en verde
- [ ] 6.2 RED/GREEN `IniciarSesion`: escenarios de "Inicio de sesión" y "Falla de inicio de sesión genérica"; verificar con un espía que con un e-mail inexistente igual se llama a `verificar` del hasher (hash de relleno); verificar en verde
- [ ] 6.3 RED/GREEN `ResolverSesion`: escenarios de "Vencimiento de la sesión" y "Sesión resuelta con los datos actuales del usuario", y que el `Actor` del odontólogo trae su `profesionalId` guardado; verificar en verde
- [ ] 6.4 Leer y validar `JWT_SECRET` (obligatoria, ≥ 32 caracteres) en `configuracion-servidor.ts`, con el error que nombra la variable sin su valor; agregar las tres variables con valores ficticios a `.env.example` (la tabla de `08_arquitectura_propuesta.md` ya se actualizó en el propose); verificar los tests de configuración en verde y que `.env` sigue ignorado por git
- [ ] 6.5 **CHECKPOINT 3** (revisión de seguridad): mostrar hasher, emisor, `IniciarSesion` y `ResolverSesion`; revisar juntos que ninguna clave, hash ni token llegue a logs, errores o respuestas; esperar la aprobación

## 7. HTTP y composición

- [ ] 7.1 RED/GREEN mapeo en `errores-http.ts`: `ACCESO_DENEGADO` 403, `SESION_INVALIDA` 401, `CREDENCIALES_INVALIDAS` 401 con mensajes fijos y sin rol, acción ni recurso en el cuerpo; verificar `tests/adapters/http/errores-http.test.ts` en verde
- [ ] 7.2 RED/GREEN `POST /auth/login` y validación del cuerpo (`fastify.inject`): escenarios de "Ruta HTTP de inicio de sesión"; verificar en verde
- [ ] 7.3 RED/GREEN `crearExigirSesion` y `GET /auth/sesion`: escenarios de "Protección HTTP de las rutas internas", con una ruta interna de prueba registrada por `opciones.rutas` que exige administrador; verificar en verde
- [ ] 7.4 RED/GREEN "Sin secretos en los logs" con el log activo en un stream de prueba; verificar en verde
- [ ] 7.5 Cablear en `componerSistema` y `main.ts` (design D10): el administrador inicial se crea antes de `listen` y `crearApp` recibe `autenticacion`; verificar con `npm run build` y arrancando el servidor con un `.env` local ficticio que `POST /auth/login` responde 200 con el administrador inicial y que las rutas públicas de C-14 siguen funcionando

## 8. Integración y cierre

- [ ] 8.1 Suite completa, `npm run typecheck`, `npm run build` y `openspec validate autenticacion-y-roles --strict` en verde; `grep` de `any`, `new Date()`/`Date.now()` en `src/domain` y de claves o tokens literales fuera de los tests (reglas duras 1, 3 y 9)
- [ ] 8.2 Actualizar la KB con lo que el apply haya precisado (por ejemplo, mensajes públicos finales) y marcar las preguntas de `10_preguntas_abiertas.md` como resueltas por C-09; verificar que `03` y el código coinciden fila por fila
- [ ] 8.3 **CHECKPOINT 4**: pedir la revisión de seguridad de un par (Alejo o Mara, como revisores de los changes CRÍTICOS) sobre el PR antes de archivar

## Workflow follow-up

- Archivar con `openspec-archive-change` cuando el PR esté aprobado y mergeado, y marcar C-09 como `[x]` en `CHANGES.md`.
- Avisar al equipo que se abre el GATE 3 para C-15 (`ui-agenda-recepcion`), que usará `crearExigirSesion` y `GET /auth/sesion`.
