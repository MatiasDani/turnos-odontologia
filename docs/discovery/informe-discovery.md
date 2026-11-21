# Relevamiento de mercado: sistemas de gestión de turnos y agenda para consultorios odontológicos (Argentina y Latinoamérica)

**Materia:** Metodología I — Tecnicatura Universitaria en Programación

**Integrantes:**
- Carabelli, Alejo — Legajo 51928
- Ferrer, Mara — Legajo 51974
- Garro, Luka — Legajo 51988
- Ibañez, Matías — Legajo 52006
- Medina, Lautaro — Legajo 52043
- Petri, Franco — Legajo 52080


**Fecha:** 2026-11-21 (con verificación de fuentes incorporada el mismo día)

---

## Resumen ejecutivo

**Qué se investigó.** Se relevaron 19 sistemas que ofrecen, total o parcialmente, gestión de turnos y agenda para odontología: productos de origen o foco argentino, productos regionales con operación en Argentina (Chile y otros) y cinco internacionales (EE. UU., Reino Unido, España) como referencia. El origen de varios proveedores no figura en sus sitios y se consigna como NE. Para cada uno se abrió el sitio oficial (o, cuando se indica, una fuente de terceros) y se registró únicamente lo que la fuente dice. Lo que no figura se consigna como "No evidenciado" (NE). Todas las consultas se hicieron el 2026-11-21, y ese mismo día se verificaron las fuentes críticas en un navegador real (ver "Verificación de fuentes").

**Criterio de evidencia.** Ninguna funcionalidad fue probada en una demo ni con una cuenta propia. "Comprobado" significa que el sitio oficial o el centro de ayuda la describe de forma concreta (por ejemplo, "agenda por profesional, práctica y sillón"). "Afirmación comercial" significa una declaración genérica, una cifra autodeclarada o un cumplimiento normativo sin documentación (por ejemplo, "cumple la Ley 25.326"). Las fuentes críticas fueron reabiertas en un navegador real leyendo el texto completo del DOM (ver sección "Verificación de fuentes"); esa verificación corrigió varios datos de la primera pasada.

**Hallazgos principales.**
1. El mercado argentino de software odontológico en la nube está poblado por proveedores pequeños y recientes, con propuestas muy desparejas. Solo un subconjunto (DentalCore, AgendaPro, DentalSoft, ClinIA, Dentalink) documenta agenda, clínica y administración con un nivel de detalle utilizable.
2. Son estándar de mercado: SaaS en nube, agenda multiprofesional, recordatorios por WhatsApp, ficha clínica con odontograma, presupuestos y caja básica.
3. Pocas funciones críticas para Argentina están documentadas: facturación ARCA (solo DentalCore, ClinIA y ZYRA, esta última en su plan Premium, la muestran como disponible; AgendaPro la anuncia como "próximamente"), liquidación a obras sociales (DentalCore, DentalSoft, ClinIA, Dentalink, OdontoGRAMA), y cobros con Mercado Pago (DentalCore, DentalSoft, AgendaPro).
4. El requisito del TP más relevante para el diseño del producto, la **prevención de solapamientos por profesional y por sillón/box con duración variable por prestación**, no está documentado de punta a punta por ningún proveedor. DentalSoft declara detección automática de solapamiento (sin sillones ni duraciones); AgendaPro declara agenda por sillón y duración por práctica (sin mencionar solapamientos). Esta es la mayor oportunidad de diferenciación identificada.
5. La mención explícita de la Ley 25.326 es rara (AgendaPro y DentalCore la citan; la mayoría no). Los precios son heterogéneos: algunos en pesos, otros en dólares, varios sin publicar. DentalCore fija su precio en USD (USD 50 por mes con 2 usuarios) y la home lo muestra convertido a pesos, por lo que el monto en pesos varía con el tipo de cambio; AgendaPro mantiene una discrepancia interna ($9.900 en la página de planes frente a "desde $13.900" en la página dental).

**MVP recomendado (síntesis, ajustado por el equipo).** Agenda multiprofesional y multi-sillón con prevención de solapamientos por profesional y por sillón/box, duración variable por prestación, bloqueos y sin sobreturnos; alta, cancelación y reprogramación de turnos; reserva online por enlace; recordatorios por e-mail y enlace `wa.me`; roles básicos. Diferenciadores: lista de espera con reasignación automática, seguimiento de ausentes, tablero de ocupación, WhatsApp Cloud API y señas con Mercado Pago. Para etapas posteriores: ficha clínica y odontograma, presupuestos y caja, auditoría y exportación, facturación ARCA, obras sociales, periodontograma, imágenes DICOM, multi-sucursal y asistente de IA. La primera versión del agente era más amplia; el ajuste y su motivo están en la sección D.3.

