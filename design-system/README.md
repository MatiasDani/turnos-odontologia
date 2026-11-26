# Sistema de diseno

- Mode: system-and-mockups
- Revision: 2
- Approval: approved (2026-11-25, by user)
- Decision source: usuario (politica de proyecto, 2026-11-21; revision 2: el dueño eligio la direccion B "Clinico calmo" el 2026-11-25)

## Proposito
Fundacion visual compartida para la app de gestion de turnos de consultorios odontologicos (Argentina). Usuarios: recepcion (desktop, uso diario), odontologo, administrador, paciente (mobile, reserva online). Copy en espanol rioplatense (voseo).

## Fuentes
- knowledge-base/01_vision_y_objetivos.md, 03_actores_y_roles.md, 06_funcionalidades.md, 07_flujos_principales.md
- docs/discovery/informe-discovery.md D.2 (referencias UX: reserva en 4 pasos, vista de ocupacion por sillon, agenda dia/3 dias/semana)
- Revision 2: change `openspec/changes/mejora-visual-ui/` (mockups `b-*.html`, investigacion en `mockups/referencias.md`).

## Archivos
- `tokens.css`: color, tipografia, espaciado, radios, sombras, foco, movimiento (+ reduced motion). Revision 2: paleta B "Clinico calmo" (blanco frio, grafito, indigo `#2f3f8f` como unico acento).
- `brand.js`: constante `BRAND_NAME` ("Turnos Odonto"); enlaza `[data-brand-name]`.
- `brand.md`: reglas de marca y voz.
- `assets/logo.svg`: isotipo de diente de trazo fino en indigo `#2f3f8f` (color fijo: un `<img>` no hereda `currentColor`). Sin texto: el nombre lo pone `[data-brand-name]`.
- `components.html`: componentes y estados. Abrir con doble clic (file://) o `npx http-server design-system -p 5178`.
- `paleta-a.css`, `paleta-b.css`: las dos paletas candidatas de la revision 2 (A "Calido sereno" descartada, B elegida). Solo las usan los mockups del change.
- `previews/components-mobile.png` (390x844), `previews/components-desktop.png` (1440x900).

## Revision 2 (aprobada 2026-11-25)
- Paleta B en `tokens.css` con los mismos nombres de token de la revision 1: todas las pantallas la toman sin cambiar sus estilos.
- Tipografia: sans del sistema (Segoe UI Variable / SF / system-ui); Inter e Inter Display solo si ya estan instaladas, nunca se descargan. Titulos con peso 600 y tracking `-0.022em`.
- Radios 6/8/12 px, sombra casi nula, lineas de 1 px.
- Marca: nombre "Turnos Odonto" y logo definitivo (diente de trazo fino).

## Decisiones abiertas (TBD)
- Imagenes/ilustraciones (TBD): sin fotografias por ahora.
- Modo oscuro: no definido (opcional).
- Vistas de agenda 3 dias/semana: se definen en el mockup del change correspondiente.

## Como reemplazar
- Nombre: editar `BRAND_NAME` en `brand.js`.
- Logo: reemplazar `assets/logo.svg` (misma ruta, con color fijo).
- Valores visuales: editar variables en `tokens.css`; subir `Revision:` y volver a `Approval: pending`.

## Aprobacion
- Revision 1: aprobada por el equipo el 2026-11-21, con nombre y logo provisionales.
- Revision 2: aprobada por el dueño (Matias Ibañez) el 2026-11-25 ("B · Clinico calmo").
