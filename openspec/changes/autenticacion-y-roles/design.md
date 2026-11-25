# Design

## Context

Ver `proposal.md` (Why) y los specs de `specs/` (requisitos). Las decisiones de negocio están en RN-32 y RN-33 (`knowledge-base/05_reglas_de_negocio.md`), DD-33 a DD-37 (`09_decisiones_y_supuestos.md`) y la matriz de `03_actores_y_roles.md`. Estado actual relevante (con C-06 y C-08 mergeados):

- `src/domain/actor.ts`: `Actor { rol: Rol; profesionalId?: string }`. Nada impide armar un odontólogo sin `profesionalId` ni un administrador con uno.
- `src/application/control-acceso.ts`: tres funciones sueltas que lanzan `AccesoDenegadoError(rol, operacion)` (`src/domain/errores.ts`, DD-28): `exigirAdministrador` (C-05), `exigirPermisoBloqueo` y `exigirPermisoLiberarBloqueo` (C-06). La agenda de C-08 controla al odontólogo en su propio caso de uso. `operacion` es texto libre.
- Casos de uso con `actor` pero sin control de rol: `AgendarTurno`, `CancelarTurno`, `ReprogramarTurno`, `ConfirmarTurno`, `MarcarAtendido`, `MarcarAusente`, `ConsultarDisponibilidad`. Sin `actor`: `ListarRecordatoriosPendientesWaMe`, `ListarRecordatoriosFallidos`, `MarcarRecordatorioEnviado` y `EnviarRecordatoriosPendientes`.
- Los flujos públicos arman un actor fijo `{ rol: 'paciente' }` (`reservar-online.ts`, `cancelar-turno-desde-token.ts`, `reprogramar-turno-desde-token.ts`, `confirmar-desde-enlace.ts`, `horarios-del-dia.ts`). La pertenencia del turno ya la garantiza el token (DD-15), pero el caso de uso interno no lo sabe.
- HTTP (C-14, DD-29): `crearApp(casos, opciones)` recibe casos de uso ya construidos, tiene un único manejador de errores (`errores-http.ts`, códigos públicos con estado fijo) y `opciones.rutas` para que C-15 registre rutas internas. Los logs solo registran método, ruta redactada y estado (`logs.ts`): nunca cabeceras ni cuerpos.
- `ConfiguracionInvalidaError(campo, motivo)` del dominio (DD-27) ya informa datos inválidos con `CampoConfiguracion`; `RecursoNoEncontradoError` cubre referencias inexistentes. `Reloj` es el único origen de la hora (regla dura 3).
- `src/main.ts` lee la configuración con `leerConfiguracionServidor(process.env)` y compone el sistema con `componerSistema`.

## Goals / Non-Goals

**Goals:**
- Una sola fuente de verdad de permisos, pura y testeable como tabla rol × acción, usada por todos los casos de uso.
- Que el compilador impida construir un actor incoherente (odontólogo sin profesional, recepción con profesional).
- Autenticación sin estado compartido entre pedidos salvo el repositorio de usuarios, coherente con los repositorios en memoria del MVP.
- Cero cambios de comportamiento para administrador, recepción y paciente en lo que ya podían hacer; los cambios de comportamiento son solo los de los specs.

**Non-Goals:**
- Revocar tokens antes de su vencimiento, refresh tokens o cookies de sesión.
- Límite de intentos de login.
- Persistir usuarios fuera de memoria (llega con PostgreSQL, etapa posterior).

## Decisions

### D1. Capas y archivos

