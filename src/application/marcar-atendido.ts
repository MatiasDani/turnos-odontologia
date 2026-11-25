import type { Turno } from '../domain/turno.js';
import type { CambiarEstadoTurnoInput } from './cambiar-estado-turno-input.js';
import { aplicarCambioDeEstado, type CambiarEstadoTurnoDependencias } from './cambiar-estado-turno.js';

export type { CambiarEstadoTurnoInput } from './cambiar-estado-turno-input.js';

/**
 * Marca atendido un turno `confirmado` cuyo `inicio` ya llegó (US-006, Flujo 7, RN-24). El turno
 * atendido sigue ocupando profesional y sillón (DD-05).
 */
export class MarcarAtendido {
  constructor(private readonly deps: CambiarEstadoTurnoDependencias) {}

  ejecutar(input: CambiarEstadoTurnoInput): Promise<Turno> {
    return aplicarCambioDeEstado(this.deps, input, 'atendido');
  }
}
