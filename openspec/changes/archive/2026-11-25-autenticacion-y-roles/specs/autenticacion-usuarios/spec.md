# Spec Delta

## Purpose

Permite que el personal del consultorio (administrador, recepción y odontólogos) tenga usuarios propios con clave protegida, inicie sesión y opere con una sesión que vence, para que cada acción interna se haga con una identidad verificada (US-013, RN-D-02, RN-D-03).

> Contexto común de los escenarios (seed ficticio de `knowledge-base/04_modelo_de_datos.md`): consultorio `c1`; profesionales `p1` (Ana Ejemplo) y `p2` (Bruno Muestra), activos. Usuarios activos: `u-admin` administrador `admin@demo.test`, `u-rec` recepción `recepcion@demo.test` y `u-odo1` odontólogo `odontologo1@demo.test` vinculado a `p1`; la clave de los tres es `clave-ficticia-01`. Todas las horas son locales (`-03:00`); lunes = 2026-11-23. Salvo que se indique otra cosa: `ahora` es el lunes 2026-11-23 a las 10:00 y el actor de la gestión de usuarios es `u-admin`. Un dato inválido se rechaza con un error de configuración inválida que indica el campo, sin código RN; un rol no autorizado se rechaza con un error de acceso denegado que indica el rol, sin código RN.

## ADDED Requirements

### Requirement: Usuarios internos con rol interno
Un usuario SHALL tener rol `administrador`, `recepcion` u `odontologo`. El rol `paciente` MUST rechazarse con un error de configuración inválida en el campo `rol`: el paciente no tiene usuario y opera con el token de su turno (DD-15).

#### Scenario: El administrador crea un usuario de recepción
- **WHEN** el administrador crea el usuario `recepcion2@demo.test` con rol `recepcion` y clave `clave-ficticia-02`
- **THEN** el usuario queda registrado, activo y con rol `recepcion`

#### Scenario: No se crean usuarios con rol paciente
- **WHEN** el administrador crea el usuario `paciente@demo.test` con rol `paciente` y clave `clave-ficticia-02`
- **THEN** se rechaza con configuración inválida en el campo `rol`
- **AND** no se registra ningún usuario

### Requirement: Profesional vinculado solo al odontólogo
Un usuario odontólogo MUST estar vinculado a un profesional existente del consultorio; los demás roles MUST NOT tener profesional. Si falta, sobra o no existe, el alta MUST rechazarse sin registrar nada: con configuración inválida en `profesionalId` si falta o sobra, y con un error de no encontrado si el profesional no existe.

#### Scenario: Odontólogo vinculado a su profesional
- **WHEN** el administrador crea el usuario `odontologo2@demo.test` con rol `odontologo`, profesional `p2` y clave `clave-ficticia-02`
- **THEN** el usuario queda registrado vinculado a `p2`

#### Scenario: Odontólogo sin profesional rechazado
- **WHEN** el administrador crea el usuario `odontologo2@demo.test` con rol `odontologo`, sin profesional, y clave `clave-ficticia-02`
- **THEN** se rechaza con configuración inválida en el campo `profesionalId`

#### Scenario: Recepción con profesional rechazada
- **WHEN** el administrador crea el usuario `recepcion2@demo.test` con rol `recepcion`, profesional `p1` y clave `clave-ficticia-02`
- **THEN** se rechaza con configuración inválida en el campo `profesionalId`

#### Scenario: Profesional inexistente
- **WHEN** el administrador crea el usuario `odontologo2@demo.test` con rol `odontologo`, profesional `p-inexistente` y clave `clave-ficticia-02`
- **THEN** se rechaza con un error de no encontrado que identifica a `p-inexistente`

### Requirement: E-mail único y normalizado
El e-mail del usuario SHALL guardarse sin espacios en los extremos y en minúsculas, MUST tener la forma `algo@dominio` con un punto en el dominio y MUST ser único entre todos los usuarios, activos o no. Un e-mail inválido o repetido MUST rechazarse con configuración inválida en el campo `email`.

#### Scenario: E-mail normalizado al guardarse
- **WHEN** el administrador crea el usuario `  Recepcion2@Demo.TEST ` con rol `recepcion` y clave `clave-ficticia-02`
- **THEN** el usuario queda registrado con el e-mail `recepcion2@demo.test`