```
src/domain/actor.ts                    Actor discriminado por rol (D2)
src/domain/permisos/acciones.ts        NUEVO: type Accion (lista cerrada)
src/domain/permisos/matriz.ts          NUEVO: MATRIZ rol x accion -> 'si' | 'propio' | 'no'
src/domain/permisos/autorizar.ts       NUEVO: autorizar(actor, accion), autorizarSobre(actor, accion, recurso)
src/domain/usuario.ts                  NUEVO: Usuario, RolInterno
src/domain/reglas/usuario.ts           NUEVO: normalizarEmail, validarDatosUsuario, validarClave (RN-32), puras
src/domain/errores.ts                  CampoConfiguracion + 'email' | 'clave' | 'rol' | 'profesionalId' | 'usuarioId'
src/application/control-acceso.ts      sus tres funciones delegan en autorizar/autorizarSobre (compatibilidad)
src/application/puertos/usuarios.ts    NUEVO: UsuarioRepositorio, HasherClaves, EmisorSesion
src/application/gestionar-usuarios.ts  NUEVO: crear, desactivar, reactivar, restablecerClave
src/application/crear-administrador-inicial.ts  NUEVO
src/application/iniciar-sesion.ts      NUEVO
src/application/resolver-sesion.ts     NUEVO
src/application/errores-autenticacion.ts  NUEVO: CredencialesInvalidasError, SesionInvalidaError
src/adapters/crypto/hasher-claves-scrypt.ts     NUEVO (D6)
src/adapters/crypto/emisor-sesion-jose.ts       NUEVO (D7)
src/adapters/persistence/en-memoria/usuario-repositorio.ts  NUEVO
src/adapters/http/autenticacion.ts     NUEVO: rutas /auth y crearExigirSesion (D9)
src/adapters/http/errores-http.ts      + ACCESO_DENEGADO 403, SESION_INVALIDA 401, CREDENCIALES_INVALIDAS 401
src/adapters/config/configuracion-servidor.ts  + JWT_SECRET, ADMIN_EMAIL_INICIAL, ADMIN_CLAVE_INICIAL
src/composicion.ts, src/main.ts        cableado (D10)
```

Los casos de uso existentes solo suman la llamada a la política (D4) y, en recordatorios, el `actor` en la entrada (D5).

### D2. Actor discriminado por rol

```ts
type Actor =
  | { rol: 'administrador'; usuarioId: string }
  | { rol: 'recepcion'; usuarioId: string }
  | { rol: 'odontologo'; usuarioId: string; profesionalId: string }
  | { rol: 'paciente'; turnoId?: string };
```

El `Actor` interno solo lo construye `ResolverSesion` a partir del usuario guardado; el del paciente, los flujos públicos (sin `turnoId` en la reserva y la disponibilidad, con el `turnoId` resuelto del token en confirmar, cancelar y reprogramar). `Rol` y `canceladoPor` no cambian.

- **Alternativa**: mantener `profesionalId?` opcional (estado de C-06). Se descarta porque el error se detecta recién en ejecución y C-08 ya tuvo que chequear el caso "odontólogo sin profesional".
- **Impacto**: los tests que arman actores literales (`{ rol: 'recepcion' }`) pasan a usar helpers del fixture (`actores.recepcion`, `actores.odontologo('p1')`, `actores.paciente('t-base')`). El cambio es de tipos, no de comportamiento.

### D3. Matriz y política pura

`Accion` es una unión cerrada: `turno.agendar`, `turno.cancelar`, `turno.reprogramar`, `turno.confirmar`, `turno.cerrar`, `disponibilidad.consultar`, `agenda.ver`, `bloqueo.crear`, `bloqueo.liberar`, `configuracion.modificar`, `recordatorio.listar`, `recordatorio.marcarEnviado`, `usuario.gestionar`.

| Acción | administrador | recepcion | odontologo | paciente |
|---|---|---|---|---|
| turno.agendar | si | si | no | si (solo reserva online, sin `turnoId`) |
| turno.cancelar / reprogramar / confirmar | si | si | no | propio (`turnoId`) |
| turno.cerrar | si | si | propio (`profesionalId`) | no |
| disponibilidad.consultar | si | si | si | si |
| agenda.ver | si | si | propio | no |
| bloqueo.crear / liberar | si | si | propio | no |
| configuracion.modificar | si | no | no | no |
| recordatorio.listar | si | si | no | no |
| recordatorio.marcarEnviado | no | si | no | no |
| usuario.gestionar | si | no | no | no |

