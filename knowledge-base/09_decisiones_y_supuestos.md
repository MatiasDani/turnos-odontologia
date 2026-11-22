# Decisiones y Supuestos

## Decisiones documentadas

### DD-01 — Stack tecnológico
**Decisión**: TypeScript sobre Node.js (LTS); lógica de dominio como módulos TypeScript puros (hexagonal/clean: dominio, aplicación/casos de uso, adaptadores); pruebas con **Vitest**; API REST opcional con **Fastify**; persistencia en **repositorios en memoria** para el MVP y pruebas, con **PostgreSQL** (free tier) como destino futuro; gestor de paquetes npm; layout `src/` y `tests/` en la raíz, según el TP.
**Contexto**: el stack no venía impuesto (checklist, punto 9); lo decidió el equipo de 6 estudiantes.
**Alternativas consideradas**: no se registraron alternativas formales en las fuentes. **Suposición:** se evaluó mantener el dominio independiente de framework frente a un backend acoplado a ORM.
**Justificación**: el diferencial es la regla de agenda por recursos; como dominio puro es verificable con TDD sin infraestructura, con costo $0.
**Trade-offs aceptados**: sin persistencia durable en el MVP; la migración a PostgreSQL es trabajo posterior; Fastify es opcional.

### DD-02 — Ajuste del MVP: reducción del alcance propuesto por el agente
**Decisión**: el MVP queda como en D.3 ajustado (agenda por recursos, turnos con estados, reserva online por enlace, recordatorios por e-mail y `wa.me`, roles básicos). Ficha clínica y odontograma, presupuesto y caja, y auditoría de accesos pasaron a **etapas posteriores**; WhatsApp Cloud API y Mercado Pago pasaron a **diferenciadores**.
**Contexto**: la primera versión del informe (generada por el agente) incluía como imprescindibles ficha con odontograma, presupuesto con caja y señas, auditoría y recordatorios por WhatsApp API. El equipo lo redujo el 2026-11-21 (protocolo de inspección, opción Ajustar) para alinearlo con el checklist confirmado.
**Alternativas consideradas**: el MVP amplio del agente (paridad con DentalCore, AgendaPro y otros).
**Justificación**: el problema priorizado es la agenda desordenada de consultorios chicos; hay restricción de costo $0 y el plazo del TP permite un change completo.
**Trade-offs aceptados**: menor paridad funcional con la competencia (que ya ofrece ficha, caja y ARCA); se compensa con el diferencial verificable de agenda sin solapamientos.

### DD-03 — Alternativas gratuitas para WhatsApp y Mercado Pago
**Decisión**: en el MVP, recordatorios por **e-mail** más enlace **`wa.me`** (click-to-chat, sin API, costo $0). **WhatsApp Cloud API** (número de prueba gratis en desarrollo) y **Mercado Pago** (sandbox) se incorporan después como diferenciadores.
**Contexto**: la restricción de costo $0 y que WhatsApp cobra por mensaje con plantilla en producción; Mercado Pago cobra comisión por cobro en producción.
**Alternativas consideradas**: WhatsApp vinculado por QR con el número propio (lo hace ZYRA); se descarta por el riesgo de incumplimiento de los términos de WhatsApp señalado en el informe. WhatsApp Cloud API desde el MVP.
**Justificación**: costo $0 y sin dependencia de terceros en el MVP.
**Trade-offs aceptados**: el envío por `wa.me` es manual (lo hace la recepción); supuesto no probado de que e-mail + `wa.me` reduzcan el ausentismo tanto como WhatsApp automático (ver SU-01).

### DD-04 — Intervalos semiabiertos [inicio, fin)
**Decisión**: todo intervalo de turno, bloqueo y horario es semiabierto; un turno que empieza cuando termina otro no se solapa (RN-05). Dos intervalos se solapan si y solo si `a1 < b2` y `b1 < a2`.
**Contexto**: evitar ambigüedad en turnos contiguos (09:00-09:45 y 09:45-10:30).
**Alternativas consideradas**: intervalos cerrados (rechazarían contiguos) o abiertos.
**Justificación**: convención estándar; permite agenda sin huecos artificiales y casos de borde bien definidos para TDD.
**Trade-offs aceptados**: la interfaz debe mostrar `fin` como hora exclusiva.

