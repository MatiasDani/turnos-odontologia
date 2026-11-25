# Proposal

## Why

Hoy cualquier rol puede ejecutar casi cualquier caso de uso: el `Actor` solo trae el rol (y, desde C-06, un `profesionalId` opcional), nadie lo autentica y el control de acceso está repartido en tres funciones sueltas (`exigirAdministrador` de C-05, `exigirPermisoBloqueo` y `exigirPermisoLiberarBloqueo` de C-06). Así un odontólogo puede cancelar o reprogramar turnos ajenos, un paciente puede cerrar un turno desde el caso de uso y no existe forma de iniciar sesión, lo que bloquea la UI de recepción (C-15) y deja sin cumplir US-013, RN-D-02 y RN-D-03. Con C-02 a C-06 terminados, C-09 cierra la brecha de seguridad (riesgo R-5) antes de abrir la UI interna.

## What Changes

- **Usuarios internos** (`Usuario`): administrador, recepción u odontólogo, con e-mail único normalizado, clave con hash scrypt (nunca en texto plano ni en logs, RN-D-03), `profesionalId` obligatorio solo para el odontólogo y baja lógica. El paciente no tiene usuario: sigue operando con el token de su turno (C-10/C-11).
- **Política de clave** (RN-31 nueva): entre 10 y 128 caracteres; se valida al crear el usuario y al restablecer la clave.
- **Gestión de usuarios solo por el administrador**: crear, desactivar, reactivar y restablecer la clave, con un administrador inicial creado al arrancar desde variables de entorno con valores ficticios en `.env.example`.
- **Inicio de sesión** con e-mail y clave que devuelve un JWT firmado (HS256, librería `jose`, `JWT_SECRET` por entorno) que vence a las 8 h (RN-32 nueva). Ante cualquier falla (e-mail inexistente, clave incorrecta, usuario inactivo) responde el mismo error genérico, sin revelar cuál fue.
- **Resolución de la sesión en cada pedido**: el token solo identifica al usuario; el `Actor` se arma con los datos actuales del usuario, así que desactivarlo o cambiarle el rol tiene efecto inmediato.
- **`Actor` con identidad (BREAKING para el código que lo construye)**: pasa a ser un tipo discriminado por rol. Administrador y recepción llevan `usuarioId`; el odontólogo, `usuarioId` y `profesionalId` obligatorios; el paciente, opcionalmente el `turnoId` de su token.
- **Política de permisos única** (`autorizar(actor, accion, recurso?)`) con la matriz de `03_actores_y_roles.md` completa, aplicada **en los casos de uso** y antes de las reglas de negocio. Reemplaza las tres funciones sueltas sin cambiar lo que ya permiten. Cierra las dos preguntas abiertas de C-09:
  - El odontólogo **no** agenda, cancela, reprograma ni confirma turnos (lo hace recepción).
  - El odontólogo **sí** marca atendido o ausente, solo los turnos de su `profesionalId`.
  - Confirmar: administrador, recepción o el paciente de ese turno por su enlace.
- **Recordatorios con control de acceso (BREAKING de contrato)**: `ListarRecordatoriosPendientesWaMe`, `ListarRecordatoriosFallidos` y `MarcarRecordatorioEnviado` pasan a recibir el `actor` (recepción y administrador listan; solo recepción marca enviado). `EnviarRecordatoriosPendientes` sigue siendo un proceso del sistema, sin actor.
- **HTTP**: `POST /auth/login`, `GET /auth/sesion` y un `preHandler` reutilizable que exige `Authorization: Bearer` y deja el `Actor` en el pedido para las rutas internas que registre C-15. Errores públicos nuevos: `CREDENCIALES_INVALIDAS` (401), `SESION_INVALIDA` (401) y `ACCESO_DENEGADO` (403), con mensajes fijos.

## Capabilities

### New Capabilities
- `autenticacion-usuarios`: usuarios internos, política de clave, hash de claves, gestión de usuarios por el administrador, administrador inicial, inicio de sesión con JWT, vencimiento y resolución de la sesión, y las rutas HTTP de autenticación.
- `control-acceso`: matriz rol × acción aplicada en los casos de uso, alcance "propio" del odontólogo y del paciente, orden del control respecto de las reglas de negocio y el error de acceso denegado.

### Modified Capabilities
- `agenda-turnos`: el odontólogo deja de poder dar turnos, así que el ajuste de duración y el estado inicial `confirmado` quedan para recepción y administrador.
- `cancelacion-turnos`: la cancelación sin restricción de anticipación queda para recepción y administrador; el odontólogo ya no cancela.
- `reprogramacion-turnos`: la reprogramación sin restricción de anticipación queda para recepción y administrador.
- `estados-turno`: el odontólogo cierra solo los turnos de su propio profesional.

## Impact

- Código nuevo: `src/domain/usuario.ts`, `src/domain/permisos/` (acciones y matriz, puro), reglas de clave; casos de uso `IniciarSesion`, `ResolverSesion`, `GestionarUsuarios` y `CrearAdministradorInicial` en `src/application/`; puertos `UsuarioRepositorio`, `HasherClaves` y `EmisorSesion`; adaptadores `HasherClavesScrypt`, `EmisorSesionJose`, `UsuarioRepositorioEnMemoria`; rutas y `preHandler` en `src/adapters/http/autenticacion.ts`.
- Código modificado: `src/domain/actor.ts`, `src/application/control-acceso.ts` (pasa a delegar en `autorizar`), los casos de uso de C-01 a C-04, C-06, C-08, C-12 y C-13 (llamada a `autorizar`), los flujos por token (actor paciente con `turnoId`), `src/adapters/http/errores-http.ts`, `src/adapters/http/app.ts`, `src/composicion.ts`, `src/adapters/config/configuracion-entorno.ts`, fixtures de tests.
- Dependencias: `jose` (runtime, JWT). scrypt viene con `node:crypto`.
- Variables de entorno: `JWT_SECRET` (obligatoria, 32 caracteres o más), `ADMIN_EMAIL_INICIAL` y `ADMIN_CLAVE_INICIAL` (opcionales), documentadas en `.env.example` con valores ficticios.
- Equipo: los casos de uso de recordatorios de C-12 y C-13 (Franco y Luka) cambian de firma; los tests de C-02, C-03 y C-01 que usaban al odontólogo como actor de cancelar, reprogramar o agendar se ajustan a la matriz.
- KB actualizada en este propose: matriz completa (`03`), `Usuario` (`04`), RN-31 y RN-32 (`05`), variables de entorno (`08`), DD-33 a DD-37 (`09`), preguntas abiertas cerradas (`10`).
- Governance **CRÍTICO**: no se implementa nada hasta la aprobación humana explícita del propose; el apply se hace con checkpoints y revisión de seguridad.

## Non-goals

- Cierre de sesión anticipado o lista de tokens revocados (con JWT la sesión vive hasta su vencimiento; desactivar al usuario la corta en el pedido siguiente).
- Límite de intentos de login, bloqueo por fuerza bruta o recuperación de clave por e-mail.
- Que el usuario cambie su propia clave (solo la restablece el administrador).
- Rutas HTTP de gestión de usuarios y pantallas de login o de administración (la UI interna es C-15).
- Cuentas de paciente: el paciente sigue sin usuario.
- Validar en `AgendarTurno` que el paciente exista o que el profesional realice la prestación (preguntas abiertas que siguen para C-15).
- Auditoría de accesos (etapa posterior).
