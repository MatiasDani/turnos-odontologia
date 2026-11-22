# Design

## Context

Ver `proposal.md` (Why) y `specs/recordatorios-turno/spec.md` (requisitos). Las decisiones de negocio están en DD-21 y RN-25 (`knowledge-base/09_decisiones_y_supuestos.md`, `05_reglas_de_negocio.md`). Estado actual relevante:

- `src/application/puertos/recordatorios.ts` (C-02, DD-19): `Recordatorios { cancelarPendientes(turnoId) }`; `CancelarTurno` lo llama después de `actualizarSi` y propaga su error. Adaptador `RecordatoriosNoOp` y doble `tests/fixtures/recordatorios-espia.ts`.
- `src/application/agendar-turno.ts` (C-01): `AgendarTurno.ejecutar(input): Promise<Turno>`; no recibe `Reloj` ni `Recordatorios`. `ReservarOnline` (C-10) recibe `agendar: Pick<AgendarTurno, 'ejecutar'>`, así que acepta cualquier objeto con esa forma.
- `src/application/servicio-tokens.ts` (C-10): `rotar(turnoId)` invalida el vigente (sin vigente no hace nada) y emite uno nuevo de 32 bytes en base64url; `resolver(token)` devuelve el `turnoId` o `undefined` (inexistente, invalidado, turno cancelado o `ahora >= fin`).
- `src/application/confirmar-turno.ts` (C-04): `reservado → confirmado` vía `actualizarSi`; repetir la transición rechaza con `RN-10` y `estadoActual`.
- `Paciente.email` es opcional y `PacienteRepositorio` solo tiene `obtenerPorDni` y `guardar`. Los pacientes del seed no tienen e-mail.
- `src/domain/tiempo.ts` convierte instantes a hora local con `Intl` (DD-09); `Consultorio.zonaHoraria` es IANA.
- El proyecto no tiene dependencias de runtime; `src/` y `tests/` usan CRLF.

## Goals / Non-Goals

**Goals:**
- Recordatorios sin modificar el comportamiento de `AgendarTurno`, `ReservarOnline`, `CancelarTurno`, `ConfirmarTurno` ni `ServicioTokens`: solo se agregan piezas y se cambia el cableado.
- Reglas de programación, revalidación y armado del mensaje como funciones puras del dominio, testeables sin repositorio, reloj ni red.
- Ningún test usa la red ni un servidor SMTP.
- La infraestructura (`nodemailer`, `process.env`) solo vive en `src/adapters/`.

**Non-Goals:**
- El proceso periódico que ejecuta el barrido y los endpoints HTTP (C-14).
- Cancelar o reprogramar desde el enlace (C-11) y llamar a `programar` desde `ReprogramarTurno` (C-03).
- Reintentos, colas, plantillas HTML o recordatorios múltiples por turno.
- Barridos concurrentes (ver Risks).

## Decisions

### D1. Capas y archivos

```
src/domain/recordatorio.ts                         Recordatorio, EstadoRecordatorio, CanalRecordatorio
src/domain/reglas/recordatorios.ts                 calcularProgramadoPara, debeProgramarse,
                                                   evaluarEnvio, armarMensajeRecordatorio
src/application/puertos/recordatorios.ts           + programar(turnoId)
src/application/puertos/notificador.ts             Notificador { enviar(MensajeEmail) }
src/application/puertos/repositorios.ts            + RecordatorioRepositorio
                                                   + PacienteRepositorio.obtenerPorId
src/application/configuracion-recordatorios.ts     ConfiguracionRecordatorios { horasAntes, baseUrlPublica }
src/application/recordatorios-email.ts             RecordatoriosEmail implements Recordatorios
src/application/agendar-turno-con-recordatorio.ts  decorador de AgendarTurno
src/application/enviar-recordatorios-pendientes.ts barrido
src/application/confirmar-desde-enlace.ts          ConfirmarDesdeEnlace
src/application/errores-enlace-publico.ts          ErrorEnlacePublico ('ENLACE_INVALIDO')
src/application/listar-recordatorios-fallidos.ts   ListarRecordatoriosFallidos
src/adapters/persistence/en-memoria/recordatorio-repositorio.ts
src/adapters/persistence/en-memoria/paciente-repositorio.ts   + obtenerPorId
src/adapters/recordatorios/recordatorios-no-op.ts             + programar (no-op)
src/adapters/notificador/notificador-smtp.ts       nodemailer
src/adapters/config/configuracion-entorno.ts       lee process.env → configuración tipada
.env.example                                       valores ficticios
```

