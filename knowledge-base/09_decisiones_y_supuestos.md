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

### DD-21 — Recordatorio por e-mail: programación, barrido, confirmación por enlace y SMTP
**Decisión** (2026-11-22, explore de C-12, Franco Petri):
- **Puerto `Recordatorios`**: suma `programar(turnoId)` idempotente (RN-25) a `cancelarPendientes(turnoId)`. No hay un `reprogramar` aparte: C-03 llama a `programar` después de mover el turno. El adaptador real persiste en un `RecordatorioRepositorio` (con adaptador en memoria) y reemplaza al no-op sin modificar `CancelarTurno` (DD-19).
- **Enganche al alta**: decorador `AgendarTurnoConRecordatorio` con la misma interfaz que `AgendarTurno`: ejecuta el alta y luego `programar`. Se inyecta en `ReservarOnline` como `agendar` y lo usa también el alta de recepción. No se modifica código de C-01 ni de C-10. Si `programar` falla, el error se propaga y el turno creado no se deshace (mismo criterio que DD-19).
- **Envío**: caso de uso `EnviarRecordatoriosPendientes` (barrido, RN-25) con `Reloj` inyectado y la anticipación por configuración. Por cada recordatorio a enviar: `ServicioTokens.rotar(turnoId)` (DD-15), arma el mensaje con `BASE_URL_PUBLICA` y lo entrega al puerto `Notificador`. El proceso que ejecuta el barrido periódicamente (cron o `setInterval`) queda para la integración HTTP (C-14).
- **Confirmación por enlace**: caso de uso público `ConfirmarDesdeEnlace(token)`: resuelve con `ServicioTokens.resolver` (C-10); token inválido, vencido o de un turno cancelado → error público genérico (patrón de RN-22); turno `reservado` → `ConfirmarTurno` (C-04, actor paciente); turno ya `confirmado` → éxito sin cambios; otro estado → error público genérico.
- **Fallos**: envío fallido → `fallido` con `motivoFallo`, sin reintento; caso de uso `ListarRecordatoriosFallidos` para la recepción. Un pendiente que quedó colgado porque falló `cancelarPendientes` nunca se envía: el barrido revalida el estado del turno y lo marca `cancelado`.
- **Notificador**: puerto `Notificador { enviar(mensaje) }`, adaptador falso para tests (ningún test usa la red) y adaptador SMTP con `nodemailer` en `src/adapters/` (primera dependencia de runtime), configurado con `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` y `SMTP_PASS`. Para desarrollo y demo se usa Ethereal (SMTP de prueba gratuito que no entrega a casillas reales).
**Contexto**: C-03 (reprogramar) todavía no existe; `AgendarTurno` y `ReservarOnline` no tenían punto de enganche; el modelo de `Recordatorio` no tenía estado para la anulación; el token solo existe como hash, por eso la rotación (DD-15); el proyecto no tenía dependencias de runtime.
**Alternativas consideradas**: inyectar `recordatorios` dentro de `AgendarTurno` (toca C-01 y todos sus tests); un método `reprogramar` separado; un barrido que detecte turnos sin recordatorio; borrar el recordatorio al cancelar en vez de marcarlo; reintentos automáticos; un adaptador de consola sin SMTP real.
**Justificación**: el decorador respeta la arquitectura hexagonal sin tocar código ajeno; `programar` idempotente deja a C-03 una sola llamada; revalidar en el barrido hace innecesario reintentar la cancelación; Ethereal mantiene costo $0 y evita enviar a casillas reales con datos ficticios.
**Trade-offs aceptados**: el token de la reserva deja de servir cuando sale el recordatorio; si un envío falla, el paciente queda sin enlace válido hasta que la recepción lo contacte; sin el runner (C-14) el barrido solo se ejecuta llamándolo; `nodemailer` es la primera dependencia de producción.
**Precisiones del apply** (2026-11-22, C-12): el remitente del e-mail es `SMTP_USER` (los free tier exigen que coincida con la cuenta autenticada), así que `SMTP_USER` y `SMTP_PASS` son obligatorias al usar SMTP; `RECORDATORIO_HORAS_ANTES` acepta enteros de 1 a 720 y los errores de configuración nombran la variable sin mostrar su valor; el motivo de un envío fallido es el texto fijo "El servicio de e-mail rechazó el envío."; el error público del enlace tiene el único código `ENLACE_INVALIDO` con el mensaje fijo "El enlace no es válido o ya no está vigente."; `MensajeEmail` (para, asunto, texto plano) vive en el dominio y el puerto `Notificador` lo reexporta; el mensaje no incluye el nombre del paciente (mínimo dato); si dos confirmaciones del mismo enlace compiten, la que pierde (`RN-10` con estado actual `confirmado`) también responde éxito.

