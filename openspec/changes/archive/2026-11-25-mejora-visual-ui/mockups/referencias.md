# Referencias (investigación breve, 2026-11-25)

Motivo: el dueño pidió una interfaz "mucho más minimalista", otra paleta y "no tan genérica". Solo se anota lo que se pudo leer; varias páginas no se abrieron (se aclara).

## Fuentes consultadas

| Fuente | Qué se tomó (1 línea) |
|---|---|
| NN/g, "Aesthetic and Minimalist Design" — https://www.nngroup.com/articles/aesthetic-minimalist-design/ | Minimalismo = solo lo que sirve a la tarea, no "poco por estética"; cada elemento extra compite con el importante ("communicate; don't decorate"). |
| Linear, "How we redesigned the Linear UI" — https://linear.app/now/how-we-redesigned-the-linear-ui | Menos ruido en barras y paneles, acento usado con moderación para que la interfaz quede neutra, tema definido con pocas variables (base, acento, contraste), títulos con una variante "display" de la tipografía. |
| Vercel Geist, colores — https://vercel.com/geist/colors | Escala con roles fijos: fondos (default/hover/activo), bordes (default/hover/activo), texto secundario y primario; sirve para tener pocos tokens con función clara. |
| Calendly, "New scheduling page UI" — https://calendly.com/blog/new-scheduling-page-ui | Día y horario en la misma pantalla y menos clics; los cambios visuales fueron chicos: el flujo manda. |
| Cal.com, layouts de reserva — https://cal.com/blog/enhanced-flexibility-take-advantage-of-cal-com-s-multiple-booking-layouts y docs del Booker (resultado de búsqueda) | Tres vistas (mes, semana, columna) que el que reserva puede alternar; la página no describe el detalle visual de los horarios. |
| SaaS UI, "Calendar & scheduling UX patterns" — https://www.saasui.design/blog/saas-calendar-scheduling-ux-patterns | Mostrar solo horarios reservables, rotular la zona horaria donde aparece una hora, vista de lista que "saca la grilla" para lo próximo, estilos distintos por estado (tentativo/confirmado). |
| One Medical — https://www.onemedical.com/ | Título corto ("Primary care designed for you") y "Book an appointment" como acción principal; el resto de la página es muy cargado (lo que NO queremos copiar). Los colores no se pudieron ver (solo texto). |

## No se pudieron abrir

- Doctolib (https://www.doctolib.fr/) y Zocdoc (https://www.zocdoc.com/): HTTP 403.
- Página pública de Cal.com (cal.com/rick/...): solo devolvió el título, sin contenido.
- Dribbble (búsqueda "dental booking app"): contenido vacío (se arma con JS). Mobbin: no se intentó (requiere cuenta).
- Ayuda de Calendly sobre personalización: redirigía a otra página; no se usó.

## Principios que aplicamos en los mockups v2

1. **Una acción principal por pantalla** (Calendly, One Medical, NN/g): portada = "Reservar turno"; cada paso = "Continuar"; recepción = "Dar turno". Lo demás es enlace o botón de texto.
2. **Pocos tokens con rol fijo** (Geist, Linear): fondo, superficie, tinta, tinta secundaria, línea, acento, acento suave + 4 estados. El acento aparece solo en la acción principal, la selección y la marca.
3. **Quitar cromo antes que agregar decoración** (Linear, NN/g): sin tarjetas con borde y sombra en todos lados; separadores de 1 px, grilla de agenda con líneas finas (hora marcada, media hora más tenue).
4. **Horarios como grilla simple y solo los disponibles** (SaaS UI, Calendly): agrupados en "Mañana" y "Tarde", botones del mismo tamaño con números tabulares; el elegido se rellena con el acento.
5. **Estados sutiles pero distinguibles** (SaaS UI): fondo tenue + borde izquierdo de color + estado en texto (nunca solo color).
6. **Tipografía como carácter, no ilustraciones** (Linear): A usa una serif del sistema en títulos; B una sans "display" con tracking negativo. Sin fuentes remotas.
