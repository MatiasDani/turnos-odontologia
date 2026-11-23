import type { Actor } from '../domain/actor.js';

/**
 * Contrato de entrada de la reprogramación (C-03, DD-22). Los recursos no informados se conservan
 * del turno. No existe ningún campo para forzar un solapamiento (RN-04).
 * El control de acceso por rol es de C-09.
 */
export interface ReprogramarTurnoInput {
  readonly turnoId: string;
  readonly actor: Actor;
  readonly inicio: Date;
  readonly profesionalId?: string;
  readonly sillonId?: string;
  readonly prestacionId?: string;
  readonly duracionMinutos?: number;
}
