# Spec Delta

## MODIFIED Requirements

### Requirement: Accesibilidad y diseño adaptable
Las pantallas SHALL usar `design-system/tokens.css` y `brand.js` sin redefinir sus valores, cumplir contraste WCAG AA, foco visible, objetivos táctiles de al menos 44 px, estados comunicados con texto además del color, navegación completa por teclado, sin desplazamiento horizontal a 390 px y sin movimiento con `prefers-reduced-motion: reduce`. El encabezado SHALL mostrar el logo y el nombre del producto del design system (sin "(TBD)" ni "LOGO PROVISIONAL") y la marca SHALL enlazar a la portada `/`.

#### Scenario: Reserva completa con teclado
- **WHEN** el paciente completa la reserva usando solo Tab, Shift+Tab, flechas, Espacio y Enter
- **THEN** llega a la confirmación, y cada control enfocado muestra el anillo de foco del design system

#### Scenario: Sin desplazamiento horizontal en el celular
- **WHEN** se recorren todas las pantallas de reserva y gestión a 390x844
- **THEN** ninguna tiene desplazamiento horizontal y todos los botones y horarios miden al menos 44 px de alto

#### Scenario: Encabezado con la marca aprobada
- **WHEN** el paciente abre `/public/reservar`
- **THEN** el encabezado muestra "Turnos Odonto", sin el texto "(TBD)"
- **AND** la marca es un enlace a `/`

#### Scenario: Sin desplazamiento horizontal en 375 px en la reserva
- **WHEN** el paciente abre `/public/reservar` a 375 × 812
- **THEN** el ancho del documento no supera el de la ventana
