# Spec Delta

## Purpose

Define el comportamiento observable de la interfaz de recepción `/recepcion`: inicio de sesión, vistas de la agenda, acciones sobre los turnos, bloqueos y recordatorios `wa.me`, estados de carga y error, accesibilidad y lo que ve cada rol, sobre la API interna y el design system aprobado.

> Contexto común de los escenarios: los datos y usuarios ficticios de `api-interna`, con la sesión iniciada en el navegador (Chromium) en una pantalla de 1440 × 900 y `ahora` el lunes 2026-11-23 a las 10:00. Salvo que se indique otra cosa, el usuario es `u-rec` (recepción) y la agenda tiene `t-base` (martes 09:00, `pa1`, `p1`, `s1`, `pr1`, `confirmado`).

## ADDED Requirements

### Requirement: Inicio de sesión
`/recepcion/login` SHALL pedir e-mail y clave y, con credenciales válidas, abrir la agenda del día actual. Con credenciales inválidas MUST mostrar "E-mail o clave incorrectos." junto al formulario, sin borrar el e-mail escrito y sin revelar cuál dato falló.

#### Scenario: Login correcto
- **WHEN** recepción ingresa `recepcion@demo.test` y `clave-ficticia-01` y envía
- **THEN** ve la agenda del lunes 23 de noviembre

#### Scenario: Login incorrecto
- **WHEN** recepción ingresa `recepcion@demo.test` y `clave-incorrecta` y envía
- **THEN** ve el mensaje "E-mail o clave incorrectos."
- **AND** el campo e-mail conserva `recepcion@demo.test`

### Requirement: Sesión en la pestaña
La interfaz SHALL guardar el token solo en `sessionStorage` de la pestaña (DD-38): recargar mantiene la sesión; "Salir" la borra y vuelve al login. Sin sesión, o si la API responde `SESION_INVALIDA`, MUST volver al login con el aviso "Tu sesión venció. Iniciá sesión de nuevo."

#### Scenario: Recargar conserva la sesión
- **GIVEN** recepción inició sesión
- **WHEN** recarga la página de la agenda
- **THEN** sigue viendo la agenda sin volver a iniciar sesión

#### Scenario: Entrar sin sesión
- **WHEN** se abre `/recepcion` sin sesión en la pestaña
- **THEN** se muestra el login

#### Scenario: Sesión vencida
- **GIVEN** recepción inició sesión y la API pasa a responder `SESION_INVALIDA`
- **WHEN** cambia de día en la agenda
- **THEN** vuelve al login con el aviso "Tu sesión venció. Iniciá sesión de nuevo."

#### Scenario: Salir
- **WHEN** recepción toca "Salir"
- **THEN** vuelve al login y `sessionStorage` ya no tiene el token

### Requirement: Agenda del día por sillón o por profesional
La agenda del día SHALL mostrar una columna por sillón o por profesional (a elección), filas cada 30 minutos dentro del horario de atención y, en cada turno, la hora, el paciente, la prestación y el estado con texto e ícono (no solo color). Los bloqueos se ven rayados con su motivo; los turnos cancelados no ocupan lugar.

#### Scenario: Día por sillón
- **WHEN** recepción abre el martes por sillón
- **THEN** ve las columnas `Sillón 1` y `Sillón 2` y, en `Sillón 1` a las 09:00, `Carla Prueba`, `Consulta/control` y el estado `Confirmado`

#### Scenario: Día por profesional
- **WHEN** recepción cambia a "Por profesional" el martes
- **THEN** ve las columnas `Ana Ejemplo` y `Bruno Muestra` y `Carla Prueba` en la de `Ana Ejemplo`

### Requirement: Semana de un recurso
La vista semana SHALL mostrar una columna por día (lunes a sábado con horario, más domingo si tiene turnos o bloqueos) para un solo profesional o sillón elegido en un selector, con el primer profesional activo elegido por defecto (DD-39).

