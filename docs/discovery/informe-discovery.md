# Relevamiento de mercado: sistemas de gestión de turnos y agenda para consultorios odontológicos (Argentina y Latinoamérica)

**Materia:** Metodología I — Tecnicatura Universitaria en Programación
**Integrantes:** (TBD — completar)
**Fecha:** 2026-11-21

---

## Resumen ejecutivo

**Qué se investigó.** Se relevaron 19 sistemas que ofrecen, total o parcialmente, gestión de turnos y agenda para odontología: productos de origen o foco argentino, productos regionales con operación en Argentina (Chile y otros) y cinco internacionales (EE. UU., Reino Unido, España) como referencia. El origen de varios proveedores no figura en sus sitios y se consigna como NE. Para cada uno se abrió el sitio oficial (o, cuando se indica, una fuente de terceros) y se registró únicamente lo que la fuente dice. Lo que no figura se consigna como "No evidenciado" (NE). Todas las consultas se hicieron el 2026-11-21.

**Criterio de evidencia.** Ninguna funcionalidad fue probada en una demo ni con una cuenta propia. "Comprobado" significa que el sitio oficial o el centro de ayuda la describe de forma concreta (por ejemplo, "agenda por profesional, práctica y sillón"). "Afirmación comercial" significa una declaración genérica, una cifra autodeclarada o un cumplimiento normativo sin documentación (por ejemplo, "cumple la Ley 25.326"). La verificación personal por el equipo está pendiente (ver sección "Verificación de fuentes").

**Hallazgos principales.**
1. El mercado argentino de software odontológico en la nube está poblado por proveedores pequeños y recientes, con propuestas muy desparejas. Solo un subconjunto (DentalCore, AgendaPro, DentalSoft, ClinIA, Dentalink) documenta agenda, clínica y administración con un nivel de detalle utilizable.
2. Son estándar de mercado: SaaS en nube, agenda multiprofesional, recordatorios por WhatsApp, ficha clínica con odontograma, presupuestos y caja básica.
3. Pocas funciones críticas para Argentina están documentadas: facturación ARCA (solo DentalCore y ClinIA la muestran como disponible; AgendaPro la anuncia como "próximamente"), liquidación a obras sociales (DentalCore, DentalSoft, ClinIA, Dentalink, OdontoGRAMA), y cobros con Mercado Pago (DentalCore, DentalSoft, AgendaPro).
4. El requisito del TP más relevante para el diseño del producto, la **prevención de solapamientos por profesional y por sillón/box con duración variable por prestación**, no está documentado de punta a punta por ningún proveedor. DentalSoft declara detección automática de solapamiento (sin sillones ni duraciones); AgendaPro declara agenda por sillón y duración por práctica (sin mencionar solapamientos). Esta es la mayor oportunidad de diferenciación identificada.
5. La mención explícita de la Ley 25.326 es rara (AgendaPro y DentalCore la citan; la mayoría no). Los precios son heterogéneos: algunos en pesos, otros en dólares, varios sin publicar, y dos proveedores muestran inconsistencias internas (DentalCore, AgendaPro).

**MVP recomendado (síntesis, ajustado por el equipo).** Agenda multiprofesional y multi-sillón con prevención de solapamientos por profesional y por sillón/box, duración variable por prestación, bloqueos y sin sobreturnos; alta, cancelación y reprogramación de turnos; reserva online por enlace; recordatorios por e-mail y enlace `wa.me`; roles básicos. Diferenciadores: lista de espera con reasignación automática, seguimiento de ausentes, tablero de ocupación, WhatsApp Cloud API y señas con Mercado Pago. Para etapas posteriores: ficha clínica y odontograma, presupuestos y caja, auditoría y exportación, facturación ARCA, obras sociales, periodontograma, imágenes DICOM, multi-sucursal y asistente de IA. La primera versión del agente era más amplia; el ajuste y su motivo están en la sección D.3.

**Limitaciones.** Los resultados de WebFetch son extractos generados por un modelo de lectura, no copias textuales de las páginas. Capterra bloqueó el acceso (HTTP 403). Dos PDF (una tesis de la Universidad de San Andrés y un folleto de la AAC sobre Consultorios.AR) estaban cifrados o comprimidos y no pudieron leerse. El sitio de ZYRA devolvió solo su título. Detalles en cada fila y en "Fuentes no abiertas o no concluyentes".

---

## Convenciones

- **C** = Comprobado: descrito de forma concreta en la fuente oficial indicada. Entre paréntesis: dónde (S = sitio oficial, P = página de precios, A = centro de ayuda, B = blog o contenido del proveedor, T = fuente de terceros). No implica que el equipo lo haya probado.
- **AC** = Afirmación comercial: declaración genérica, cifra autodeclarada o cumplimiento sin documentación.
- **NE** = No evidenciado en la fuente consultada. No significa que no exista.
- Fecha de consulta de todas las fuentes: **2026-11-21**.
- Las referencias [n] remiten a la sección "Referencias completas".
- Orden de las filas: relevancia estimada para Argentina (foco local, evidencia de funciones locales, disponibilidad de información).

---

## A. Tabla comparativa

### A.1 Identificación

