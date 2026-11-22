import { cambiarEstado, evaluarCambioDeEstado, type EstadoDestino } from '../domain/reglas/estados.js';
import type { Turno } from '../domain/turno.js';
import type { Reloj } from './puertos/reloj.js';
import type { TurnoRepositorio } from './puertos/repositorios.js';

export interface CambiarEstadoTurnoDependencias {
  readonly turnos: TurnoRepositorio;
  readonly reloj: Reloj;
}

/**
 * Aplica un cambio de estado de C-04 de forma atómica (RN-12, DD-20). El instante se lee una sola
 * vez, antes de la sección crítica, y las reglas se evalúan sobre el estado real del turno dentro
 * de `actualizarSi`. Un turno inexistente lo informa el repositorio con `RecursoNoEncontradoError`.
 */
export function aplicarCambioDeEstado(
  deps: CambiarEstadoTurnoDependencias,
  turnoId: string,
  hacia: EstadoDestino,
): Promise<Turno> {
  const ahora = deps.reloj.ahora();
  return deps.turnos.actualizarSi(turnoId, (actual) => {
    const violacion = evaluarCambioDeEstado(actual, hacia, ahora);
    return violacion === null ? { ok: true, turno: cambiarEstado(actual, hacia) } : { ok: false, violacion };
  });
}
