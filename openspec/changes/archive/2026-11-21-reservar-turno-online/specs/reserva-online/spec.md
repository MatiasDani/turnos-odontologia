# Spec Delta

## Purpose

Permite que un paciente sin cuenta reserve un turno desde la ruta pública del consultorio, con las mismas reglas de agenda que la recepción, sin exponer ni modificar datos de otros pacientes, y que reciba un token de gestión de su turno que el sistema almacena solo como hash.

> Contexto común de los escenarios (seed ficticio de `knowledge-base/04_modelo_de_datos.md`): consultorio `c1` en `America/Argentina/Buenos_Aires`; profesionales `p1` (Ana Ejemplo) y `p2` (Bruno Muestra), ambos habilitados para `pr1`..`pr4`; sillones `s1` y `s2`; prestaciones `pr1` "Consulta/control" 30 min, `pr2` "Limpieza" 45 min; horario lunes a viernes 09:00-13:00 y 15:00-19:00; bloqueo de `p1` el miércoles 2026-11-25 de 15:00 a 17:00; paciente existente `pa1` (Carla Prueba, DNI 00000001, teléfono `+54 9 11 0000-0001`). Todas las horas son locales (`-03:00`); lunes = 2026-11-23. Salvo que se indique otra cosa: `ahora` es el domingo 2026-11-22 a las 08:00, la agenda no tiene turnos y el **pedido base** es `{prestacionId: 'pr2', inicio: '2026-11-23T09:00:00-03:00', paciente: {dni: '00000004', nombre: 'Paciente', apellido: 'Ficticio 4', telefono: '+54 9 11 0000-0004', email: 'paciente4@ejemplo.test', consentimientoContacto: true}}`. Un error público tiene un `codigo` del conjunto cerrado `DATOS_INVALIDOS`, `RESERVA_EN_PASADO`, `PRESTACION_NO_DISPONIBLE`, `PROFESIONAL_NO_DISPONIBLE`, `RESERVA_DUPLICADA`, `LIMITE_DE_TURNOS`, `HORARIO_NO_DISPONIBLE`.

## ADDED Requirements

### Requirement: Reserva online exitosa
Una reserva válida SHALL crear un turno en estado `reservado` con `origen: 'online'`, asignado por el sistema al primer combo libre (profesional y sillón) del horario pedido, con la duración de la prestación (RN-13, RN-16, SU-05, DD-11). El rol del actor SHALL ser siempre paciente y MUST NOT tomarse del pedido.

#### Scenario: Reserva exitosa nace reservado con origen online y token
- **WHEN** se reserva el pedido base
- **THEN** se crea un turno `reservado` con `origen: 'online'`, `p1`, `s1`, `pr2`, de 09:00 a 09:45, vinculado a un paciente nuevo con DNI 00000004
- **AND** la respuesta incluye el `turnoId` y un token de gestión

#### Scenario: Filtro opcional por profesional
- **WHEN** se reserva el pedido base con `profesionalId: 'p2'`
- **THEN** el turno se asigna a `p2` con `s1`

### Requirement: Respuesta pública de la reserva
La respuesta SHALL contener solo `turnoId`, `inicio`, `fin`, el nombre de la prestación, el nombre y apellido del profesional asignado y el token en claro (DD-18). MUST NOT incluir el sillón, el id del paciente ni datos de otros pacientes o turnos.

#### Scenario: Respuesta incluye profesional y prestación sin sillón
- **WHEN** se reserva el pedido base
- **THEN** la respuesta tiene `inicio` 09:00, `fin` 09:45, prestación "Limpieza" y profesional Ana Ejemplo
- **AND** la respuesta no contiene `sillonId`, `pacienteId` ni ningún otro campo

### Requirement: Validación estricta del pedido público
El pedido SHALL validarse en la frontera antes de cualquier regla y MUST rechazarse con `DATOS_INVALIDOS` y la lista de campos inválidos si falta un campo obligatorio, un campo tiene tipo o formato inválido o aparece un campo desconocido (incluidos `duracionMinutos`, `sillonId`, `forzar` y `rol`; RN-16, RN-04). Un pedido rechazado MUST NOT crear turno, paciente ni token.

