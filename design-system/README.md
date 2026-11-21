# Sistema de diseno

- Mode: system-and-mockups
- Revision: 1
- Approval: approved (2026-11-21, by user)
- Decision source: usuario (politica de proyecto, 2026-11-21)

## Proposito
Fundacion visual compartida para la app de gestion de turnos de consultorios odontologicos (Argentina). Usuarios: recepcion (desktop, uso diario), odontologo, administrador, paciente (mobile, reserva online). Copy en espanol rioplatense (voseo).

## Fuentes
- knowledge-base/01_vision_y_objetivos.md, 03_actores_y_roles.md, 06_funcionalidades.md, 07_flujos_principales.md
- docs/discovery/informe-discovery.md D.2 (referencias UX: reserva en 4 pasos, vista de ocupacion por sillon, agenda dia/3 dias/semana)
- Sin UI ni marca previas.

## Archivos
- `tokens.css`: color, tipografia (system-ui), espaciado, radios, sombras, foco, movimiento (+ reduced motion).
- `brand.js`: constante `BRAND_NAME`; enlaza `[data-brand-name]`.
- `brand.md`: reglas de marca y voz.
- `assets/logo.svg`: logo PROVISIONAL.
- `components.html`: componentes y estados. Abrir con doble clic (file://) o `npx http-server design-system -p 5178`.
- `previews/components-mobile.png` (390x844), `previews/components-desktop.png` (1440x900), pagina completa.

## Decisiones abiertas (TBD)
- Nombre del producto (TBD): provisorio "Turnos Odonto (TBD)".
- Logo (TBD): placeholder.
- Imagenes/ilustraciones (TBD).
- Modo oscuro: no definido (opcional).
- Vistas de agenda 3 dias/semana: se definen en el mockup del change correspondiente.

## Como reemplazar
- Nombre: editar `BRAND_NAME` en `brand.js`.
- Logo: reemplazar `assets/logo.svg` (misma ruta).
- Valores visuales: editar variables en `tokens.css`; subir `Revision:` y volver a `Approval: pending`.

## Aprobacion
Aprobado por el equipo el 2026-11-21 (revisión 1), con nombre y logo aún provisionales (TBD).
