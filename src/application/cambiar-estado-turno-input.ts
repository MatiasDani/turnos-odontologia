import type { Actor } from '../domain/actor.js';

/**
 * Contrato de entrada de los casos de uso de estado (C-04): confirmar, marcar atendido y marcar
 * ausente. Ninguna regla de C-04 usa el actor; viaja para que C-09 agregue el control de acceso
 * por rol sin cambiar la firma (DD-20).
 */
export interface CambiarEstadoTurnoInput {
  readonly turnoId: string;
  readonly actor: Actor;
}
