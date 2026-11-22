import type { Turno } from '../domain/turno.js';
import type { CambiarEstadoTurnoInput } from './cambiar-estado-turno-input.js';
import { aplicarCambioDeEstado, type CambiarEstadoTurnoDependencias } from './cambiar-estado-turno.js';

export type { CambiarEstadoTurnoInput } from './cambiar-estado-turno-input.js';

/**
 * Marca ausente un turno `confirmado` cuyo `inicio` ya llegó (US-006, Flujo 7, RN-24). El turno
 * ausente deja de ocupar profesional y sillón (DD-05): el horario queda libre.
 */
export class MarcarAusente {
  constructor(private readonly deps: CambiarEstadoTurnoDependencias) {}

  ejecutar(input: CambiarEstadoTurnoInput): Promise<Turno> {
    return aplicarCambioDeEstado(this.deps, input.turnoId, 'ausente');
  }
}