#### Scenario: Campo duracionMinutos rechazado
- **WHEN** se reserva el pedido base con `duracionMinutos: 60`
- **THEN** se rechaza con `DATOS_INVALIDOS` y el campo `duracionMinutos`
- **AND** no se crea ningún turno

#### Scenario: Campos sillonId y rol rechazados
- **WHEN** se reserva el pedido base con `sillonId: 's2'` y `rol: 'administrador'`
- **THEN** se rechaza con `DATOS_INVALIDOS` y los campos `sillonId` y `rol`

#### Scenario: Campo desconocido dentro del paciente rechazado
- **WHEN** se reserva el pedido base con `paciente.id: 'pa1'`
- **THEN** se rechaza con `DATOS_INVALIDOS` y el campo `paciente.id`

#### Scenario: Inicio sin formato de fecha válido
- **WHEN** se reserva el pedido base con `inicio: 'lunes 9 hs'`
- **THEN** se rechaza con `DATOS_INVALIDOS` y el campo `inicio`

#### Scenario: Pedido que no es un objeto
- **WHEN** se reserva con un pedido `null`
- **THEN** se rechaza con `DATOS_INVALIDOS`

### Requirement: Datos mínimos del paciente
El paciente SHALL identificarse con DNI de 7 u 8 dígitos (se quitan los puntos), nombre y apellido no vacíos tras `trim` de hasta 80 caracteres, teléfono argentino normalizado, `consentimientoContacto` exactamente `true` y e-mail opcional con formato válido (DD-17). Cualquier incumplimiento MUST rechazarse con `DATOS_INVALIDOS` y el campo.

#### Scenario: DNI con puntos se normaliza
- **WHEN** se reserva el pedido base con `dni: '00.000.004'`
- **THEN** el turno se crea y el paciente nuevo queda con DNI `00000004`

#### Scenario: DNI inválido
- **WHEN** se reserva el pedido base con `dni` `'123456'`, `'123456789'` o `'00A00004'`
- **THEN** cada pedido se rechaza con `DATOS_INVALIDOS` y el campo `paciente.dni`

#### Scenario: Teléfono se normaliza a dígitos
- **WHEN** se reserva el pedido base con `telefono: '+54 9 11 0000-0004'`
- **THEN** el paciente nuevo queda con teléfono `5491100000004`

#### Scenario: Teléfono inválido
- **WHEN** se reserva el pedido base con `telefono` `'12345'`, `'+1 555 000 0000'` o `'11-ABCD-0004'`
- **THEN** cada pedido se rechaza con `DATOS_INVALIDOS` y el campo `paciente.telefono`

#### Scenario: Consentimiento ausente
- **WHEN** se reserva el pedido base sin `consentimientoContacto` o con `consentimientoContacto: false`
- **THEN** cada pedido se rechaza con `DATOS_INVALIDOS` y el campo `paciente.consentimientoContacto`

#### Scenario: Nombre vacío
- **WHEN** se reserva el pedido base con `nombre: '   '`
- **THEN** se rechaza con `DATOS_INVALIDOS` y el campo `paciente.nombre`

#### Scenario: Apellido demasiado largo
- **WHEN** se reserva el pedido base con un `apellido` de 81 caracteres
- **THEN** se rechaza con `DATOS_INVALIDOS` y el campo `paciente.apellido`
- **AND** con 80 caracteres el turno se crea

#### Scenario: Email inválido
- **WHEN** se reserva el pedido base con `email: 'paciente4@ejemplo'`
- **THEN** se rechaza con `DATOS_INVALIDOS` y el campo `paciente.email`

#### Scenario: Email ausente es válido
- **WHEN** se reserva el pedido base sin `email`
- **THEN** el turno se crea y el paciente nuevo no tiene e-mail

#### Scenario: Varios campos inválidos se informan juntos
- **WHEN** se reserva el pedido base con `dni: '1'` y `telefono: '2'`
- **THEN** se rechaza con `DATOS_INVALIDOS` y los campos `paciente.dni` y `paciente.telefono`