**Limitaciones.** La primera pasada se hizo con WebFetch, cuyos resultados son extractos generados por un modelo de lectura, no copias textuales de las páginas; por eso se verificaron en navegador real las fuentes críticas, lo que corrigió el precio de DentalCore (no existe un "$ 75.000" tal cual: era un USD 50 convertido), el plan gratuito de DentalSoft y el relevamiento completo de ZYRA, que había quedado como "No evidenciado" por una limitación de la herramienta y no del producto. Persisten limitaciones: Capterra bloquea el acceso (HTTP 403 con desafío anti-bot de Cloudflare) incluso con navegador real; dos PDF (una tesis de la Universidad de San Andrés y un folleto de la AAC sobre Consultorios.AR) estaban cifrados o comprimidos y no pudieron leerse; las reseñas de Google de DentalSoft no pudieron confirmarse de forma independiente; y la verificación cubrió ocho fuentes, no todas las del informe. Detalles en cada fila y en "Fuentes no abiertas o no concluyentes".

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
| 10 | **ZYRA** / proveedor NE | Argentina ("Hecho en Argentina"; WhatsApp de contacto +54 9 351…, Córdoba) · consultorios y clínicas odontológicas ("Software de Gestión Odontológica Integral") | C (S): 100 % nube (SaaS), multidispositivo [12] | https://www.appzyra.ar/ | 2026-11-21 |
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
| 10 | C (S): agenda de turnos con roles y usuarios por plan (3, 7 o ilimitados). NE: vistas, sillones, duración por prestación, bloqueos, sobreturnos, solapamientos [12] | C (S): confirmación por WhatsApp con respuesta SI/NO que actualiza la agenda. NE: reserva online de pacientes (solo menciona "agenda online" en las confirmaciones), lista de espera [12] | C (S): recordatorios automáticos por WhatsApp el día anterior a las 11:59 y por e-mail; el WhatsApp se vincula escaneando un código QR con el número propio (no es la API oficial de Meta). Starter sin recordatorios de WhatsApp; Profesional 200 por mes; Premium ilimitados. NE: ausentes, campañas [12] |
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
| 10 | C (S): odontograma interactivo para adultos y niños, evoluciones, radiografías y estudios, presupuestos en PDF. NE: periodontograma [12] | C (S): obras sociales y aranceles; caja diaria con arqueo (no incluida en Starter); liquidación de honorarios por profesional; pagos combinados; stock de insumos; facturación electrónica ARCA/AFIP con certificado digital y CAE (plan Premium). NE: Mercado Pago, módulo de reportes [12] |
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
| 3 | C (S, P): Google Calendar, Google Maps, Meta Ads, Google Ads, Mercado Pago, WhatsApp; API de integraciones a US$ 200 al mes [3][4] | C (S): control multisede con reportes consolidados. NE: roles, auditoría, exportación [3] | C (S): cifrado, respaldos automáticos, acceso restringido por profesional, servidores AWS. AC: "cumple con la Ley 25.326"; la página dental menciona además la Ley 26.529 [3] |
| 4 | C (S): ARCA, PUCO, RENAPER, receta electrónica HL7 FHIR (ReNaPDiS nº 248); WhatsApp [5] | C (S): sucursales con dashboard único. NE: roles y permisos por perfil (solo "acceso controlado"), auditoría explícita ("registro operativo"), exportación (solo PDF) [5] | C (S): copias cada 10 minutos. AC: soporte 24/7, actualizaciones diarias. NE: Ley 25.326 (hay enlaces a /privacidad y /seguridad no leídos) [5] |
| 5 | C (S): API como complemento; módulo Argentina (obras sociales, receta electrónica). NE: Mercado Pago, ARCA, Google Calendar [6][7] | C (S): multicentro (Pro). NE: roles, auditoría (solo "Contralor IA", AC), exportación (solo "reportes en planilla") [6] | AC: ISO 27001, AWS con datos cifrados y respaldos diarios, HIPAA. NE: Ley 25.326 (el blog cita la Ley 26.529) [6] |
| 6 | C (S): WhatsApp Business API; migración desde Kommo, Dentalink, Excel y CSV. NE: otras [8] | C (S): multi-clínica (Enterprise); roles Dueño, Admin, Dentista y Recepción; audit logs. NE: exportación [8] | C (S): HTTPS/TLS, AES-256-GCM para tokens de WhatsApp, backups de PostgreSQL, aislamiento multi-tenant. NE: Ley 25.326 [8] |
| 7 | NE [9] | NE [9] | NE (el resumen del buscador citaba la Ley 25.326, pero no se confirmó en la página abierta) [9] |
| 8 | NE [10] | NE [10] | AC: datos "protegidos y disponibles 24x7", sin necesidad de backups. NE: Ley 25.326 [10] |
| 9 | NE [11] | C (S): secretarias y doctores por plan; exportación de ficha en formato de lectura. NE: sucursales, auditoría [11] | AC: respaldos automáticos y "encriptación de grado bancario". NE: Ley 25.326 [11] |
| 10 | C (S): WhatsApp por código QR (no API oficial); ARCA/AFIP (Premium). NE: API oficial de Meta, Mercado Pago, Google Calendar, API pública [12] | C (S): roles y permisos granulares; usuarios por plan (3, 7 o ilimitados). NE: auditoría, exportación, sucursales [12] | AC: datos encriptados y respaldados automáticamente. NE: Ley 25.326 [12] |
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
| 1 | Prueba de 1 semana. Precio en USD: USD 50 por mes con 2 usuarios y 50 GB, USD 10 por usuario adicional (hasta 100), con pago por adelantado (1, 3, 6 o 12 meses) en la moneda de cada país (FAQ y datos estructurados de la página). La home lo muestra convertido a pesos con una calculadora por cantidad de usuarios (con el valor por defecto: $ 78.987 por mes, o $ 55.291 por mes con el descuento). SMS extra USD 0,35 pasados 10. Promoción: 30 % de descuento 6 meses con contratación hasta el 31/12. **No es una inconsistencia de moneda: es un precio en USD mostrado en pesos, y el monto en pesos varía con el tipo de cambio.** Corrección: la primera versión citaba "$ 75.000 por mes" y "$ 15.000 por usuario adicional", cifras que no figuran tal cual [1] | Combina WhatsApp API oficial, ARCA, Mercado Pago, 65 obras sociales, periodontograma, auditoría y FHIR en una sola oferta | Sin reserva online, sillones, duración, sobreturnos ni lista de espera. Proveedor unipersonal; comparativa con "6 softwares" es relevamiento propio sin nombres | Sin clientes ni casos. Único testimonio es del propio fundador (AC) [1] |
| 2 | Moneda indicada solo como "$". Gratis $0 por mes "para todos los profesionales" y "gratis durante 3 meses", hasta 50 turnos por mes, sin almacenamiento de imágenes; Gestión $30.000 por mes y Pro $60.000 por mes (por profesional, con selector); más de 10 profesionales a medida. Corrección: la primera versión decía que el plan gratuito era para "1 profesional". Prueba sin tarjeta con clínica de demostración [2] | Plan gratuito; reserva online con filtro por obra social; detección de solapamientos; liquidación por obra social; Mercado Pago | Sin ARCA, sillones, duración, lista de espera, periodontograma. Importación no trae historias clínicas ni radiografías previas | AC: widget "5,0 calificación de 11 reseñas" de Google en el propio sitio (autopublicado, no verificable: en Google Maps la búsqueda "DentalSoft" devuelve un homónimo chileno, dentalsoft.cl, y no la ficha argentina); clientes nombrados en reseñas: DM Odontología, Centro Médico Coopim Salud, Chacón Odontología Integral. Sin casos con cifras [2] |
| 3 | Pesos argentinos, IVA incluido, solo cuentas nuevas: Individual $9.900 por mes (primeros 3 meses a $990); Básico $19.900; Premium $39.900; Pro IA $129.900. Extras: profesionales adicionales, Recepcionista IA, paquete WhatsApp desde $7.900, API US$ 200. La página dental dice "desde $13.900 ARS/mes" (**discrepancia** con $9.900). Prueba gratis de 14 días sin tarjeta (FAQ). Precisión: el plan orientado a salud es Premium ($39.900, "para equipos pequeños de Salud y Estética"), no Individual; Básico ($19.900) apunta a Belleza y Bienestar. La discrepancia $9.900 frente a "desde $13.900" se confirmó en navegador [3][4] | Única con sillón y duración por práctica documentadas; reserva 24/7 incluso desde Google; cobros online con Mercado Pago; reportes de ocupación por sillón | Ficha clínica y presupuestos solo desde Premium. Sin obras sociales ni ARCA. Roles, auditoría, exportación no figuran. Plataforma multirrubro | AC: más de 30.000 clínicas y consultorios en LATAM, 135.000 profesionales, 4,8 de 5 con más de 1.200 reseñas. Casos no exclusivos de odontología [3] |
| 4 | Abono por institución sin monto ni moneda; USD, pesos y euros solo para cobros a pacientes. Costo por usuario, migración y servidores $0. Demo de 45 minutos; sin prueba gratuita [5] | Mayor integración institucional local (ARCA, PUCO, RENAPER, receta electrónica FHIR); asistente de IA por WhatsApp; sillón como eje de la agenda | Sin precios, Mercado Pago ni reportes; pocas funciones de agenda documentadas | NE [5] |
| 5 | Sin precios publicados: "solicitá tu cotización"; pago mensual, semestral o anual; sin permanencia. Promoción Contact Center IA USD 50 por mes (hasta 80 conversaciones). Sin prueba gratuita publicada; demo a pedido [6][23] | Madurez y escala; odontograma muy documentado; módulo para Argentina; análisis de RX con IA (AC) | Sin ARCA ni Mercado Pago evidenciados; agenda poco detallada; precio opaco | AC: +15.000 clientes, +100.000 profesionales. Casos: Norden, Clínica Everest, Sanasalud, Clínica Alpes; 7 testimonios de 5 estrellas [6] |
| 6 | USD 89, 149 y 249 por mes (equivalencias en pesos según el sitio: ≈ 140.000, 235.000 y 390.000); implementación incluida; sin prueba gratis, demo gratuita [8] | Periodontograma y odontograma completos; auditoría y roles; chatbot con WhatsApp API oficial | Sin caja, cobros, obras sociales ni ARCA; precio alto frente a locales; cupo "fundador" de 10 clínicas en Argentina | NE [8] |
| 7 | Hay enlace a "Precios" sin montos en la página; sin prueba gratuita evidenciada [9] | Foco en odontología | Casi todo NE | AC: "más de 100 odontólogos y clínicas" [9] |
| 8 | Prueba gratuita con todas las funciones; precios NE [10] | Caja, cuentas corrientes y facturación a prepagas y obras sociales | Sitio con copyright 2023; sin recordatorios ni reserva online; empresa poco identificable | NE [10] |
| 9 | USD 0, 5, 10, 20, 30, 60 y 150 por mes según almacenamiento y funciones; plan gratuito sin tarjeta; demo [11] | Muy bajo costo; DICOM e IA de radiografías; multi-sillón | Sin recordatorios de turnos, reserva online, caja, obras sociales ni ARCA | Un único testimonio (AC) [11] |
| 10 | Planes en pesos por mes: Starter $15.000 (hasta 50 pacientes, 3 usuarios, sin recordatorios de WhatsApp ni caja); Profesional $29.000 (pacientes ilimitados, 7 usuarios, 200 recordatorios de WhatsApp por mes y e-mail); Premium $39.000 (usuarios ilimitados, WhatsApp ilimitado, facturación ARCA). Prueba gratis de 30 días [12] | Hecho en Argentina; precios publicados en pesos; caja con arqueo, liquidación de honorarios por profesional, stock y ARCA (Premium) en un producto de costo bajo | WhatsApp vinculado por código QR con el número propio, no por la API oficial de Meta: riesgo de incumplimiento de los términos de WhatsApp. Sin reserva online, sillones, duración por prestación, solapamientos, lista de espera, Mercado Pago, Google Calendar, periodontograma ni auditoría (NE). Starter sin recordatorios ni caja | AC: "+2.000 turnos gestionados" y "+15 clínicas activas" [12] |
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

