# Spec Delta

## Purpose

Página de inicio pública en `/` que presenta el producto con la marca del design system (revisión 2, dirección B "Clínico calmo") y lleva al paciente a reservar un turno y al personal del consultorio a ingresar, sin exponer datos.

## ADDED Requirements

### Requirement: Portada en la raíz
El servidor SHALL responder `GET /` con una página HTML estática (200, `text/html`, `cache-control: no-store`) con las mismas cabeceras de seguridad que el resto de las páginas. La página MUST NOT incluir datos de turnos, pacientes ni profesionales, ni scripts ni estilos en línea; solo usa estáticos de la lista blanca.

#### Scenario: La raíz ya no da 404
- **WHEN** un navegador pide `GET /` con `Accept: text/html`
- **THEN** recibe 200 con `content-type` `text/html`
- **AND** la respuesta lleva `content-security-policy` con `default-src 'self'`, `x-content-type-options: nosniff` y `referrer-policy: no-referrer`

#### Scenario: La portada no expone datos
- **GIVEN** la agenda demo tiene el turno `t-base` de `Carla Prueba`
- **WHEN** se pide `GET /`
- **THEN** el cuerpo no contiene `Carla Prueba`, ningún DNI ni teléfono

### Requirement: La portada ofrece reservar e ingresar
La portada SHALL mostrar el logo y el nombre del producto del design system, un único encabezado principal (`h1`), un botón principal "Reservar turno" a `/public/reservar` y un enlace discreto "Soy del consultorio" a `/recepcion/login`, ambos visibles sin desplazarse. No hay otro enlace de ingreso en el encabezado.

#### Scenario: La portada ofrece reservar e ingresar
- **WHEN** el visitante abre `/` a 1440 × 900
- **THEN** ve el enlace "Reservar turno" que lleva a `/public/reservar` y el enlace "Soy del consultorio" que lleva a `/recepcion/login`, ambos dentro de la primera pantalla
- **AND** el nombre mostrado es "Turnos Odonto", sin el texto "(TBD)"

#### Scenario: Reservar desde la portada
- **WHEN** el visitante toca "Reservar turno"
- **THEN** llega al paso 1 de la reserva ("¿Qué necesitás?")

### Requirement: Portada adaptable y accesible
La portada SHALL usar `tokens.css` y `brand.js` sin redefinir sus valores, no tener desplazamiento horizontal a 375 px ni a 390 px, tener objetivos táctiles de al menos 44 px y foco visible.

#### Scenario: Portada en el celular
- **WHEN** el visitante abre `/` a 375 × 812
- **THEN** la página no tiene desplazamiento horizontal
- **AND** "Reservar turno" y "Soy del consultorio" miden al menos 44 px de alto y se ven sin desplazarse
