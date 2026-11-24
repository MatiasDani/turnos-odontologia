import type { Actor } from '../domain/actor.js';
import { validarDatosPacienteOnline, type DatosPacienteOnline } from '../domain/datos-paciente-online.js';
import { agruparPorHorario } from '../domain/disponibilidad/agrupar-huecos.js';
import type { Hueco } from '../domain/disponibilidad/hueco.js';
import {
  ConsultaInvalidaError,
  RecursoNoEncontradoError,
  ReglaNegocioError,
} from '../domain/errores.js';
import type { Prestacion } from '../domain/prestacion.js';
import { aHoraLocal } from '../domain/tiempo.js';
import { esActivo, type Turno } from '../domain/turno.js';
import type { AgendarTurno } from './agendar-turno.js';
import type { ConsultarDisponibilidad } from './consultar-disponibilidad.js';
import { ErrorReservaPublica, type HorarioOfrecido } from './errores-reserva-publica.js';
import type { GeneradorId } from './puertos/generador-id.js';
import type { Recordatorios } from './puertos/recordatorios.js';
import type { Reloj } from './puertos/reloj.js';
import type {
  ConsultorioRepositorio,
  PacienteRepositorio,
  PrestacionRepositorio,
  ProfesionalRepositorio,
  TurnoRepositorio,
} from './puertos/repositorios.js';
import type { ReservaOnlineConfirmada, ReservarOnlineInput } from './reservar-online-input.js';
import type { ServicioTokens } from './servicio-tokens.js';

export type { ReservaOnlineConfirmada, ReservarOnlineInput } from './reservar-online-input.js';

/** El rol del actor de la ruta pública es siempre paciente: nunca se toma del pedido (RN-16, RN-04). */
const ACTOR_PACIENTE: Actor = { rol: 'paciente' };
const UN_MINUTO_MS = 60_000;
const UN_DIA_MS = 24 * 60 * UN_MINUTO_MS;

/** Máximo de turnos online activos futuros por DNI (RN-23, configurable). */
export const TOPE_TURNOS_ONLINE = 2;

export interface ReservarOnlineDependencias {
  readonly reloj: Reloj;
  readonly pacientes: PacienteRepositorio;
  /** Solo lecturas: duplicado y tope por DNI (RN-23). */
  readonly turnos: Pick<TurnoRepositorio, 'listarPorPaciente'>;
  readonly profesionales: ProfesionalRepositorio;
  readonly prestaciones: PrestacionRepositorio;
  readonly consultorios: ConsultorioRepositorio;
  readonly ids: GeneradorId;
  readonly consultar: Pick<ConsultarDisponibilidad, 'ejecutar'>;
  readonly agendar: Pick<AgendarTurno, 'ejecutar'>;
  /** Programa los recordatorios del turno creado (RN-25, RN-26, DD-32); `RecordatoriosNoOp` si no se usan. */
  readonly recordatorios: Pick<Recordatorios, 'programar'>;
  readonly tokens: Pick<ServicioTokens, 'emitir'>;
  readonly topeTurnosOnline?: number;
}

/** Errores de C-01/C-07 que nunca se propagan a la ruta pública (RN-22): se traducen a un código. */
function esErrorInterno(error: unknown): boolean {
  return (
    error instanceof ReglaNegocioError ||
    error instanceof RecursoNoEncontradoError ||
    error instanceof ConsultaInvalidaError
  );
}

export class ReservarOnline {
  constructor(private readonly deps: ReservarOnlineDependencias) {}

  async ejecutar(input: ReservarOnlineInput): Promise<ReservaOnlineConfirmada> {
    const { deps } = this;
    // 1-4. Pedido válido y catálogo público; `ahora` se lee una sola vez.
    const { datos, ahora, prestacion } = await this.validarPedido(input);
    // 5. Paciente existente por DNI (sin crearlo): se vincula sin tocar sus datos (RN-22).
    const existente = await deps.pacientes.obtenerPorDni(datos.dni);
    if (existente !== undefined) await this.verificarDuplicadoYTope(existente.id, input, ahora);
    // 6. Combos libres para el `inicio` exacto, solo de profesionales habilitados.
    const combo = (await this.combosLibres(input, ahora))[0];
    if (combo === undefined) throw await this.horarioNoDisponible(input, ahora);
    // 7-8. Id reservado sin guardar y alta con un único reintento ante carrera (D6, D7).
    const pacienteId = existente?.id ?? deps.ids.siguiente();
    const turno = await this.agendarConReintento(input, pacienteId, combo, ahora);
    // 9. Solo ahora, con el turno creado, se guarda el paciente nuevo: ningún rechazo deja huérfanos.
    if (existente === undefined) await deps.pacientes.guardar({ id: pacienteId, ...datos });
    // 10. Recordatorios con turno y paciente ya guardados; fuera del reintento, así una falla se propaga sin
    //     traducir (RN-22) y, al ir antes del token, no deja un token emitido que nadie recibe (DD-32).
    await deps.recordatorios.programar(turno.id);
    // 11. El token en claro solo existe en la respuesta.
    const token = await deps.tokens.emitir(turno.id);
    return this.armarRespuesta(turno, prestacion.nombre, token);
  }