#### Scenario: Semana de un profesional
- **WHEN** recepción abre la vista semana con `Ana Ejemplo`
- **THEN** ve las columnas de lunes 23 a sábado 28 y `Carla Prueba` el martes a las 09:00

### Requirement: Navegación de fechas y filtros
La barra de la agenda SHALL permitir ir al día o semana anterior y siguiente, volver a "Hoy" y elegir una fecha, y conservar la vista y el recurso elegidos al navegar.

#### Scenario: Ir al día siguiente
- **GIVEN** recepción ve el lunes por sillón
- **WHEN** toca "Siguiente"
- **THEN** ve el martes por sillón

### Requirement: Detalle y acciones de un turno
Al elegir un turno SHALL abrirse un panel con sus datos (paciente, con DNI y teléfono si el rol puede verlos, prestación, profesional, sillón, horario y estado) y solo las acciones válidas para su estado y para el rol: confirmar (si está `reservado`), reprogramar y cancelar (si está `reservado` o `confirmado`), y marcar atendido o ausente (si está `confirmado` y ya empezó).

#### Scenario: Acciones de un turno confirmado futuro
- **WHEN** recepción elige `t-base`
- **THEN** ve "Reprogramar" y "Cancelar turno"
- **AND** no ve "Confirmar", "Atendido" ni "Ausente"

#### Scenario: Acciones de un turno que ya empezó
- **GIVEN** un turno `confirmado` de `pa2` el lunes de 09:30 a 10:00
- **WHEN** recepción lo elige
- **THEN** ve "Atendido" y "Ausente"

### Requirement: Dar turno con búsqueda y alta rápida
"Dar turno" SHALL abrir un formulario que busca al paciente mientras se escribe (desde 3 caracteres), ofrece "Dar de alta" cuando no hay resultados, y pide prestación, profesional, sillón, fecha y hora, ofreciendo los huecos libres del día. Al confirmar, el turno aparece en la agenda con un aviso de éxito.

#### Scenario: Dar turno a un paciente existente
- **WHEN** recepción busca `Modelo`, elige `Diego Modelo`, `Consulta/control`, `Bruno Muestra`, `Sillón 2`, el martes y el hueco de las 15:00, y confirma
- **THEN** ve el aviso "Turno dado" y `Diego Modelo` en la agenda del martes a las 15:00

#### Scenario: Alta rápida desde Dar turno
- **WHEN** recepción busca `30000009` sin resultados, toca "Dar de alta", completa los datos con consentimiento y guarda
- **THEN** el paciente queda elegido en el formulario de Dar turno

#### Scenario: Alta con DNI existente
- **WHEN** recepción da de alta con DNI `00000001`
- **THEN** ve "Ya existe un paciente con ese DNI" y la opción de elegir a `Carla Prueba`

### Requirement: Cancelar con confirmación
"Cancelar turno" SHALL pedir confirmación en un diálogo que nombra al paciente y el horario; al confirmar, el turno pasa a cancelado y el horario queda libre en la agenda.

#### Scenario: Cancelar un turno
- **WHEN** recepción elige `t-base`, toca "Cancelar turno" y confirma "Sí, cancelar turno"
- **THEN** ve el aviso "Turno cancelado. El horario quedó libre." y `t-base` ya no ocupa el martes a las 09:00

#### Scenario: Volver sin cancelar
- **WHEN** recepción toca "Cancelar turno" en `t-base` y luego "Volver"
- **THEN** `t-base` sigue `confirmado`

### Requirement: Reprogramar eligiendo un hueco
"Reprogramar" SHALL ofrecer los huecos libres de la fecha elegida para la misma prestación, con profesional y sillón opcionales, y mover el turno al hueco elegido.

#### Scenario: Reprogramar al mismo día
- **WHEN** recepción reprograma `t-base` al martes a las 10:00
- **THEN** ve el aviso "Turno reprogramado" y `Carla Prueba` el martes a las 10:00

