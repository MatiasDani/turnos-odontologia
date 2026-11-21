import type { Actor } from '../actor.js';
import type { Violacion } from '../errores.js';
import type { Prestacion } from '../prestacion.js';

/** Duración informada o, si no hay, la de la prestación (RN-06). No valida. */
export function duracionEfectiva(prestacion: Prestacion, informada: number | undefined): number {
  return informada ?? prestacion.duracionMinutos;
}

/** RN-16: el paciente no ajusta la duración. RN-06: entero > 0 y múltiplo de 5. */
export function validarDuracion(
  actor: Actor,
  prestacion: Prestacion,
  informada: number | undefined,
): Violacion | null {
  if (informada === undefined) return null;
  if (actor.rol === 'paciente' && informada !== prestacion.duracionMinutos) {
    return { codigo: 'RN-16' };
  }
  if (!Number.isInteger(informada) || informada <= 0 || informada % 5 !== 0) {
    return { codigo: 'RN-06' };
  }
  return null;
}