  /** Pasos 1 a 4 del algoritmo (design D5), en orden fijo: se informa solo el primer error. */
  private async validarPedido(input: ReservarOnlineInput): Promise<{
    readonly datos: DatosPacienteOnline;
    readonly ahora: Date;
    readonly prestacion: Prestacion;
  }> {
    const { deps } = this;
    // 1. Los datos se revalidan acá además de la frontera (DD-17): el caso de uso no confía en quien lo llama.
    const datos = validarDatosPacienteOnline(input.paciente);
    if (!datos.ok) throw new ErrorReservaPublica('DATOS_INVALIDOS', { campos: datos.campos });
    // 2. Un `inicio` igual a `ahora` es válido (RN-20).
    const ahora = deps.reloj.ahora();
    if (input.inicio.getTime() < ahora.getTime()) throw new ErrorReservaPublica('RESERVA_EN_PASADO');
    // 3. Prestación existente y activa.
    const prestacion = await deps.prestaciones.obtenerPorId(input.prestacionId);
    if (prestacion === undefined || !prestacion.activa) {
      throw new ErrorReservaPublica('PRESTACION_NO_DISPONIBLE');
    }
    // 4. Profesional pedido: existente, activo y habilitado para la prestación (RN-19, DD-18).
    if (input.profesionalId !== undefined) {
      const pedido = await deps.profesionales.obtenerPorId(input.profesionalId);
      if (pedido === undefined || !pedido.activo || !pedido.prestacionIds.includes(prestacion.id)) {
        throw new ErrorReservaPublica('PROFESIONAL_NO_DISPONIBLE');
      }
    }
    return { datos: datos.datos, ahora, prestacion };
  }

  /** Respuesta pública (DD-18): solo seis claves, sin sillón ni id de paciente. */
  private async armarRespuesta(
    turno: Turno,
    nombrePrestacion: string,
    token: string,
  ): Promise<ReservaOnlineConfirmada> {
    const profesional = await this.deps.profesionales.obtenerPorId(turno.profesionalId);
    if (profesional === undefined) throw new RecursoNoEncontradoError('profesional', turno.profesionalId);
    return {
      turnoId: turno.id,
      inicio: turno.inicio,
      fin: turno.fin,
      prestacion: { nombre: nombrePrestacion },
      profesional: { nombre: profesional.nombre, apellido: profesional.apellido },
      token,
    };
  }

  /** RN-23: primero el duplicado (misma prestación e `inicio` con turno activo) y luego el tope. */
  private async verificarDuplicadoYTope(
    pacienteId: string,
    input: ReservarOnlineInput,
    ahora: Date,
  ): Promise<void> {
    const turnos = await this.deps.turnos.listarPorPaciente(pacienteId);
    const duplicado = turnos.some(
      (t) =>
        esActivo(t.estado) &&
        t.prestacionId === input.prestacionId &&
        t.inicio.getTime() === input.inicio.getTime(),
    );
    if (duplicado) throw new ErrorReservaPublica('RESERVA_DUPLICADA');
    const onlineFuturos = turnos.filter(
      (t) => t.origen === 'online' && esActivo(t.estado) && t.inicio.getTime() >= ahora.getTime(),
    );
    if (onlineFuturos.length >= (this.deps.topeTurnosOnline ?? TOPE_TURNOS_ONLINE)) {
      throw new ErrorReservaPublica('LIMITE_DE_TURNOS');
    }
  }

