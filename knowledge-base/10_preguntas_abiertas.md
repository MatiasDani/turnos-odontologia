# Preguntas Abiertas

## Inconsistencias detectadas

### IN-01 — Ajuste del MVP entre la primera versión del informe y el checklist
**Informe (primera versión del agente) dice**: el MVP incluye ficha clínica con odontograma, presupuesto con caja y señas, auditoría y WhatsApp API.
**Checklist confirmado dice**: el MVP es agenda, turnos, reserva online, recordatorios por e-mail y `wa.me`, y roles básicos; lo demás es opcional.
**Impacto**: alcance desmedido para el plazo del TP.
**Resolución propuesta**: ya resuelta por el equipo el 2026-11-21: D.3 ajustado (ver DD-02). Esta KB sigue D.3 ajustado.

### IN-02 — Precio de AgendaPro
**Fuente A dice**: página de planes, Individual $9.900 por mes.
**Fuente B dice**: página dental, "desde $13.900 ARS/mes".
**Impacto**: el precio de referencia de la competencia es incierto; el plan orientado a salud es Premium ($39.900).
**Resolución propuesta**: no es bloqueante; verificar con una demo o consulta directa.

### IN-03 — Precio de DentalCore
**Fuente dice**: USD 50 por mes (2 usuarios) en FAQ y datos estructurados; la home lo muestra convertido a pesos ($78.987 con el valor por defecto), por lo que varía con el tipo de cambio. No existe el "$ 75.000" de la primera versión.
**Impacto**: comparación de precios en pesos no estable.
**Resolución propuesta**: tratarlo como precio en USD.

### IN-04 — Zona horaria no definida frente a un supuesto
**Suposición de la KB**: `America/Argentina/Buenos_Aires`; **checklist**: pregunta abierta. **Resuelta el 2026-11-21**: ver DD-09.

## Preguntas abiertas (priorizadas)

### Del checklist, punto 11

| Prioridad | Pregunta | Bloquea | Decisor |
|---|---|---|---|
| Alta | ¿Puede el odontólogo dar un turno sobre un bloqueo propio? (por defecto: no, RN-07) | Change de bloqueos | Equipo / Product Owner |
| Alta | ¿Qué pasa con los turnos ya dados cuando se crea un bloqueo encima? (provisoria: rechazar y listar conflictos, DD-06) | Change de bloqueos | Equipo |
| Resuelta | ¿La duración es fija por prestación o el profesional puede ajustarla en cada turno? | n/a | Resuelta el 2026-11-21: ajustable de forma opcional (DD-10, RN-06, RN-16) |
| Resuelta | ¿Qué zona horaria se usa? ¿Una por consultorio? | n/a | Resuelta el 2026-11-21: IANA por consultorio (DD-09) |
| Media | ¿El paciente necesita registrarse o alcanza con DNI y teléfono para reservar? | Change de reserva online | Equipo |
| Media | ¿Cuáles son las tarifas vigentes de WhatsApp Business Platform para Argentina? | Etapa WhatsApp Cloud API | Equipo (verificar en Meta) |
| Baja | ¿Qué proveedor de e-mail (SMTP/transaccional) con free tier se usa? | Change de recordatorios | Equipo técnico |
| Resuelta | ¿Qué stack tecnológico se usa? | n/a | Decidido: ver DD-01 |

### Datos "No evidenciado" o no verificables del informe

| Prioridad | Dato | Estado en el informe | Cómo verificar |
|---|---|---|---|
| Media | **DentalSoft: detección automática de solapamiento** | Solo afirmación comercial; el video oficial de 2020 no la muestra; sin sillones ni duraciones | Demo o prueba con la cuenta gratuita |
| Media | **AgendaPro: prevención de solapamientos** | La agenda por sillón y duración por práctica está documentada, pero "solapamiento" y "superposición" no aparecen | Demo (prueba de 14 días sin tarjeta) |
| Media | **DentalCore: sillones y solapamientos** | No evidenciado; "sillón" y "solapamiento" no aparecen en el sitio | Demo (prueba de 1 semana) |
| Media | **Precios inconsistentes de DentalCore y AgendaPro** | Ver IN-02 e IN-03 | Consulta directa |
| Baja | **Reseñas de Capterra** | No verificable: HTTP 403 con desafío anti-bot de Cloudflare, también en navegador real; no se usan | Acceso manual por el equipo |
| Baja | **Reseñas de Google de DentalSoft** (5,0 sobre 11) | Autopublicadas, sin ficha verificable; hay un homónimo chileno (dentalsoft.cl) | Verificación independiente |
| Baja | **ZYRA: contenido y alcance** | Relevado tras la verificación; sin evidencia de reserva online, sillones, solapamientos | Demo |
| Baja | **Cifra de odontólogos del país** (~70.000 y 3 % con herramienta tecnológica) | Atribuida a una tesis de la Universidad de San Andrés cuyo PDF estaba cifrado; **no usar sin leer la fuente** | Leer el PDF manualmente |
| Baja | **Consultorios.AR** (folleto de la AAC) | PDF comprimido ilegible; resumen sin verificar | Abrir el PDF manualmente |
| Baja | Otros sistemas sin fuente abierta (Reservo, Benty, MednIA, XDental, Pedí Tu Turno, Dentech, Dental Plus, Maxident) | No localizados o sin contenido odontológico | Fuera del alcance del TP |
| Baja | **Efectividad de e-mail + `wa.me`** vs WhatsApp automático | Supuesto no probado (SU-01) | Piloto o entrevistas |
| Baja | **Costo de WhatsApp en producción compatible con un precio accesible** | Supuesto no probado | Cuando se evalúe la Cloud API |
| Baja | Adopción por la secretaria | Supuesto no probado (SU-02) | Pruebas de usabilidad |
| Baja | Ley 27.706: cómo aplicaría cuando se agregue ficha clínica | Ninguno de los competidores lo trata | Análisis legal en etapa posterior |

### Preguntas surgidas de la KB (no están en las fuentes)

| Prioridad | Pregunta | Bloquea | Decisor |
|---|---|---|---|
| Resuelta | ¿Hace falta el estado `reservado` además de `confirmado`? | n/a | Resuelta el 2026-11-21: se mantiene; alta interna nace `confirmado`, reserva online `reservado` (DD-11) |
| Media | ¿El horario de atención se define por consultorio, por profesional o ambos? (SU-09). C-01 solo evalúa el horario del consultorio | C-05 | Equipo |
| Media | ¿`AgendarTurno` debe validar que el paciente exista? En C-01 no se valida (no hay repositorio de pacientes) | C-05 | Equipo |
| Media | ¿Se limita qué prestaciones puede realizar cada profesional y en qué sillones? | Primer change | Equipo |
| Baja | ¿Cómo se maneja el consentimiento de contacto y la eliminación de datos del paciente (Ley 25.326)? | Reserva online | Equipo |
| Baja | ¿La API REST con Fastify se implementa dentro del TP o solo los casos de uso con tests? | Alcance del change | Equipo |
| Baja | Versión mínima de Node LTS y de Vitest a fijar | Inicialización del proyecto | Equipo técnico |

### Campos de discovery con baja confianza

Ningún campo de `state.kb.discovery` quedó con baja confianza: `problem` y `scale` provienen del `discovery` de nivel superior; `system_type`, `stack` y `needs_infra` provienen de la decisión del equipo informada por el orquestador.