| # | Producto / proveedor | País · segmento | Modalidad | URL oficial | Consulta |
|---|---|---|---|---|---|
| 1 | **DentalCore** / Alfredo Di Tullio | Argentina (La Plata) · consultorios y clínicas, uno o varios profesionales | C (S): nube por navegador, celular, tablet; app para Windows [1] | https://dentalcore.app/ | 2026-11-21 |
| 2 | **DentalSoft** / DentalSoft | Argentina (sedes La Plata y Rosario) · consultorios y clínicas | C (S): 100 % nube [2] | https://dentalsoft.com.ar/ | 2026-11-21 |
| 3 | **AgendaPro** / AgendaPro Inc. | País de origen: NE en la página consultada (sitios por país, incluido Argentina) · dentistas, clínicas y consultorios (plataforma multirrubro con página dental) | C (S): software en la nube, servidores AWS [3][4] | https://agendapro.com/ar/dental/software-odontologico | 2026-11-21 |
| 4 | **ClinIA / OdontoClinIA** / Emprinet | Argentina · consultorios privados, clínicas PyME, centros de salud municipales, hospitales públicos, cadenas | C (S): web, instancia por cliente con subdominio [5] | https://www.clinia.com.ar/odontologia | 2026-11-21 |
| 5 | **Dentalink** / Engenis SpA | Chile (Santiago) · consultorio individual y clínicas multisucursal; módulo exclusivo para Argentina | C (S): 100 % nube [6][7] | https://www.softwaredentalink.com/ar | 2026-11-21 |
| 6 | **Dentiqa** / Violet Wave | Origen NE; lista Argentina entre sus países · clínicas pequeñas a grupos | C (S): SaaS en navegador [8] | https://dentiqa.app | 2026-11-21 |
| 7 | **OdontoApp** / empresa NE | Origen NE (dominio .com.ar; declara servicio en 19 países) · odontólogos y consultorios | NE [9] | https://odontoapp.com.ar/ | 2026-11-21 |
| 8 | **OdontoGRAMA** / Julio Santolo (sello Solsoftware) | País NE (enlace de contacto +54) · consultorios odontológicos | C (S): nube; PC, tablet o celular [10] | https://odontograma.com.ar/ | 2026-11-21 |
| 9 | **OdontoDrive** / empresa NE | País NE · odontólogos; plan "Clínica" hasta 10 doctores | C (S): SaaS en nube [11] | https://odontodrive.com/ | 2026-11-21 |
| 10 | **ZYRA** / NE | NE (dominio .ar) · "Gestión Odontológica Integral" (solo el título) | NE: el sitio no entregó contenido (probable aplicación JavaScript) [12] | https://www.appzyra.ar/ | 2026-11-21 |
| 11 | **XIAgenda** / NE | Argentina según la ficha de terceros · consultorios y centros de salud (no específico de odontología) | NE; sitio oficial no abierto (la ficha no da URL) [13] | URL oficial no figura; fuente: https://www.comparasoftware.com/xiagenda | 2026-11-21 |
| 12 | **Doctoralia Argentina** (agenda para doctores) / proveedor NE en la página | Argentina · marketplace de pacientes con perfiles de odontólogos | NE [14] | https://www.doctoraliar.com/odontologo (www.doctoralia.com.ar no respondió: ECONNREFUSED) | 2026-11-21 |
| 13 | **OdontoPlus** / Kodea Labs - MangoPOS | País NE (selector US$ y RD$) · odontólogo independiente a grupos multisucursal | C (S): nube, app.miodontoplus.com [15] | https://miodontoplus.com/ | 2026-11-21 |
| 14 | **Dentidesk** / Dentidesk | Chile (Santiago) · clínicas dentales, centros médicos, hospitales, instituciones educativas, sindicatos | NE (tiene app móvil) [16] | https://www.dentidesk.cl/ | 2026-11-21 |
| 15 | **Medesk** / Medesk | Sede NE (usuarios en Colombia, Perú y México según su blog) · clínicas dentales y otras especialidades | NE explícito; web [17][18] | https://www.medesk.net/es/solutiones/odontologia | 2026-11-21 |
| 16 | **Clinic Cloud** / Doctoralia España SL | España (Barcelona) · clínicas y profesionales sanitarios en general; odontología NE en la página | NE; "sin coste de instalación" [19] | https://www.clinic-cloud.com/ | 2026-11-21 |
| 17 | **Dentrix** / Henry Schein One | EE. UU. (Utah) · consultorios de uno o varios sitios | C (S): "on premises" frente a Ascend; imágenes en nube [20] | https://www.dentrix.com/ | 2026-11-21 |
| 18 | **Open Dental** / Open Dental Software | País NE · consultorios de cualquier tamaño | NE [21] | https://www.opendental.com/ | 2026-11-21 |
| 19 | **Dentally** / Henry Schein One UK | Reino Unido · clínicas dentales | C (S): nube [22] | https://www.dentally.com/ | 2026-11-21 |

### A.2 Agenda, turnos digitales y automatización

Cada celda: agenda | turnos digitales | automatización.

| # | Gestión de agenda (vistas, profesionales, sillones, duración, bloqueos, sobreturnos, solapamientos) | Turnos digitales (reserva online, WhatsApp, confirmar/cancelar/reprogramar, lista de espera) | Automatización (recordatorios, ausentes, recuperación, campañas) |
|---|---|---|---|
| 1 | C (S): vistas día, 3 días, semana y mes con mapa de calor y kanban; multi-doctor; bloqueos; arrastrar y soltar. NE: sillones, duración, sobreturnos, solapamientos [1] | C (S): confirmar o cancelar desde un enlace; WhatsApp con API oficial de Meta y bandeja compartida. NE: reserva online de turnos nuevos, lista de espera [1] | C (S): recordatorios por WhatsApp, e-mail o SMS 48 y 24 h antes; analítica de ausentismo y retención. NE: seguimiento activo de ausentes, campañas [1] |
| 2 | C (S): vistas semanal, diaria y mensual; horarios por odontólogo; bloqueos (feriados); sobreturnos y urgencias con "detección automática de solapamiento"; multi-sucursal; drag and drop. NE: sillones, duración configurable [2] | C (S): reserva online en 4 pasos con cupos en tiempo real, reconocimiento por DNI, filtro por especialidad y obra social; chatbot 24 h (plan Pro). NE: lista de espera [2] | C (S): recordatorios por WhatsApp y e-mail (automáticos en Pro, manuales en Gestión); WhatsApp lo cobra Meta, USD 0,026 por recordatorio según el sitio; reseñas de Google automatizadas (Pro). NE: ausentes, campañas [2] |
| 3 | C (S): agenda por odontólogo, práctica y sillón; duración por práctica; vista del día. NE: bloqueos, sobreturnos, solapamientos [3] | C (S): turnos online 24/7, sitio de reservas, reserva desde Google Maps; atención por WhatsApp, Instagram y Messenger. NE: lista de espera [3] | C (S): recordatorios por WhatsApp 1, 2 o 3 días antes; IA que da seguimiento a presupuestos pendientes; campañas (Meta Ads, Google Ads en captura). AC: efectividad "Presupuestos que se cierran" [3][4] |
| 4 | C (S): turnos por profesional, especialidad o sillón; múltiples profesionales. NE: vistas, duración, bloqueos, sobreturnos, solapamientos [5] | C (S): turnero web y app para pacientes; asistente de IA por WhatsApp que toma, confirma, cancela y reprograma y deriva a una persona. NE: lista de espera [5] | C (S): recordatorios automáticos por WhatsApp y correo. NE: ausentes, campañas [5] |
| 5 | NE: vistas, sillones, duración, bloqueos, sobreturnos, solapamientos (el sitio no los describe). Reagendamiento automático (plan Titanium) [6] | C (S): agendamiento online, turnos por WhatsApp, contact center de IA por WhatsApp y llamadas. NE: lista de espera [6] | C (S): recordatorios y confirmaciones automáticas por WhatsApp; seguimiento automático de presupuestos (Titanium); encuestas y campañas de e-mail (Titanium) [6][23] |
| 6 | C (S): vistas día y semana; multi-dentista; bloqueos por franja, día completo o vacaciones; reprogramación con validación de horario. NE: sillones, duración, sobreturnos, solapamientos [8] | C (S): turno por WhatsApp con chatbot de IA 24/7 (API oficial de Meta). NE: portal de reserva propio, lista de espera [8] | C (S): recordatorios por WhatsApp 24 h y 2 h antes. NE: ausentes, campañas [8] |
| 7 | C (S): "agenda digital" sin más detalle. NE: todo lo demás [9] | NE [9] | C (S): "recordatorios automáticos" sin canal especificado [9] |
| 8 | C (S): agendas personalizables con control de asistencia; varios usuarios. NE: sillones, duración, bloqueos, sobreturnos, solapamientos [10] | NE: reserva online, lista de espera. El WhatsApp es solo un botón de contacto [10] | NE [10] |
| 9 | C (S): vistas día, semana y mes; hasta 10 doctores (plan Clínica); "multi-sillón" (plan Avanzado); agenda para secretaria (Premium). NE: duración, bloqueos, sobreturnos, solapamientos [11] | NE: reserva online, WhatsApp, lista de espera [11] | NE: recordatorios de turnos. Solo "recordatorios de pago" [11] |
| 10 | NE [12] | NE [12] | NE [12] |
| 11 | C (T): múltiples profesionales por consultorio [13] | C (T): agente de IA atiende por WhatsApp, web y correo para agendar, reprogramar y cancelar; lista de espera que ofrece turnos liberados [13] | C (T): recordatorios con pedido de confirmación [13] |
| 12 | NE: "Agenda para doctores" figura como enlace sin descripción [14] | C (S): los pacientes buscan, filtran por obra social y piden turno desde el perfil [14] | NE [14] |
| 13 | C (S): agenda multi-doctor por profesional, sillón o sucursal. NE: vistas, duración, bloqueos, sobreturnos, solapamientos [15] | C (S): enlace de citas en línea para Instagram y Google (plan Clínica); WhatsApp para confirmar, cancelar y reagendar; lista de espera para cubrir huecos [15] | C (S): recordatorios por WhatsApp (Clínica) y e-mail (Consultorio); aviso de control periódico cada 6 meses [15] |
| 14 | C (S): agenda por profesional, personalizable; agendar, modificar y reprogramar. NE: boxes, duración [16] | C (S): agendamiento online. WhatsApp automático figura como "próximamente". NE: lista de espera [16] | C (S): recordatorios personalizados [16] |
| 15 | C (S, B): agenda "inteligente" con detección de huecos; multi-sucursal [17][18] | C (S, B): reserva online desde la web; recordatorios por WhatsApp según el blog. NE: lista de espera [17][18] | C (B): confirmación y recordatorio automático [18] |
| 16 | C (S): agenda multiprofesional y multisede, "optimiza huecos y evita ausencias" (AC) [19] | C (S): reserva a través de Doctoralia; recordatorios y confirmaciones por WhatsApp, SMS y e-mail [19] | C (S): recordatorios y confirmaciones automáticos [19] |
| 17 | NE: la agenda no se describe en detalle ("scheduling simplificado") [20] | C (S): reservas online automatizadas [20] | C (S): recordatorios automatizados [20] |
| 18 | NE [21] | C (S): "Web Sched" mencionado sin detalle [21] | C (S): "Automated Messaging", texting y correo masivo [21] |
| 19 | C (S): gestión de agenda y herramientas de reserva [22] | C (S): reserva online y portal; listas de espera [22] | C (S): recordatorios y confirmaciones automáticos [22] |

