# Discovery — checklist de 11 puntos

> Resultado estructurado de la skill `discovery-research` (Etapa 2 del TP).
> Confirmado por el equipo el 2026-11-21. Insumo de `kb-creator`.
> Informe de mercado complementario: [`informe-discovery.md`](informe-discovery.md).

## 1. Problema

Los consultorios odontológicos chicos de Argentina gestionan la agenda en papel, planillas o WhatsApp. Esto produce turnos superpuestos por profesional y por sillón, sillones reservados dos veces y tiempo de recepción perdido en coordinar.

## 2. Usuarios y roles

Segmento de la v1: consultorio chico, de 1 a 5 profesionales y de 1 a 3 sillones o boxes.

| Rol | Verbo principal |
|---|---|
| Recepción / secretaria | Da, mueve y cancela turnos para todos los profesionales |
| Odontólogo | Consulta su agenda y bloquea horarios |
| Paciente | Reserva, confirma, cancela o reprograma su turno online |
| Administrador / dueño | Configura profesionales, sillones, prestaciones y horarios de atención |

## 3. Casos de uso principales

1. Como **recepción**, quiero dar un turno asignando profesional, sillón y prestación, para que no se superponga con otro turno. *(Bloquea el MVP; es el primer change.)*
2. Como **recepción o paciente**, quiero reprogramar o cancelar un turno, para liberar el horario.
3. Como **paciente**, quiero reservar un turno online las 24 horas desde un enlace, sin tener que llamar.
4. Como **paciente**, quiero recibir un recordatorio y confirmar mi asistencia, para no olvidarme del turno.
5. Como **odontólogo**, quiero bloquear horarios, para que no se den turnos cuando no atiendo.

## 4. Competidores

Se relevaron 19 sistemas en [`informe-discovery.md`](informe-discovery.md), secciones A y B. Top 5 de la matriz ponderada: DentalCore (4,30), AgendaPro (3,80), DentalSoft (3,73), ClinIA (3,52) y Dentalink (3,45).

**Hallazgo clave:** ningún proveedor documenta de punta a punta la prevención de solapamientos por profesional **y** por sillón con duración variable por prestación. DentalSoft declara detección de solapamiento sin mencionar sillones. AgendaPro declara agenda por sillón y duración por práctica, pero no menciona solapamientos.

Alternativa informal (también es competencia): papel, planilla y WhatsApp.

## 5. Funcionalidades necesarias (MVP)

- Agenda diaria y semanal con múltiples profesionales y múltiples sillones, duración por prestación y bloqueos de horario, sin solapamientos.
- Alta, cancelación y reprogramación de turnos con liberación del horario.
- Reserva online del paciente mediante enlace público 24/7.
- Recordatorios y confirmación por e-mail, más un enlace `wa.me` con el mensaje armado para que lo envíe la recepción.
- Roles básicos (administrador, odontólogo, recepción, paciente).

## 6. Funcionalidades opcionales (post-MVP)

- Recordatorios automáticos por WhatsApp Cloud API.
- Señas con Mercado Pago.
- Lista de espera con reasignación de huecos liberados.
- Seguimiento de ausentes y controles periódicos.
- Tablero de ocupación y de ausentismo.
- Ficha clínica, anamnesis y odontograma.
- Presupuestos y caja.
- Facturación ARCA, obras sociales y prepagas.
- Multi-sucursal.

## 7. Reglas de negocio

- **RN-01:** un turno ocupa a la vez un profesional y un sillón durante la duración de la prestación.
- **RN-02:** no puede haber dos turnos activos solapados para el mismo profesional.
- **RN-03:** no puede haber dos turnos activos solapados para el mismo sillón o box.
- **RN-04:** no existen sobreturnos; ningún rol puede forzar un solapamiento.
- **RN-05:** los intervalos son semiabiertos [inicio, fin). Un turno que empieza exactamente cuando termina otro no se solapa.
- **RN-06:** la duración del turno la define la prestación elegida.
- **RN-07:** no se pueden dar turnos en horarios bloqueados del profesional ni fuera del horario de atención.
- **RN-08:** el paciente puede cancelar o reprogramar online solo con 24 h o más de anticipación. Con menos de 24 h, solo puede hacerlo la recepción.
- **RN-09:** cancelar un turno libera el horario del profesional y del sillón.

## 8. Integraciones

| Integración | Estado | Costo |
|---|---|---|
| E-mail (recordatorios) | MVP | Gratis (free tier de un proveedor SMTP o transaccional; a confirmar) |
| Enlace `wa.me` (click-to-chat) | MVP | Gratis, sin API |
| Google Calendar | Opcional | Gratis, dentro de las cuotas de la API |
| WhatsApp Cloud API (Meta) | Post-MVP | Número de prueba gratis en desarrollo; cobro por mensaje con plantilla en producción |
| Mercado Pago | Post-MVP | Sandbox gratis; comisión por cobro en producción |

## 9. Restricciones

- **Costo $0:** solo herramientas y servicios gratuitos o del free tier.
- **Plazo del TP:** se completa un change de punta a punta; el resto queda documentado.
- **Datos:** solo datos ficticios en código, tests, ejemplos y capturas. Hay que respetar la Ley 25.326 (protección de datos personales) y la Ley 26.529 (derechos del paciente e historia clínica).
- **Stack:** no viene impuesto; lo define `kb-creator`.

## 10. Riesgos

- **Datos sensibles de salud** (riesgo principal): cumplimiento de la Ley 25.326 y la Ley 26.529, control de acceso, consentimiento y resguardo.
- **Supuesto no probado:** que el e-mail más el enlace `wa.me` reduzcan el ausentismo tanto como un recordatorio automático por WhatsApp.
- **Supuesto no probado:** que el costo de WhatsApp en producción sea compatible con un precio accesible.
- **Supuesto no probado:** que la secretaria adopte el sistema en lugar de WhatsApp y el papel.
- **Mercado:** competidores argentinos ya consolidados (DentalCore, AgendaPro, DentalSoft).

## 11. Preguntas abiertas

- ¿Qué stack tecnológico se usa? (lo decide `kb-creator`)
- ¿Cuáles son las tarifas vigentes de WhatsApp Business Platform para Argentina?
- ¿Puede el odontólogo dar un turno sobre un bloqueo propio?
- ¿Qué zona horaria se usa? ¿Una por consultorio?
- ¿La duración es fija por prestación o el profesional puede ajustarla en cada turno?
- ¿El paciente necesita registrarse o alcanza con DNI y teléfono para reservar?
- ¿Qué pasa con los turnos ya dados cuando se crea un bloqueo encima?
- Datos que el informe dejó como "No evidenciado" y deben verificarse: sillones y solapamientos en DentalCore; prevención real de solapamientos en AgendaPro; precios inconsistentes de DentalCore y AgendaPro; reseñas de Capterra; contenido de ZYRA; la cifra de odontólogos del país.