- `autorizar(actor, accion)`: lanza `AccesoDenegadoError(rol, accion)` si la celda es `no`. Para `propio` deja pasar; el alcance se verifica después.
- `autorizarSobre(actor, accion, { profesionalId?, turnoId? })`: si la celda es `propio`, compara `actor.profesionalId` (odontólogo) o `actor.turnoId` (paciente) con el recurso; si no coincide, o el paciente no trae `turnoId`, lanza `AccesoDenegadoError`.
- `AccesoDenegadoError.operacion` pasa a tiparse como `Accion | string`: las funciones de C-05/C-06 siguen compilando y sus mensajes actuales no cambian (sus tests siguen en verde). El mensaje nunca incluye datos del recurso.
- **Alternativa**: decorar los casos de uso o chequear solo en HTTP. Se descarta: la KB exige el control en los casos de uso (`08`, §Autorización) y los flujos por token no pasan por las rutas internas.

### D4. Dónde se llama la política (orden de evaluación)

```
AgendarTurno, ConsultarDisponibilidad, agenda, recordatorios, usuarios:
  autorizar(actor, accion)  ->  (validaciones y reglas de siempre)

Cancelar, Reprogramar, Confirmar, MarcarAtendido, MarcarAusente:
  autorizar(actor, accion)          // antes de leer: odontólogo cancela t-inexistente -> acceso denegado
  turno = obtener(turnoId)          // no encontrado (sin RN)
  autorizarSobre(actor, accion, { profesionalId: turno.profesionalId, turnoId: turno.id })
  RN-10 -> RN-08 / RN-24 -> reglas del horario    // orden actual intacto
```

En `ReprogramarTurno` y `CancelarTurno` la verificación de alcance va dentro de la sección crítica, después de releer el turno, igual que hoy RN-10, para no abrir una carrera entre lectura y escritura. `exigirPermisoBloqueo`/`exigirPermisoLiberarBloqueo` pasan a ser `autorizar` + `autorizarSobre` con `bloqueo.*` y la agenda de C-08 usa `autorizar(actor, 'agenda.ver')` más su filtro actual por `profesionalId`, sin cambiar sus rechazos.

### D5. Recordatorios con actor

`ListarRecordatoriosPendientesWaMe.ejecutar({ actor })`, `ListarRecordatoriosFallidos.ejecutar({ actor })` y `MarcarRecordatorioEnviado.ejecutar({ actor, recordatorioId })` llaman a `autorizar` antes de leer. Cambia la firma (BREAKING interno): hoy ninguna ruta HTTP los usa, así que solo cambian sus tests y fixtures (C-12, C-13). `EnviarRecordatoriosPendientes` lo dispara el sistema y no recibe actor.

### D6. Hash de claves con scrypt

Puerto `HasherClaves { hashear(clave): Promise<string>; verificar(clave, hash): Promise<boolean> }`. Adaptador `HasherClavesScrypt` sobre `node:crypto.scrypt`:

- Formato autodescriptivo `scrypt$N$r$p$<sal base64url>$<hash base64url>`, sal de 16 bytes aleatorios, clave derivada de 64 bytes. Guardar los parámetros permite subir el costo sin invalidar las claves existentes.
- Costo por defecto N = 2^15, r = 8, p = 1, `maxmem` 64 MiB (≈ 100 ms por verificación en una notebook). El constructor acepta un costo menor para los tests (N = 2^10), así la suite no se vuelve lenta.
- `verificar` compara con `timingSafeEqual` y devuelve `false` ante un hash mal formado (nunca lanza con la clave en el mensaje).
- **Alternativa**: argon2 (más resistente a GPU) pero es un paquete nativo que se compila y puede romper `npm ci` en las Mac y Windows del equipo; bcrypt corta las claves en 72 bytes. scrypt viene con Node y cumple RN-D-03.