### DD-05 — Estados activos y ocupación de recursos
**Decisión**: son *activos* (ocupan profesional y sillón) los turnos `reservado`, `confirmado` y `atendido`; `cancelado` y `ausente` no ocupan recursos.
**Contexto**: D.3 lista confirmado, cancelado, ausente y atendido sin definir ocupación; RN-09 exige que cancelar libere el horario.
**Alternativas consideradas**: que `ausente` siga ocupando el hueco.
**Justificación**: coherencia con RN-02/RN-03 ("turnos activos") y RN-09.
**Trade-offs aceptados**: `reservado` es un estado añadido por el equipo (ver DD-11).

### DD-06 — Bloqueo sobre turnos existentes (provisoria)
**Decisión provisoria**: si al crear un bloqueo hay turnos activos debajo, el sistema informa los conflictos y no crea el bloqueo hasta que se reprogramen o cancelen.
**Contexto**: pregunta abierta del checklist (punto 11).
**Alternativas consideradas**: crear el bloqueo y marcar los turnos para reprogramar; cancelarlos automáticamente.
**Justificación**: no destruye turnos en silencio; es el comportamiento más conservador.
**Trade-offs aceptados**: más fricción para el odontólogo. A confirmar con el equipo.

### DD-07 — Datos ficticios únicamente y cumplimiento normativo
**Decisión**: nunca se almacenan datos reales de pacientes en el repositorio, tests ni ejemplos; solo datos ficticios. Se toman como restricción las Leyes 25.326 y 26.529.
**Contexto**: riesgo principal del checklist: datos sensibles de salud.
**Justificación**: obligación legal y de buena práctica; el MVP además evita datos clínicos.
**Trade-offs aceptados**: los tests y demos usan datos inventados.

### DD-08 — Un change completo de punta a punta
**Decisión**: el TP implementa un change completo; el primer change es "dar un turno sin solapamiento" (caso de uso 1, bloquea el MVP). El resto se documenta como roadmap.
**Justificación**: plazo del TP.

### DD-09 — Zona horaria IANA por consultorio
**Decisión** (2026-11-21, explore de C-01): cada consultorio define `Consultorio.zonaHoraria` (IANA), por defecto `America/Argentina/Buenos_Aires`. Los instantes se guardan en UTC (`Date`); el horario de atención se expresa `HH:mm` en hora local del consultorio. La conversión usa `Intl.DateTimeFormat({ timeZone })`, sin dependencias.
**Contexto**: antes era el supuesto SU-04 y la pregunta abierta del checklist (IN-04).
**Alternativas consideradas**: librería de fechas (luxon, date-fns-tz); offset fijo UTC-3.
**Justificación**: costo $0, sin dependencias y robusto ante cambios de offset.
**Trade-offs aceptados**: el dominio debe convertir hora local a UTC con cuidado en los bordes de cambio de offset.

### DD-10 — Duración del turno ajustable de forma opcional
**Decisión** (2026-11-21, explore de C-01): la duración puede ajustarse por turno. Sin `duracionMinutos`, `fin = inicio + prestacion.duracionMinutos`; con `duracionMinutos`, `fin = inicio + duracionMinutos`. Debe ser un entero > 0 y múltiplo de 5, sin tope (lo limita el horario de atención). Solo recepción, odontólogo y administrador pueden informarla; el paciente usa siempre la de la prestación (RN-06, RN-16).
**Contexto**: reemplaza el supuesto SU-06 (duración fija) y cierra la pregunta abierta del checklist.
**Alternativas consideradas**: duración fija por prestación; tope máximo por prestación.
**Justificación**: los casos reales varían (p. ej. una consulta que se extiende); el solapamiento sigue protegido porque se valida con `fin` efectivo.
**Trade-offs aceptados**: `Turno` persiste la duración efectiva además de `fin`.

### DD-11 — Estados del turno y estado inicial
**Decisión** (2026-11-21, explore de C-01): se mantienen los 5 estados (`reservado`, `confirmado`, `cancelado`, `ausente`, `atendido`). El turno creado por recepción, odontólogo o administrador nace `confirmado`; la reserva online del paciente (C-10) nace `reservado`. Activos: `reservado`, `confirmado`, `atendido` (DD-05).
**Contexto**: cierra SU-03 y la pregunta abierta sobre `reservado`.
**Alternativas consideradas**: eliminar `reservado`.
**Justificación**: la reserva online necesita una instancia de confirmación; el alta interna no.
**Trade-offs aceptados**: dos estados iniciales según el origen.