### DD-22 — Reprogramación atómica: estados, anticipación, atomicidad y contrato
**Decisión** (2026-11-23, explore de C-03, Luka Garro; confirmada por el equipo):
- **Estados**: solo se reprograman turnos `reservado` y `confirmado`. Otro estado se rechaza con `RN-10` e `estadoActual`. La reprogramación no cambia el estado ni agrega un estado `reprogramado`: conserva `id`, paciente, estado y origen (coherente con DD-19 y DD-20).
- **Orden de rechazos**: turno inexistente (`RecursoNoEncontradoError`, sin código RN) → `RN-10` → `RN-08` → reglas del nuevo horario en el orden de `validarAlta`. RN-08 se extrae a una regla pura compartida con `evaluarCancelacion` (24 h en milisegundos, umbral inclusivo); el comportamiento de C-02 no cambia.
- **Atomicidad**: `TurnoRepositorio.actualizarSi` se extiende de forma compatible para pasar al callback los turnos de los recursos de destino (parámetro opcional `recursos`). El caso de uso excluye el propio turno por `id` y re-ejecuta `validarAlta` dentro de la sección crítica, sin `await`, igual que `AgendarTurno` con `agregarSiDisponible`. Así se cierra el riesgo documentado en el design de C-02 (D4).
- **Entrada**: `{ turnoId, actor, inicio, profesionalId?, sillonId?, prestacionId?, duracionMinutos? }`. Los recursos no informados se conservan; la duración sigue RN-06/RN-16; no existe campo para forzar solapamientos (RN-04). No se agrega la restricción RN-20 para el personal: es exclusiva de la reserva online.
- **Recordatorio**: después de persistir y fuera de la sección crítica se llama a `Recordatorios.programar(turnoId)` (DD-21, RN-25). Si falla, el error se propaga y el turno ya movido no se deshace, igual que en DD-19. Cierra la pregunta abierta N° 84.
- **Roles**: C-03 no hace control de acceso; C-09 debe cubrir también reprogramar en la matriz RBAC (pregunta abierta N° 81).

**Contexto**: C-02 creó `actualizarSi` pero su callback solo veía el turno propio; C-12 ya dejó el puerto `Recordatorios.programar` listo; la KB no definía estados reprogramables ni el orden de rechazos.
**Alternativas consideradas**: reutilizar `evaluarCancelacion` (arrastra la transición a `cancelado`); un estado `reprogramado` (pierde identidad y rompe el vínculo con el token); un método `reprogramarSi` separado (duplica la sección crítica); validar solo fuera de la sección crítica (carrera RN-12).
**Justificación**: reutiliza `validarAlta` como única fuente de reglas y mantiene la atomicidad en un solo contrato de modificación, sin tocar el comportamiento de changes archivados.
**Trade-offs aceptados**: extensión aditiva de un puerto que implementan C-02 y C-04; fallo del adaptador de recordatorios deja el turno movido; RBAC diferido a C-09.