#### Scenario: E-mail repetido con otras mayúsculas
- **WHEN** el administrador crea el usuario `RECEPCION@demo.test` con rol `recepcion` y clave `clave-ficticia-02`
- **THEN** se rechaza con configuración inválida en el campo `email`

#### Scenario: E-mail sin dominio rechazado
- **WHEN** el administrador crea el usuario `recepcion2` con rol `recepcion` y clave `clave-ficticia-02`
- **THEN** se rechaza con configuración inválida en el campo `email`

### Requirement: Política de clave
La clave de un usuario MUST tener entre 10 y 128 caracteres, ambos inclusive (RN-32). Se valida al crear el usuario y al restablecer la clave; una clave fuera de rango MUST rechazarse con configuración inválida en el campo `clave`, sin registrar ni cambiar nada.

#### Scenario: Clave de 10 caracteres aceptada
- **WHEN** el administrador crea el usuario `recepcion2@demo.test` con rol `recepcion` y la clave `abcdefghij`
- **THEN** el usuario queda registrado

#### Scenario: Clave de 9 caracteres rechazada
- **WHEN** el administrador crea el usuario `recepcion2@demo.test` con rol `recepcion` y la clave `abcdefghi`
- **THEN** se rechaza con configuración inválida en el campo `clave`

#### Scenario: Clave de 129 caracteres rechazada
- **WHEN** el administrador crea el usuario `recepcion2@demo.test` con rol `recepcion` y una clave de 129 caracteres
- **THEN** se rechaza con configuración inválida en el campo `clave`

### Requirement: La clave nunca se guarda ni se expone en claro
El sistema MUST guardar solo un hash adaptativo con sal de la clave (RN-D-03). La clave MUST NOT aparecer en lo guardado, en las respuestas, en los mensajes de error ni en los logs, y dos usuarios con la misma clave MUST tener hashes distintos.

#### Scenario: Lo guardado no contiene la clave
- **WHEN** el administrador crea el usuario `recepcion2@demo.test` con rol `recepcion` y clave `clave-ficticia-02`
- **THEN** el usuario guardado no contiene el texto `clave-ficticia-02`

#### Scenario: Misma clave, hashes distintos
- **WHEN** el administrador crea `recepcion2@demo.test` y `recepcion3@demo.test`, ambos con clave `clave-ficticia-02`
- **THEN** los hashes guardados de los dos usuarios son distintos

#### Scenario: El rechazo no repite la clave
- **WHEN** el administrador crea el usuario `recepcion2@demo.test` con rol `recepcion` y la clave `abcdefghi`
- **THEN** el mensaje del error no contiene `abcdefghi`

### Requirement: Solo el administrador gestiona usuarios
Crear, desactivar, reactivar usuarios y restablecer su clave SHALL estar permitido solo al administrador. Cualquier otro rol MUST rechazarse con acceso denegado que indica el rol, antes de validar los datos y sin modificar nada.

#### Scenario: Recepción no puede crear usuarios
- **WHEN** `u-rec` crea el usuario `recepcion2@demo.test` con rol `recepcion` y clave `clave-ficticia-02`
- **THEN** se rechaza con acceso denegado para el rol `recepcion`
- **AND** no se registra ningún usuario

#### Scenario: Odontólogo no puede restablecer claves
- **WHEN** `u-odo1` restablece la clave de `u-rec` a `clave-ficticia-09`
- **THEN** se rechaza con acceso denegado para el rol `odontologo`

#### Scenario: El acceso se evalúa antes que los datos
- **WHEN** `u-rec` crea el usuario `recepcion2` con rol `paciente` y la clave `abc`
- **THEN** se rechaza con acceso denegado para el rol `recepcion`, no con configuración inválida

### Requirement: Desactivación y reactivación de usuarios
El administrador SHALL poder desactivar y reactivar usuarios; desactivar no borra el usuario. El sistema MUST rechazar la desactivación del último administrador activo, con configuración inválida en el campo `usuarioId`, para no dejar el consultorio sin quien gestione usuarios.

#### Scenario: Desactivar un usuario de recepción
- **WHEN** el administrador desactiva a `u-rec`
- **THEN** `u-rec` queda inactivo y sigue registrado

#### Scenario: Reactivar un usuario
- **GIVEN** `u-rec` inactivo
- **WHEN** el administrador reactiva a `u-rec`
- **THEN** `u-rec` queda activo