### A.3 Gestión odontológica y administración

| # | Gestión odontológica (ficha, anamnesis, odontograma, periodontograma, imágenes, presupuestos) | Administración (caja, cobros, señas, Mercado Pago, obras sociales, ARCA, reportes) |
|---|---|---|
| 1 | C (S): historias clínicas por especialidad; odontograma con "más de 50 hallazgos"; periodontograma de 6 sitios por pieza (clasificación 2018); radiografías, tomografía 3D, cefalometría, placas con IA (AC: "la IA propone, vos decidís"); presupuesto generado desde el plan [1] | C (S): caja con apertura, cierre y arqueo; cobros por QR, enlace o tarjeta; Mercado Pago y PayPal; obras sociales con liquidación por período (65 cargadas, según el sitio); ARCA Factura A, B o C con CAE y QR; analítica de ingresos, producción por profesional, ausentismo [1] |
| 2 | C (S): ficha, antecedentes, notas; odontograma de 18 estados, notación FDI, historial de cambios; presupuestos desde catálogo con cobertura de obra social, compartibles por enlace; recetas y consentimientos (plan Gestión); almacenamiento de imágenes (5 o 10 GB). NE: periodontograma, módulo de radiografías [2] | C (S): caja diaria; señas y enlaces de pago de Mercado Pago (Pro); obra social por tratamiento y plan con liquidaciones; reportes de ocupación y facturación. NE: ARCA [2] |
| 3 | C (S): historia clínica con anamnesis, evoluciones, alergias; odontograma digital; radiografías adjuntas; presupuestos por WhatsApp. En la página de planes, la ficha clínica, consentimientos y presupuestos figuran desde el plan Premium. NE: periodontograma [3][4] | C (S, P): caja multisede; cobros online con seña, total o cuotas; enlaces de Mercado Pago; reportes de ocupación por sillón e ingresos. NE: obras sociales. Facturación electrónica: "próximamente" [3][4] |
| 4 | C (S): historia clínica con CIE-10 y adjuntos; odontograma FDI de 52 piezas, versionado, exporta PDF; "plan de tratamiento con importe estimado". NE: periodontograma, presupuesto como módulo, radiografías específicas [5] | C (S): caja con arqueo; cobros en pesos, dólares o euros; recibo PDF por WhatsApp; verificación de cobertura con PUCO y facturación a obras sociales y prepagas; factura electrónica ARCA. NE: Mercado Pago, módulo de reportes [5] |
| 5 | C (S, A): historia clínica; odontograma con versiones (24 h), nomenclaturas Continuo, ADA y FDI, anulación sin borrado e índice de placa; imágenes y radiografías, análisis de RX con IA (AC); presupuestos. NE: periodontograma [6][24] | C (S, A): control de caja y cobros; configuración de aranceles y coberturas; módulo Argentina con alta de obras sociales, cobro con obra social, conciliaciones y receta electrónica (solo títulos de artículos); reportes y dashboard (Pro). NE: Mercado Pago, ARCA [6][7] |
| 6 | C (S): historia clínica de 8 pestañas con evoluciones, consentimientos y galería; odontograma permanente y temporal, versionado, modo pediátrico; periodontograma (BOP, NIC, placa); galería de radiografías e intraorales; presupuestos dentro del plan de tratamiento [8] | C (S): reportes de citas, ingresos facturados, top de tratamientos, rendimiento por dentista. NE: caja, cobros, Mercado Pago, obras sociales, ARCA [8] |
| 7 | C (S): historia clínica y odontograma, sin detalle. NE: periodontograma, imágenes, presupuestos [9] | NE [9] |
| 8 | C (S): ficha de paciente con imágenes, tratamientos y diagnósticos. El odontograma figura solo en el nombre. NE: periodontograma, presupuestos [10] | C (S): caja, cuentas corrientes, facturación a prepagas y obras sociales, gastos, estadísticas. NE: Mercado Pago, ARCA [10] |
| 9 | C (S): historia clínica digital; odontograma; comparador de radiografías con IA (AC); 5 GB de DICOM (plan Estándar); presupuestos en PDF. NE: periodontograma [11] | C (S): recordatorios de pago y alerta de deudores. NE: caja, obras sociales, ARCA, reportes. Mercado Pago aparece solo como procesador de pagos del propio proveedor [11] |
| 10 | NE [12] | NE [12] |
| 11 | NE [13] | C (T): señas por Mercado Pago [13] |
| 12 | NE [14] | NE [14] |
| 13 | C (S): historia clínica con alertas, consentimientos con firma digital, recetas; odontograma por superficies, dentición adulta e infantil; fotos y RX adjuntas; presupuestos con logo y firma del paciente. El periodontograma figura solo como "integrado" en un banner (sin detalle) [15] | C (S): cuadre de caja, abonos y saldos, pagos parciales, gastos, comisiones, inventario, reportes. Obras sociales: habla de "aseguradoras" (no equivalente confirmado). NE: Mercado Pago, ARCA [15] |
| 14 | C (S): fichas digitales, odontograma (nomenclatura chilena, internacional o universal), fichas de endodoncia, periodoncia, ortodoncia y otras, consentimiento digital. NE: periodontograma, imágenes, presupuestos [16] | C (S): registro de pagos; más de 20 reportes; facturación con SII (Chile). NE: caja [16] |
| 15 | C (S, B): odontograma digital de 5 caras con periodontograma y módulo de ortodoncia (blog). NE: imágenes, presupuestos [17][18] | C (S, B): facturas desde la ficha, registro de pagos, reportes de ingresos; facturación CFDI (México) y DIAN (Colombia) según el blog; ARCA NE [17][18] |
| 16 | NE: la página no menciona odontología [19] | C (S): facturas, bonos, mutuas y cobros integrados (Verifactu y TicketBAI, España) [19] |
| 17 | C (S): charting clínico (sin detalle de odontograma), planes de tratamiento, imágenes con detección por IA. NE: periodontal, módulo de presupuestos [20] | C (S): facturación, cobros y procesamiento de pagos [20] |
| 18 | C (S): "Graphical Tooth Chart" y vista 3D. NE: periodontal, imágenes, presupuestos [21] | C (S): "Payment Portal", "Message-to-Pay", "Discount Plans" [21] |
| 19 | C (S): imagen digital integrada con detección por IA. "Efficient charting" sin detalle; odontograma NE; presupuestos NE [22] | C (S): pagos a través del portal [22] |