### D7. Sesión con JWT firmado (`jose`)

Puerto `EmisorSesion { emitir(usuarioId, ahora): Promise<{ token; venceEn }>; verificar(token, ahora): Promise<string | null> }`. Adaptador `EmisorSesionJose`:

- HS256 con `JWT_SECRET` (32 caracteres o más, validado al arrancar). Claims: `sub` = `usuarioId`, `iat`, `exp` = `ahora + 8 h` (RN-33), `iss` y `aud` = `turnos-odontologia`. El token no lleva rol, e-mail ni profesional.
- `verificar` usa `jwtVerify` con `algorithms: ['HS256']`, `issuer`, `audience` y `currentDate: ahora` del `Reloj` (regla dura 3: la hora nunca sale del sistema). Cualquier excepción de `jose` (firma, formato, vencido, `alg` distinto) se traduce a `null`. `jose` considera vencido cuando `exp <= ahora`, que es lo que pide RN-33.
- `jose` va en `dependencies` con la versión fijada por `package-lock` (6.2.x): es ESM, sin dependencias transitivas y mantenido. **Alternativas**: `jsonwebtoken` (CommonJS, varias dependencias) y un JWT hecho a mano (riesgo de errores de verificación); token opaco guardado como hash (descartado por el equipo para respetar la KB).

### D8. Casos de uso de autenticación y usuarios

- **IniciarSesion(email, clave)**: normaliza el e-mail, busca el usuario y **siempre** verifica un hash (el del usuario o uno fijo de relleno generado al construir el caso de uso) para que el tiempo de respuesta no revele si el e-mail existe. Si no existe, la clave no coincide o está inactivo, lanza `CredencialesInvalidasError` con un mensaje fijo. Si es válido, emite la sesión y devuelve `{ token, usuario: { id, email, rol, profesionalId?, venceEn } }`.
- **ResolverSesion(token)**: `verificar` → `usuarioId` → `obtenerPorId` → activo → arma el `Actor` (D2) con el rol y profesional guardados. Cualquier falla: `SesionInvalidaError`.
- **GestionarUsuarios** (`crear`, `desactivar`, `reactivar`, `restablecerClave`): orden `autorizar(actor, 'usuario.gestionar')` → datos (`rol`, `profesionalId`, `email`, `clave`, en ese orden) → referencias (profesional existente) → e-mail único → hash → guardar. `desactivar` rechaza al último administrador activo con `ConfiguracionInvalidaError('usuarioId', …)`. El `motivo` de un error de `clave` nunca incluye la clave.
- **CrearAdministradorInicial**: si el repositorio está vacío y hay configuración, crea el administrador con las mismas validaciones; si hay usuarios, no hace nada. Corre una vez en `main.ts` antes de `listen`.
- `UsuarioRepositorio`: `obtenerPorId`, `obtenerPorEmail`, `listarPorConsultorio`, `guardar` (alta o reemplazo, como `PacienteRepositorioEnMemoria`). `Usuario.hashClave` nunca sale de la capa de aplicación: las respuestas usan un `UsuarioPublico` sin el hash.

### D9. HTTP