#### Scenario: No se desactiva al último administrador activo
- **WHEN** `u-admin`, único administrador activo, se desactiva a sí mismo
- **THEN** se rechaza con configuración inválida en el campo `usuarioId`
- **AND** `u-admin` sigue activo

### Requirement: Restablecimiento de clave por el administrador
El administrador SHALL poder asignar una clave nueva a cualquier usuario, sujeta a la política de clave. Desde ese momento la clave anterior MUST dejar de servir para iniciar sesión.

#### Scenario: La clave anterior deja de servir
- **GIVEN** el administrador restableció la clave de `u-rec` a `clave-ficticia-09`
- **WHEN** `recepcion@demo.test` inicia sesión con `clave-ficticia-01`
- **THEN** se rechaza con credenciales inválidas

#### Scenario: La clave nueva sirve
- **GIVEN** el administrador restableció la clave de `u-rec` a `clave-ficticia-09`
- **WHEN** `recepcion@demo.test` inicia sesión con `clave-ficticia-09`
- **THEN** obtiene una sesión de rol `recepcion`

### Requirement: Administrador inicial
Al arrancar, si no existe ningún usuario y están definidas `ADMIN_EMAIL_INICIAL` y `ADMIN_CLAVE_INICIAL`, el sistema SHALL crear un administrador activo con esos datos y la política de clave. Si ya hay usuarios MUST NOT crear nada; si solo una variable está definida MUST fallar nombrando la variable faltante, sin mostrar valores.

#### Scenario: Primer arranque crea el administrador
- **GIVEN** no hay usuarios y las variables valen `admin-inicial@demo.test` y `clave-ficticia-inicial`
- **WHEN** el sistema arranca
- **THEN** existe un administrador activo `admin-inicial@demo.test` que puede iniciar sesión con esa clave

#### Scenario: Con usuarios existentes no crea nada
- **GIVEN** existen los usuarios del contexto y las variables valen `admin-inicial@demo.test` y `clave-ficticia-inicial`
- **WHEN** el sistema arranca
- **THEN** no existe el usuario `admin-inicial@demo.test`

#### Scenario: Falta la clave inicial
- **GIVEN** no hay usuarios, `ADMIN_EMAIL_INICIAL` vale `admin-inicial@demo.test` y `ADMIN_CLAVE_INICIAL` no está definida
- **WHEN** el sistema arranca
- **THEN** falla con un error de configuración que nombra `ADMIN_CLAVE_INICIAL`

### Requirement: Inicio de sesión
Con un e-mail (comparado sin espacios en los extremos ni mayúsculas) y la clave correcta de un usuario activo, el sistema SHALL devolver un token de sesión y los datos públicos del usuario: id, e-mail, rol, profesional si es odontólogo y vencimiento. La respuesta MUST NOT incluir el hash de la clave.

#### Scenario: Recepción inicia sesión
- **WHEN** `recepcion@demo.test` inicia sesión con `clave-ficticia-01`
- **THEN** obtiene un token de sesión y los datos de `u-rec` con rol `recepcion`, sin el hash de la clave

#### Scenario: Odontólogo inicia sesión con su profesional
- **WHEN** ` Odontologo1@Demo.test ` inicia sesión con `clave-ficticia-01`
- **THEN** obtiene una sesión de `u-odo1` con rol `odontologo` y profesional `p1`

### Requirement: Falla de inicio de sesión genérica
Un e-mail inexistente, una clave incorrecta o un usuario inactivo MUST rechazarse con el mismo error de credenciales inválidas y el mismo mensaje, sin revelar cuál fue la causa ni si el e-mail existe.

#### Scenario: Clave incorrecta
- **WHEN** `recepcion@demo.test` inicia sesión con `clave-incorrecta`
- **THEN** se rechaza con credenciales inválidas

#### Scenario: E-mail inexistente
- **WHEN** `nadie@demo.test` inicia sesión con `clave-ficticia-01`
- **THEN** se rechaza con credenciales inválidas y el mismo mensaje que con una clave incorrecta

#### Scenario: Usuario inactivo
- **GIVEN** `u-rec` inactivo
- **WHEN** `recepcion@demo.test` inicia sesión con `clave-ficticia-01`
- **THEN** se rechaza con credenciales inválidas y el mismo mensaje que con una clave incorrecta