`RecordatoriosEmail` vive en `application` (no en `adapters`) porque solo orquesta puertos: es la implementación "real" del puerto `Recordatorios` sin infraestructura propia; la infraestructura está detrás de `RecordatorioRepositorio`. Alternativa descartada: ponerlo en `src/adapters/recordatorios/`, que obligaría a un adaptador a depender de otros puertos de repositorio.

### D2. Modelo `Recordatorio`

```ts
type CanalRecordatorio = 'email';               // 'wa_me' lo agrega C-13
type EstadoRecordatorio = 'pendiente' | 'enviado' | 'fallido' | 'cancelado';
interface Recordatorio {
  readonly id: string; readonly turnoId: string; readonly canal: CanalRecordatorio;
  readonly programadoPara: Date; readonly estado: EstadoRecordatorio;
  readonly enviadoEn?: Date; readonly motivoFallo?: string;
}
```

Inmutable, igual que `Turno`. Sin campo para el token ni su hash (spec "El token nunca se guarda en el recordatorio"). `canal` como unión de un solo valor deja el punto de extensión de C-13 sin decidir su forma.

### D3. Reglas puras (`src/domain/reglas/recordatorios.ts`)

- `calcularProgramadoPara(inicio, horasAntes): Date` → `inicio - horasAntes * 3_600_000` ms (aritmética de instantes; no depende de la zona).
- `debeProgramarse(paciente): boolean` → `consentimientoContacto && email !== undefined && email !== ''`.
- `evaluarEnvio(recordatorio, turno, ahora): 'esperar' | 'anular' | 'enviar'`:
  1. `programadoPara > ahora` → `esperar`.
  2. turno inexistente, estado distinto de `reservado` o `confirmado`, o `ahora >= inicio` → `anular`.
  3. si no → `enviar`.
  Se usa una lista explícita de estados enviables en vez de `esActivo()` porque `esActivo` incluye `atendido` (ocupa recursos, pero no se recuerda).
- `armarMensajeRecordatorio(datos): MensajeEmail` con `{ para, asunto, texto }` en texto plano (sin HTML: evita inyección de marcado). Recibe solo lo que el mensaje puede contener: e-mail, fecha y hora local ya formateadas, prestación, profesional, consultorio, enlace de gestión y, si el turno está `reservado`, enlace de confirmación. Al no recibir DNI, teléfono ni sillón, no puede filtrarlos.
- Fecha y hora local: función nueva en `src/domain/tiempo.ts`, `formatearFechaHoraLocal(instante, zona)` → `"lunes 23/11/2026 09:00"` con `Intl.DateTimeFormat` en la zona del consultorio (DD-09).
- Enlaces: gestión `${baseUrlPublica}/public/turnos/${token}`, confirmación `${baseUrlPublica}/public/turnos/${token}/confirmar` (forma de rutas de C-11), con `encodeURIComponent(token)` y sin barra doble si la base termina en `/`.

### D4. Puertos

```ts
interface Recordatorios {
  cancelarPendientes(turnoId: string): Promise<void>;
  /** Idempotente: crea o reemplaza el único pendiente del turno (RN-25). */
  programar(turnoId: string): Promise<void>;
}
interface RecordatorioRepositorio {
  guardar(r: Recordatorio): Promise<void>;                     // alta o reemplazo por id
  listarPorTurno(turnoId: string): Promise<readonly Recordatorio[]>;
  listarPendientesHasta(hasta: Date): Promise<readonly Recordatorio[]>;  // programadoPara <= hasta, por programadoPara asc
  listarPorEstado(estado: EstadoRecordatorio): Promise<readonly Recordatorio[]>;
}
interface Notificador { enviar(mensaje: MensajeEmail): Promise<void>; }  // rechaza si el envío falla
```

`PacienteRepositorio.obtenerPorId(id)` es aditivo; el adaptador en memoria lo implementa y C-05 lo hereda.

### D5. `RecordatoriosEmail` (implementación real del puerto)

Dependencias: `recordatorios: RecordatorioRepositorio`, `turnos: Pick<TurnoRepositorio, 'obtenerPorId'>`, `pacientes: Pick<PacienteRepositorio, 'obtenerPorId'>`, `ids: GeneradorId`, `config: ConfiguracionRecordatorios`.