- Escala de 0 a 5 por criterio, con pasos de 0,5. Se puntuó **solo con lo documentado** en las fuentes de la sección A. "No evidenciado" puntúa 0 en ese sub-ítem; por eso un producto poco documentado queda penalizado aunque quizá tenga más funciones de las que muestra (caso extremo: Doctoralia Argentina; en la primera versión también ZYRA, que obtuvo 0 por una limitación de la herramienta de lectura y se puntuó de nuevo tras la verificación en navegador real).
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
| 8 | ZYRA (puntuada tras la verificación) | 2,5 | 3,5 | 3,0 | 3,5 | 1,5 | 2,0 | 4,0 | **2,85** |
| 9 | Medesk | 3,0 | 3,5 | 0,5 | 2,5 | 3,0 | 3,0 | 3,5 | **2,68** |
| 10 | Dentrix | 3,0 | 3,0 | 1,0 | 3,0 | 3,0 | 2,5 | 0,5 | **2,52** |
| 11 | Dentally | 4,0 | 2,0 | 1,0 | 2,0 | 4,0 | 1,5 | 0,5 | **2,43** |
| 12 | OdontoDrive | 2,0 | 3,5 | 0,5 | 1,5 | 1,0 | 2,0 | 5,0 | **2,05** |
| 13 | Dentidesk | 2,5 | 3,0 | 0,5 | 2,0 | 2,0 | 1,0 | 2,5 | **2,02** |
| 13 | Clinic Cloud | 3,5 | 0,0 | 0,5 | 2,0 | 3,0 | 3,5 | 2,5 | **2,02** |
| 15 | Open Dental | 2,0 | 3,0 | 1,0 | 2,0 | 2,0 | 0,5 | 1,0 | **1,85** |
| 16 | XIAgenda (solo fuente de terceros) | 3,0 | 0,0 | 2,0 | 1,0 | 3,5 | 0,0 | 3,0 | **1,70** |
| 17 | OdontoGRAMA | 1,5 | 2,0 | 0,5 | 3,0 | 0,5 | 1,0 | 2,5 | **1,57** |
| 18 | OdontoApp | 1,5 | 2,5 | 0,5 | 0,5 | 1,0 | 0,5 | 1,0 | **1,23** |
| 19 | Doctoralia Argentina | 1,0 | 0,0 | 0,0 | 0,0 | 3,0 | 0,0 | 1,0 | **0,60** |