### DD-23 — Gestión del turno por token: operaciones, errores públicos y vigencia
**Decisión** (2026-11-23, explore de C-11, Luka Garro; confirmada por el equipo):
- **Operaciones**: el paciente consulta, cancela y reprograma su turno con el token vigente del enlace. Las tres resuelven el token con `ServicioTokens.resolver` (DD-15) antes de cualquier otra comprobación; no se acepta `turnoId`, `actor` ni rol desde la entrada. Cancelar y reprogramar delegan en los casos de uso de C-02 y C-03 con actor `paciente`, sin duplicar RN-08/RN-09/RN-10/RN-11/RN-12.
- **Errores públicos**: el token inválido, vencido, rotado o de un turno cancelado usa `ErrorEnlacePublico` (`ENLACE_INVALIDO`, DD-21), sin revelar motivo. Los demás rechazos usan un error de conjunto cerrado con mensajes fijos: `CONTACTAR_CONSULTORIO` (RN-08), `HORARIO_NO_DISPONIBLE` (reglas del nuevo horario o recursos) y `DATOS_INVALIDOS` (`inicio` inválido). Ningún error incluye códigos RN, ids, sillones, estados, tokens ni errores de dominio de origen (RN-22, RN-D-02, DD-18).
- **Orden**: token → anticipación de 24 h → reglas del nuevo horario. La anticipación se comprueba con la regla pura compartida de C-03 (umbral inclusivo); con menos de 24 h se responde `CONTACTAR_CONSULTORIO` y no se cancela, mueve ni toca el recordatorio (US-010).
- **Vigencia**: reprogramar **no rota** el token; `resolver` ya calcula el vencimiento con el `fin` actual del turno, así que el mismo enlace pasa a vencer con el nuevo horario. RN-21 solo exige rotación en cada envío de recordatorio (C-12).
- **Datos**: la respuesta pública (`TurnoPublico`) contiene `turnoId`, `inicio`, `fin`, prestación y profesional, sin token, sillón, id de paciente, estado ni datos ajenos (DD-18). La entrada de reprogramación expone solo `token`, `inicio`, `profesionalId?` y `prestacionId?`, sin `sillonId`, `duracionMinutos`, `forzar` ni `rol` (RN-04, RN-16).
- **Sin HTTP**: los casos de uso viven en `src/application`; el cableo de `GET/POST /public/turnos/:token` y la validación de cuerpo `unknown` son de C-14.

**Contexto**: C-10 emite el token y C-12 lo envía, pero solo existía el caso de uso de confirmación; US-010 seguía sin cubrirse y era el último eslabón del camino crítico antes de C-14.
**Alternativas consideradas**: un único caso de uso con parámetro `accion`; devolver la entidad `Turno`; propagar `ReglaNegocioError` con su código RN; rotar el token al reprogramar y devolver el nuevo en la respuesta; implementar los endpoints HTTP en C-11.
**Justificación**: un caso de uso por operación mantiene DTOs y errores separados; la traducción centralizada evita filtrar datos internos; reutilizar `resolver` y la regla pura de anticipación impide duplicar reglas; no rotar respeta DD-15 (entrega única) y RN-21.
**Trade-offs aceptados**: el enlace deja de servir si llega un recordatorio nuevo (el paciente debe usar el último); sin HTTP los escenarios se validan a nivel de caso de uso; RBAC de estas rutas queda para C-09.

### DD-24 — Recordatorio `wa.me`: generación, mensaje y marca manual
**Decisión** (2026-11-23, explore de C-13, Luka Garro; confirmada por el equipo):
- **Generación**: el `wa_me` se programa al dar de alta o reprogramar el turno, con `programadoPara = inicio - 24 h` por defecto (SU-07). Un decorador del puerto `Recordatorios` agrega el pendiente `wa_me` sin tocar `AgendarTurno`, `ReservarOnline`, `AgendarTurnoConRecordatorio` ni C-12. Idempotente: reemplaza solo el `wa_me` `pendiente`, conservando su `id`.
- **Elegibilidad**: `consentimientoContacto` y teléfono argentino válido (10 a 13 dígitos, `+54` opcional), sin exigir e-mail. La normalización se extrae a una regla pura compartida con la validación de la reserva online de C-10, sin cambiar el comportamiento de esa ruta.
- **Mensaje**: `https://wa.me/<digitos>?text=<encodeURIComponent(mensaje)>`, con fecha y hora local (`formatearFechaHoraLocal`, DD-09), prestación, profesional y consultorio. Sin token ni enlace de gestión: el envío es manual y un token copiado en WhatsApp quedaría en claro (RN-D-02, RN-21). No se agrega `54` a un teléfono de 10 dígitos: se usan los dígitos normalizados.
- **Recepción**: `ListarRecordatoriosPendientesWaMe` devuelve todos los `wa_me` `pendientes` ordenados por `programadoPara` con solo `id`, `turnoId`, `enlaceWaMe` y `programadoPara`. `MarcarRecordatorioEnviado({ recordatorioId, reloj })` pasa `pendiente → enviado` con `enviadoEn = reloj.ahora()`, es idempotente sobre `enviado` y rechaza con `ErrorMarcarRecordatorio` un id inexistente o un estado `cancelado`/`fallido`. Sin RBAC (C-09) ni HTTP.
- **Canales**: `RecordatoriosEmail.programar` reemplaza solo el pendiente `email` y `EnviarRecordatoriosPendientes` ignora los `wa_me`; `cancelarPendientes` anula ambos. Ningún change archivado cambia su comportamiento salvo ese filtro.