- `crearApp` suma `opciones.autenticacion?: { iniciarSesion; resolverSesion }`. Si está presente registra `POST /auth/login` y `GET /auth/sesion` y exporta `crearExigirSesion(resolverSesion)`: un `preHandler` que lee `Authorization: Bearer`, resuelve la sesión y deja el actor en `request.actor` (ampliación de tipos de `FastifyRequest`). C-15 lo aplica a sus rutas con `opciones.rutas`.
- El cuerpo del login se valida en la frontera (`validadores.ts`): objeto con `email` y `clave` de tipo texto, si no `DATOS_INVALIDOS` con los campos.
- `errores-http.ts` mapea `AccesoDenegadoError` → 403 `ACCESO_DENEGADO` ("No tenés permiso para hacer esto."), `SesionInvalidaError` → 401 `SESION_INVALIDA` ("Tu sesión no es válida o venció. Iniciá sesión de nuevo.") y `CredencialesInvalidasError` → 401 `CREDENCIALES_INVALIDAS` ("E-mail o clave incorrectos."). Ninguno expone rol, acción ni el recurso en la respuesta pública.
- Las respuestas de `/auth/*` llevan `cache-control: no-store` (el hook `onSend` actual lo pone en todo JSON). Los logs ya excluyen cabeceras y cuerpos, así que ni la clave ni el `Authorization` llegan al log; se agrega un test que lo verifica.

### D10. Configuración y composición

- `leerConfiguracionServidor` suma `jwtSecret` (obligatoria, ≥ 32 caracteres; el error nombra `JWT_SECRET` sin mostrar su valor) y `adminInicial?: { email, clave }` (ambas o ninguna).
- `componerSistema` crea `UsuarioRepositorioEnMemoria`, `HasherClavesScrypt`, `EmisorSesionJose` y los casos de uso nuevos, y expone `autenticacion` para `crearApp`. Los tests usan el fixture con usuarios ficticios ya hasheados con costo bajo y un `JWT_SECRET` ficticio de 32 caracteres.
- `.env.example` suma las tres variables con valores ficticios (`JWT_SECRET=cambiar-en-local-por-32-caracteres-o-mas`, `ADMIN_EMAIL_INICIAL=admin@demo.test`, `ADMIN_CLAVE_INICIAL=cambiar-en-local`).

## Risks / Trade-offs

- [Un token robado sirve hasta 8 h] → El token no tiene datos personales, la sesión se resuelve contra el usuario en cada pedido (desactivarlo la corta) y el vencimiento es corto. La revocación por lista queda fuera del MVP.
- [Fuerza bruta sobre el login sin límite de intentos] → scrypt hace cada intento costoso y la política exige 10 caracteres; el límite de intentos queda como pregunta abierta para la etapa con despliegue público.
- [Enumeración de e-mails por tiempo de respuesta] → hash de relleno en `IniciarSesion` (D8) y mensaje único.
- [Cambio de firma en casos de uso de C-12/C-13 y de tipos del `Actor` en tests de todo el equipo] → Se hace en el mismo change con los fixtures compartidos; se avisa a Franco y Luka antes del apply. Los títulos de los tests cambian solo donde el spec renombra el escenario (regla dura 8).
- [Usuarios en memoria se pierden al reiniciar] → Aceptado en el MVP; el administrador inicial se recrea desde el entorno en cada arranque vacío.
- [`JWT_SECRET` débil o filtrado] → Validación de longitud al arrancar, nunca en el repositorio (regla dura 9), solo un valor ficticio en `.env.example`.
- [Costo de scrypt en los tests] → Costo reducido inyectado en los fixtures; el costo real se prueba una vez en el test del adaptador.

## Migration Plan

1. Agregar `jose` con `npm install jose` (queda fijada en `package-lock`).
2. Definir `JWT_SECRET` (y, para el primer arranque, `ADMIN_EMAIL_INICIAL` y `ADMIN_CLAVE_INICIAL`) en el `.env` local de cada integrante.
3. Sin migración de datos: todo está en memoria. Rollback: revertir el commit del change y quitar las variables.
4. Verificación: `npm ci`, `npm run typecheck`, `npm test`, `openspec validate autenticacion-y-roles --strict`.

## Open Questions

- Límite de intentos de login y bloqueo temporal: se decide al definir el despliegue público (no cambia los specs del MVP).
- Dónde guarda el token la UI de recepción (memoria o `sessionStorage`): lo define C-15 con su mockup.