Observaciones críticas sobre la matriz:
- DentalCore lidera por amplitud documentada, pero su evidencia de adopción es nula y su precio está fijado en USD y mostrado en pesos (varía con el tipo de cambio); el puntaje alto refleja lo que promete, no una base instalada.
- ZYRA se puntuó recién tras la verificación en navegador real (2,85; posición 8): turnos 2,5 (confirmación y recordatorios por WhatsApp, sin vistas, sillones ni solapamientos documentados); clínica 3,5 (odontograma, evoluciones, radiografías, presupuestos; sin periodontograma); integraciones 3,0 (ARCA y obras sociales, pero WhatsApp por QR y sin Mercado Pago ni Google Calendar); administración 3,5 (caja con arqueo, honorarios, ARCA; sin reportes evidenciados); experiencia del paciente 1,5 (sin reserva online ni enlaces de pago); seguridad 2,0 (roles y backups; sin auditoría ni exportación); precio y adopción 4,0 (precios en pesos y prueba de 30 días). No altera el top 5.
- Las correcciones de la verificación (precio de DentalCore, plan gratuito de DentalSoft, precisión de AgendaPro) no modifican los puntajes de los demás productos.
- Las diferencias entre las posiciones 2 y 3 (AgendaPro y DentalSoft) son menores que la incertidumbre del método; no deben leerse como una ventaja real.
- Clinic Cloud, Doctoralia y XIAgenda no son sistemas odontológicos completos según lo evidenciado; se incluyen como referencia de agenda y captación.