**Contexto**: la KB y el modelo ya preveían `canal: 'email' | 'wa_me'` y `enlaceWaMe`, pero C-12 implementó solo e-mail; US-012 seguía sin cubrirse y los pacientes sin e-mail no recibían recordatorio.
**Alternativas consideradas**: generar el `wa_me` recién en el barrido; exigir e-mail como para el e-mail; incluir el token en el mensaje; buscar el recordatorio a marcar por `turnoId` y canal; marcar siempre con error en la segunda llamada.
**Justificación**: generar al programar da a recepción vista anticipada; el decorador concentrado evita duplicar puntos de alta; el mensaje mínimo evita filtrar tokens en un canal manual; la marca por `id` es inequívoca e idempotente; los filtros de canal preservan C-12.
**Trade-offs aceptados**: sin API ni confirmación automática de lectura (SU-01); un teléfono de 10 dígitos se usa sin código de país; sin HTTP ni roles hasta C-14/C-09.

### DD-25 — Desactivación de recursos con turnos activos futuros (RN-27)
**Decisión** (2026-11-23, explore de C-05, Alejo Carabelli): profesional, sillón y prestación se desactivan de forma lógica (`activo`/`activa` en `false`) y se pueden reactivar; nunca se borran. No se desactiva un recurso que tenga turnos `reservado` o `confirmado` con `inicio >= ahora` (`ahora` del `Reloj`): se rechaza con `RN-27` y la violación lista **todos** los turnos en conflicto ordenados por `inicio` (campo nuevo `turnosEnConflicto`). La regla es una función pura del dominio; `TurnoRepositorio` suma una lectura por recurso (`listarPorRecurso`, cualquier estado) y el filtrado por estado e `inicio` lo hace el dominio. Desactivar un recurso ya inactivo o reactivar uno activo es un no-op exitoso. Que un recurso inactivo no reciba turnos nuevos ya lo cubre RN-18 (solo se agrega un test de integración).
**Contexto**: US-008 exige "no se desactiva un recurso con turnos activos futuros sin resolver" sin definir "futuro", qué estados cuentan ni cómo se informa.
**Alternativas consideradas**: cancelar o reasignar en cascada los turnos afectados; borrar físicamente; informar solo el primer conflicto (como RN-02); filtrar en el repositorio.
**Justificación**: la recepción necesita la lista completa para reprogramar o cancelar antes de reintentar; la regla en el dominio es única fuente de verdad y testeable sin repositorio; un turno ya iniciado no se ve afectado por la baja.
**Trade-offs aceptados**: entre la lectura de turnos y el guardado del recurso no hay sección crítica común con el alta: un alta concurrente que ya leyó el recurso activo puede crear un turno sobre un recurso recién desactivado (riesgo bajo en memoria; el change de persistencia real lo resuelve con una transacción). Un turno `atendido` futuro no puede existir (RN-24), así que no se cuenta.