### Requirement: Sin reservas en el pasado
La reserva MUST rechazarse con `RESERVA_EN_PASADO` si `inicio` es anterior a `ahora` según el reloj del sistema; un `inicio` igual a `ahora` SHALL aceptarse si hay hueco (RN-20).

#### Scenario: Reserva en el pasado
- **GIVEN** `ahora` es el lunes 2026-11-23 a las 10:07
- **WHEN** se reserva el pedido base (lunes 09:00)
- **THEN** se rechaza con `RESERVA_EN_PASADO` y no se crea turno ni paciente

#### Scenario: Hueco que empieza justo ahora aceptado
- **GIVEN** `ahora` es el lunes 2026-11-23 a las 09:00
- **WHEN** se reserva el pedido base
- **THEN** el turno se crea de 09:00 a 09:45

### Requirement: Mismas reglas de agenda que la recepción
La reserva SHALL aplicar sin excepción por canal las reglas de solapamiento por profesional y por sillón, horario de atención, bloqueos, tramo único y recursos activos (RN-02, RN-03, RN-07, RN-17, RN-18). Si no hay combo libre para el `inicio` pedido MUST rechazarse con `HORARIO_NO_DISPONIBLE` y una nueva oferta.

#### Scenario: Profesionales ocupados rechazan el horario
- **GIVEN** turnos activos de recepción de `p1` en `s1` y de `p2` en `s2` el lunes de 09:00 a 10:00
- **WHEN** se reserva el pedido base
- **THEN** se rechaza con `HORARIO_NO_DISPONIBLE` y no se crea ningún turno

#### Scenario: Sillón ocupado se salta en la asignación
- **GIVEN** un turno activo de `p2` en `s1` el lunes de 09:00 a 10:00
- **WHEN** se reserva el pedido base
- **THEN** el turno se asigna a `p1` con `s2`

#### Scenario: Bloqueo del profesional elegido
- **WHEN** se reserva `pr1` el miércoles 2026-11-25 a las 15:00 con `profesionalId: 'p1'`
- **THEN** se rechaza con `HORARIO_NO_DISPONIBLE`
- **AND** sin `profesionalId` el turno se asigna a `p2` con `s1`

#### Scenario: Fuera del horario de atención
- **WHEN** se reserva el pedido base con `inicio` el sábado 2026-11-28 a las 10:00
- **THEN** se rechaza con `HORARIO_NO_DISPONIBLE`

#### Scenario: Turno que cruza el corte entre tramos
- **WHEN** se reserva el pedido base (`pr2`, 45 min) con `inicio` lunes 12:30
- **THEN** se rechaza con `HORARIO_NO_DISPONIBLE`

#### Scenario: Sillón inactivo no se asigna
- **GIVEN** el sillón `s1` está inactivo
- **WHEN** se reserva el pedido base
- **THEN** el turno se asigna a `p1` con `s2`

#### Scenario: Inicio no alineado al paso de la disponibilidad
- **WHEN** se reserva el pedido base con `inicio` lunes 09:07
- **THEN** se rechaza con `HORARIO_NO_DISPONIBLE`

### Requirement: Nueva oferta ante horario no disponible
El error `HORARIO_NO_DISPONIBLE` SHALL incluir una nueva oferta con los horarios únicos `{inicio, fin}` disponibles para la prestación (y el profesional, si se pidió) en el día local de `inicio`, a partir de `ahora`, sin profesional, sillón ni otros datos internos.

#### Scenario: Nueva oferta del día sin el horario ocupado
- **GIVEN** turnos activos de recepción de `p1` en `s1` y de `p2` en `s2` el lunes de 09:00 a 10:00
- **WHEN** se reserva el pedido base
- **THEN** la nueva oferta es del lunes, no incluye 09:00 y su primer horario es 10:00-10:45
- **AND** cada elemento de la oferta tiene solo `inicio` y `fin`