### DD-12 — Consulta de disponibilidad: combos, `ahora`, paso y estrategia
**Decisión** (2026-11-21, explore de C-07, Matías Ibañez): `ConsultarDisponibilidad` solo ofrece profesionales habilitados (su `prestacionIds` incluye la prestación) y cualquier sillón activo (no evalúa `requiereSillonIds`); `AgendarTurno` (C-01) no se modifica. Además:
- **Salida**: combinaciones `{inicio, fin, profesionalId, sillonId}` ordenadas de forma determinista (inicio, luego `profesionalId`, luego `sillonId`), con filtro opcional `profesionalId`, y un helper puro que las agrupa por horario único para la vista del paciente. C-10 toma el primer combo del horario elegido y llama a `AgendarTurno`; la carrera la resuelve RN-12.
- **Pasado y rango**: el input recibe `ahora: Date` (quien llama pasa `reloj.ahora()`; el puerto `Reloj` lo crea C-10, DD-16); se excluyen huecos con `inicio < ahora`. Rango `{desde, hasta}` semiabierto, de hasta 31 días; rango invertido o vacío, o de más de 31 días, es error de validación.
- **Duración**: `duracionMinutos` opcional más `actor`, reutilizando RN-06 y RN-16 (el paciente solo con la duración de la prestación).
- **Granularidad**: `pasoMinutos` (entero > 0, múltiplo de 5, por defecto 15); los candidatos se alinean al inicio de cada tramo de atención.
- **Errores** (implementado en C-07): validación de entrada con `ConsultaInvalidaError` (`campo: 'rango' | 'paso'`, sin ampliar `CodigoRN`); orden fijo rango → paso → prestación inexistente → profesional filtrado inexistente → RN-18 de la prestación → RN-16 → RN-06 (las validaciones de rango y paso ocurren antes de generar candidatos).
- **Estrategia**: cada candidato (profesional habilitado × sillón × inicio) se evalúa con `validarAlta` de C-01, única fuente de verdad. La consulta es de solo lectura, no reserva el hueco y es idempotente.
**Contexto**: RN-13 y US-003 no definían formato de salida, granularidad, tratamiento del pasado ni límite del rango; C-10 necesita una salida estable para asignar el sillón.
**Alternativas consideradas**: devolver solo horarios agregados (pierde el recurso a asignar); calcular huecos por resta de intervalos libres (duplica la lógica de C-01); leer el reloj dentro del caso de uso (no hay `Reloj` hasta C-02); granularidad fija en fixture.
**Justificación**: una sola fuente de verdad garantiza que todo hueco ofrecido se pueda agendar; el orden determinista hace reproducibles los tests y la asignación de C-10; el tope de 31 días acota el costo de enumerar candidatos.
**Trade-offs aceptados**: la enumeración por candidato es O(días × inicios × profesionales × sillones), aceptable para 1-5 profesionales y 1-3 sillones; la disponibilidad y el alta pueden discrepar en la habilitación del profesional hasta resolver la pregunta abierta (la reserva online lo cubre con RN-19, DD-14).

### DD-13 — Capa HTTP de C-10: sin Fastify, solo DTO y validador puro de frontera
**Decisión** (2026-11-21, explore de C-10, Matías Ibañez): C-10 no agrega Fastify ni dependencias. Incluye un DTO de entrada y un validador puro de frontera en `src/adapters/http/` (sin framework). Los endpoints (`POST /public/reservas`, `GET /public/disponibilidad`), el rate limit y los logs redactados quedan para un change posterior (C-14 o el que integre HTTP).
**Contexto**: DD-01 deja Fastify como opcional y la pregunta abierta sobre la API REST seguía sin resolver; C-10 es de governance ALTO (datos personales en ruta pública) y conviene acotar su superficie.
**Alternativas consideradas**: agregar Fastify en C-10 con `fastify.inject`; dejar toda la validación dentro del caso de uso.
**Justificación**: costo $0 y cero dependencias nuevas; la frontera valida la forma del pedido y el dominio revalida invariantes; el cableado HTTP se decide una sola vez cuando haya UI (C-14).
**Trade-offs aceptados**: C-10 no expone endpoints; rate limit y logs redactados quedan diferidos y deben retomarse antes de publicar la ruta.