### DD-26 — Horario propio del profesional prevalece por día (RN-28, resuelve SU-09)
**Decisión** (2026-11-23, explore de C-05, Alejo Carabelli): si el profesional tiene al menos un tramo propio (`profesionalId` informado) para el `diaSemana`, ese día solo valen sus tramos; si no, los del consultorio. Una única función pura de selección de tramos la usan `validarHorario` (alta, disponibilidad y reprogramación, vía `validarAlta`) y la generación de inicios candidatos de C-07, que reciben el `profesionalId`. La disponibilidad genera los inicios por profesional, alineados a sus propios tramos. Un tramo propio no necesita estar dentro del horario del consultorio.
**Contexto**: SU-09 era un supuesto; C-01 y C-07 solo evaluaban los tramos del consultorio.
**Alternativas consideradas**: prevalencia total (con cualquier tramo propio se ignora siempre el consultorio); intersección o unión de ambos horarios; exigir que el tramo propio esté dentro del horario del consultorio.
**Justificación**: por día es lo más simple de configurar (un profesional que solo atiende distinto los martes no tiene que recargar toda la semana) y no altera a quien no tiene horario propio.
**Trade-offs aceptados**: un profesional puede atender fuera del horario general del consultorio (decisión del administrador); para que un profesional no atienda un día del consultorio hace falta un bloqueo (C-06), porque "sin tramos propios ese día" significa "rige el consultorio".

### DD-27 — Validación de la configuración y error de configuración inválida (RN-29)
**Decisión** (2026-11-23, explore de C-05, Alejo Carabelli): las reglas de RN-29 (nombres, duración de la prestación entero > 0 múltiplo de 5, `diaSemana`, formato `HH:mm`, `desde < hasta`, tramos sin solapar en el mismo día y ámbito) se informan con una clase nueva `ConfiguracionInvalidaError` (`campo`, `motivo` y, para el solapamiento, el tramo en conflicto), sin ampliar `CodigoRN`, igual que `ConsultaInvalidaError` (DD-12). Las referencias inexistentes (consultorio, profesional del tramo, prestaciones de `prestacionIds`, recurso a modificar) usan `RecursoNoEncontradoError`. `prestacionIds` no admite repetidos y puede incluir prestaciones inactivas. La modificación no cambia `id`, `consultorioId`, `activo` ni el ámbito de un tramo (`profesionalId`): la actividad solo cambia con desactivar/reactivar, para que RN-27 no se pueda saltear. Cambiar la duración de una prestación no altera los turnos existentes (guardan su `fin` y su duración efectiva, RN-06). Orden de rechazo, con las validaciones sin I/O primero como en C-07: rol (`AccesoDenegadoError`, DD-28) → campos inválidos (en el orden en que se declaran) → recurso o referencia inexistente → tramo solapado → `RN-27`.
**Contexto**: US-008 solo pedía "duración en minutos"; el modelo decía "entero > 0".
**Alternativas consideradas**: códigos RN nuevos para cada validación; permitir duraciones no múltiplo de 5.
**Justificación**: coherente con la validación de entrada ya existente y con RN-06 (una prestación de 32 min generaría turnos que el ajuste manual no podría reproducir).
**Trade-offs aceptados**: no se valida que un tramo eliminado o modificado deje turnos futuros fuera de horario (pregunta abierta).

### DD-28 — Solo el administrador configura; puertos de catálogo con escritura
**Decisión** (2026-11-23, explore de C-05, Alejo Carabelli): los casos de uso de configuración reciben `actor` y rechazan todo rol distinto de `administrador` con una clase nueva `AccesoDenegadoError` (`rol`, `operacion`), sin código RN, antes de cualquier lectura (matriz RBAC de `03_actores_y_roles.md`). Es el primer control de rol del código; C-09 lo reutiliza y agrega la autenticación real. Los puertos `ProfesionalRepositorio`, `SillonRepositorio`, `PrestacionRepositorio` y `HorarioAtencionRepositorio` suman escritura (`guardar` como alta o reemplazo por `id`; los horarios además `obtenerPorId` y `eliminar`) y `PrestacionRepositorio` suma `listarPorConsultorio`; los adaptadores en memoria pasan a ser mutables copiando la colección recibida en el constructor, de modo que el uso con seed de los tests sigue igual. Los ids nuevos salen del puerto `GeneradorId`. `PacienteRepositorio` **no se extiende**: `obtenerPorDni`, `obtenerPorId` y `guardar` ya existen desde C-10 y C-12, así que el "extiende" de `CHANGES.md` y DD-16 queda satisfecho sin cambios.
**Contexto**: hasta C-05 los catálogos eran de solo lectura y venían de fixtures; ningún caso de uso controlaba roles.
**Alternativas consideradas**: puertos de escritura separados; un `ReglaNegocioError` con código nuevo para el rol; esperar a C-09 para controlar roles.
**Justificación**: US-008 es del administrador y la configuración es sensible para toda la agenda; un error propio sin código RN distingue permisos de reglas de agenda.
**Trade-offs aceptados**: los casos de uso de lectura (alta, disponibilidad) dependen de puertos que ahora también escriben; cualquier adaptador futuro debe implementar las escrituras.

