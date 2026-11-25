// Cableado de repos en memoria + caso de uso sobre el seed ficticio (solo para tests).
import {
  BloqueoRepositorioEnMemoria,
  ConsultorioRepositorioEnMemoria,
  HorarioAtencionRepositorioEnMemoria,
  PrestacionRepositorioEnMemoria,
  ProfesionalRepositorioEnMemoria,
  SillonRepositorioEnMemoria,
} from '../../src/adapters/persistence/en-memoria/catalogos.js';
import { HasherSha256 } from '../../src/adapters/crypto/hasher-sha256.js';
import { GeneradorTokenCrypto } from '../../src/adapters/crypto/generador-token-crypto.js';
import { PacienteRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/paciente-repositorio.js';
import { TokenGestionRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/token-gestion-repositorio.js';
import { reservarDesdePedido } from '../../src/adapters/http/pedido-reserva.js';
import { ReservarOnline, type ReservaOnlineConfirmada } from '../../src/application/reservar-online.js';
import { ErrorReservaPublica } from '../../src/application/errores-reserva-publica.js';
import { ServicioTokens } from '../../src/application/servicio-tokens.js';
import { RelojFijo } from './reloj-fijo.js';
import { TurnoRepositorioDePrueba } from './turno-repositorio-de-prueba.js';
import { TurnoRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/turno-repositorio.js';
import { AgendarTurno } from '../../src/application/agendar-turno.js';
import { CancelarTurno } from '../../src/application/cancelar-turno.js';
import { ConfirmarTurno } from '../../src/application/confirmar-turno.js';
import { MarcarAtendido } from '../../src/application/marcar-atendido.js';
import { MarcarAusente } from '../../src/application/marcar-ausente.js';
import { RecordatoriosEspia } from './recordatorios-espia.js';
import { ReprogramarTurno } from '../../src/application/reprogramar-turno.js';
import { ConsultarDisponibilidad } from '../../src/application/consultar-disponibilidad.js';
import type { ConsultarDisponibilidadInput } from '../../src/application/consultar-disponibilidad-input.js';
import type { GeneradorId } from '../../src/application/puertos/generador-id.js';
import type { Recordatorios } from '../../src/application/puertos/recordatorios.js';
import { RecordatoriosNoOp } from '../../src/adapters/recordatorios/recordatorios-no-op.js';
import type { Rol } from '../../src/domain/actor.js';
import type { Hueco } from '../../src/domain/disponibilidad/hueco.js';
import type { Turno } from '../../src/domain/turno.js';
import { crearEntorno, crearTurno, type Entorno, LUNES, local } from './seed.js';
import { actorDeRol } from './actores.js';

/** Ids deterministas: t-1, t-2, ... */
export class GeneradorIdSecuencial implements GeneradorId {
  private contador = 0;
  siguiente(): string {
    this.contador += 1;
    return `t-${this.contador}`;
  }
}

export interface Sistema {
  readonly datos: Entorno;
  readonly turnos: TurnoRepositorioEnMemoria;
  readonly agendarTurno: AgendarTurno;
  readonly consultarDisponibilidad: ConsultarDisponibilidad;
}

export function crearSistema(overrides: Partial<Entorno> = {}): Sistema {
  const datos = crearEntorno(overrides);
  const turnos = new TurnoRepositorioEnMemoria(datos.turnos);
  const repos = {
    profesionales: new ProfesionalRepositorioEnMemoria(datos.profesionales),
    sillones: new SillonRepositorioEnMemoria(datos.sillones),
    prestaciones: new PrestacionRepositorioEnMemoria(datos.prestaciones),
    consultorios: new ConsultorioRepositorioEnMemoria([datos.consultorio]),
    horarios: new HorarioAtencionRepositorioEnMemoria(datos.horarios),
    bloqueos: new BloqueoRepositorioEnMemoria(datos.bloqueos),
    turnos,
  };
  const agendarTurno = new AgendarTurno({ ...repos, ids: new GeneradorIdSecuencial() });
  const consultarDisponibilidad = new ConsultarDisponibilidad(repos);
  return { datos, turnos, agendarTurno, consultarDisponibilidad };
}

export interface SistemaBloqueo {
  readonly datos: Entorno;
  readonly turnos: TurnoRepositorioEnMemoria;
  readonly bloqueos: BloqueoRepositorioEnMemoria;
  readonly generadorId: GeneradorId;
  readonly agendarTurno: AgendarTurno;
  readonly consultarDisponibilidad: ConsultarDisponibilidad;
}

/** Cableado para pruebas de bloqueos (C-06). */
export function crearSistemaBloqueo(overrides: Partial<Entorno> = {}): SistemaBloqueo {
  const datos = crearEntorno(overrides);
  const turnos = new TurnoRepositorioEnMemoria(datos.turnos);
  const bloqueos = new BloqueoRepositorioEnMemoria(datos.bloqueos);
  const repos = {
    profesionales: new ProfesionalRepositorioEnMemoria(datos.profesionales),
    sillones: new SillonRepositorioEnMemoria(datos.sillones),
    prestaciones: new PrestacionRepositorioEnMemoria(datos.prestaciones),
    consultorios: new ConsultorioRepositorioEnMemoria([datos.consultorio]),
    horarios: new HorarioAtencionRepositorioEnMemoria(datos.horarios),
    bloqueos,
    turnos,
  };
  const generadorId = new GeneradorIdSecuencial();
  const agendarTurno = new AgendarTurno({ ...repos, ids: generadorId });
  const consultarDisponibilidad = new ConsultarDisponibilidad(repos);
  return { datos, turnos, bloqueos, generadorId, agendarTurno, consultarDisponibilidad };
}

export interface Solicitud {
  rol?: Rol;
  pacienteId?: string;
  profesionalId?: string;
  sillonId?: string;
  prestacionId?: string;
  dia?: string;
  hora: string;
  duracion?: number;
}

/** Agenda con valores por defecto: recepción, pa1, p1, s1, pr1, lunes. */
export function agendar(sistema: Sistema, s: Solicitud): Promise<Turno> {
  return sistema.agendarTurno.ejecutar({
    actor: actorDeRol(s.rol ?? 'recepcion'),
    pacienteId: s.pacienteId ?? 'pa1',
    profesionalId: s.profesionalId ?? 'p1',
    sillonId: s.sillonId ?? 's1',
    prestacionId: s.prestacionId ?? 'pr1',
    inicio: local(s.dia ?? LUNES, s.hora),
    duracionMinutos: s.duracion,
  });
}

const DIA_EN_MS = 24 * 60 * 60_000;

/** Domingo anterior al lunes del seed, 08:00 local (valor por defecto de `ahora` en los escenarios). */
export const AHORA_POR_DEFECTO = local('2026-11-22', '08:00');

export interface Consulta {
  rol?: Rol;
  prestacionId?: string;
  /** Día consultado completo [00:00, 00:00 del día siguiente); por defecto el lunes. */
  dia?: string;
  /** Si se informa, reemplaza al rango del día. */
  rango?: { desde: Date; hasta: Date };
  ahora?: Date;
  duracion?: number;
  paso?: number;
  profesionalId?: string;
}

/** Consulta con los valores por defecto del contexto común del spec: recepción, pr1, paso 15, lunes. */
export function consultar(sistema: Sistema, c: Consulta = {}): Promise<readonly Hueco[]> {
  const desde = local(c.dia ?? LUNES, '00:00');
  const input: ConsultarDisponibilidadInput = {
    actor: actorDeRol(c.rol ?? 'recepcion'),
    prestacionId: c.prestacionId ?? 'pr1',
    rango: c.rango ?? { desde, hasta: new Date(desde.getTime() + DIA_EN_MS) },
    ahora: c.ahora ?? AHORA_POR_DEFECTO,
    pasoMinutos: c.paso ?? 15,
    duracionMinutos: c.duracion,
    profesionalId: c.profesionalId,
  };
  return sistema.consultarDisponibilidad.ejecutar(input);
}

export { TurnoRepositorioDePrueba };

/** Ids deterministas con prefijo: pn-1, pn-2, ... (evita choques con t-N y los ids del seed). */
export class GeneradorIdConPrefijo implements GeneradorId {
  private contador = 0;
  constructor(private readonly prefijo: string) {}
  siguiente(): string {
    this.contador += 1;
    return `${this.prefijo}${this.contador}`;
  }
}

export type OpcionesSistemaReserva = Partial<Entorno> & {
  /** Instante del reloj fijo; por defecto el domingo 2026-11-22 08:00 local. */
  readonly ahora?: Date;
  /** Doble de la fuente de disponibilidad de `ReservarOnline` (defensa RN-19). */
  readonly consultar?: Pick<ConsultarDisponibilidad, 'ejecutar'>;
  /** Doble del alta (para simular rechazos del alta). */
  readonly agendar?: Pick<AgendarTurno, 'ejecutar'>;
  readonly topeTurnosOnline?: number;
  /** Puerto de recordatorios de la reserva; por defecto `RecordatoriosNoOp` (DD-32). */
  readonly recordatorios?: Pick<Recordatorios, 'programar'>;
};

export interface SistemaReserva {
  readonly datos: Entorno;
  readonly reloj: RelojFijo;
  readonly turnos: TurnoRepositorioDePrueba;
  readonly pacientes: PacienteRepositorioEnMemoria;
  readonly tokens: TokenGestionRepositorioEnMemoria;
  readonly hasher: HasherSha256;
  readonly agendarTurno: AgendarTurno;
  readonly consultarDisponibilidad: ConsultarDisponibilidad;
  readonly servicioTokens: ServicioTokens;
  readonly reservarOnline: ReservarOnline;
}

/** Cableado de la reserva online: repos en memoria, reloj fijo y adaptadores crypto reales. */
export function crearSistemaReserva(opciones: OpcionesSistemaReserva = {}): SistemaReserva {
  const { ahora, consultar, agendar, topeTurnosOnline, recordatorios, ...overrides } = opciones;
  const datos = crearEntorno(overrides);
  const reloj = new RelojFijo(ahora ?? AHORA_POR_DEFECTO);
  const turnos = new TurnoRepositorioDePrueba(datos.turnos);
  const pacientes = new PacienteRepositorioEnMemoria(datos.pacientes);
  const tokens = new TokenGestionRepositorioEnMemoria();
  const hasher = new HasherSha256();
  const repos = {
    profesionales: new ProfesionalRepositorioEnMemoria(datos.profesionales),
    sillones: new SillonRepositorioEnMemoria(datos.sillones),
    prestaciones: new PrestacionRepositorioEnMemoria(datos.prestaciones),
    consultorios: new ConsultorioRepositorioEnMemoria([datos.consultorio]),
    horarios: new HorarioAtencionRepositorioEnMemoria(datos.horarios),
    bloqueos: new BloqueoRepositorioEnMemoria(datos.bloqueos),
    turnos,
  };
  const agendarTurno = new AgendarTurno({ ...repos, ids: new GeneradorIdConPrefijo('tu-') });
  const consultarDisponibilidad = new ConsultarDisponibilidad(repos);
  const servicioTokens = new ServicioTokens({
    generador: new GeneradorTokenCrypto(),
    hasher,
    tokens,
    turnos,
    reloj,
  });
  const reservarOnline = new ReservarOnline({
    reloj,
    pacientes,
    turnos,
    ...(topeTurnosOnline === undefined ? {} : { topeTurnosOnline }),
    profesionales: repos.profesionales,
    prestaciones: repos.prestaciones,
    consultorios: repos.consultorios,
    ids: new GeneradorIdConPrefijo('pn-'),
    consultar: consultar ?? consultarDisponibilidad,
    agendar: agendar ?? agendarTurno,
    recordatorios: recordatorios ?? new RecordatoriosNoOp(),
    tokens: servicioTokens,
  });
  return {
    datos, reloj, turnos, pacientes, tokens, hasher, agendarTurno, consultarDisponibilidad, servicioTokens, reservarOnline,
  };
}

/** Pedido base del spec como `unknown`; `undefined` en los cambios quita la clave. */
export function pedidoBase(
  cambios: Readonly<Record<string, unknown>> = {},
  paciente: Readonly<Record<string, unknown>> = {},
): unknown {
  const pedido: Record<string, unknown> = {
    prestacionId: 'pr2',
    inicio: '2026-11-23T09:00:00-03:00',
    paciente: {
      dni: '00000004',
      nombre: 'Paciente',
      apellido: 'Ficticio 4',
      telefono: '+54 9 11 0000-0004',
      email: 'paciente4@ejemplo.test',
      consentimientoContacto: true,
      ...paciente,
    },
    ...cambios,
  };
  for (const [clave, valor] of Object.entries(pedido)) if (valor === undefined) delete pedido[clave];
  const datosPaciente = pedido['paciente'];
  if (typeof datosPaciente === 'object' && datosPaciente !== null) {
    const copia: Record<string, unknown> = { ...datosPaciente };
    for (const [clave, valor] of Object.entries(copia)) if (valor === undefined) delete copia[clave];
    pedido['paciente'] = copia;
  }
  return pedido;
}

/** Reserva por el cuerpo `unknown`, como lo hará el borde HTTP. */
export function reservar(sistema: SistemaReserva, cuerpo: unknown): Promise<ReservaOnlineConfirmada> {
  return reservarDesdePedido(cuerpo, sistema.reservarOnline);
}

/** Espera un rechazo y devuelve el error público; falla si la promesa se resuelve o el error es de otro tipo. */
export async function rechazoPublico(promesa: Promise<unknown>): Promise<ErrorReservaPublica> {
  const error = await promesa.then(
    () => undefined,
    (e: unknown) => e,
  );
  if (!(error instanceof ErrorReservaPublica)) {
    throw new Error(`Se esperaba un ErrorReservaPublica y llegó: ${String(error)}`);
  }
  return error;
}

// ---------------------------------------------------------------------------------------------
// Cancelación (C-02)

/** Turno base del spec de cancelación: confirmado, pa1, p1, s1, pr1, lunes 09:00-09:30. */
export function turnoBaseCancelacion(overrides: Partial<Turno> = {}): Turno {
  return crearTurno({
    id: 't-base',
    prestacionId: 'pr1',
    inicio: local(LUNES, '09:00'),
    fin: local(LUNES, '09:30'),
    duracionMinutos: 30,
    ...overrides,
  });
}

export type OpcionesSistemaCancelacion = Partial<Entorno> & {
  /** Instante del reloj fijo; por defecto el domingo 2026-11-22 08:00 local. */
  readonly ahora?: Date;
};

export interface SistemaCancelacion {
  readonly datos: Entorno;
  readonly reloj: RelojFijo;
  readonly turnos: TurnoRepositorioDePrueba;
  readonly recordatorios: RecordatoriosEspia;
  readonly agendarTurno: AgendarTurno;
  readonly consultarDisponibilidad: ConsultarDisponibilidad;
  readonly cancelarTurno: CancelarTurno;
  /** Casos de uso de estado (C-04), sobre los mismos repos y reloj. */
  readonly confirmarTurno: ConfirmarTurno;
  readonly marcarAtendido: MarcarAtendido;
  readonly marcarAusente: MarcarAusente;
}

/** Cableado de la cancelación y los estados: repos en memoria, reloj fijo y espía de recordatorios. */
export function crearSistemaCancelacion(opciones: OpcionesSistemaCancelacion = {}): SistemaCancelacion {
  const { ahora, ...overrides } = opciones;
  const datos = crearEntorno(overrides);
  const reloj = new RelojFijo(ahora ?? AHORA_POR_DEFECTO);
  const turnos = new TurnoRepositorioDePrueba(datos.turnos);
  const recordatorios = new RecordatoriosEspia();
  const repos = {
    profesionales: new ProfesionalRepositorioEnMemoria(datos.profesionales),
    sillones: new SillonRepositorioEnMemoria(datos.sillones),
    prestaciones: new PrestacionRepositorioEnMemoria(datos.prestaciones),
    consultorios: new ConsultorioRepositorioEnMemoria([datos.consultorio]),
    horarios: new HorarioAtencionRepositorioEnMemoria(datos.horarios),
    bloqueos: new BloqueoRepositorioEnMemoria(datos.bloqueos),
    turnos,
  };
  const agendarTurno = new AgendarTurno({ ...repos, ids: new GeneradorIdSecuencial() });
  const consultarDisponibilidad = new ConsultarDisponibilidad(repos);
  const cancelarTurno = new CancelarTurno({ turnos, reloj, recordatorios });
  const confirmarTurno = new ConfirmarTurno({ turnos, reloj });
  const marcarAtendido = new MarcarAtendido({ turnos, reloj });
  const marcarAusente = new MarcarAusente({ turnos, reloj });
  return {
    datos,
    reloj,
    turnos,
    recordatorios,
    agendarTurno,
    consultarDisponibilidad,
    cancelarTurno,
    confirmarTurno,
    marcarAtendido,
    marcarAusente,
  };
}

/** Cancela con el rol indicado (por defecto recepción). */
export function cancelar(sistema: SistemaCancelacion, c: { turnoId: string; rol?: Rol }): Promise<Turno> {
  return sistema.cancelarTurno.ejecutar({ turnoId: c.turnoId, actor: actorDeRol(c.rol ?? 'recepcion', { turnoId: c.turnoId }) });
}

// ---------------------------------------------------------------------------------------------
// Estados del turno (C-04)

type CambioDeEstado = { turnoId: string; rol?: Rol };

/** Confirma con el rol indicado (por defecto recepción). */
export function confirmar(sistema: SistemaCancelacion, c: CambioDeEstado): Promise<Turno> {
  return sistema.confirmarTurno.ejecutar({ turnoId: c.turnoId, actor: actorDeRol(c.rol ?? 'recepcion', { turnoId: c.turnoId }) });
}

/** Marca atendido con el rol indicado (por defecto recepción). */
export function marcarAtendido(sistema: SistemaCancelacion, c: CambioDeEstado): Promise<Turno> {
  return sistema.marcarAtendido.ejecutar({ turnoId: c.turnoId, actor: actorDeRol(c.rol ?? 'recepcion', { turnoId: c.turnoId }) });
}

/** Marca ausente con el rol indicado (por defecto recepción). */
export function marcarAusente(sistema: SistemaCancelacion, c: CambioDeEstado): Promise<Turno> {
  return sistema.marcarAusente.ejecutar({ turnoId: c.turnoId, actor: actorDeRol(c.rol ?? 'recepcion', { turnoId: c.turnoId }) });
}

/** Espera un rechazo y devuelve el error; falla si la promesa se resuelve. */
export async function rechazo(promesa: Promise<unknown>): Promise<unknown> {
  const resultado = await promesa.then(
    () => ({ resuelta: true as const }),
    (error: unknown) => ({ resuelta: false as const, error }),
  );
  if (resultado.resuelta) throw new Error('Se esperaba un rechazo y la promesa se resolvió');
  return resultado.error;
}

// ---------------------------------------------------------------------------------------------
// Reprogramación (C-03)

export type OpcionesSistemaReprogramacion = Partial<Entorno> & {
  /** Instante del reloj fijo; por defecto el domingo 2026-11-22 08:00 local. */
  readonly ahora?: Date;
};

export interface SistemaReprogramacion {
  readonly datos: Entorno;
  readonly reloj: RelojFijo;
  readonly turnos: TurnoRepositorioDePrueba;
  readonly recordatorios: RecordatoriosEspia;
  readonly agendarTurno: AgendarTurno;
  readonly cancelarTurno: CancelarTurno;
  readonly reprogramarTurno: ReprogramarTurno;
}

/** Cableado de la reprogramación: mismos repos y reloj que cancelación, más el caso de uso C-03. */
export function crearSistemaReprogramacion(opciones: OpcionesSistemaReprogramacion = {}): SistemaReprogramacion {
  const { ahora, ...overrides } = opciones;
  const datos = crearEntorno(overrides);
  const reloj = new RelojFijo(ahora ?? AHORA_POR_DEFECTO);
  const turnos = new TurnoRepositorioDePrueba(datos.turnos);
  const recordatorios = new RecordatoriosEspia();
  const repos = {
    profesionales: new ProfesionalRepositorioEnMemoria(datos.profesionales),
    sillones: new SillonRepositorioEnMemoria(datos.sillones),
    prestaciones: new PrestacionRepositorioEnMemoria(datos.prestaciones),
    consultorios: new ConsultorioRepositorioEnMemoria([datos.consultorio]),
    horarios: new HorarioAtencionRepositorioEnMemoria(datos.horarios),
    bloqueos: new BloqueoRepositorioEnMemoria(datos.bloqueos),
    turnos,
  };
  return {
    datos,
    reloj,
    turnos,
    recordatorios,
    agendarTurno: new AgendarTurno({ ...repos, ids: new GeneradorIdSecuencial() }),
    cancelarTurno: new CancelarTurno({ turnos, reloj, recordatorios }),
    reprogramarTurno: new ReprogramarTurno({ ...repos, reloj, recordatorios }),
  };
}

export type PedidoReprogramacion = {
  readonly turnoId: string;
  readonly inicio: Date;
  readonly rol?: Rol;
  readonly profesionalId?: string;
  readonly sillonId?: string;
  readonly prestacionId?: string;
  readonly duracionMinutos?: number;
};

/** Reprograma con valores por defecto del contexto común del spec (recepción). */
export function reprogramar(sistema: SistemaReprogramacion, p: PedidoReprogramacion): Promise<Turno> {
  return sistema.reprogramarTurno.ejecutar({
    turnoId: p.turnoId,
    actor: actorDeRol(p.rol ?? 'recepcion', { turnoId: p.turnoId }),
    inicio: p.inicio,
    ...(p.profesionalId === undefined ? {} : { profesionalId: p.profesionalId }),
    ...(p.sillonId === undefined ? {} : { sillonId: p.sillonId }),
    ...(p.prestacionId === undefined ? {} : { prestacionId: p.prestacionId }),
    ...(p.duracionMinutos === undefined ? {} : { duracionMinutos: p.duracionMinutos }),
  });
}
