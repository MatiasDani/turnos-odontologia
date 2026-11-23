import type { Actor } from '../domain/actor.js';
import { agruparPorHorario } from '../domain/disponibilidad/agrupar-huecos.js';
import type { Hueco } from '../domain/disponibilidad/hueco.js';
import { ConsultaInvalidaError, RecursoNoEncontradoError, ReglaNegocioError } from '../domain/errores.js';
import type { Prestacion } from '../domain/prestacion.js';
import type { Profesional } from '../domain/profesional.js';
import { sumarDias } from '../domain/reglas/horizonte-reserva.js';
import { deHoraLocal } from '../domain/tiempo.js';
import type { ConsultarDisponibilidad } from './consultar-disponibilidad.js';
import type { HorarioOfrecido } from './errores-reserva-publica.js';

const ACTOR_PACIENTE: Actor = { rol: 'paciente' };

export interface ConsultaDelDia {
  readonly consultar: Pick<ConsultarDisponibilidad, 'ejecutar'>;
  readonly prestacion: Prestacion;
  /** Profesionales del consultorio (se filtran los activos y habilitados, RN-19). */
  readonly profesionales: readonly Profesional[];
  /** Día local 'AAAA-MM-DD' ya validado. */
  readonly fecha: string;
  readonly zonaHoraria: string;
  readonly ahora: Date;
  readonly profesionalId?: string;
  /** Si se informa, solo se ofrecen los combos de ese sillón (reprogramación, D7). */
  readonly sillonId?: string;
}

/**
 * Horarios únicos `{inicio, fin}` libres de un día local para el paciente (RN-13, RN-19, DD-18).
 * Nunca devuelve sillón ni profesional. Un error de reglas de C-07 equivale a "sin horarios" (RN-22).
 */
export async function horariosLibresDelDia(consulta: ConsultaDelDia): Promise<readonly HorarioOfrecido[]> {
  const desde = deHoraLocal(consulta.fecha, 0, consulta.zonaHoraria);
  const hasta = deHoraLocal(sumarDias(consulta.fecha, 1), 0, consulta.zonaHoraria);
  let huecos: readonly Hueco[];
  try {
    huecos = await consulta.consultar.ejecutar({
      actor: ACTOR_PACIENTE,
      prestacionId: consulta.prestacion.id,
      rango: { desde, hasta },
      ahora: consulta.ahora,
      profesionalId: consulta.profesionalId,
    });
  } catch (error) {
    if (
      error instanceof ReglaNegocioError ||
      error instanceof RecursoNoEncontradoError ||
      error instanceof ConsultaInvalidaError
    ) {
      return [];
    }
    throw error;
  }
  const habilitados = new Set(
    consulta.profesionales
      .filter((p) => p.activo && p.prestacionIds.includes(consulta.prestacion.id))
      .map((p) => p.id),
  );
  const libres = huecos.filter(
    (h) => habilitados.has(h.profesionalId) && (consulta.sillonId === undefined || h.sillonId === consulta.sillonId),
  );
  return agruparPorHorario(libres).map(({ inicio, fin }) => ({ inicio, fin }));
}
