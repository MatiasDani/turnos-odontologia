# Verificación visual de C-15

Capturas de 1440 × 900 (Chromium, `es-AR`, reloj del navegador fijo en el lunes 2026-11-23 10:00) de la interfaz implementada, con los datos ficticios de `tests/fixtures/sistema-http-recepcion.ts`. Se comparan con `../mockups/previews/` (mockups aprobados).

| Captura | Mockup | Resultado |
|---|---|---|
| `login-desktop.png`, `login-error-desktop.png`, `login-vencida-desktop.png` | `login*` | Igual |
| `agenda-dia-sillon-desktop.png` | `agenda-dia-sillon` | Igual en estructura y componentes (diferencias abajo) |
| `agenda-dia-profesional-desktop.png` | `agenda-dia-profesional` | Igual |
| `agenda-semana-desktop.png` | `agenda-semana` | Igual: lunes a viernes, selector de recurso |
| `turno-cancelar-desktop.png` | `turno-cancelar` | Igual |
| `reprogramar-desktop.png` | `reprogramar` | Igual |
| `dar-turno-buscar-desktop.png`, `dar-turno-alta-desktop.png` | `dar-turno-buscar`, `dar-turno-alta` | Igual |
| `bloquear-desktop.png` | `bloquear` | Igual, con el conflicto RN-31 listado |
| `estado-vacio-desktop.png` | `estado-vacio` | Igual |
| `odontologo-desktop.png` | `odontologo` | Igual: sin "Dar turno" ni panel de WhatsApp |

Diferencias justificadas:

1. **Fecha**: el mockup muestra un campo de texto `24/11/2026`; la implementación usa `<input type="date">` nativo, cuyo formato lo decide el navegador (en Chromium headless, `11/24/2026`). Es accesible y valida la fecha sin código propio.
2. **Usuario en la barra**: el mockup muestra "Recepción Demo"; el modelo de usuario de C-09 no tiene nombre, así que se muestra el e-mail.
3. **Panel de WhatsApp**: el mockup muestra el teléfono en cada pendiente; la implementación no lo muestra porque el enlace `wa.me` ya lo lleva y la vista de agenda no expone teléfonos (DD-40, mínimo dato). El texto de ayuda es genérico porque los pendientes no son solo de pacientes sin e-mail.
4. **Datos**: las capturas usan los datos ficticios de los tests (pocos turnos), no los del mockup.