- `programar(turnoId)`: carga turno (inexistente → `RecursoNoEncontradoError('turno')`) y paciente; si `!debeProgramarse(paciente)` no hace nada. Si hay un `pendiente` del turno lo reemplaza conservando su `id`; si no, crea uno con id nuevo. Los `enviado`/`fallido`/`cancelado` no se tocan (spec "Programar un turno con recordatorio ya enviado").
- `cancelarPendientes(turnoId)`: pasa a `cancelado` los `pendiente` del turno.

### D6. Enganche al alta: decorador

```ts
class AgendarTurnoConRecordatorio implements Pick<AgendarTurno, 'ejecutar'> {
  constructor(agendar: Pick<AgendarTurno, 'ejecutar'>, recordatorios: Pick<Recordatorios, 'programar'>)
  async ejecutar(input) { const turno = await agendar.ejecutar(input); await recordatorios.programar(turno.id); return turno; }
}
```

Un alta rechazada lanza antes de `programar`. Si `programar` falla, el error se propaga y el turno queda creado (spec "Falla al programar no deshace el alta", mismo criterio que DD-19). Se inyecta en `ReservarOnline` como `agendar`; como `ReservarOnline` emite su token después de `agendar`, el token de la reserva existe antes del primer barrido y la rotación lo invalida (spec "El token de la reserva deja de valer al enviar"). Alternativa descartada: agregar `recordatorios` a `AgendarTurnoDependencias` (cambia el constructor de C-01 y todas sus fixtures).

### D7. Barrido `EnviarRecordatoriosPendientes`

Dependencias: `reloj`, `recordatorios: RecordatorioRepositorio`, `turnos`, `pacientes`, `profesionales`, `prestaciones`, `consultorios`, `tokens: Pick<ServicioTokens, 'rotar'>`, `notificador`, `config`. `ejecutar(): Promise<ResumenBarrido>` con `{ enviados, fallidos, anulados }` (conteos, sin datos personales).

1. `ahora` se lee una sola vez; se listan `listarPendientesHasta(ahora)`.
2. Por cada uno, en orden de `programadoPara`: `evaluarEnvio`. `anular` → guarda `cancelado`. Si el paciente ya no cumple `debeProgramarse` (perdió el e-mail o el consentimiento) también se anula.
3. `enviar` → `tokens.rotar(turnoId)` → arma el mensaje → `notificador.enviar`. Éxito → `enviado` con `enviadoEn = ahora`. Rechazo del notificador → `fallido` con `motivoFallo` fijo (`'El servicio de e-mail rechazó el envío.'`), nunca `error.message`, que podría contener la dirección o el enlace. Se sigue con el siguiente.
4. Errores de repositorios o de `rotar` (infraestructura inesperada) se propagan y cortan el barrido; los recordatorios ya procesados quedan guardados. Mismo criterio que RN-22: lo inesperado no se enmascara.

Rotar antes de enviar es obligatorio porque el token en claro solo existe al emitirlo (DD-15). Trade-off aceptado en DD-21: si el envío falla, el token anterior ya quedó invalidado.

### D8. `ConfirmarDesdeEnlace`

Dependencias: `tokens: Pick<ServicioTokens, 'resolver'>`, `turnos: Pick<TurnoRepositorio, 'obtenerPorId'>`, `confirmar: Pick<ConfirmarTurno, 'ejecutar'>`. `ejecutar({ token }): Promise<{ estado: 'confirmado'; inicio; fin }>`.

1. `resolver(token)`; `undefined` → `ErrorEnlacePublico`.
2. Turno `confirmado` → respuesta sin cambios.
3. Turno `reservado` → `confirmar.ejecutar({ turnoId, actor: { rol: 'paciente' } })`. Si pierde una carrera contra otra confirmación (`RN-10` con `estadoActual: 'confirmado'`) → éxito igual.
4. Cualquier otro estado, `ReglaNegocioError` o `RecursoNoEncontradoError` → `ErrorEnlacePublico`. Un error inesperado se propaga sin enmascarar.

`ErrorEnlacePublico` sigue el patrón de `ErrorReservaPublica`: un único código `ENLACE_INVALIDO`, mensaje fijo genérico, sin `cause` ni datos del turno. Se crea aparte en vez de sumar un código a `ErrorReservaPublica` porque su conjunto cerrado y su orden de evaluación son de la reserva (C-10).