### A.4 Integraciones, operación y seguridad

| # | Integraciones (WhatsApp API, Google Calendar, web, API, Mercado Pago, ARCA, radiología, firma) | Operación (sucursales, roles, auditoría, exportación, soporte) | Seguridad y normativa argentina |
|---|---|---|---|
| 1 | C (S): API oficial de Meta, Mercado Pago, PayPal, HL7 FHIR R4 y R5, Google Calendar (para migrar turnos), ARCA [1] | C (S): varias clínicas en una cuenta; 4 roles (recepción y asistentes no ven lo clínico); auditoría no editable de quién abrió cada ficha; verificación en dos pasos; exportación a PDF y FHIR, incluso con cuenta suspendida [1] | C (S): base aislada por clínica, TLS, backups cifrados AES-256-GCM, sesión de 2 h. AC: sigue controles de ISO/IEC 27001 (aclara que no está certificado) y "pensada para ayudarte a cumplir" la Ley 25.326 [1] |
| 2 | C (S): Google Calendar, WhatsApp, Mercado Pago, exportación PDF y Excel, reseñas de Google; importación de pacientes desde Excel o CSV. NE: ARCA [2] | C (S): multi-sucursal; permisos por rol; historial de cambios del odontograma con profesional y fecha. NE: auditoría general. Exportación de datos y copias de seguridad declaradas [2] | C (S): copias de seguridad; enlaces a privacidad y eliminación de datos. NE: mención de Ley 25.326 [2] |
| 3 | C (S, P): Google Calendar, Google Maps, Meta Ads, Google Ads, Mercado Pago, WhatsApp; API de integraciones a US$ 200 al mes [3][4] | C (S): control multisede con reportes consolidados. NE: roles, auditoría, exportación [3] | C (S): cifrado, respaldos automáticos, acceso restringido por profesional, servidores AWS. AC: "cumple con la Ley 25.326" [3] |
| 4 | C (S): ARCA, PUCO, RENAPER, receta electrónica HL7 FHIR (ReNaPDiS nº 248); WhatsApp [5] | C (S): sucursales con dashboard único. NE: roles y permisos por perfil (solo "acceso controlado"), auditoría explícita ("registro operativo"), exportación (solo PDF) [5] | C (S): copias cada 10 minutos. AC: soporte 24/7, actualizaciones diarias. NE: Ley 25.326 (hay enlaces a /privacidad y /seguridad no leídos) [5] |
| 5 | C (S): API como complemento; módulo Argentina (obras sociales, receta electrónica). NE: Mercado Pago, ARCA, Google Calendar [6][7] | C (S): multicentro (Pro). NE: roles, auditoría (solo "Contralor IA", AC), exportación (solo "reportes en planilla") [6] | AC: ISO 27001, AWS con datos cifrados y respaldos diarios, HIPAA. NE: Ley 25.326 (el blog cita la Ley 26.529) [6] |
| 6 | C (S): WhatsApp Business API; migración desde Kommo, Dentalink, Excel y CSV. NE: otras [8] | C (S): multi-clínica (Enterprise); roles Dueño, Admin, Dentista y Recepción; audit logs. NE: exportación [8] | C (S): HTTPS/TLS, AES-256-GCM para tokens de WhatsApp, backups de PostgreSQL, aislamiento multi-tenant. NE: Ley 25.326 [8] |
| 7 | NE [9] | NE [9] | NE (el resumen del buscador citaba la Ley 25.326, pero no se confirmó en la página abierta) [9] |
| 8 | NE [10] | NE [10] | AC: datos "protegidos y disponibles 24x7", sin necesidad de backups. NE: Ley 25.326 [10] |
| 9 | NE [11] | C (S): secretarias y doctores por plan; exportación de ficha en formato de lectura. NE: sucursales, auditoría [11] | AC: respaldos automáticos y "encriptación de grado bancario". NE: Ley 25.326 [11] |
| 10 | NE [12] | NE [12] | NE [12] |
| 11 | C (T): Mercado Pago, WhatsApp [13] | NE [13] | NE [13] |
| 12 | NE [14] | NE [14] | NE [14] |
| 13 | C (S): WhatsApp, enlaces para Instagram y Google. NE: Mercado Pago, ARCA [15] | C (S): multisucursal; roles y permisos; exportación a Excel de pacientes e historial. NE: auditoría [15] | C (S): conexión cifrada y respaldos diarios. NE: Ley 25.326 [15] |
| 14 | C (S): agendamiento online, SII (Chile), Alegra (Rep. Dominicana). WhatsApp: "próximamente" [16] | C (S): multisucursal. NE: roles, auditoría, exportación [16] | AC: sistema "seguro"; se prepara para la ley de datos chilena. NE: medidas técnicas, normativa argentina [16] |
| 15 | C (B): CFDI, DIAN, WhatsApp [18] | C (S): multi-sucursal; control de acceso por roles. NE: auditoría [17] | C (S): backups automáticos y cumplimiento del RGPD declarado; NOM-024-SSA3-2012 (México) citada en el blog. NE: normativa argentina [17][18] |
| 16 | C (S): Doctoralia; SEOGA "próximamente"; IA Noa [19] | C (S): multisede [19] | C (S): RGPD, cifrado, trazabilidad (declarados). NE: normativa argentina [19] |
| 17 | C (S): Dentrix API Exchange, imágenes, facturación, analítica [20] | NE [20] | C (S): servicio de gestión de TI con ciberseguridad, respaldo y recuperación. NE: normativa argentina [20] |
| 18 | C (S): más de 100 puentes y más de 20 clearinghouses [21] | NE [21] | NE [21] |
| 19 | C (S): marketplace de socios [22] | NE [22] | NE: detalle (hay una página de políticas no leída). NE: normativa argentina [22] |

### A.5 Modelo comercial, fortalezas, limitaciones y adopción