### DD-29 — Servidor HTTP público: Fastify, fábrica de la app, rutas, errores y logs
**Decisión** (2026-11-23, explore/propose de C-14, Alejo Carabelli; numeración desde DD-29 porque C-05 reserva DD-25 a DD-28):
- **Servidor**: Fastify 5.x (primera integración HTTP; cierra la parte pendiente de DD-13). Fábrica `crearApp` en `src/adapters/http/` que recibe casos de uso ya construidos y registra módulos de rutas como plugins; raíz de composición única (`src/main.ts`). C-15 reutiliza la fábrica agregando su módulo de rutas sin modificar las públicas. Tests de contrato con `fastify.inject`.
- **Rutas públicas**: `GET /public/prestaciones`, `GET /public/prestaciones/:prestacionId/profesionales`, `GET /public/disponibilidad`, `POST /public/reservas`, `GET /public/turnos/:token` (HTML o JSON según `Accept`, con `Vary: Accept`), `GET /public/turnos/:token/confirmar` (HTML), `POST /public/turnos/:token/{confirmar,cancelar,reprogramar}`, `GET /public/turnos/:token/disponibilidad` y la página `GET /public/reservar`. Se conservan las rutas de los e-mails de C-12.
- **Ningún `GET` cambia estado**: el enlace `/confirmar` del e-mail abre la página y la confirmación es un `POST` (los clientes de correo prefetchean enlaces). Agrega un clic al flujo de DD-21.
- **Errores**: formato único `{ error: { codigo, mensaje, campos?, nuevaOferta? } }`; `DATOS_INVALIDOS` 400, `ENLACE_INVALIDO` 404, `HORARIO_NO_DISPONIBLE` y `RESERVA_DUPLICADA` 409, el resto de los códigos públicos 422, inesperado 500 `ERROR_INTERNO` sin detalle. Entradas validadas con validadores puros (la frontera de C-10 se reutiliza); respuestas con schema `additionalProperties: false`.
- **Logs redactados (en alcance)**: método, ruta con el token reemplazado por `[redactado]` y estado; sin cuerpos, query strings, cabeceras ni cookies (RN-21, RN-D-02). Cabeceras `no-store`, `Referrer-Policy: no-referrer` y CSP estricta.
- **Rate limit (fuera de alcance)**: queda como pregunta abierta y requisito antes de publicar fuera de la demo.
**Contexto**: DD-13, DD-21 y DD-23 difirieron endpoints, logs redactados y rate limit a C-14; los e-mails de C-12 ya apuntan a `/public/turnos/<token>`.
**Alternativas consideradas**: `node:http` puro; Express; Fastify 4; prefijo `/public/api` para JSON; confirmar en el `GET`; `@fastify/rate-limit` en memoria.
**Justificación**: `inject` permite tests de contrato sin red; la fábrica evita que C-15 rehaga el arranque; la negociación mantiene las rutas ya publicadas en los e-mails.
**Trade-offs aceptados**: una dependencia de runtime nueva; sin rate limit hasta un change posterior; un clic extra para confirmar.