### Requirement: Mensajes de reglas de negocio
Un rechazo de la API SHALL mostrarse junto a la acción, con el mensaje en español del código y, si hay conflicto, su horario, sin cerrar el formulario ni perder lo escrito.

#### Scenario: Conflicto de profesional al dar turno
- **WHEN** recepción intenta dar un turno a `Diego Modelo` con `Ana Ejemplo` y `Sillón 2` el martes a las 09:00
- **THEN** ve un aviso de que el profesional ya tiene un turno de 09:00 a 09:30
- **AND** el formulario conserva el paciente y la prestación elegidos

### Requirement: Bloquear y liberar horarios
"Bloquear horario" SHALL crear un bloqueo de un profesional o un sillón con fecha, desde, hasta y motivo; un bloqueo elegido en la agenda se puede liberar. Si hay turnos en el intervalo, se listan y el bloqueo no se crea (RN-31).

#### Scenario: Bloquear una hora libre
- **WHEN** recepción bloquea `Bruno Muestra` el martes de 15:00 a 16:00 con motivo `Capacitación`
- **THEN** ve el bloqueo rayado con `Capacitación` en la agenda del martes

#### Scenario: Bloqueo sobre un turno
- **WHEN** recepción bloquea `Ana Ejemplo` el martes de 09:00 a 10:00
- **THEN** ve que no se puede bloquear por el turno de `Carla Prueba` de 09:00 a 09:30

### Requirement: Pendientes de WhatsApp
El panel "Recordatorios por WhatsApp" SHALL listar los pendientes con paciente y horario del turno, un enlace "Abrir WhatsApp" que abre el enlace `wa.me` en otra pestaña y "Marcar enviado", que lo quita de la lista. Al administrador no se le muestra "Marcar enviado".

#### Scenario: Marcar un recordatorio enviado
- **GIVEN** un recordatorio `wa.me` pendiente de `t-base`
- **WHEN** recepción toca "Marcar enviado"
- **THEN** el recordatorio ya no aparece en el panel

### Requirement: Lo que ve el odontólogo
El odontólogo SHALL ver solo la agenda de su profesional (sin selector de recurso), sin "Dar turno", "Cancelar turno", "Reprogramar", "Confirmar" ni el panel de WhatsApp; en sus turnos ya empezados ve "Atendido" y "Ausente", y puede bloquear su propio horario.

#### Scenario: Agenda del odontólogo
- **GIVEN** la sesión de `u-odo1` y un turno de `pa2` con `p2` el martes a las 11:00
- **WHEN** abre el martes
- **THEN** ve `Carla Prueba` a las 09:00 y no ve el turno de `p2`
- **AND** no ve el botón "Dar turno"

### Requirement: Estados de carga, vacío y error
La interfaz SHALL mostrar "Cargando agenda…" mientras espera, "No hay turnos para este día." si el día está vacío, y ante una falla de red "No pudimos cargar la agenda." con "Reintentar"; un 403 muestra "No tenés permiso para hacer esto."

#### Scenario: Día vacío
- **WHEN** recepción abre el miércoles 25 de noviembre, sin turnos
- **THEN** ve "No hay turnos para este día."

#### Scenario: Error de red con reintento
- **GIVEN** la API de agenda falla por red una vez
- **WHEN** recepción abre el martes y toca "Reintentar"
- **THEN** ve la agenda del martes con `Carla Prueba`

### Requirement: Accesibilidad de la agenda
La interfaz SHALL poder usarse con teclado (cada turno es un botón con nombre accesible "hora, paciente, prestación, estado"), con foco visible, objetivos de 44 px o más, `aria-live` para avisos y diálogos nativos que devuelven el foco al cerrarse; sin scroll horizontal de la página a 1440 px.

#### Scenario: Turno operable con teclado
- **WHEN** recepción llega con Tab al turno de `Carla Prueba` y presiona Enter
- **THEN** se abre el detalle de `t-base`
- **AND** el botón tenía el nombre accesible "09:00, Carla Prueba, Consulta/control, Confirmado"