---

## C. Análisis competitivo

### C.1 Funcionalidades que ya son estándar de mercado
(documentadas por la mayoría de los sistemas con evidencia suficiente)
- Software como servicio en la nube, accesible desde celular, tablet y PC, sin instalación.
- Agenda con múltiples profesionales y, frecuentemente, múltiples sucursales (DentalCore, DentalSoft, AgendaPro, ClinIA, Dentiqa, OdontoPlus).
- Recordatorios automáticos por WhatsApp (DentalCore, DentalSoft, AgendaPro, ClinIA, Dentalink, Dentiqa, OdontoPlus, ZYRA; esta última vincula el WhatsApp por código QR y no por la API oficial de Meta).
- Historia clínica digital con odontograma (la gran mayoría de los sistemas odontológicos relevados lo menciona; ver A.3 para el nivel de detalle de cada uno).
- Presupuestos asociados al plan de tratamiento (DentalCore, DentalSoft, AgendaPro, Dentalink, Dentiqa, OdontoDrive, OdontoPlus, ZYRA).
- Caja o control de cobros (DentalCore, DentalSoft, AgendaPro, ClinIA, Dentalink, OdontoPlus, OdontoGRAMA, ZYRA).
- Prueba gratuita o demo como vía de adquisición (DentalCore, DentalSoft, AgendaPro, OdontoPlus, Dentidesk, OdontoGRAMA, ClinIA con demo de 45 minutos).

### C.2 Funcionalidades diferenciadoras reales
(presentes en pocos sistemas y de valor concreto)
- **Sillón o box como recurso de agenda**: declarada por AgendaPro, ClinIA, OdontoPlus y OdontoDrive. Solo AgendaPro agrega duración por práctica. Ninguna fuente demuestra prevención de solapamientos por sillón.
- **Detección automática de solapamiento** de turnos: solo DentalSoft, sin sillón ni duración. Es una afirmación comercial: el video oficial de 2020 no la muestra (ver V4).
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
4. **Facturación ARCA**: solo DentalCore, ClinIA y ZYRA (plan Premium); AgendaPro la lista como "próximamente".
5. **Normativa**: solo AgendaPro y DentalCore citan la Ley 25.326; ninguno documenta cómo se aplica a datos de salud (datos sensibles según la ley) [25]; AgendaPro menciona además la Ley 26.529 de historias clínicas [26] en su página dental, sin explicar su aplicación, y ninguno trata la Ley 27.706 de historia clínica electrónica [27]. Dentalink cita ISO 27001 y HIPAA, normas ajenas al marco argentino.
6. **Exportación de datos y portabilidad**: la mayoría no la documenta; DentalCore (PDF y FHIR), DentalSoft (PDF y Excel) y OdontoPlus (Excel) son excepciones.
7. **Seguimiento de ausentes y recuperación de pacientes** como flujo explícito: solo se documenta analítica (DentalCore) o seguimiento de presupuestos (AgendaPro, Dentalink).
8. **Transparencia de precios**: 10 de 19 sin precio publicado; AgendaPro con una discrepancia interna ($9.900 frente a "desde $13.900"); DentalCore con precio en USD mostrado convertido a pesos (el monto en pesos varía) y varios con "$" sin código de moneda (DentalSoft, Medesk).
9. **Evidencia de adopción verificable**: casi siempre autodeclarada; las únicas reseñas con números fueron el widget de Google que DentalSoft publica en su propio sitio (no verificable de forma independiente, con riesgo de confusión con el homónimo chileno dentalsoft.cl) y las cifras propias de AgendaPro y Dentalink; Capterra no pudo abrirse.

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
1. **DentalCore**: mayor amplitud documentada (WhatsApp API, ARCA, Mercado Pago, obras sociales, periodontograma, auditoría). Verificar: ausencia de reserva online, sillones y solapamientos, y el precio real en pesos (su tarifa es en USD, convertida en la home).
2. **AgendaPro**: único con sillón y duración por práctica documentados y mayor escala declarada. Verificar: si previene solapamientos, qué incluye cada plan en odontología.
3. **DentalSoft**: plan gratuito, reserva online con filtros y detección de solapamiento. Verificar: alcance real de la detección de solapamiento (no se ve en el video oficial) y manejo de sillones.
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