### DD-30 — Interfaz del paciente sin framework, horizonte de 30 días y estrategia de pruebas
**Decisión** (2026-11-23, explore/propose de C-14, Alejo Carabelli):
- **UI**: HTML + CSS + JavaScript (módulos ES) sin framework ni build, servidos por el mismo Fastify desde `src/adapters/http/web/` con lista blanca; usan `design-system/tokens.css` y `brand.js` tal cual. JS con `// @ts-check` y JSDoc, tipado con `tsconfig.web.json`. Copy en voseo. El token nunca se guarda en el almacenamiento del navegador.
- **Reserva**: prestación → profesional (por defecto "Cualquiera") → día de los próximos 30 y sus horarios libres → datos → confirmación con profesional asignado y enlace de gestión (entrega única, DD-15). Nunca se muestra el sillón (DD-18).
- **Horizonte**: RN-30 (hoy a hoy + 30 días locales) validado en el servidor, no solo en la UI; los días reservables los calcula el servidor con el `Reloj`.
- **Pruebas**: contrato HTTP con `fastify.inject` dentro de `npm test`; estados de UI con Playwright (Chromium) en `tests/ui/*.ui.test.ts` bajo `vitest.ui.config.ts` y `npm run test:ui`, fuera de `npm test` para mantenerlo rápido; ambos obligatorios antes de archivar.
- **Ejecución**: `npm run build` (`tsc` a `dist/`) y `npm start` con seed demo ficticio en memoria.
**Contexto**: el owner eligió en el explore UI sin framework, selector de día y profesional opcional.
**Alternativas consideradas**: React/Vite; SSR con plantillas; límite de 30 días solo en la UI; Playwright dentro de `npm test`; `tsx` para ejecutar.
**Justificación**: dos pantallas no justifican build ni framework; validar RN-30 en el servidor impide reservas fuera de rango con un cliente propio; separar la suite de UI preserva el ciclo TDD rápido.
**Trade-offs aceptados**: JS sin compilación (tipado opcional por JSDoc); suite de UI más lenta, ejecutada aparte.

### DD-31 — Vista de gestión por token y reprogramación online
**Decisión** (2026-11-23, propose de C-14, Alejo Carabelli; supuestos a confirmar por el owner antes del apply):
- **Vista HTTP**: `GET /public/turnos/:token` (JSON) devuelve `inicio`, `fin`, prestación, profesional, `asistenciaConfirmada` (booleano: `confirmado` vs. `reservado` del propio turno, coherente con la respuesta de `ConfirmarDesdeEnlace`), `gestionOnline` (RN-08 calculado en el servidor), contacto del consultorio (nombre, teléfono, e-mail, zona) y días reservables. Sin `turnoId`, token, sillón ni datos del paciente. `TurnoPublico` de DD-23 no cambia.
- **Menos de 24 h**: la pantalla reemplaza cancelar y reprogramar por el contacto del consultorio; confirmar asistencia sigue disponible (RN-08 no la limita).
- **Reprogramar online solo cambia el horario**: la disponibilidad para reprogramar ofrece horarios del mismo profesional y del mismo sillón (C-03 conserva el sillón y la entrada pública no lo acepta) y el cuerpo admite solo `inicio`. Los horarios que se solapan con el propio turno actual no se ofrecen.
**Contexto**: DD-23 excluyó el estado de la respuesta pública y la entrada de reprogramación no admite sillón.
**Alternativas consideradas**: no exponer la confirmación (mostrar siempre "Confirmar"); aceptar `profesionalId` y reasignar sillón en el servidor (cambia C-11/C-03).
**Justificación**: muestra al paciente lo que ya sabe de su propio turno sin datos ajenos; ofrecer solo horarios que la reprogramación puede concretar evita rechazos sorpresivos.
**Trade-offs aceptados**: el paciente no puede cambiar de profesional online; un pequeño corrimiento dentro del propio horario no se ofrece.

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

### SU-09 — Horario por profesional prevalece sobre el del consultorio *(confirmado con precisión: DD-26, RN-28, 2026-11-23)*
**Supuesto**: si existe horario propio del profesional, se usa ese; si no, el del consultorio.
**Origen**: inferido; el checklist solo habla de "horario de atención".
**Resolución**: confirmado en el explore de C-05 con la precisión de que la prevalencia es por día de la semana (DD-26, RN-28).