| # | Modelo comercial (precios solo si están publicados) | Fortalezas y diferenciales evidentes | Limitaciones o dudas | Adopción |
|---|---|---|---|---|
| 1 | Prueba de 1 semana. Home: "$ 75.000 por mes" con 2 usuarios y $ 15.000 por usuario adicional (pesos). FAQ: USD 50 por mes con 2 usuarios y USD 10 por adicional. SMS extra USD 0,35 pasados 10. Promoción: 30 % de descuento 6 meses con contratación hasta el 31/12. **Inconsistencia de moneda y monto entre secciones** [1] | Combina WhatsApp API oficial, ARCA, Mercado Pago, 65 obras sociales, periodontograma, auditoría y FHIR en una sola oferta | Sin reserva online, sillones, duración, sobreturnos ni lista de espera. Proveedor unipersonal; comparativa con "6 softwares" es relevamiento propio sin nombres | Sin clientes ni casos. Único testimonio es del propio fundador (AC) [1] |
| 2 | Moneda indicada solo como "$". Gratis $0 durante 3 meses, hasta 50 turnos por mes, 1 profesional; Gestión $30.000 por mes; Pro $60.000 por mes (1 profesional cada plan); más de 10 profesionales a medida. Prueba sin tarjeta con clínica de demostración [2] | Plan gratuito; reserva online con filtro por obra social; detección de solapamientos; liquidación por obra social; Mercado Pago | Sin ARCA, sillones, duración, lista de espera, periodontograma. Importación no trae historias clínicas ni radiografías previas | 5,0 sobre 11 reseñas de Google (según el sitio); clientes nombrados en reseñas: DM Odontología, Centro Médico Coopim Salud, Chacón Odontología Integral. Sin casos con cifras [2] |
| 3 | Pesos argentinos, IVA incluido, solo cuentas nuevas: Individual $9.900 por mes (primeros 3 meses a $990); Básico $19.900; Premium $39.900; Pro IA $129.900. Extras: profesionales adicionales, Recepcionista IA, paquete WhatsApp desde $7.900, API US$ 200. La página dental dice "desde $13.900 ARS/mes" (**discrepancia** con $9.900). Prueba gratis de 14 días sin tarjeta (FAQ) [3][4] | Única con sillón y duración por práctica documentadas; reserva 24/7 incluso desde Google; cobros online con Mercado Pago; reportes de ocupación por sillón | Ficha clínica y presupuestos solo desde Premium. Sin obras sociales ni ARCA. Roles, auditoría, exportación no figuran. Plataforma multirrubro | AC: más de 30.000 clínicas y consultorios en LATAM, 135.000 profesionales, 4,8 de 5 con más de 1.200 reseñas. Casos no exclusivos de odontología [3] |
| 4 | Abono por institución sin monto ni moneda; USD, pesos y euros solo para cobros a pacientes. Costo por usuario, migración y servidores $0. Demo de 45 minutos; sin prueba gratuita [5] | Mayor integración institucional local (ARCA, PUCO, RENAPER, receta electrónica FHIR); asistente de IA por WhatsApp; sillón como eje de la agenda | Sin precios, Mercado Pago ni reportes; pocas funciones de agenda documentadas | NE [5] |
| 5 | Sin precios publicados: "solicitá tu cotización"; pago mensual, semestral o anual; sin permanencia. Promoción Contact Center IA USD 50 por mes (hasta 80 conversaciones). Sin prueba gratuita publicada; demo a pedido [6][23] | Madurez y escala; odontograma muy documentado; módulo para Argentina; análisis de RX con IA (AC) | Sin ARCA ni Mercado Pago evidenciados; agenda poco detallada; precio opaco | AC: +15.000 clientes, +100.000 profesionales. Casos: Norden, Clínica Everest, Sanasalud, Clínica Alpes; 7 testimonios de 5 estrellas [6] |
| 6 | USD 89, 149 y 249 por mes (equivalencias en pesos según el sitio: ≈ 140.000, 235.000 y 390.000); implementación incluida; sin prueba gratis, demo gratuita [8] | Periodontograma y odontograma completos; auditoría y roles; chatbot con WhatsApp API oficial | Sin caja, cobros, obras sociales ni ARCA; precio alto frente a locales; cupo "fundador" de 10 clínicas en Argentina | NE [8] |
| 7 | Hay enlace a "Precios" sin montos en la página; sin prueba gratuita evidenciada [9] | Foco en odontología | Casi todo NE | AC: "más de 100 odontólogos y clínicas" [9] |
| 8 | Prueba gratuita con todas las funciones; precios NE [10] | Caja, cuentas corrientes y facturación a prepagas y obras sociales | Sitio con copyright 2023; sin recordatorios ni reserva online; empresa poco identificable | NE [10] |
| 9 | USD 0, 5, 10, 20, 30, 60 y 150 por mes según almacenamiento y funciones; plan gratuito sin tarjeta; demo [11] | Muy bajo costo; DICOM e IA de radiografías; multi-sillón | Sin recordatorios de turnos, reserva online, caja, obras sociales ni ARCA | Un único testimonio (AC) [11] |
| 10 | NE [12] | NE | Sitio no evaluable con la herramienta usada | NE [12] |
| 11 | USD 15 por mes por miembro ("Esencial"), prueba sin tarjeta (ficha de terceros; el precio aparece junto a valores para México) [13] | Lista de espera automática y agente de IA multicanal | No es específico de odontología; sin evidencia oficial leída | NE [13] |
| 12 | Registro gratuito de doctores; planes: enlace sin contenido. Los precios de consulta que se ven son de profesionales, no del software [14] | Canal de captación de pacientes con opiniones | No se evidenció software de gestión | Búsqueda con paginación a 500 páginas (sin total de profesionales) [14] |
| 13 | USD 29 (Consultorio), 59 (Clínica) y 119 (Multi sede) por mes; 2 meses gratis en plan anual; prueba de 14 días sin tarjeta [15] | Lista de espera, controles periódicos, consentimientos con firma digital, agenda por sillón | Orientado a otro mercado (US$ y RD$); sin Mercado Pago, ARCA ni obras sociales | NE [15] |
| 14 | Precios NE; prueba de 15 días sin costo [16] | Fichas por especialidad; informe para el Ministerio de Salud de Chile | Facturación chilena (SII); WhatsApp pendiente | Clientes nombrados: Clínica Matucana, INCHALAM, Clínica Caras & Bocas; 3 testimonios [16] |
| 15 | Blog: Mini $10 por mes (100 consultas), Pro $28 (1.000 consultas); Premium sin precio; moneda indicada solo como "$"; prueba de 2 semanas en el texto frente a 7 días en el banner (**inconsistencia**) [18] | Odontograma con periodontograma y ortodoncia | Sin adaptación argentina evidenciada; contenido de blog propio | AC: más de 50 países; 1/4 de usuarios en Colombia, Perú y México son odontólogos (blog) [17][18] |
| 16 | Precios NE; promoción de 50 % por tiempo limitado; prueba gratis sin tarjeta [19] | Agenda multisede; vínculo con marketplace Doctoralia | Odontología NE; contadores de la página en "0+" no fiables | AC: "+12.000 doctores" [19] |
| 17 | Precios NE; prueba NE [20] | Imagen con IA; ecosistema de integraciones | On-premise; sin adaptación argentina | AC: más de 35.000 consultorios [20] |
| 18 | Precios NE (enlace "Trial Version" sin condiciones) [21] | Gran cantidad de puentes; mensajería automática | Sin adaptación argentina | NE [21] |
| 19 | Precios NE; demo a pedido [22] | Reserva online, lista de espera y portal de pacientes | Odontograma NE; sin adaptación argentina | Tres testimonios de profesionales [22] |

---

## B. Matriz de puntuación

### Nota metodológica

- Escala de 0 a 5 por criterio, con pasos de 0,5. Se puntuó **solo con lo documentado** en las fuentes de la sección A. "No evidenciado" puntúa 0 en ese sub-ítem; por eso un producto poco documentado queda penalizado aunque quizá tenga más funciones de las que muestra (caso extremo: ZYRA, 0 por no haber podido leer el sitio).
- Anclas: **0** = sin evidencia; **1** = mención genérica sin detalle; **2** = función básica o parcial; **3** = función documentada con alcance limitado; **4** = función documentada, completa y con varios sub-ítems; **5** = cobertura documentada de casi todos los sub-ítems del criterio.
- Sub-ítems considerados: Turnos y automatización (vistas, multiprofesional, sillón, bloqueos, solapamientos, reserva online, WhatsApp, recordatorios, lista de espera); Clínica (ficha, odontograma, periodontograma, imágenes, presupuestos); Integraciones locales y WhatsApp (WhatsApp API, Mercado Pago, ARCA, obras sociales y padrones, Google Calendar, API); Administración (caja, cobros, señas, obras sociales, facturación, reportes); Experiencia del paciente (reserva autoservicio, confirmación o cancelación, enlaces de pago, reseñas); Seguridad (roles, auditoría, exportación, backups, mención normativa); Precio y adopción (precio publicado, prueba o plan gratuito, moneda coherente).
- La puntuación mide **lo que el proveedor publica**, no la calidad real del producto. Una afirmación comercial puntúa igual que una función descrita si el sitio la presenta de forma concreta. Es un criterio del equipo y debería contrastarse con demos.
- Ponderación: Turnos y automatización 25 %, Clínica 20 %, Integraciones locales y WhatsApp 15 %, Administración 15 %, Experiencia del paciente 10 %, Seguridad 10 %, Precio y facilidad de adopción 5 %. Total = suma de nota × peso (máximo 5,00).
- Los productos extranjeros reciben nota baja en integraciones locales por no mostrar adaptación argentina; eso refleja relevancia para el mercado local, no calidad general.