### DD-14 — `ReservarOnline`: pedido, paciente, carrera, error público y `Reloj`
**Decisión** (2026-11-21, explore de C-10, Matías Ibañez):
- **Pedido**: `{prestacionId, inicio, profesionalId?, paciente: {dni, nombre, apellido, telefono, email?, consentimientoContacto}}` (nombre y apellido agregados el 2026-11-21, DD-17); sin `duracionMinutos` ni `sillonId` (RN-16, SU-05). `ReservarOnline` consulta `ConsultarDisponibilidad` (C-07) con actor paciente y `ahora` para ese `inicio`, toma el primer combo (filtrado por `profesionalId` si viene), verifica RN-19 y RN-20 y llama a `AgendarTurno` con estado `reservado` y `origen: 'online'` (DD-11).
- **Carrera**: si `AgendarTurno` rechaza por RN-02/RN-03, reintenta UNA vez con el siguiente combo del mismo horario; si falla, error público "horario no disponible" y nueva oferta de disponibilidad del día de `inicio` (RN-12).
- **Paciente**: alta mínima con DNI (7-8 dígitos), nombre, apellido, teléfono argentino normalizado y `consentimientoContacto === true` obligatorio; e-mail opcional (formatos en DD-17). Si el DNI ya existe, el turno se vincula al `pacienteId` existente sin modificar teléfono ni datos y la respuesta no revela que el DNI existía (RN-22). Puerto mínimo `PacienteRepositorio` (`obtenerPorDni`, `guardar`), creado por C-10 (DD-16).
- **Error público**: la ruta pública nunca devuelve `turnoEnConflicto`, `bloqueoEnConflicto` ni datos de otros pacientes; los `ReglaNegocioError` se mapean a un error público genérico (RN-22).
- **Límites**: máximo 2 turnos online activos futuros por DNI y reserva repetida idempotente (RN-23).
- **Mail de confirmación**: fuera de C-10; el token va en la respuesta y los envíos son de C-12.
- **Detalles de implementación** *(apply de C-10, 2026-11-21; no cambian la decisión)*: (1) orden fijo de errores públicos: `DATOS_INVALIDOS`, `RESERVA_EN_PASADO`, `PRESTACION_NO_DISPONIBLE`, `PROFESIONAL_NO_DISPONIBLE`, `RESERVA_DUPLICADA`, `LIMITE_DE_TURNOS`, `HORARIO_NO_DISPONIBLE`; (2) la verificación explícita de RN-19 exige profesional **activo** y con la prestación en `prestacionIds`, tanto para los combos como para la nueva oferta; (3) los errores de dominio de C-01/C-07 que escapen de la consulta o del alta se traducen a `HORARIO_NO_DISPONIBLE` con nueva oferta (la oferta es vacía si falla), mientras que los errores inesperados (no de dominio) se propagan sin enmascarar; (4) el reintento ante carrera solo corresponde a RN-02/RN-03, reconsulta el mismo `inicio` y descarta el combo fallido; cualquier otro rechazo del alta (RN-07, RN-17, RN-18, recurso inexistente) no se reintenta; (5) el paciente nuevo se guarda después del alta del turno; (6) `RESERVA_DUPLICADA` se evalúa antes que `LIMITE_DE_TURNOS`.
- **Ahora**: `ReservarOnline` obtiene `ahora` de un puerto `Reloj` (`ahora(): Date`), creado por C-10 (DD-16).
**Contexto**: US-009 y el flujo 2 no definían el pedido, el tratamiento de un DNI existente, la carrera ni qué se expone en la ruta pública; cierra la pregunta abierta sobre registro vs. DNI + teléfono (alta mínima sin cuenta).
**Alternativas consideradas**: pedir `sillonId` al paciente (contradice SU-05); actualizar teléfono de un DNI existente (permitiría pisar datos ajenos desde una ruta pública); enviar el e-mail desde C-10 (acopla con el notificador de C-12); reintentar sin límite ante la carrera.
**Justificación**: reutiliza la única fuente de verdad (C-07 y C-01); el vínculo por DNI sin revelar existencia evita enumeración de pacientes y modificación de datos ajenos (RN-D-02); un solo reintento acota el costo y mantiene el comportamiento determinista.
**Trade-offs aceptados**: un paciente con DNI existente y teléfono desactualizado conserva el dato viejo hasta que lo corrija recepción; el segundo combo puede asignar otro profesional distinto al que vio el paciente.
**Coordinación** *(resuelta el 2026-11-21)*: C-10 crea el puerto `Reloj` y el puerto `PacienteRepositorio` (DD-16); C-02 reutiliza el `Reloj` y C-05 extiende `PacienteRepositorio`. Lo autorizó Matías Ibañez, único integrante activo hasta cerrar C-10.

