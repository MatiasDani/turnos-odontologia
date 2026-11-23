# interfaz-paciente Specification

## Purpose

Define las pantallas públicas que usa el paciente desde el celular o la computadora: reservar un turno desde el enlace del consultorio y gestionar su turno desde el enlace con token, con estados claros, accesibles y fieles al design system aprobado.

> Contexto común: mismo seed ficticio, `ahora` y turno base que `api-publica-paciente` (turno `reservado` con Ana Ejemplo, "Consulta/control", lunes 2026-11-23 10:00-10:30, token `T`). Las pantallas se verifican en un navegador real a 390x844 y 1440x900 contra el servidor de la aplicación con repositorios en memoria y reloj fijo. Todo texto visible está en español rioplatense (voseo) y las horas se muestran en la zona del consultorio.

## Requirements

### Requirement: Reserva guiada en pasos
La página `/public/reservar` SHALL guiar la reserva en cuatro pasos visibles con indicador "Paso N de 4": prestación (nombre y duración), profesional y horario (profesional opcional, por defecto "Cualquiera"; un día de los próximos 30 y sus horarios libres), datos del paciente y confirmación. MUST NOT mostrar sillones ni datos de otros pacientes.

#### Scenario: Paciente reserva un turno con Cualquiera
- **WHEN** el paciente elige "Consulta/control", deja "Cualquiera", elige el lunes y las 11:00, completa "Paciente Ficticio 1", DNI `30000001`, teléfono `1100000000`, marca el consentimiento y confirma
- **THEN** ve la pantalla de turno reservado con lunes 23 de noviembre, 11:00 a 11:30, "Consulta/control" y el profesional asignado
- **AND** en ninguna pantalla aparece la palabra "Sillón" ni un dato de otro paciente

#### Scenario: Paciente elige un profesional
- **WHEN** el paciente elige "Consulta/control" y luego "Bruno Muestra"
- **THEN** los horarios del día seleccionado son los libres de Bruno Muestra y la confirmación lo muestra como profesional

#### Scenario: Selector de días limitado a 30 días
- **WHEN** el paciente llega al paso de horario con `ahora` domingo 2026-11-22
- **THEN** el selector ofrece desde hoy hasta el martes 2026-12-22 y no permite elegir un día posterior

### Requirement: Estados de carga, vacío y error en la reserva
Cada paso que consulta al servidor SHALL mostrar un estado de carga accesible mientras espera, un estado vacío con una acción para seguir cuando no hay datos, y un mensaje de error con "Reintentar" cuando falla la red o el servidor. Ningún estado MUST mostrar códigos internos, trazas ni JSON crudo.

#### Scenario: Carga de horarios con indicador
- **GIVEN** la respuesta de disponibilidad demora
- **WHEN** el paciente elige un día
- **THEN** la lista de horarios muestra un indicador de carga anunciado a lectores de pantalla y no permite continuar

#### Scenario: Día sin horarios libres
- **WHEN** el paciente elige el sábado 2026-11-28
- **THEN** ve "No hay horarios libres este día" y una acción para elegir otro día

#### Scenario: Error de red al cargar prestaciones
- **GIVEN** el pedido de prestaciones falla
- **WHEN** se abre `/public/reservar`
- **THEN** ve un mensaje de error en lenguaje claro con el botón "Reintentar", y al reintentar con el servidor disponible ve las prestaciones

### Requirement: Validación del formulario de datos
El paso de datos SHALL pedir DNI, nombre, apellido, teléfono y consentimiento de contacto obligatorios y e-mail opcional, con etiquetas visibles. Un campo inválido, detectado en el navegador o informado por el servidor en `campos`, MUST marcarse junto a su campo con un texto que diga qué corregir, y el foco MUST ir al primer campo inválido.

#### Scenario: Datos inválidos marcados por campo
- **WHEN** el paciente envía DNI `123`, teléfono vacío y sin consentimiento
- **THEN** ve un error junto a DNI, teléfono y consentimiento, el foco queda en DNI y no se envía la reserva

### Requirement: Confirmación con enlace de gestión
Tras una reserva exitosa la pantalla SHALL mostrar fecha, hora, prestación y profesional asignado, y el enlace de gestión `/public/turnos/<token>` una sola vez con un botón para copiarlo y el aviso de que, si llega un recordatorio por e-mail, el enlace vigente es el del último e-mail (DD-15, RN-21). El token MUST NOT guardarse en el almacenamiento del navegador ni en la URL de la página.