  /**
   * Alta con el primer combo (RN-12). Si lo ocupó otro turno entre la consulta y el alta (RN-02, RN-03),
   * reconsulta el mismo `inicio` y reintenta UNA sola vez con el primer combo restante (design D7).
   * Cualquier otro rechazo, o la falla del reintento, es `HORARIO_NO_DISPONIBLE` con nueva oferta.
   */
  private async agendarConReintento(
    input: ReservarOnlineInput,
    pacienteId: string,
    combo: Hueco,
    ahora: Date,
  ): Promise<Turno> {
    try {
      return await this.agendarEn(input, pacienteId, combo);
    } catch (error) {
      if (!esErrorInterno(error)) throw error;
      if (!(error instanceof ReglaNegocioError) || (error.codigo !== 'RN-02' && error.codigo !== 'RN-03')) {
        throw await this.horarioNoDisponible(input, ahora);
      }
    }
    const restantes = (await this.combosLibres(input, ahora)).filter(
      (c) => c.profesionalId !== combo.profesionalId || c.sillonId !== combo.sillonId,
    );
    const siguiente = restantes[0];
    if (siguiente === undefined) throw await this.horarioNoDisponible(input, ahora);
    try {
      return await this.agendarEn(input, pacienteId, siguiente);
    } catch (error) {
      if (!esErrorInterno(error)) throw error;
      throw await this.horarioNoDisponible(input, ahora);
    }
  }

  private agendarEn(input: ReservarOnlineInput, pacienteId: string, combo: Hueco): Promise<Turno> {
    return this.deps.agendar.ejecutar({
      actor: ACTOR_PACIENTE,
      pacienteId,
      profesionalId: combo.profesionalId,
      sillonId: combo.sillonId,
      prestacionId: input.prestacionId,
      inicio: input.inicio,
    });
  }

  /** Combos de C-07 con `inicio` exacto y profesional habilitado (RN-19, verificado de forma explícita). */
  private async combosLibres(input: ReservarOnlineInput, ahora: Date): Promise<readonly Hueco[]> {
    const huecos = await this.consultarHuecos({
      prestacionId: input.prestacionId,
      rango: { desde: input.inicio, hasta: new Date(input.inicio.getTime() + UN_MINUTO_MS) },
      ahora,
      profesionalId: input.profesionalId,
    });
    return this.soloHabilitados(
      input.prestacionId,
      huecos.filter((h) => h.inicio.getTime() === input.inicio.getTime()),
    );
  }

  /** Consulta a C-07; un error interno equivale a "sin combos" y nunca se propaga (RN-22). */
  private async consultarHuecos(consulta: {
    readonly prestacionId: string;
    readonly rango: { readonly desde: Date; readonly hasta: Date };
    readonly ahora: Date;
    readonly profesionalId: string | undefined;
  }): Promise<readonly Hueco[]> {
    try {
      return await this.deps.consultar.ejecutar({ actor: ACTOR_PACIENTE, ...consulta });
    } catch (error) {
      if (esErrorInterno(error)) return [];
      throw error;
    }
  }

  private async soloHabilitados(prestacionId: string, huecos: readonly Hueco[]): Promise<readonly Hueco[]> {
    const habilitados: Hueco[] = [];
    for (const hueco of huecos) {
      const profesional = await this.deps.profesionales.obtenerPorId(hueco.profesionalId);
      if (profesional?.activo === true && profesional.prestacionIds.includes(prestacionId)) {
        habilitados.push(hueco);
      }
    }
    return habilitados;
  }

  private async horarioNoDisponible(input: ReservarOnlineInput, ahora: Date): Promise<ErrorReservaPublica> {
    return new ErrorReservaPublica('HORARIO_NO_DISPONIBLE', {
      nuevaOferta: await this.nuevaOferta(input, ahora),
    });
  }

  /** Horarios únicos `{inicio, fin}` del día local de `inicio` (design D8), sin datos internos. */
  private async nuevaOferta(input: ReservarOnlineInput, ahora: Date): Promise<readonly HorarioOfrecido[]> {
    const { deps } = this;
    const prestacion = await deps.prestaciones.obtenerPorId(input.prestacionId);
    const consultorio =
      prestacion === undefined ? undefined : await deps.consultorios.obtenerPorId(prestacion.consultorioId);
    if (consultorio === undefined) return [];
    const { minutosDelDia } = aHoraLocal(input.inicio, consultorio.zonaHoraria);
    const subMinutoMs = input.inicio.getUTCSeconds() * 1000 + input.inicio.getUTCMilliseconds();
    const desde = new Date(input.inicio.getTime() - minutosDelDia * UN_MINUTO_MS - subMinutoMs);
    const huecos = await this.consultarHuecos({
      prestacionId: input.prestacionId,
      rango: { desde, hasta: new Date(desde.getTime() + UN_DIA_MS) },
      ahora,
      profesionalId: input.profesionalId,
    });
    const habilitados = await this.soloHabilitados(input.prestacionId, huecos);
    return agruparPorHorario(habilitados).map(({ inicio, fin }) => ({ inicio, fin }));
  }
}