### DD-15 — Token de gestión: entidad `TokenGestion` con hash SHA-256
**Decisión** (2026-11-21, explore de C-10, Matías Ibañez): el token son 32 bytes aleatorios (`node:crypto`) en base64url. Se almacena solo el hash SHA-256 en una entidad/repositorio propio `TokenGestion` (`turnoId`, `hash`, `creadoEn`), separado de `Turno`; un token por turno. El token en claro se devuelve una única vez en la respuesta de la reserva. Vence al pasar el `fin` del turno o al cancelarse (sin TTL propio). Servicio reutilizable por C-11 y C-12 con `emitir(turnoId)`, `resolver(tokenPlano)` y `rotar(turnoId)` (RN-21, RN-15).
- **Enlace de C-12** *(decisión del 2026-11-21; se implementa en C-12, no en C-10)*: **rotación**. Al enviar cada recordatorio, C-12 llama a `rotar(turnoId)`: emite un token nuevo (cuyo valor en claro va solo en el enlace del e-mail) e invalida el anterior. Así nunca se guarda un token en claro; el último enlace enviado es el único válido.
**Contexto**: el modelo tenía `Turno.tokenGestion` en claro con índice único; un volcado de datos habría expuesto todos los enlaces de gestión.
**Alternativas consideradas**: guardar el token en claro dentro de `Turno`; token firmado (JWT) con TTL.
**Justificación**: con 256 bits de entropía basta un hash rápido (SHA-256) sin sal; separar la entidad mantiene `Turno` libre de secretos y permite resolver por hash sin exponer el token.
**Trade-offs aceptados**: un token perdido no se puede recuperar (hay que rotarlo); cada recordatorio invalida el enlace anterior (el de la respuesta de la reserva o el de un e-mail previo), por lo que el paciente debe usar el último enlace recibido.

### DD-16 — Puertos `Reloj` y `PacienteRepositorio` creados por C-10
**Decisión** (2026-11-21, Matías Ibañez): C-10 crea, como piezas aditivas:
- El puerto `src/application/puertos/reloj.ts` → `export interface Reloj { ahora(): Date }`; el adaptador de sistema `src/adapters/reloj/reloj-sistema.ts` (único lugar del código con `new Date()` sin argumentos, fuera del dominio) y un reloj fijo para tests en `tests/fixtures/`.
- El puerto `PacienteRepositorio { obtenerPorDni(dni): Promise<Paciente | undefined>; guardar(paciente): Promise<void> }` con su adaptador en memoria.
C-02 **reutiliza** el `Reloj` (no lo redefine) y C-05 **extiende** `PacienteRepositorio` (p. ej. `obtenerPorId`, búsqueda por teléfono, modificación por recepción).
**Contexto**: C-10 necesita ambos puertos y sus dueños originales (C-02 y C-05) todavía no empezaron; Matías Ibañez es el único integrante activo hasta cerrar C-10 y autorizó crearlos sin coordinación previa.
**Alternativas consideradas**: esperar a C-02 y C-05; pasar `ahora` como dato del pedido (lo pondría en manos del cliente público).
**Justificación**: desbloquea el camino crítico sin duplicar puertos; las firmas son mínimas y extensibles.
**Trade-offs aceptados**: C-02 y C-05 heredan firmas que no diseñaron; cualquier cambio de firma debe mantener compatibles a C-10 y sus tests.

