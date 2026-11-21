# Visión y Objetivos

> Fuentes: `docs/discovery/checklist-discovery.md` (puntos 1, 2, 3, 5, 6, 9) e `docs/discovery/informe-discovery.md` (secciones C y D.3).

## Propósito del sistema

Sistema de gestión de turnos y agenda para consultorios odontológicos chicos de Argentina, cuyo núcleo es **garantizar que no existan turnos superpuestos por profesional ni por sillón (box)**, con duración variable según la prestación.

Contexto: los consultorios chicos (1 a 5 profesionales, 1 a 3 sillones) gestionan hoy la agenda en papel, planillas o WhatsApp. Eso produce turnos superpuestos por profesional y por sillón, sillones reservados dos veces y tiempo de recepción perdido en coordinar. La alternativa informal (papel, planilla, WhatsApp) es también competencia.

Es un trabajo práctico universitario (Metodología I, Tecnicatura Universitaria en Programación) realizado por un equipo de 6 estudiantes. Se completa **un change de punta a punta**; el resto del alcance queda documentado como etapas posteriores.

## Hallazgo de mercado que justifica el producto

El relevamiento de 19 sistemas (informe de Discovery, secciones A a C) mostró que:

- Son estándar de mercado: SaaS en nube, agenda multiprofesional, recordatorios por WhatsApp, ficha clínica con odontograma, presupuestos y caja.
- **Ningún proveedor documenta de punta a punta la prevención de solapamientos por profesional y por sillón con duración variable por prestación.** DentalSoft declara "detección automática de solapamiento" (afirmación comercial, sin sillones ni duraciones; su video oficial de 2020 no la muestra). AgendaPro documenta agenda por odontólogo, práctica y sillón con duración por práctica, pero no menciona solapamientos. Es la mayor oportunidad de diferenciación identificada.
- Otros vacíos del mercado argentino: lista de espera con reasignación automática, seguimiento de ausentes como flujo explícito, portabilidad/exportación de datos, transparencia de precios y cumplimiento visible de las Leyes 25.326 y 26.529.
- Top 5 de la matriz ponderada: DentalCore (4,30), AgendaPro (3,80), DentalSoft (3,73), ClinIA (3,52) y Dentalink (3,45). Todos son plataformas amplias (clínica, caja, ARCA); el producto no compite en amplitud sino en la **garantía verificable de la agenda por recursos**.

## Objetivos por actor

| Actor | Objetivo principal | Objetivos secundarios |
|---|---|---|
| Recepción / secretaria | Dar, mover y cancelar turnos para todos los profesionales sin solapamientos | Enviar recordatorios (e-mail y enlace `wa.me`); resolver cancelaciones con menos de 24 h |
| Odontólogo | Consultar su agenda y bloquear horarios | Ver los turnos del día y su estado |
| Paciente | Reservar, confirmar, cancelar o reprogramar su turno online 24/7 desde un enlace | Recibir recordatorios y confirmar asistencia |
| Administrador / dueño | Configurar profesionales, sillones, prestaciones y horarios de atención | Gestionar usuarios y roles |

## Alcance del MVP (alineado al punto 5 del checklist y a D.3 del informe)

- Agenda diaria y semanal multi-profesional y multi-sillón, **sin solapamientos**, con duración por prestación, bloqueos de horario y horario de atención. Sin sobreturnos.
- Alta, cancelación y reprogramación de turnos con registro de estado (confirmado, cancelado, ausente, atendido). Cancelar libera el horario.
- Reserva online del paciente mediante enlace público 24/7, respetando disponibilidad real, duración y recursos. El paciente cancela o reprograma online solo con 24 h o más de anticipación.
- Recordatorios y confirmación por e-mail, más un enlace `wa.me` con el mensaje armado que envía la recepción (costo $0).
- Roles básicos: administrador, odontólogo, recepción y paciente.

## Diferenciadores (post-MVP inmediato, según D.3)

- Lista de espera con oferta automática de huecos liberados.
- Seguimiento de ausentes y recordatorio de controles periódicos.
- Tablero de ocupación por sillón y profesional y tasa de ausentismo.
- Recordatorios automáticos por WhatsApp Cloud API (número de prueba en desarrollo; costo por mensaje con plantilla en producción).
- Cobro de señas con Mercado Pago (sandbox en desarrollo; comisión por cobro en producción).
- Precios en pesos publicados y plan gratuito acotado.

## Etapas posteriores (fuera del MVP)

Ficha del paciente con anamnesis y odontograma básico (FDI); presupuesto, plan de tratamiento y caja; registro de auditoría de accesos, exportación de datos del paciente y backups; facturación ARCA; obras sociales y prepagas; periodontograma e imágenes (DICOM); multi-sucursal; chatbot/asistente de IA, API pública y sincronización con Google Calendar; receta electrónica, firma digital y HL7 FHIR; importación desde otros sistemas.

> La primera versión del informe (agente) proponía un MVP más amplio (ficha clínica con odontograma, presupuesto con caja y señas, auditoría, WhatsApp API). El equipo lo redujo el 2026-11-21 (ver DD-02 en `09_decisiones_y_supuestos.md`).

## Fuera de alcance (explícito)

- Historia clínica, odontograma, anamnesis y cualquier dato clínico del paciente en la primera versión.
- Cobros, caja, presupuestos, facturación ARCA, obras sociales.
- Envío automático por WhatsApp Cloud API y señas con Mercado Pago (post-MVP).
- Sobreturnos: ningún rol puede forzar un solapamiento (RN-04).
- Multi-sucursal, chatbots de IA, interoperabilidad HL7 FHIR.
- Cualquier uso de **datos reales de pacientes** en el repositorio, tests, ejemplos o capturas.

## Restricciones

- **Costo $0**: solo herramientas y servicios gratuitos o de free tier.
- **Plazo del TP**: un change completo de punta a punta; el resto queda documentado.
- **Datos**: solo datos ficticios. Cumplimiento de la Ley 25.326 (protección de datos personales) y la Ley 26.529 (derechos del paciente e historia clínica). La Ley 27.706 (historia clínica electrónica) es referencia para etapas con ficha clínica.

## Métricas de éxito

- Cero turnos activos solapados por profesional o por sillón, verificado por pruebas automatizadas (incluidos casos de borde de intervalos semiabiertos).
- Un turno completo (alta, reprogramación y cancelación liberando el horario) funciona de punta a punta.
- Reserva online posible sin intervención de recepción, respetando RN-01 a RN-09.
- (Hipótesis a validar, no probada) Reducción del ausentismo con e-mail + `wa.me` frente a WhatsApp automático.
