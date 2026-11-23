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
| Resuelta | ¿El paciente necesita registrarse o alcanza con DNI y teléfono para reservar? | n/a | Resuelta el 2026-11-21 (explore de C-10): alta mínima sin cuenta con DNI, nombre, apellido, teléfono y consentimiento de contacto (DD-14, DD-17, RN-22) |
| Media | ¿Cuáles son las tarifas vigentes de WhatsApp Business Platform para Argentina? | Etapa WhatsApp Cloud API | Equipo (verificar en Meta) |
| Baja | ¿Qué proveedor de e-mail (SMTP/transaccional) con free tier se usa en producción? Para desarrollo y demo se decidió Ethereal con `nodemailer` (DD-21, 2026-11-22) | Post-MVP | Equipo técnico |
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
| Resuelta | ¿El horario de atención se define por consultorio, por profesional o ambos? (SU-09) | n/a | Resuelta el 2026-11-23 (explore de C-05): ambos; el horario propio del profesional prevalece por día de la semana y, sin tramos propios ese día, rige el del consultorio (DD-26, RN-28) |
| Media | ¿`AgendarTurno` debe validar que el paciente exista? En C-01 no se valida. El 2026-11-23 el explore de C-05 la dejó fuera de su alcance (C-05 configura recursos, no pacientes); `PacienteRepositorio.obtenerPorId` ya existe desde C-12 | Change que toque el alta interna (candidato: C-09 o C-15) | Equipo |
| Media | ¿El alta (`AgendarTurno`) también debe exigir que el profesional realice la prestación? (RN-19). Desde el 2026-11-21 la disponibilidad (C-07) y la reserva online (RN-19) exigen profesional habilitado, pero el alta interna de C-01 no lo valida (DD-12, DD-14). El 2026-11-23 el explore de C-05 la dejó fuera de su alcance: C-05 permite configurar `prestacionIds`, pero no cambia el alta | Change que toque el alta interna (candidato: C-09 o C-15) | Equipo |
| Baja | ¿Se respeta `Prestacion.requiereSillonIds` (sillones compatibles con la prestación)? En C-07 no se considera: cualquier sillón activo sirve (DD-12). El 2026-11-23 el explore de C-05 la dejó fuera de su alcance: el campo no existe en el código y C-05 no lo agrega | Post-MVP (o un change propio si el equipo lo prioriza) | Equipo |
| Parcial | ¿Se limita qué prestaciones puede realizar cada profesional y en qué sillones? | Ver las dos filas anteriores | Parcialmente resuelta el 2026-11-21 (DD-12): la disponibilidad usa `Profesional.prestacionIds`, que desde C-05 configura el administrador (DD-27); siguen abiertas la exigencia en el alta interna (RN-19 la fija solo para la reserva online) y `requiereSillonIds` (ver las dos filas anteriores) |
| Baja | ¿Cómo se maneja el consentimiento de contacto y la eliminación de datos del paciente (Ley 25.326)? | Reserva online | Equipo |
| Resuelta | ¿La API REST con Fastify se implementa dentro del TP o solo los casos de uso con tests? | n/a | Resuelta el 2026-11-23 (propose de C-14, DD-29): Fastify 5 con fábrica `crearApp` reutilizable por C-15; endpoints públicos y logs redactados en C-14; el rate limit queda abierto (fila siguiente) |
| Alta | ¿Qué rate limit se aplica a las rutas públicas (por IP, por DNI, límites) y en qué change? C-14 no lo incluye (DD-29): requisito antes de publicar fuera de la demo | Change que publique el sistema (post C-14) | Equipo |
| Resuelta | ¿El alta online pide nombre y apellido? | n/a | Resuelta el 2026-11-21: sí, nombre y apellido obligatorios (trim, no vacíos, máx. 80); e-mail opcional con formato válido (DD-17) |
| Resuelta | ¿La consulta pública expone nombres de profesionales? | n/a | Resuelta el 2026-11-21: sí, nombre y apellido del profesional (personal del consultorio); nunca el sillón ni datos de pacientes (DD-18) |
| Resuelta | ¿Quién crea el puerto `Reloj` y el puerto `PacienteRepositorio`, y con qué firma? | n/a | Resuelta el 2026-11-21: los crea C-10 (`Reloj { ahora(): Date }`; `PacienteRepositorio { obtenerPorDni, guardar }`); C-02 reutiliza el `Reloj` y C-05 extiende el repositorio (DD-16) |
| Resuelta | ¿Cómo entrega C-12 el enlace de gestión si solo se guarda el hash del token? | n/a | Resuelta el 2026-11-21: rotación; cada recordatorio llama a `rotar(turnoId)` del servicio de tokens de C-10, que emite uno nuevo e invalida el anterior (DD-15) |
| Media | Riesgo documentado en C-10: dos reservas concurrentes del mismo DNI nuevo podrían crear dos pacientes y el duplicado/tope de RN-23 no es atómico en la implementación en memoria. ¿Cómo se garantiza? | Integración HTTP y persistencia real (C-14 o el change que integre PostgreSQL) | Equipo: índice único por DNI y transacción (paciente, turno y token en una sola unidad) |
| Media | Riesgo documentado en C-10: `RESERVA_DUPLICADA` y `LIMITE_DE_TURNOS` permiten inferir que un DNI tiene reservas online (tensión con RN-22). ¿Qué mitigación definitiva se adopta? | Integración HTTP | Equipo: mensajes genéricos ya aplicados; logs redactados en C-14 (DD-29); falta rate limit (ver fila de rate limit) |
| Resuelta | ¿Qué estados se pueden cancelar, con qué código se rechaza y cómo se evita que una cancelación y una reprogramación concurrentes se pisen? | n/a | Resuelta el 2026-11-22 (explore de C-02): solo `reservado` y `confirmado`; transición inválida `RN-10`, falta de anticipación `RN-08`; `TurnoRepositorio.actualizarSi` atómico (DD-19) |
| Media | `Turno` todavía no tiene `creadoEn` ni `actualizadoEn` (definidos en `04_modelo_de_datos.md`). C-02 solo agrega `canceladoEn` y `canceladoPor`; agregarlos obliga a inyectar el `Reloj` en `AgendarTurno` y ajustar los tests de C-01 y C-10. Pospuesta el 2026-11-22 en el explore de C-04 (DD-20): C-04 no los agrega | Change que integre la persistencia real (PostgreSQL) | Equipo |
| Resuelta | ¿Qué transiciones cubre C-04, con qué error se rechazan y si el cierre del turno tiene restricción horaria? | n/a | Resuelta el 2026-11-22 (explore de C-04): `reservado → confirmado` y `confirmado → atendido / ausente`; transición inválida o repetida `RN-10`; `atendido`/`ausente` solo con `ahora >= inicio` (RN-24) (DD-20) |
| Media | La matriz RBAC no tiene fila para cambiar el estado del turno (confirmar, marcar atendido o ausente). C-04 no controla roles: ¿quién puede confirmar (paciente por token, recepción, administrador) y quién puede cerrar el turno (recepción, odontólogo, administrador)? | C-09 | Lautaro Medina (C-09) |
| Media | La matriz RBAC no permite cancelar ni reprogramar al odontólogo, pero `CancelarTurno` (C-02) no controla roles y lo trata como a la recepción. C-09 debe cubrir cancelar y reprogramar en el control de acceso | C-09 | Lautaro Medina (C-09) |
| Resuelta | Si el adaptador real de recordatorios (C-12) falla al cancelar, la cancelación ya quedó persistida y el error se propaga (DD-19). ¿Se reintenta o se registra para un proceso posterior? | n/a | Resuelta el 2026-11-22 (explore de C-12): sin reintento; el barrido revalida el estado del turno antes de enviar y marca `cancelado` el pendiente de un turno que ya no está activo (RN-25, DD-21) |
| Media | ¿Qué proceso ejecuta periódicamente `EnviarRecordatoriosPendientes` (cron, `setInterval`) y cada cuánto? El propose de C-14 lo deja fuera de su alcance (requiere SMTP y operación; a confirmar por el owner) | Change que opere el despliegue (post C-14) | Equipo |
| Resuelta | C-03 debe llamar a `Recordatorios.programar(turnoId)` después de reprogramar el turno para mover el recordatorio (DD-21) | n/a | Resuelta el 2026-11-23 (explore de C-03, DD-22): se llama después de persistir y fuera de la sección crítica; si falla, el error se propaga y el turno ya movido no se deshace (RN-25, DD-21) |
| Resuelta | El token de la respuesta de la reserva deja de valer cuando sale el recordatorio (rotación, RN-21). C-11 resuelve con `resolver` y no necesita cambios, pero la pantalla de C-14 debería avisar que el enlace vigente es el del último e-mail | n/a | Resuelta el 2026-11-23 (propose de C-14): la confirmación de la reserva y el mensaje de enlace inválido lo avisan (spec `interfaz-paciente`) |
| Media | C-05 permite eliminar o modificar un tramo de `HorarioAtencion` sin revisar los turnos activos futuros que quedarían fuera de horario (RN-27 solo cubre profesional, sillón y prestación; DD-27). ¿Se rechaza y se listan los conflictos, como RN-27? | Change posterior de configuración o C-15 | Equipo / Alejo Carabelli |
| Baja | La desactivación de un recurso (RN-27) y un alta concurrente no comparten sección crítica: un alta que ya leyó el recurso activo puede crear un turno sobre un recurso recién desactivado (DD-25) | Change que integre la persistencia real (PostgreSQL) | Equipo técnico |
| Baja | Versión mínima de Node LTS y de Vitest a fijar | Inicialización del proyecto | Equipo técnico |

### Campos de discovery con baja confianza

Ningún campo de `state.kb.discovery` quedó con baja confianza: `problem` y `scale` provienen del `discovery` de nivel superior; `system_type`, `stack` y `needs_infra` provienen de la decisión del equipo informada por el orquestador.