### DD-17 — Datos del alta online del paciente
**Decisión** (2026-11-21, Matías Ibañez): el alta online **sí pide nombre y apellido** (el modelo `Paciente` los requiere, `src/domain/paciente.ts`). Formatos:
- `dni`: se quitan los puntos; deben quedar 7 u 8 dígitos.
- `nombre` y `apellido`: texto con `trim`, no vacío, longitud máxima 80.
- `telefono`: teléfono argentino normalizado a solo dígitos: se quitan espacios, guiones, puntos y paréntesis; un prefijo `+` solo se admite como `+54` y debe quedar entre 10 y 13 dígitos (ej.: `+54 9 11 0000-0004` → `5491100000004`).
- `email`: opcional; si viene, formato válido.
- `consentimientoContacto`: debe ser exactamente `true`.
**Contexto**: la KB solo mencionaba DNI y teléfono, pero `Paciente` exige nombre y apellido y la recepción los necesita para atender.
**Alternativas consideradas**: alta sin nombre (rompe el modelo); nombre opcional completado por recepción.
**Justificación**: dato mínimo necesario para identificar al paciente en la agenda (RN-D-02) sin abrir campos nuevos.
**Trade-offs aceptados**: un DNI existente conserva el nombre ya cargado aunque el pedido traiga otro (RN-22).

### DD-18 — Datos de profesionales en las rutas públicas
**Decisión** (2026-11-21, Matías Ibañez): la respuesta de la reserva online incluye `inicio`, `fin`, el nombre de la prestación y el nombre y apellido del profesional asignado (personal del consultorio, no dato de pacientes); nunca el sillón interno, ids de otros turnos ni datos de otros pacientes. La consulta pública de disponibilidad (cuando exista HTTP) puede mostrar el nombre del profesional.
**Contexto**: pregunta abierta sobre si se exponen nombres de profesionales en lo público.
**Alternativas consideradas**: ocultar al profesional hasta el día del turno; mostrar solo la matrícula.
**Justificación**: el paciente necesita saber con quién se atiende; el nombre del profesional es información que el consultorio ya publica. El sillón es un recurso interno (SU-05).
**Trade-offs aceptados**: ante una carrera, el reintento puede asignar otro profesional; la respuesta lo informa.

### DD-19 — `CancelarTurno`: estados cancelables, errores, atomicidad, campos, roles y recordatorios
**Decisión** (2026-11-22, explore de C-02, Franco Petri):
- **Estados cancelables**: solo `reservado → cancelado` y `confirmado → cancelado` (transiciones de `04_modelo_de_datos.md`). Un turno `cancelado`, `atendido` o `ausente` no se cancela. La transición no depende de la hora: recepción, odontólogo y administrador pueden cancelar un turno `confirmado` cuyo `inicio` ya pasó (todavía no marcado `atendido` ni `ausente`); el paciente nunca llega a ese caso porque RN-08 lo rechaza antes.
- **Orden de evaluación**: turno inexistente (`RecursoNoEncontradoError`, sin código RN), luego transición de estado (`RN-10`), luego anticipación del paciente (`RN-08`). Un paciente que cancela un turno ya cancelado recibe `RN-10`, no `RN-08`.
- **Errores**: la transición inválida se rechaza con `ReglaNegocioError` de código `RN-10` e informa el `estadoActual` del turno; la falta de anticipación, con código `RN-08`. `CodigoRN` suma `RN-08` y `RN-10`. No se crea una clase de error nueva.
- **Anticipación (RN-08)**: el paciente cancela solo si `inicio - reloj.ahora() >= 24 h`, medido como diferencia absoluta en milisegundos (`>= 86 400 000`; Argentina no tiene horario de verano). `ahora` sale del puerto `Reloj` de DD-16.
- **Atomicidad**: `TurnoRepositorio` suma `actualizarSi(id, cambio)`, donde `cambio(actual)` devuelve el turno modificado o una `Violacion`. Es una sección crítica sin `await` (como `agregarSiDisponible`, RN-12): lee el turno actual, ejecuta `cambio` y, solo si no hay violación, lo reemplaza; si hay violación rechaza con `ReglaNegocioError` y no persiste nada. RN-10 y RN-08 se evalúan dentro de `cambio`, con el `ahora` leído antes de entrar. C-03 y C-04 reutilizan la misma operación.
- **Campos**: `Turno` suma solo `canceladoEn?: Date` y `canceladoPor?: Rol`. `creadoEn` y `actualizadoEn` de `04_modelo_de_datos.md` siguen pendientes (ver `10_preguntas_abiertas.md`).
- **Roles**: C-02 no hace control de acceso. El odontólogo se trata como la recepción (sin restricción de anticipación) aunque la matriz RBAC de `03_actores_y_roles.md` no le permite cancelar; lo resuelve C-09. Tampoco verifica que el turno sea del paciente (el `Actor` no tiene identidad): lo hace C-11 con el token de gestión.
- **Recordatorios**: puerto `Recordatorios { cancelarPendientes(turnoId): Promise<void> }` con un adaptador no-op. `CancelarTurno` lo llama solo si la cancelación se concretó, después de `actualizarSi` y fuera de la sección crítica; si falla, el error se propaga y la cancelación persistida no se deshace. C-12 implementa el adaptador real sin modificar `CancelarTurno`.
- **Token de gestión**: no se invalida al cancelar; `ServicioTokens.resolver` ya rechaza los turnos cancelados (RN-21).
- **Liberación (RN-09)**: no requiere lógica propia; `esActivo()` ya excluye `cancelado` del alta, de la disponibilidad y del tope de RN-23.
**Contexto**: el código de C-01/C-10 no tenía campos de cancelación, ni operación de modificación en `TurnoRepositorio`, ni los códigos RN-08/RN-10, ni puerto de recordatorios; la matriz RBAC y el scope de C-02 no coincidían para el odontólogo.
**Alternativas consideradas**: clase `TransicionInvalidaError` sin código RN; `guardar(turno)` simple (la última escritura pisa a la anterior); agregar también `creadoEn`/`actualizadoEn` (obliga a inyectar el `Reloj` en `AgendarTurno` y tocar tests de C-01 y C-10); rechazar al odontólogo en C-02; no crear el puerto de recordatorios o usar eventos de dominio.
**Justificación**: reusa el contrato de errores RN de C-01 sin crear reglas nuevas; la sección crítica evita que una cancelación y una reprogramación concurrentes se pisen; mantiene el alcance de C-02 sin modificar código de otros changes ni invadir el dominio CRÍTICO de C-09.
**Trade-offs aceptados**: hasta C-09 un odontólogo puede cancelar desde el caso de uso; un fallo del adaptador real de recordatorios (C-12) deja la cancelación hecha y el error a cargo de quien llama.

