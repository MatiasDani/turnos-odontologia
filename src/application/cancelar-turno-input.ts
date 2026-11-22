import type { Actor } from '../domain/actor.js';

/**
 * Contrato de entrada de la cancelación (C-02). El actor define la política de anticipación
 * (RN-08 solo para el paciente); el control de acceso por rol es de C-09 (DD-19).
 */
export interface CancelarTurnoInput {
  readonly turnoId: string;
  readonly actor: Actor;
}