### Puntuaciones

| Posición | Producto | Turnos y autom. (25 %) | Clínica (20 %) | Integr. locales y WhatsApp (15 %) | Admin., cobros y facturación (15 %) | Exp. paciente (10 %) | Seguridad, export., trazab. (10 %) | Precio y adopción (5 %) | **Total ponderado** |
|---|---|---|---|---|---|---|---|---|---|
| 1 | DentalCore | 4,0 | 5,0 | 4,5 | 5,0 | 3,0 | 4,0 | 3,5 | **4,30** |
| 2 | AgendaPro | 4,5 | 3,0 | 4,0 | 3,5 | 4,5 | 3,0 | 4,0 | **3,80** |
| 3 | DentalSoft | 4,0 | 3,5 | 3,5 | 4,0 | 4,0 | 2,5 | 5,0 | **3,73** |
| 4 | ClinIA | 3,5 | 4,0 | 4,0 | 3,5 | 4,0 | 2,5 | 1,5 | **3,52** |
| 5 | Dentalink | 3,5 | 4,0 | 3,0 | 3,5 | 3,5 | 3,5 | 2,0 | **3,45** |
| 6 | OdontoPlus | 4,0 | 4,0 | 1,5 | 3,0 | 3,5 | 2,5 | 4,0 | **3,27** |
| 7 | Dentiqa | 3,0 | 4,0 | 2,5 | 1,5 | 3,0 | 3,5 | 3,0 | **2,95** |
| 8 | Medesk | 3,0 | 3,5 | 0,5 | 2,5 | 3,0 | 3,0 | 3,5 | **2,68** |
| 9 | Dentrix | 3,0 | 3,0 | 1,0 | 3,0 | 3,0 | 2,5 | 0,5 | **2,52** |
| 10 | Dentally | 4,0 | 2,0 | 1,0 | 2,0 | 4,0 | 1,5 | 0,5 | **2,43** |
| 11 | OdontoDrive | 2,0 | 3,5 | 0,5 | 1,5 | 1,0 | 2,0 | 5,0 | **2,05** |
| 12 | Dentidesk | 2,5 | 3,0 | 0,5 | 2,0 | 2,0 | 1,0 | 2,5 | **2,02** |
| 12 | Clinic Cloud | 3,5 | 0,0 | 0,5 | 2,0 | 3,0 | 3,5 | 2,5 | **2,02** |
| 14 | Open Dental | 2,0 | 3,0 | 1,0 | 2,0 | 2,0 | 0,5 | 1,0 | **1,85** |
| 15 | XIAgenda (solo fuente de terceros) | 3,0 | 0,0 | 2,0 | 1,0 | 3,5 | 0,0 | 3,0 | **1,70** |
| 16 | OdontoGRAMA | 1,5 | 2,0 | 0,5 | 3,0 | 0,5 | 1,0 | 2,5 | **1,57** |
| 17 | OdontoApp | 1,5 | 2,5 | 0,5 | 0,5 | 1,0 | 0,5 | 1,0 | **1,23** |
| 18 | Doctoralia Argentina | 1,0 | 0,0 | 0,0 | 0,0 | 3,0 | 0,0 | 1,0 | **0,60** |
| 19 | ZYRA (sitio no legible) | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | **0,00** |

Observaciones críticas sobre la matriz:
- DentalCore lidera por amplitud documentada, pero su evidencia de adopción es nula y su precio es inconsistente dentro del propio sitio; el puntaje alto refleja lo que promete, no una base instalada.
- Las diferencias entre las posiciones 2 y 3 (AgendaPro y DentalSoft) son menores que la incertidumbre del método; no deben leerse como una ventaja real.
- Clinic Cloud, Doctoralia y XIAgenda no son sistemas odontológicos completos según lo evidenciado; se incluyen como referencia de agenda y captación.

---

## C. Análisis competitivo

### C.1 Funcionalidades que ya son estándar de mercado
(documentadas por la mayoría de los sistemas con evidencia suficiente)
- Software como servicio en la nube, accesible desde celular, tablet y PC, sin instalación.
- Agenda con múltiples profesionales y, frecuentemente, múltiples sucursales (DentalCore, DentalSoft, AgendaPro, ClinIA, Dentiqa, OdontoPlus).
- Recordatorios automáticos por WhatsApp (DentalCore, DentalSoft, AgendaPro, ClinIA, Dentalink, Dentiqa, OdontoPlus).
- Historia clínica digital con odontograma (la gran mayoría de los sistemas odontológicos relevados lo menciona; ver A.3 para el nivel de detalle de cada uno).
- Presupuestos asociados al plan de tratamiento (DentalCore, DentalSoft, AgendaPro, Dentalink, Dentiqa, OdontoDrive, OdontoPlus).
- Caja o control de cobros (DentalCore, DentalSoft, AgendaPro, ClinIA, Dentalink, OdontoPlus, OdontoGRAMA).
- Prueba gratuita o demo como vía de adquisición (DentalCore, DentalSoft, AgendaPro, OdontoPlus, Dentidesk, OdontoGRAMA, ClinIA con demo de 45 minutos).

### C.2 Funcionalidades diferenciadoras reales
(presentes en pocos sistemas y de valor concreto)
- **Sillón o box como recurso de agenda**: declarada por AgendaPro, ClinIA, OdontoPlus y OdontoDrive. Solo AgendaPro agrega duración por práctica. Ninguna fuente demuestra prevención de solapamientos por sillón.
- **Detección automática de solapamiento** de turnos: solo DentalSoft, sin sillón ni duración.
- **Reserva online con filtros por obra social y especialidad** (DentalSoft) y reserva desde Google Maps (AgendaPro).
- **WhatsApp con API oficial de Meta y bandeja compartida** (DentalCore); chatbot de IA que agenda, confirma, cancela y reprograma (ClinIA, Dentiqa, Dentalink; declarado, no probado).
- **Cadena local completa**: ARCA, Mercado Pago y liquidación a obras sociales en un mismo producto (solo DentalCore lo documenta); verificación de cobertura con PUCO (ClinIA).
- **Periodontograma** documentado: DentalCore y Dentiqa. Medesk lo menciona en su blog.
- **Auditoría de accesos a la ficha**: DentalCore (quién abrió cada ficha) y Dentiqa (audit logs).
- **Interoperabilidad (HL7 FHIR)** y receta electrónica: DentalCore y ClinIA.
- **Plan gratuito real**: DentalSoft (3 meses, 50 turnos por mes) y OdontoDrive (plan Gratis).