### DD-20 — Estados del turno: transiciones, RN-24, campos, roles y errores
**Decisión** (2026-11-22, explore de C-04, Franco Petri):
- **Casos de uso**: `ConfirmarTurno` (`reservado → confirmado`), `MarcarAtendido` y `MarcarAusente` (`confirmado → atendido | ausente`). Entrada `{ turnoId, actor }`, igual que `CancelarTurno`; devuelven el turno modificado.
- **Tabla única de transiciones**: el dominio define una sola tabla de transiciones permitidas (`reservado → confirmado | cancelado`, `confirmado → atendido | ausente | cancelado`) con un predicado `puedeTransicionar(desde, hacia)`. La cancelación (C-02) pasa a usarla en lugar de su lista propia, sin cambiar su comportamiento.
- **Errores**: una transición no permitida, incluida repetir la misma (confirmar un `confirmado`), se rechaza con `ReglaNegocioError` de código `RN-10` y `estadoActual`. No se crea una clase de error nueva.
- **Restricción horaria (RN-24)**: `atendido` y `ausente` solo con `ahora >= inicio` (inclusivo); antes, `RN-24`. Confirmar no tiene restricción horaria: un turno `reservado` cuyo `inicio` ya pasó se puede confirmar (el paciente por token no llega a ese caso porque el token vence en el `fin`, RN-21).
- **Orden de evaluación**: turno inexistente (`RecursoNoEncontradoError`), luego transición (`RN-10`), luego hora (`RN-24`).
- **Atomicidad**: reutiliza `TurnoRepositorio.actualizarSi` (DD-19); las reglas se evalúan dentro de `cambio` con el `ahora` leído una sola vez antes de entrar.
- **Campos**: C-04 no agrega campos a `Turno`. `creadoEn`/`actualizadoEn` se posponen al change que integre la persistencia real; tampoco se agregan `confirmadoEn`, `atendidoEn` ni `ausenteEn`.
- **Roles**: C-04 no hace control de acceso; el `actor` viaja en la entrada por contrato, pero ninguna regla lo usa. Quién puede confirmar o cerrar un turno lo resuelve C-09 (pregunta abierta).
- **Recordatorios**: sin hook. Al cerrar un turno su hora ya pasó; la confirmación desde el recordatorio la cablea C-12 llamando a `ConfirmarTurno`.
- **Liberación**: `ausente` libera profesional y sillón sin lógica nueva porque `esActivo()` ya lo excluye (DD-05); `atendido` sigue ocupando.
**Contexto**: el scope de C-04 no menciona timestamps ni horarios; el Flujo 7 dice que el cierre se hace "después de la hora del turno"; la matriz RBAC no tiene fila para cambiar el estado.
**Alternativas consideradas**: agregar `creadoEn`/`actualizadoEn` obligatorios (toca C-01, C-10 y unos 55 asserts de tests); campos por transición (`confirmadoEn`, `atendidoEn`, `ausenteEn`); permitir el cierre sin restricción horaria; un único caso de uso `CambiarEstado(hacia)`; una lista de estados por caso de uso.
**Justificación**: mantiene C-04 acotado a su scope sin modificar código de otros changes; RN-24 evita liberar un horario por un `ausente` marcado por error antes del turno; una sola tabla evita que cancelación y estados diverjan.
**Trade-offs aceptados**: el modelo de la KB sigue teniendo `creadoEn`/`actualizadoEn` sin implementar; hasta C-09 cualquier rol (incluido el paciente) puede cerrar un turno desde el caso de uso, aunque ninguna ruta pública lo expone.