### Método de verificación

La verificación se realizó el 2026-11-21 abriendo cada URL en un navegador real (panel de navegador del agente Claude Code) y leyendo el texto completo del DOM, incluidos acordeones y preguntas frecuentes ocultos, y no un resumen generado por un modelo. Se hizo a pedido del equipo; fue ejecutada por el agente y revisada por el equipo. Resultado: 8 fuentes revisadas; 4 con correcciones o precisiones (V1, V2, V6 y V8), 3 sin cambios en el informe (V3, V4 y V7) y 1 no verificable (V5). Dentro de V6 se corrigió además el plan gratuito de DentalSoft.

### Tabla de verificación

| # | Tipo de fuente | URL | Qué afirma el informe | Qué encontramos | ¿Corregido? |
|---|---|---|---|---|---|
| V1 | Sitio oficial | https://dentalcore.app/ | DentalCore documenta WhatsApp API de Meta, ARCA, Mercado Pago, 65 obras sociales, periodontograma y auditoría; no documenta reserva online, sillones ni solapamientos; tiene precio inconsistente ($75.000 frente a USD 50) | CONFIRMADO el contenido funcional: WhatsApp API oficial de Meta ("sin QR"), factura ARCA con CAE, Mercado Pago (QR, enlace, tarjeta) y PayPal, 65 obras sociales y prepagas (en el FAQ), periodontograma de 6 sitios por pieza, registro de auditoría no editable, 4 roles, varias clínicas por cuenta, prueba de 1 semana y 30 % de descuento 6 meses hasta el 31/12. No hay reserva online de turnos nuevos (solo confirmar o cancelar desde un enlace); "sillón" y "solapamiento" no aparecen. El precio: la home no dice "$ 75.000 por mes", sino que muestra una calculadora por cantidad de usuarios ($ 78.987 por mes con el valor por defecto, o $ 55.291 con el descuento); el FAQ y los datos estructurados de la página dicen USD 50 por mes con 2 usuarios y 50 GB, USD 10 por usuario adicional (hasta 100), pago por adelantado de 1, 3, 6 o 12 meses. No aparece "$ 15.000 por usuario adicional". | Sí. El precio de DentalCore no es una inconsistencia de moneda sino un precio en USD mostrado convertido a pesos, cuyo monto varía con el tipo de cambio. Corregidos A.5 (fila 1), el resumen, C.3 y D.1. |
| V2 | Página de precios | https://agendapro.com/ar/planes | AgendaPro publica Individual $9.900, Básico $19.900, Premium $39.900 y Pro IA $129.900 en pesos (IVA incluido) y la página dental dice "desde $13.900" | CONFIRMADO. Planes en pesos con IVA incluido: Individual $9.900 por mes (primeros 3 meses a $990, 1 profesional), Básico $19.900 ("para equipos pequeños de Belleza y Bienestar"), Premium $39.900 ("para equipos pequeños de Salud y Estética", 2 profesionales), Pro IA $129.900 (5 profesionales); recepcionista IA con costo adicional. En la página dental: "los planes van desde $13.900 ARS/mes", prueba gratis de 14 días sin tarjeta, "agenda por odontólogo, práctica y sillón", "cada práctica con su duración", menciona las Leyes 25.326 y 26.529 y la sincronización con Google Calendar. "Solapamiento" y "superposición" no aparecen. | Precisión agregada en A.5 y A.4: el plan orientado a salud es Premium ($39.900), no Individual; la discrepancia $9.900 frente a $13.900 se confirma. Google Calendar de AgendaPro ya figuraba como Comprobado (S). |
| V3 | Centro de ayuda | https://intercom.help/softwaredentalink/es/articles/9493218-como-usar-el-odontograma | El odontograma de Dentalink tiene versiones por 24 h, nomenclaturas Continuo, ADA y FDI, anulación sin borrado e índice de placa; no menciona periodontograma | CONFIRMADO. Nomenclaturas "Continuo, ADA y FDI Internacional"; versiones del odontograma generadas en un plazo de 24 horas desde el cambio; botón "Anular" (la lesión "NO será eliminada, sólo anulada"); índice de placa bacteriana activable. No menciona periodontograma. | No requirió correcciones. |
| V4 | Video oficial | https://www.youtube.com/watch?v=XYDcIdG6mPk | Sin afirmaciones del informe basadas en video; se buscó ver en funcionamiento la detección de solapamientos de DentalSoft (y la agenda por sillón de AgendaPro) | Video "Dentalsoft · Agenda" (https://www.youtube.com/watch?v=XYDcIdG6mPk, canal "Dentalsoft Software Dental", 26-06-2020, 3:33, sin narración); otro video del canal: https://www.youtube.com/watch?v=SCUE9UshiPU (~6 años). Se revisaron fotogramas: muestra la agenda, un formulario de alta de turno ("Registro fácilmente tipos de cita y pacientes") y plantillas de prestaciones y tratamientos. No se ve la detección automática de solapamiento (el video es de 2020; la función se declara hoy en el sitio). El sitio dentalsoft.com.ar no enlaza el canal: la oficialidad se infiere por el nombre y el contenido. | Sin cambios de datos. La detección de solapamiento de DentalSoft se mantiene como Afirmación comercial, no Comprobado. La agenda por sillón de AgendaPro no se contrastó en video. |
| V5 | Reseña o marketplace | https://www.capterra.com/p/196361/Dentalink/ | El informe usa solo la autodeclaración del sitio (+15.000 clientes, 7 testimonios); contrastar con reseñas verificadas y con el precio inicial | NO VERIFICABLE: también en navegador real devuelve HTTP 403 con desafío anti-bot de Cloudflare. | No. Se mantiene la decisión de no usar datos de Capterra; se registra como limitación. |
| V6 | Reseñas en Google | Google Maps, búsqueda "DentalSoft"; https://dentalsoft.com.ar/ | Cifra autodeclarada por DentalSoft (5,0 sobre 11 reseñas) y plan gratuito "para 1 profesional" | En dentalsoft.com.ar se CONFIRMA el widget "5,0 calificación de 11 reseñas" de Google, pero es contenido autopublicado. En Google Maps, buscar "DentalSoft" devuelve un homónimo chileno (Dentalsoft, Providencia, Santiago, dentalsoft.cl, 5,0 con 1 reseña) y "DentalSoft La Plata" no encuentra la ficha argentina. Además se verificó en el sitio: plan Gratis $0 por mes "para todos los profesionales", "gratis durante 3 meses", hasta 50 turnos por mes, sin almacenamiento de imágenes; Gestión $30.000 y Pro $60.000 por mes (por profesional, con selector); "Urgencias y sobreturnos con detección automática de solapamiento"; sincronización con Google Calendar; integración con Mercado Pago (enlaces de pago); recordatorios por WhatsApp y e-mail. | Sí. La cifra de reseñas queda como afirmación comercial no verificable, con advertencia por el homónimo chileno. Corregido el plan gratuito: el informe decía "1 profesional" y el sitio dice "para todos los profesionales" (A.5 fila 2). |
| V7 | Normativa oficial | https://www.argentina.gob.ar/normativa/nacional/ley-27706-380710/texto | La Ley 27.706 exige respetar las leyes 26.529 y 25.326 y establece la titularidad del paciente sobre sus datos | CONFIRMADO. El Art. 1 crea el Programa Federal Único de Informatización y Digitalización de Historias Clínicas, "respetando lo establecido por el Capítulo IV de la ley 26.529 ... y por la ley 25.326"; el Art. 8 dice "El paciente es titular de los datos". | No requirió correcciones. |
| V8 | Sitio oficial | https://www.appzyra.ar/ | ZYRA: el sitio no entregó contenido a la herramienta; todas sus filas figuraban como No evidenciado | CORRECCIÓN MAYOR: en navegador real el sitio carga completo (la primera pasada solo había obtenido el título). "Software de Gestión Odontológica Integral", "Hecho en Argentina" (contacto +54 9 351…, Córdoba), 100 % nube, multidispositivo, datos encriptados y respaldados. Recordatorios de WhatsApp el día anterior a las 11:59 y confirmación SI/NO que actualiza la agenda; el WhatsApp se vincula escaneando un código QR con el número propio (no es la API oficial de Meta). Odontograma interactivo, evoluciones, radiografías, presupuestos PDF, obras sociales y aranceles, caja con arqueo, honorarios por profesional, stock, roles y permisos granulares, ARCA (plan Premium). Planes: Starter $15.000, Profesional $29.000, Premium $39.000 por mes; prueba de 30 días. Sin evidencia de reserva online, sillones, duración, solapamientos, lista de espera, Mercado Pago, Google Calendar, periodontograma ni auditoría. | Sí. ZYRA figuraba entera como NE por una limitación de la herramienta de lectura (falso negativo). Se actualizaron las filas 10 de A.1 a A.5, se puntuó en la matriz (2,85; posición 8) y se retiró de las fuentes no concluyentes. |