#### Scenario: Confirmación muestra el enlace de gestión una sola vez
- **WHEN** la reserva se confirma
- **THEN** la pantalla muestra el enlace de gestión con "Copiar enlace" y el aviso sobre el último e-mail
- **AND** la URL de la página sigue siendo `/public/reservar` y el almacenamiento local y de sesión no contienen el token

#### Scenario: Horario tomado al confirmar
- **GIVEN** el horario elegido se ocupa antes de confirmar
- **WHEN** el paciente confirma la reserva
- **THEN** ve "Ese horario se acaba de ocupar" con los horarios de la nueva oferta para elegir otro, sin perder los datos cargados

### Requirement: Página de gestión del turno
La página `/public/turnos/<token>` SHALL mostrar fecha, hora, prestación, profesional y el estado de la asistencia, con las acciones "Confirmar asistencia" (si no está confirmada), "Reprogramar" y "Cancelar turno". Cancelar MUST pedir confirmación en un diálogo accesible; reprogramar MUST ofrecer días y horarios del mismo profesional. Cada acción exitosa muestra su resultado en la página.

#### Scenario: Paciente confirma asistencia desde el enlace
- **WHEN** el paciente abre `/public/turnos/T/confirmar` y presiona "Confirmar asistencia"
- **THEN** ve "Asistencia confirmada" y el botón de confirmar ya no se muestra

#### Scenario: Paciente cancela desde el enlace
- **WHEN** el paciente presiona "Cancelar turno" y confirma en el diálogo
- **THEN** ve "Cancelaste tu turno. El horario quedó libre." y ya no ve acciones sobre el turno

#### Scenario: Paciente reprograma desde el enlace
- **WHEN** el paciente presiona "Reprogramar", elige el martes 2026-11-24 a las 09:00 y confirma
- **THEN** ve el turno con martes 24 de noviembre, 09:00 a 09:30 y Ana Ejemplo, y el aviso de que el mismo enlace sigue sirviendo

### Requirement: Gestión con menos de 24 horas
Cuando el servidor informa que la gestión online no está disponible, la página SHALL reemplazar "Reprogramar" y "Cancelar turno" por un aviso para contactar al consultorio con su teléfono (enlace `tel:`) y su e-mail (enlace `mailto:`), manteniendo visible "Confirmar asistencia" si corresponde (RN-08, US-010).

#### Scenario: Turno con menos de 24 horas muestra el contacto
- **WHEN** el paciente abre `/public/turnos/T` con `ahora` domingo 10:01
- **THEN** ve el aviso para contactar al consultorio con el teléfono y el e-mail como enlaces, y no ve "Reprogramar" ni "Cancelar turno"

### Requirement: Enlace inválido o vencido
Si el servidor responde `ENLACE_INVALIDO` al cargar o al ejecutar una acción, la página SHALL mostrar solo el mensaje fijo "El enlace no es válido o ya no está vigente." con una indicación para usar el último e-mail recibido o contactar al consultorio, sin revelar el motivo ni datos de ningún turno (RN-15, RN-22).

#### Scenario: Enlace inválido muestra el mensaje genérico
- **WHEN** el paciente abre `/public/turnos/` con un token nunca emitido
- **THEN** ve "El enlace no es válido o ya no está vigente." y ningún dato de turno, profesional ni paciente

### Requirement: Accesibilidad y diseño adaptable
Las pantallas SHALL usar `design-system/tokens.css` y `brand.js` sin redefinir sus valores, cumplir contraste WCAG AA, foco visible, objetivos táctiles de al menos 44 px, estados comunicados con texto además del color, navegación completa por teclado, sin desplazamiento horizontal a 390 px y sin movimiento con `prefers-reduced-motion: reduce`.

#### Scenario: Reserva completa con teclado
- **WHEN** el paciente completa la reserva usando solo Tab, Shift+Tab, flechas, Espacio y Enter
- **THEN** llega a la confirmación, y cada control enfocado muestra el anillo de foco del design system

#### Scenario: Sin desplazamiento horizontal en el celular
- **WHEN** se recorren todas las pantallas de reserva y gestión a 390x844
- **THEN** ninguna tiene desplazamiento horizontal y todos los botones y horarios miden al menos 44 px de alto