### Requirement: Prestación y profesional públicos válidos
La reserva MUST rechazarse con `PRESTACION_NO_DISPONIBLE` si la prestación no existe o está inactiva, y con `PROFESIONAL_NO_DISPONIBLE` si el `profesionalId` pedido no existe, está inactivo o no está habilitado para la prestación (RN-18, RN-19).

#### Scenario: Prestación inexistente
- **WHEN** se reserva el pedido base con `prestacionId: 'pr-x'`
- **THEN** se rechaza con `PRESTACION_NO_DISPONIBLE`

#### Scenario: Prestación inactiva
- **GIVEN** la prestación `pr2` está inactiva
- **WHEN** se reserva el pedido base
- **THEN** se rechaza con `PRESTACION_NO_DISPONIBLE`

#### Scenario: Profesional no habilitado elegido
- **GIVEN** `p2` no tiene `pr2` en sus prestaciones
- **WHEN** se reserva el pedido base con `profesionalId: 'p2'`
- **THEN** se rechaza con `PROFESIONAL_NO_DISPONIBLE`

#### Scenario: Profesional inexistente o inactivo elegido
- **WHEN** se reserva el pedido base con `profesionalId: 'p-x'`, o con `profesionalId: 'p2'` estando `p2` inactivo
- **THEN** cada pedido se rechaza con `PROFESIONAL_NO_DISPONIBLE`

### Requirement: Solo profesionales habilitados reciben el turno
El turno MUST asignarse solo a un profesional habilitado para la prestación, verificado de forma explícita sobre el combo elegido aunque provenga de la disponibilidad (RN-19, defensa en profundidad).

#### Scenario: Combo de profesional no habilitado se descarta
- **GIVEN** la fuente de disponibilidad ofrece primero un combo de un profesional no habilitado para `pr2` y luego `p2` con `s2`
- **WHEN** se reserva el pedido base
- **THEN** el turno se asigna a `p2` con `s2`

### Requirement: Carrera entre la consulta y el alta
Si el alta se rechaza por solapamiento de profesional o sillón (RN-02, RN-03) por un turno creado entre la consulta y el alta, la reserva SHALL reintentar una sola vez con el siguiente combo libre del mismo `inicio`; si el reintento no tiene combo o falla, MUST rechazarse con `HORARIO_NO_DISPONIBLE` y nueva oferta (RN-12).

#### Scenario: Carrera con reintento exitoso en otro combo
- **GIVEN** entre la consulta y el alta, recepción agenda `p1` en `s1` el lunes de 09:00 a 10:00
- **WHEN** se reserva el pedido base
- **THEN** el turno se asigna a `p2` con `s2` y la respuesta informa al profesional Bruno Muestra

#### Scenario: Carrera sin alternativa devuelve horario no disponible y nueva oferta
- **GIVEN** entre la consulta y el alta, recepción agenda `p1` en `s1` y `p2` en `s2` el lunes de 09:00 a 10:00
- **WHEN** se reserva el pedido base
- **THEN** se rechaza con `HORARIO_NO_DISPONIBLE` con nueva oferta y no se crea turno, paciente ni token

#### Scenario: Solo un reintento
- **GIVEN** entre la consulta y el alta, y otra vez antes del reintento, recepción ocupa el combo que la reserva va a usar
- **WHEN** se reserva el pedido base
- **THEN** se rechaza con `HORARIO_NO_DISPONIBLE` tras dos intentos de alta

### Requirement: Paciente existente por DNI
Si el DNI ya existe, el turno SHALL vincularse al paciente existente sin modificar ninguno de sus datos, y la respuesta MUST ser indistinguible de la de un DNI nuevo (RN-22).

#### Scenario: DNI existente se vincula sin modificar datos
- **WHEN** se reserva el pedido base con DNI `00000001`, nombre "Otro", apellido "Nombre" y teléfono `+54 9 11 0000-9999`
- **THEN** el turno queda vinculado a `pa1`
- **AND** `pa1` conserva nombre Carla, apellido Prueba y teléfono `+54 9 11 0000-0001`

#### Scenario: Respuesta no revela si el DNI existía
- **WHEN** se reserva el pedido base con DNI `00000001` y, en otro sistema igual, con DNI `00000004`
- **THEN** ambas respuestas tienen exactamente los mismos campos y ninguna indica si el paciente era nuevo