### Hallazgos de la verificación (para la reflexión)

- El precio "$ 75.000 por mes" de DentalCore no existe tal cual: era un USD 50 convertido a pesos, y la home muestra una calculadora cuyo monto cambia con el tipo de cambio. Lo que parecía una inconsistencia de moneda era una conversión.
- ZYRA figuraba entera como "No evidenciado" por una limitación de la herramienta de lectura y no del producto: un falso negativo que habría dejado fuera del análisis a un competidor local con precios, ARCA y caja.
- El plan gratuito de DentalSoft estaba mal citado: el sitio dice "para todos los profesionales", no "1 profesional".
- Existe un homónimo chileno de DentalSoft (dentalsoft.cl) que aparece en Google Maps; las reseñas pueden confundirse y la cifra de 11 reseñas del sitio argentino no pudo confirmarse de forma independiente.
- Capterra sigue inaccesible incluso con navegador real (HTTP 403 con desafío anti-bot de Cloudflare).
- La detección automática de solapamiento de DentalSoft no se ve en su video oficial (de 2020); sigue siendo una afirmación comercial.
- ZYRA vincula el WhatsApp con un código QR y no con la API oficial de Meta, lo que implica un riesgo de cumplimiento de los términos de WhatsApp que conviene considerar como contraste con el enfoque del MVP.

