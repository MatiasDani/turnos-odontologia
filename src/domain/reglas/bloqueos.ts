import type { BloqueoHorario } from '../bloqueo-horario.js';
import type { Violacion } from '../errores.js';
import { type Intervalo, seSolapa } from '../intervalo.js';

/** RN-07: bloqueos del profesional (primero) o del sillón que se solapan con el intervalo. */
export function validarBloqueos(
  intervalo: Intervalo,
  profesionalId: string,
  sillonId: string,
  bloqueos: readonly BloqueoHorario[],
): Violacion | null {
  const solapados = bloqueos.filter((b) => seSolapa(intervalo, { inicio: b.inicio, fin: b.fin }));

  const deProfesional = solapados.find((b) => b.profesionalId === profesionalId);
  if (deProfesional !== undefined) {
    return { codigo: 'RN-07', bloqueoEnConflicto: deProfesional, recursoBloqueado: 'profesional' };
  }
  const deSillon = solapados.find((b) => b.sillonId === sillonId);
  if (deSillon !== undefined) {
    return { codigo: 'RN-07', bloqueoEnConflicto: deSillon, recursoBloqueado: 'sillon' };
  }
  return null;
}
