import type { Turno } from '../domain/turno.js';
import type { CambiarEstadoTurnoInput } from './cambiar-estado-turno-input.js';
import { aplicarCambioDeEstado, type CambiarEstadoTurnoDependencias } from './cambiar-estado-turno.js';

export type { CambiarEstadoTurnoInput } from './cambiar-estado-turno-input.js';

/**
 * Confirma un turno `reservado` (US-006, DD-20), sin restricción horaria. C-12 lo usa para la
 * confirmación desde el enlace del recordatorio.
 */
export class ConfirmarTurno {
  constructor(private readonly deps: CambiarEstadoTurnoDependencias) {}

  ejecutar(input: CambiarEstadoTurnoInput): Promise<Turno> {
    return aplicarCambioDeEstado(this.deps, input, 'confirmado');
  }
}