### D9. `ListarRecordatoriosFallidos`

`ejecutar(): Promise<readonly Recordatorio[]>` = `listarPorEstado('fallido')`. Sin control de rol (C-09, igual que DD-19 y DD-20).

### D10. Notificador SMTP y configuración

- `NotificadorSmtp` recibe un transporte de `nodemailer` ya creado (inyectable) y un remitente; `enviar` llama a `sendMail({ from, to, subject, text })` y deja propagar el rechazo. Fábrica `crearNotificadorSmtp(configSmtp)` con `createTransport({ host, port, secure: port === 465, auth })`.
- Test del adaptador con el transporte `jsonTransport: true` de `nodemailer` (no abre conexiones): verifica el mapeo de campos; y con un transporte doble que rechaza, que el error se propaga.
- `configuracion-entorno.ts`: `leerConfiguracionRecordatorios(env)` y `leerConfiguracionSmtp(env)` reciben un `Record<string, string | undefined>` (testeables sin tocar `process.env`). `RECORDATORIO_HORAS_ANTES` entero > 0 (por defecto 24); `BASE_URL_PUBLICA` URL `http(s)` obligatoria; `SMTP_PORT` entero (por defecto 587); valor inválido → `Error` con el nombre de la variable, nunca su valor (puede ser un secreto).
- `nodemailer` con versión exacta fijada por `package-lock.json` (hoy 10.6.1) y `@types/nodemailer` en dev. Ethereal: las credenciales se generan en ethereal.email y van en `.env` local, nunca en el repo (regla dura 9).

### D11. Fixtures de test

- `crearSistemaRecordatorios(opciones)` en `tests/fixtures/sistema-recordatorios.ts`: seed con override de pacientes (`pa1` con `carla.prueba@demo.test`; `pa2` sin e-mail; `pa3` con `consentimientoContacto: false`), `RelojFijo`, repos en memoria, `ServicioTokens` real, `NotificadorFalso`, `RecordatoriosEmail`, decorador sobre `AgendarTurno`, `ReservarOnline`, `CancelarTurno`, `ConfirmarTurno`, barrido, `ConfirmarDesdeEnlace` y lista de fallidos. El seed global no cambia.
- `NotificadorFalso`: guarda los mensajes enviados y puede rechazar todos o solo el n-ésimo.
- `RecordatorioRepositorioQueFalla`: doble para "Falla al programar".
- `RecordatoriosEspia` (C-02) suma `programar` registrado aparte; los tests de C-02 no cambian.
- "Turno movido": helper de prueba `moverTurno(id, inicio)` en `TurnoRepositorioDePrueba` (sin reglas, como `cambiarEstado`), porque `ReprogramarTurno` (C-03) no existe.

## Risks / Trade-offs

- [Dos barridos concurrentes podrían enviar dos veces el mismo recordatorio] → el MVP tiene un único ejecutor (C-14); queda documentado. Con persistencia real, tomar el pendiente con una actualización condicional (`pendiente → enviando`).
- [Si el envío falla, el token anterior ya está invalidado y el paciente queda sin enlace válido] → el recordatorio queda `fallido` en la lista de la recepción, que contacta al paciente (DD-21).
- [El token de la reserva deja de valer al enviarse el recordatorio] → documentado para C-11 y C-14 en `10_preguntas_abiertas.md`.
- [El token viaja en la URL del e-mail] → mismo modelo que C-10/C-11 (token de alta entropía, solo hash guardado, vence en el `fin`); los logs HTTP redactados quedan en C-14.
- [`motivoFallo` fijo pierde detalle para diagnosticar] → se prioriza no guardar datos personales; el detalle técnico queda para logs de infraestructura redactados (C-14).
- [`nodemailer` es la primera dependencia de runtime] → aislada en `src/adapters/notificador/`; el dominio y la aplicación no la importan (regla dura 2).
- [El alta de recepción no usa todavía el decorador en ningún punto de entrada] → no hay capa HTTP; el cableado de producción lo hace C-14 con el mismo decorador.

## Migration Plan

Sin migración de datos (persistencia en memoria). Rollback: volver a cablear `RecordatoriosNoOp` y `AgendarTurno` sin decorador; ningún caso de uso existente cambia.

## Open Questions

- Proveedor SMTP real con free tier para producción (Baja, post-MVP); no cambia el puerto ni el adaptador.
