# Spec Delta

## MODIFIED Requirements

### Requirement: Accesibilidad de la agenda
La interfaz SHALL poder usarse con teclado (cada turno es un botón con nombre accesible "hora, paciente, prestación, estado"), con foco visible, objetivos de 44 px o más, `aria-live` para avisos y diálogos nativos que devuelven el foco al cerrarse; sin scroll horizontal de la página a 1440 px ni a 375 px (en pantallas angostas la grilla se desplaza dentro de su propio contenedor).

#### Scenario: Turno operable con teclado
- **WHEN** recepción llega con Tab al turno de `Carla Prueba` y presiona Enter
- **THEN** se abre el detalle de `t-base`
- **AND** el botón tenía el nombre accesible "09:00, Carla Prueba, Consulta/control, Confirmado"

## ADDED Requirements

### Requirement: Diseño adaptable de la recepción
A 768 px de ancho o menos, `/recepcion` SHALL mostrar la barra superior en una línea, "Bloquear horario" y "Dar turno" (los mismos botones) en una barra fija al pie, la grilla con desplazamiento horizontal propio y horas fijas, y el panel de WhatsApp debajo, sin scroll horizontal de la página. Los nombres accesibles no cambian y la barra fija no tapa los turnos.

#### Scenario: Sin desplazamiento horizontal en 375 px
- **GIVEN** recepción con sesión iniciada en una pantalla de 375 × 812 y la agenda del martes por sillón
- **WHEN** termina de cargar la agenda
- **THEN** el ancho del documento no supera el de la ventana
- **AND** "Salir", "Dar turno" y "Bloquear horario" están completos dentro de la ventana y miden al menos 44 px de alto

#### Scenario: La grilla no queda tapada por el panel
- **GIVEN** recepción en 375 × 812 con un recordatorio de WhatsApp pendiente de `Carla Prueba`
- **WHEN** termina de cargar la agenda
- **THEN** la grilla está por encima de "Recordatorios por WhatsApp" sin superponerse
- **AND** la grilla se puede desplazar horizontalmente dentro de su contenedor hasta la última columna

#### Scenario: Acciones fijas al pie en el celular
- **GIVEN** recepción en 375 × 812 con la agenda del martes
- **WHEN** termina de cargar la agenda
- **THEN** "Bloquear horario" y "Dar turno" están pegados al borde inferior de la ventana
- **AND** el turno de `Carla Prueba` se puede tocar con un clic normal

#### Scenario: El detalle se muestra al elegir un turno en el celular
- **GIVEN** recepción en 375 × 812 con la agenda del martes
- **WHEN** toca el turno de `Carla Prueba`
- **THEN** el encabezado "Turno" del panel de detalle queda visible en la ventana

### Requirement: Agenda legible en escritorio
En escritorio `/recepcion` SHALL mostrar una barra superior fina con la marca definitiva (enlace a `/`), el consultorio, el usuario con su rol y "Salir", sin otros enlaces de navegación; una barra de herramientas con navegación de fecha, vista y columnas como controles quietos y "Dar turno" como única acción con color; la leyenda de estados arriba de la grilla; y el nombre completo del paciente en turnos de 30 minutos o más a 1280 px y más.

#### Scenario: Nombre completo en un turno corto
- **GIVEN** recepción en 1280 × 800 con la agenda del martes por sillón
- **WHEN** termina de cargar la agenda
- **THEN** el turno de `Carla Prueba` (30 minutos) muestra "Carla Prueba" sin recortar

#### Scenario: La navegación solo lleva a pantallas que existen
- **WHEN** recepción abre `/recepcion` en 1440 × 900
- **THEN** la barra superior tiene como único enlace la marca, que lleva a `/`
- **AND** no hay enlaces "Agenda" ni "Reserva online"

#### Scenario: La recepción muestra la marca definitiva
- **WHEN** recepción abre `/recepcion` o `/recepcion/login`
- **THEN** la marca muestra "Turnos Odonto", sin "(TBD)" ni "LOGO PROVISIONAL"