### Requirement: Sin pacientes huérfanos
Un paciente nuevo SHALL guardarse solo cuando el turno se creó. Una reserva rechazada por cualquier motivo MUST NOT dejar guardado un paciente nuevo.

#### Scenario: Reserva fallida no deja paciente huérfano
- **WHEN** se reserva el pedido base y se rechaza por `RESERVA_EN_PASADO`, `PRESTACION_NO_DISPONIBLE`, `HORARIO_NO_DISPONIBLE` o carrera sin alternativa
- **THEN** en ningún caso existe un paciente con DNI `00000004`

### Requirement: Tope de turnos online por DNI
Un DNI MUST NOT tener más de 2 turnos online activos futuros; un tercero SHALL rechazarse con `LIMITE_DE_TURNOS`. Los turnos cancelados o ausentes, los ya iniciados y los creados por recepción no cuentan (RN-23).

#### Scenario: Tope de dos turnos online por DNI
- **GIVEN** el DNI `00000004` tiene 2 turnos online `reservado` el lunes a las 09:00 y a las 10:00
- **WHEN** se reserva el pedido base con `inicio` lunes 11:00
- **THEN** se rechaza con `LIMITE_DE_TURNOS`

#### Scenario: Turno cancelado no cuenta para el tope
- **GIVEN** el DNI `00000004` tiene un turno online `reservado` el lunes a las 09:00 y otro `cancelado` a las 10:00
- **WHEN** se reserva el pedido base con `inicio` lunes 11:00
- **THEN** el turno se crea

#### Scenario: Turnos de recepción y pasados no cuentan para el tope
- **GIVEN** `ahora` es el lunes a las 10:30 y el DNI `00000004` tiene un turno online el lunes a las 09:00, y dos turnos de recepción el martes
- **WHEN** se reserva el pedido base con `inicio` lunes 11:00
- **THEN** el turno se crea

### Requirement: Reserva duplicada
Una reserva con el mismo DNI, la misma prestación y el mismo `inicio` que un turno activo existente MUST rechazarse con `RESERVA_DUPLICADA` sin crear otro turno ni emitir ni reentregar un token (RN-23). Este control SHALL evaluarse antes del tope.

#### Scenario: Reserva duplicada no crea otro turno ni token
- **GIVEN** el pedido base ya se reservó con éxito
- **WHEN** se reserva de nuevo el pedido base
- **THEN** se rechaza con `RESERVA_DUPLICADA`, sigue existiendo un solo turno y un solo token, y el error no contiene token

#### Scenario: Duplicado de un turno cancelado no es duplicado
- **GIVEN** el pedido base se reservó y luego ese turno se canceló
- **WHEN** se reserva de nuevo el pedido base
- **THEN** el turno se crea

### Requirement: Orden de los errores públicos
Los errores SHALL evaluarse en orden fijo y se informa solo el primero: `DATOS_INVALIDOS`, `RESERVA_EN_PASADO`, `PRESTACION_NO_DISPONIBLE`, `PROFESIONAL_NO_DISPONIBLE`, `RESERVA_DUPLICADA`, `LIMITE_DE_TURNOS`, `HORARIO_NO_DISPONIBLE`.

#### Scenario: Pasado prevalece sobre prestación inexistente
- **GIVEN** `ahora` es el lunes a las 10:07
- **WHEN** se reserva el pedido base con `prestacionId: 'pr-x'`
- **THEN** se rechaza con `RESERVA_EN_PASADO`

#### Scenario: Duplicado prevalece sobre tope
- **GIVEN** el DNI `00000004` tiene 2 turnos online activos futuros y uno de ellos es el del pedido base
- **WHEN** se reserva de nuevo el pedido base
- **THEN** se rechaza con `RESERVA_DUPLICADA`