---

## Fuentes no abiertas o no concluyentes

- **Capterra** (varias fichas): HTTP 403, también en navegador real (desafío anti-bot de Cloudflare). Los datos de Capterra que aparecen en resúmenes de búsqueda (por ejemplo, precio inicial de Dentalink de US$ 29 y de Dentiqa de US$ 89) no se usan en las tablas.
- **Consultorios.AR** (folleto de la AAC, https://aac.org.ar/beneficios/imagenes/consultorios2.pdf): PDF con contenido comprimido, no legible por la herramienta. Un resumen de búsqueda mencionaba agenda multiconsultorio, historia clínica, sala de espera y norma ISO 27001, sin verificar. No figura en las tablas. El equipo puede abrir el PDF manualmente.
- **Tesis de la Universidad de San Andrés** (https://repositorio.udesa.edu.ar/jspui/bitstream/10908/23801/1/%5bP%5d%20%5bW%5d%20MBA%20Nervi%2c%20Santiago%20Luis.pdf): PDF cifrado, no legible. Un resumen de búsqueda atribuye a la tesis unos 70.000 odontólogos en Argentina y un 3 % que usa alguna herramienta tecnológica; **dato no verificado, no usar sin leer la fuente**.
- **Doctoralia** (https://www.doctoralia.com.ar/): sin respuesta (ECONNREFUSED); se usó la página de odontólogos de doctoraliar.com.
- **Reservo, Benty, MednIA, Dendoo, XDental, Pedí Tu Turno, Dentech, Dental Plus, Maxident**: no se pudieron abrir fuentes oficiales con contenido odontológico, o no se localizaron (Benty y MednIA no aparecieron en búsquedas). La guía de Reservo (https://reservo.cl/blog/profesionales/dental/guia-para-elegir-el-mejor-software-dental-en-argentina/) solo devolvió el título. La página reservo.cl/ar describe software médico general sin datos odontológicos. dendoo.com resultó ser una plataforma de comunidades, no un software odontológico (el resumen de buscador que lo ubicaba como software dental no se confirmó).
- **Videos oficiales**: se revisó un video de DentalSoft (2020, sin narración) que no muestra la detección de solapamiento; no se localizaron videos oficiales de AgendaPro ni de Dentalink.
- **Reseñas de Google de DentalSoft**: cifra autopublicada, sin ficha propia verificable en Google Maps (hay un homónimo chileno).

ZYRA dejó de figurar en esta lista: su sitio se leyó completo en navegador real (ver V8).

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
28. Dentalsoft, video "Dentalsoft · Agenda" (canal Dentalsoft Software Dental, 2020). https://www.youtube.com/watch?v=XYDcIdG6mPk
29. Dentalsoft, otro video del canal (se revisó solo su existencia y antigüedad). https://www.youtube.com/watch?v=SCUE9UshiPU
30. Dentalink en Capterra (bloqueada, HTTP 403; no se usan datos). https://www.capterra.com/p/196361/Dentalink/
31. AgendaPro, página dental (planes desde $13.900, Leyes 25.326 y 26.529, Google Calendar). https://agendapro.com/ar/dental/software-odontologico
