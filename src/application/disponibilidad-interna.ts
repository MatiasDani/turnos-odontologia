import type { Actor } from '../domain/actor.js';
import { agruparPorHorario, type HuecoAgrupado } from '../domain/disponibilidad/agrupar-huecos.js';
import { ConsultaInvalidaError, RecursoNoEncontradoError } from '../domain/errores.js';
import { esFechaLocalValida, sumarDias } from '../domain/reglas/horizonte-reserva.js';
import { deHoraLocal } from '../domain/tiempo.js';
import type { ConsultarDisponibilidad } from './consultar-disponibilidad.js';
import type { Reloj } from './puertos/reloj.js';
import type { ConsultorioRepositorio } from './puertos/repositorios.js';

export interface DisponibilidadInternaDependencias {
  readonly consultar: Pick<ConsultarDisponibilidad, 'ejecutar'>;
  readonly consultorios: Pick<ConsultorioRepositorio, 'obtenerPorId'>;
  readonly reloj: Reloj;
  readonly consultorioId: string;
}

export interface DisponibilidadInternaInput {
  readonly actor: Actor;
  readonly prestacionId: string;
  readonly fecha: string;
  readonly profesionalId?: string;
}

/**
 * Huecos libres de un día para el personal (C-15): reusa C-07 sobre el día local del consultorio y
 * agrupa por horario con todas las combinaciones profesional + sillón (el personal sí ve el sillón).
 */
export class DisponibilidadInterna {
  constructor(private readonly deps: DisponibilidadInternaDependencias) {}

  async ejecutar(input: DisponibilidadInternaInput): Promise<readonly HuecoAgrupado[]> {
    if (!esFechaLocalValida(input.fecha)) throw new ConsultaInvalidaError('rango', 'fecha inválida');
    const consultorio = await this.deps.consultorios.obtenerPorId(this.deps.consultorioId);
    if (consultorio === undefined) throw new RecursoNoEncontradoError('consultorio', this.deps.consultorioId);
    const zona = consultorio.zonaHoraria;
    const huecos = await this.deps.consultar.ejecutar({
      actor: input.actor,
      prestacionId: input.prestacionId,
      rango: { desde: deHoraLocal(input.fecha, 0, zona), hasta: deHoraLocal(sumarDias(input.fecha, 1), 0, zona) },
      ahora: this.deps.reloj.ahora(),
      ...(input.profesionalId === undefined ? {} : { profesionalId: input.profesionalId }),
    });
    return agruparPorHorario(huecos);
  }
}