## Supuestos inferidos

### SU-01 — E-mail + `wa.me` es suficiente frente a WhatsApp automático
**Supuesto**: reducen el ausentismo de forma comparable.
**Origen**: checklist, punto 10 (supuesto no probado).
**Riesgo si es falso**: el MVP pierde valor percibido frente a la competencia con WhatsApp automático.
**Cómo validar**: pilotear con un consultorio real (fuera del repositorio) o entrevistar usuarios.

### SU-02 — La secretaria adoptará el sistema en lugar de WhatsApp y papel
**Origen**: checklist, punto 10.
**Riesgo si es falso**: el sistema no se usa.
**Cómo validar**: entrevistas y prueba de usabilidad con una secretaria.

### SU-03 — Estado `reservado` previo a `confirmado` *(resuelto: DD-11, 2026-11-21)*
**Supuesto**: el alta crea el turno sin confirmar.
**Origen**: D.3 solo enumera confirmado, cancelado, ausente, atendido.
**Riesgo si es falso**: estados sobrantes; simplificable a `confirmado` en el alta.
**Cómo validar**: decisión del equipo antes del primer change.

### SU-04 — Zona horaria única por consultorio *(confirmado: DD-09, 2026-11-21)*
**Supuesto**: `America/Argentina/Buenos_Aires` (UTC-3, sin horario de verano) como valor por defecto, almacenada por consultorio.
**Origen**: contexto argentino; pregunta abierta del checklist.
**Riesgo si es falso**: errores de horario.
**Cómo validar**: confirmar con el equipo.

### SU-05 — El sistema asigna el sillón en la reserva online
**Supuesto**: el paciente elige prestación y horario; el sillón lo asigna el sistema.
**Origen**: inferido de D.3 ("respetando disponibilidad real, duración y recursos").
**Riesgo si es falso**: hace falta exponer el sillón al paciente.
**Cómo validar**: revisar con el equipo.

### SU-06 — Duración fija por prestación *(rechazado: reemplazado por DD-10, 2026-11-21)*
**Supuesto**: hasta resolver la pregunta abierta, la duración es la de la prestación (RN-06). El equipo decidió que sea ajustable por turno de forma opcional.
**Origen**: RN-06 del checklist.

### SU-07 — Recordatorio por defecto 24 h antes
**Supuesto**: el recordatorio se programa 24 h antes del turno (configurable).
**Origen**: inferido del umbral de RN-08 y de las prácticas del mercado (DentalCore 48 y 24 h; AgendaPro 1, 2 o 3 días).
**Cómo validar**: confirmar con el equipo.

### SU-08 — Un consultorio por instalación en el MVP
**Supuesto**: multi-sucursal queda fuera (etapa posterior).
**Origen**: D.3.

### SU-09 — Horario por profesional prevalece sobre el del consultorio
**Supuesto**: si existe horario propio del profesional, se usa ese; si no, el del consultorio.
**Origen**: inferido; el checklist solo habla de "horario de atención".