### C.3 Vacíos frecuentes del mercado argentino
1. **Prevención de solapamientos por profesional y sillón con duración variable**: no hay documentación completa en ningún sistema relevado. Es el núcleo del problema de agenda de un consultorio con varios boxes.
2. **Lista de espera con reasignación automática** de turnos cancelados: solo OdontoPlus, XIAgenda (terceros) y Dentally (extranjero) la mencionan; ningún sistema argentino con evidencia sólida la documenta.
3. **Sobreturnos controlados**: DentalSoft los menciona; el resto no figura.
4. **Facturación ARCA**: solo DentalCore y ClinIA; AgendaPro la lista como "próximamente".
5. **Normativa**: solo AgendaPro y DentalCore citan la Ley 25.326; ninguno documenta cómo se aplica a datos de salud (datos sensibles según la ley) [25] ni la Ley 26.529 de historias clínicas [26] o la Ley 27.706 de historia clínica electrónica [27]. Dentalink cita ISO 27001 y HIPAA, normas ajenas al marco argentino.
6. **Exportación de datos y portabilidad**: la mayoría no la documenta; DentalCore (PDF y FHIR), DentalSoft (PDF y Excel) y OdontoPlus (Excel) son excepciones.
7. **Seguimiento de ausentes y recuperación de pacientes** como flujo explícito: solo se documenta analítica (DentalCore) o seguimiento de presupuestos (AgendaPro, Dentalink).
8. **Transparencia de precios**: 11 de 19 sin precio publicado; dos con inconsistencias internas (DentalCore, AgendaPro) y varios con "$" sin código de moneda (DentalSoft, Medesk).
9. **Evidencia de adopción verificable**: casi siempre autodeclarada; las únicas reseñas con números abiertas fueron las de Google que cita DentalSoft en su sitio y las cifras propias de AgendaPro y Dentalink.

### C.4 Oportunidades de innovación para un nuevo sistema
1. **Agenda por recursos**: modelo de turnos con dos recursos simultáneos (profesional y sillón), duración variable por prestación y reglas de bloqueo, con prevención de solapamientos garantizada y verificable (pruebas automatizadas).
2. **Lista de espera inteligente**: al cancelar, ofrecer el hueco por WhatsApp a pacientes en espera compatibles con la duración y el profesional.
3. **Ciclo de ausentes**: marcación de ausencia, mensaje de recuperación y recordatorio de controles periódicos, con tablero de tasa de ausentismo.
4. **Portabilidad y cumplimiento visibles**: exportación completa del paciente en formato abierto, registro de auditoría legible por el profesional y documento público sobre cómo se aplican las Leyes 25.326, 26.529 y 27.706.
5. **Precio transparente en pesos** con actualización por índice, plan gratuito acotado y sin cargos ocultos por WhatsApp (informar que Meta cobra por conversación según el proveedor consultado).
6. **Cadena local por etapas**: Mercado Pago para señas desde el MVP; ARCA y obras sociales en etapas siguientes.
7. **Importación desde competidores** (hoy solo Dentiqa documenta migración desde otros sistemas; DentalSoft aclara que no importa historias clínicas).

---

## D. Recomendación final

### D.1 Cinco competidores prioritarios para analizar mediante demo
1. **DentalCore**: mayor amplitud documentada (WhatsApp API, ARCA, Mercado Pago, obras sociales, periodontograma, auditoría). Verificar: ausencia de reserva online, sillones, solapamientos y la inconsistencia de precio.
2. **AgendaPro**: único con sillón y duración por práctica documentados y mayor escala declarada. Verificar: si previene solapamientos, qué incluye cada plan en odontología.
3. **DentalSoft**: plan gratuito, reserva online con filtros y detección de solapamiento. Verificar: alcance real de la detección y manejo de sillones.
4. **ClinIA**: integración institucional argentina (ARCA, PUCO, receta electrónica) y turnos por sillón. Verificar: agenda, precios y roles.
5. **Dentalink**: operador regional maduro con módulo para Argentina. Verificar: agenda, ARCA y Mercado Pago, que no figuran.

Alternos si el equipo dispone de tiempo: Dentiqa (periodontograma, chatbot) y OdontoPlus (lista de espera, controles periódicos).

### D.2 Tres productos de referencia para experiencia de usuario
(a validar con una demo; la selección se basa en descripciones públicas, no en uso)
1. **DentalSoft**: flujo de reserva en 4 pasos con cupos en tiempo real, reconocimiento por DNI y presupuesto compartible por enlace.
2. **AgendaPro**: reserva desde Google, enlaces de pago de Mercado Pago y vista de ocupación por sillón.
3. **DentalCore**: agenda con vistas día, 3 días, semana y mes, mapa de calor y kanban por estado; arrastrar y soltar.

### D.3 MVP sugerido

> **Ajuste del equipo (2026-11-21, protocolo de inspección → Ajustar).** La primera versión de esta lista, generada por el agente, incluía como imprescindibles la ficha clínica con odontograma, el presupuesto con caja y señas, la auditoría de accesos y los recordatorios por WhatsApp API. Se redujo para alinearla con el checklist de Discovery confirmado (`checklist-discovery.md`): el problema priorizado es la agenda desordenada de consultorios chicos, con restricción de costo $0 y el plazo del trabajo. Lo quitado pasó a "Diferenciador" o "Etapas posteriores".

**Imprescindible**
- Agenda diaria y semanal con múltiples profesionales y múltiples sillones o boxes.
- **Prevención de solapamientos por profesional y por sillón o box**, con duración variable por prestación y bloqueos de horario. Sin sobreturnos. Los intervalos son semiabiertos [inicio, fin): un turno que empieza cuando termina otro no se solapa.
- Alta, cancelación y reprogramación de turnos con registro de estado (confirmado, cancelado, ausente, atendido). Cancelar libera el horario.
- Reserva online por enlace público (24/7) respetando disponibilidad real, duración y recursos. El paciente puede cancelar o reprogramar online solo con 24 h o más de anticipación.
- Recordatorios y confirmación por e-mail, más un enlace `wa.me` con el mensaje armado que envía la recepción (costo $0).
- Roles básicos: administrador, odontólogo, recepción y paciente.

**Diferenciador**
- Lista de espera con oferta automática de huecos liberados.
- Seguimiento de ausentes y recordatorio de controles periódicos.
- Tablero de ocupación por sillón y profesional, y tasa de ausentismo.
- Recordatorios automáticos por WhatsApp Cloud API (con el número de prueba en desarrollo; con costo por mensaje en producción).
- Cobro de señas con Mercado Pago (con el sandbox en desarrollo; comisión por cobro en producción).
- Precios en pesos publicados y plan gratuito acotado.

**Etapas posteriores**
- Ficha del paciente con anamnesis y odontograma básico (FDI).
- Presupuesto y plan de tratamiento; seguimiento de presupuestos pendientes; caja.
- Registro de auditoría de accesos; exportación de datos del paciente y backups; consentimiento alineado con la Ley 25.326. El riesgo de datos sensibles sigue abierto en `checklist-discovery.md`.
- Facturación electrónica ARCA.
- Obras sociales y prepagas: padrón, coberturas y liquidaciones.
- Periodontograma e imágenes (DICOM) con visor.
- Multi-sucursal y cuenta de cadena.
- Chatbot o asistente de IA, API pública y sincronización con Google Calendar.
- Receta electrónica, firma digital y HL7 FHIR.
- Importación desde otros sistemas.

---

## Verificación de fuentes

Esta verificación la completan los estudiantes personalmente. No se debe confiar en los extractos de esta investigación sin contraste.