### Requirement: Errores públicos sin datos de otros pacientes
Todo rechazo de la ruta pública SHALL expresarse como un error público con `codigo`, un mensaje genérico y, según el código, la lista de campos o la nueva oferta; MUST NOT contener turnos o bloqueos en conflicto, ids de pacientes, turnos o sillones, ni el error interno de origen (RN-22, RN-D-02).

#### Scenario: Error público sin datos de otros pacientes
- **GIVEN** un turno activo de `pa1` en `p1`/`s1` y otro de `pa2` en `p2`/`s2` el lunes de 09:00 a 10:00
- **WHEN** se reserva el pedido base
- **THEN** el error serializado no contiene `pa1`, `pa2`, ids de turnos, `s1`, `s2`, `turnoEnConflicto` ni `bloqueoEnConflicto`

### Requirement: No existe opción de forzar
La reserva online MUST NOT ofrecer ningún campo, flag ni rol para forzar un solapamiento (RN-04).

#### Scenario: No existe opción de forzar
- **GIVEN** turnos activos de `p1` en `s1` y de `p2` en `s2` el lunes de 09:00 a 10:00
- **WHEN** se reserva el pedido base con `forzar: true`
- **THEN** se rechaza con `DATOS_INVALIDOS` y el campo `forzar`, y la agenda sigue con 2 turnos

### Requirement: Token de gestión de alta entropía
Cada reserva exitosa SHALL emitir un token de gestión de 32 bytes aleatorios codificado en base64url (43 caracteres), distinto para cada turno, que se entrega en claro una única vez en la respuesta (RN-15, RN-21).

#### Scenario: Token único entre dos reservas
- **WHEN** se reservan el pedido base y otro pedido con DNI `00000005` a las 10:00
- **THEN** los dos tokens son distintos y cada uno tiene 43 caracteres del alfabeto base64url

### Requirement: Solo se almacena el hash del token
El sistema SHALL almacenar del token solo su hash SHA-256 junto con el turno y la fecha de emisión; el token en claro MUST NOT quedar almacenado en ningún repositorio (RN-21).

#### Scenario: Solo se almacena el hash
- **WHEN** se reserva el pedido base
- **THEN** el registro del token guarda el SHA-256 en hexadecimal del token de la respuesta
- **AND** ni el registro del token, ni el turno, ni el paciente guardados contienen el token en claro

### Requirement: Resolución del token de gestión
Resolver un token SHALL devolver el turno al que pertenece solo si el token está vigente: existe su hash, no fue invalidado, el turno no está cancelado y `ahora` es anterior al `fin` del turno. En cualquier otro caso MUST no resolver, sin revelar el motivo (RN-21).

#### Scenario: Resolver token devuelve su turno
- **GIVEN** el pedido base se reservó con éxito
- **WHEN** se resuelve el token de la respuesta
- **THEN** devuelve el `turnoId` de esa reserva

#### Scenario: Token ajeno o inválido no resuelve
- **GIVEN** el pedido base se reservó con éxito
- **WHEN** se resuelve un token inventado de 43 caracteres, una cadena vacía, o el token con un carácter cambiado
- **THEN** ninguno resuelve

#### Scenario: Token vencido o de turno cancelado no resuelve
- **GIVEN** el pedido base se reservó con éxito
- **WHEN** se resuelve su token con `ahora` lunes 09:45, o después de cancelar el turno
- **THEN** no resuelve en ninguno de los dos casos
- **AND** con `ahora` lunes 09:44 resuelve

### Requirement: Rotación del token de gestión
Rotar el token de un turno SHALL emitir un token nuevo e invalidar el anterior, de modo que solo el último resuelva; emitir un segundo token para un turno con token vigente MUST rechazarse (DD-15, para uso de C-12).

#### Scenario: Token rotado invalida el anterior
- **GIVEN** el pedido base se reservó con éxito con el token T1
- **WHEN** se rota el token del turno y se obtiene T2
- **THEN** T2 resuelve el turno, T1 ya no resuelve y T1 es distinto de T2

#### Scenario: Un solo token vigente por turno
- **GIVEN** el pedido base se reservó con éxito
- **WHEN** se intenta emitir otro token para el mismo turno
- **THEN** se rechaza y el token original sigue resolviendo