### Requirement: Vencimiento de la sesión
Una sesión SHALL vencer 8 h después de iniciada (RN-33): es válida mientras el instante actual sea anterior al vencimiento y MUST rechazarse con sesión inválida desde el vencimiento en adelante.

#### Scenario: Sesión válida un segundo antes de vencer
- **GIVEN** `u-rec` inició sesión el lunes a las 10:00
- **WHEN** usa la sesión el lunes a las 17:59:59
- **THEN** la sesión es válida

#### Scenario: Sesión vencida a las 8 h exactas
- **GIVEN** `u-rec` inició sesión el lunes a las 10:00
- **WHEN** usa la sesión el lunes a las 18:00
- **THEN** se rechaza con sesión inválida

### Requirement: Sesión resuelta con los datos actuales del usuario
Cada uso de la sesión SHALL identificar al usuario y tomar su rol y profesional de los datos guardados en ese momento. Un token alterado, firmado con otra clave, mal formado o de un usuario hoy inactivo o inexistente MUST rechazarse con sesión inválida.

#### Scenario: Usuario desactivado durante la sesión
- **GIVEN** `u-rec` inició sesión el lunes a las 10:00 y el administrador lo desactivó a las 10:30
- **WHEN** `u-rec` usa la sesión el lunes a las 10:31
- **THEN** se rechaza con sesión inválida

#### Scenario: Token alterado
- **GIVEN** `u-rec` inició sesión y se modificó un carácter del token
- **WHEN** se usa el token modificado
- **THEN** se rechaza con sesión inválida

#### Scenario: Token firmado con otro secreto
- **WHEN** se usa un token con el formato correcto para `u-admin` pero firmado con un secreto distinto del configurado
- **THEN** se rechaza con sesión inválida

### Requirement: Ruta HTTP de inicio de sesión
`POST /auth/login` con `{ email, clave }` SHALL responder 200 con `{ token, usuario }`. Un cuerpo sin esos textos MUST responder 400 `DATOS_INVALIDOS`; credenciales inválidas, 401 `CREDENCIALES_INVALIDAS` con mensaje fijo. Ninguna respuesta se guarda en caché.

#### Scenario: Login HTTP exitoso
- **WHEN** se envía `POST /auth/login` con `recepcion@demo.test` y `clave-ficticia-01`
- **THEN** responde 200 con un `token` y el `usuario` `u-rec` de rol `recepcion`
- **AND** la respuesta tiene `cache-control: no-store`

#### Scenario: Login HTTP con credenciales inválidas
- **WHEN** se envía `POST /auth/login` con `recepcion@demo.test` y `clave-incorrecta`
- **THEN** responde 401 con el código `CREDENCIALES_INVALIDAS`

#### Scenario: Login HTTP sin clave
- **WHEN** se envía `POST /auth/login` con solo `{ "email": "recepcion@demo.test" }`
- **THEN** responde 400 con el código `DATOS_INVALIDOS`

### Requirement: Protección HTTP de las rutas internas
Las rutas internas SHALL exigir `Authorization: Bearer <token>`. Sin cabecera o con una sesión inválida MUST responder 401 `SESION_INVALIDA`; un acceso denegado por la política de permisos MUST responder 403 `ACCESO_DENEGADO`. `GET /auth/sesion` devuelve los datos públicos del usuario de la sesión.

#### Scenario: Ruta interna sin cabecera
- **WHEN** se pide `GET /auth/sesion` sin cabecera `Authorization`
- **THEN** responde 401 con el código `SESION_INVALIDA`

#### Scenario: Datos de la sesión vigente
- **GIVEN** `u-odo1` inició sesión
- **WHEN** pide `GET /auth/sesion` con su token
- **THEN** responde 200 con `u-odo1`, rol `odontologo` y profesional `p1`

#### Scenario: Acceso denegado responde 403
- **GIVEN** una ruta interna que ejecuta una acción reservada al administrador
- **WHEN** `u-rec` la pide con su token vigente
- **THEN** responde 403 con el código `ACCESO_DENEGADO`

### Requirement: Sin secretos en los logs
Los logs MUST NOT contener la clave, su hash ni el token de sesión, tampoco en un error inesperado.

#### Scenario: El login no deja la clave ni el token en el log
- **WHEN** se envía `POST /auth/login` con `recepcion@demo.test` y `clave-ficticia-01` con el log activo
- **THEN** el log no contiene `clave-ficticia-01` ni el token devuelto
