import type { Actor } from '../domain/actor.js';

/**
 * Contrato de entrada del alta de turnos (D3). No existe ningún campo para forzar
 * un solapamiento: no hay sobreturnos para ningún rol (RN-04).
 */
export interface AgendarTurnoInput {
  readonly actor: Actor;
  readonly pacienteId: string;
  readonly profesionalId: string;
  readonly sillonId: string;
  readonly prestacionId: string;
  readonly inicio: Date;
  readonly duracionMinutos?: number | undefined;
}