| # | Tipo de fuente | URL | Qué afirma el informe | Qué encontramos | ¿Corregido? |
|---|---|---|---|---|---|
| V1 | Sitio oficial | https://dentalcore.app/ | DentalCore documenta WhatsApp API de Meta, ARCA, Mercado Pago, 65 obras sociales, periodontograma y auditoría; no documenta reserva online, sillones ni solapamientos; tiene precio inconsistente ($75.000 frente a USD 50) | (a completar por el equipo) | (a completar por el equipo) |
| V2 | Página de precios | https://agendapro.com/ar/planes | AgendaPro publica Individual $9.900, Básico $19.900, Premium $39.900 y Pro IA $129.900 en pesos (IVA incluido) y la página dental dice "desde $13.900" | (a completar por el equipo) | (a completar por el equipo) |
| V3 | Centro de ayuda | https://intercom.help/softwaredentalink/es/articles/9493218-como-usar-el-odontograma | El odontograma de Dentalink tiene versiones por 24 h, nomenclaturas Continuo, ADA y FDI, anulación sin borrado e índice de placa; no menciona periodontograma | (a completar por el equipo) | (a completar por el equipo) |
| V4 | Video oficial | (no localizado por el investigador; buscar en los canales oficiales de YouTube de AgendaPro, Dentalink o DentalSoft y registrar la URL) | Sin afirmaciones del informe basadas en video; verificar que la agenda por sillón de AgendaPro y la detección de solapamientos de DentalSoft se vean en funcionamiento | (a completar por el equipo) | (a completar por el equipo) |
| V5 | Reseña o marketplace | https://www.capterra.com/p/196361/Dentalink/ (Capterra bloqueó al investigador con HTTP 403; abrir manualmente) | El informe usa solo la autodeclaración del sitio (+15.000 clientes, 7 testimonios); contrastar con reseñas verificadas y con el precio inicial | (a completar por el equipo) | (a completar por el equipo) |
| V6 | Reseñas en Google | Buscar en Google Maps "DentalSoft" (el sitio dice 5,0 sobre 11 reseñas) | Cifra autodeclarada por DentalSoft | (a completar por el equipo) | (a completar por el equipo) |
| V7 | Normativa oficial | https://www.argentina.gob.ar/normativa/nacional/ley-27706-380710/texto | La Ley 27.706 exige respetar las leyes 26.529 y 25.326 y establece la titularidad del paciente sobre sus datos | (a completar por el equipo) | (a completar por el equipo) |
| V8 | Sitio oficial | https://www.appzyra.ar/ | ZYRA: el sitio no entregó contenido a la herramienta; todas sus filas figuran como No evidenciado | (a completar por el equipo) | (a completar por el equipo) |

---

## Fuentes no abiertas o no concluyentes

- **ZYRA** (https://www.appzyra.ar/): solo se obtuvo el título. Un buscador resumió ARCA, odontograma y WhatsApp, pero no se verificó, por lo que no se usó.
- **Capterra** (varias fichas): HTTP 403. Los datos de Capterra que aparecen en resúmenes de búsqueda (por ejemplo, precio inicial de Dentalink de US$ 29 y de Dentiqa de US$ 89) no se usan en las tablas.
- **Consultorios.AR** (folleto de la AAC, https://aac.org.ar/beneficios/imagenes/consultorios2.pdf): PDF con contenido comprimido, no legible por la herramienta. Un resumen de búsqueda mencionaba agenda multiconsultorio, historia clínica, sala de espera y norma ISO 27001, sin verificar. No figura en las tablas. El equipo puede abrir el PDF manualmente.
- **Tesis de la Universidad de San Andrés** (https://repositorio.udesa.edu.ar/jspui/bitstream/10908/23801/1/%5bP%5d%20%5bW%5d%20MBA%20Nervi%2c%20Santiago%20Luis.pdf): PDF cifrado, no legible. Un resumen de búsqueda atribuye a la tesis unos 70.000 odontólogos en Argentina y un 3 % que usa alguna herramienta tecnológica; **dato no verificado, no usar sin leer la fuente**.
- **Doctoralia** (https://www.doctoralia.com.ar/): sin respuesta (ECONNREFUSED); se usó la página de odontólogos de doctoraliar.com.
- **Reservo, Benty, MednIA, Dendoo, XDental, Pedí Tu Turno, Dentech, Dental Plus, Maxident**: no se pudieron abrir fuentes oficiales con contenido odontológico, o no se localizaron (Benty y MednIA no aparecieron en búsquedas). La guía de Reservo (https://reservo.cl/blog/profesionales/dental/guia-para-elegir-el-mejor-software-dental-en-argentina/) solo devolvió el título. La página reservo.cl/ar describe software médico general sin datos odontológicos. dendoo.com resultó ser una plataforma de comunidades, no un software odontológico (el resumen de buscador que lo ubicaba como software dental no se confirmó).
- **Videos oficiales**: no se localizó ninguno.

---

## Referencias completas

Todas con fecha de consulta **2026-11-21**.

1. DentalCore. https://dentalcore.app/
2. DentalSoft. https://dentalsoft.com.ar/
3. AgendaPro, software odontológico (Argentina). https://agendapro.com/ar/dental/software-odontologico
4. AgendaPro, planes y precios (Argentina). https://agendapro.com/ar/planes
5. ClinIA, odontología. https://www.clinia.com.ar/odontologia
6. Dentalink Argentina. https://www.softwaredentalink.com/ar
7. Dentalink, centro de ayuda, módulo exclusivo para Argentina (solo títulos). https://ayuda.softwaredentalink.com/es/collections/19196578-modulo-exclusivo-para-argentina
8. Dentiqa. https://dentiqa.app
9. OdontoApp. https://odontoapp.com.ar/
10. OdontoGRAMA. https://odontograma.com.ar/
11. OdontoDrive. https://odontodrive.com/
12. ZYRA. https://www.appzyra.ar/
13. XIAgenda en ComparaSoftware (fuente de terceros). https://www.comparasoftware.com/xiagenda
14. Doctoralia Argentina, odontólogos. https://www.doctoraliar.com/odontologo
15. OdontoPlus. https://miodontoplus.com/
16. Dentidesk. https://www.dentidesk.cl/
17. Medesk, soluciones para odontología. https://www.medesk.net/es/solutiones/odontologia
18. Medesk, blog "Software para clínicas dentales" (contenido del propio proveedor). https://www.medesk.net/es/blog/software-para-clinicas-dentales/
19. Clinic Cloud. https://www.clinic-cloud.com/
20. Dentrix (Henry Schein One). https://www.dentrix.com/
21. Open Dental. https://www.opendental.com/
22. Dentally. https://www.dentally.com/
23. Dentalink, planes. https://web-es.softwaredentalink.com/en/planes
24. Dentalink, centro de ayuda, "Cómo usar el odontograma". https://intercom.help/softwaredentalink/es/articles/9493218-como-usar-el-odontograma
25. Ley 25.326 y Ley 26.529 (datos sensibles de salud e historia clínica): resumen de búsqueda sobre argentina.gob.ar y otras fuentes; el texto consolidado de la Ley 25.326 no se abrió. Consultar https://www.argentina.gob.ar/normativa/nacional/160432/texto
26. Ley 26.529, derechos del paciente (copia en https://www.mpba.gov.ar/files/documents/ley_26.529-2009._Ds._del_paciente%2C_H._Cl._y_Cons._inf..pdf; solo aparece en resultados de búsqueda, no se abrió).
27. Ley 27.706, historia clínica electrónica (texto abierto). https://www.argentina.gob.ar/normativa/nacional/ley-27706-380710/texto
