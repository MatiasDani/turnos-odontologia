/** Mensaje fijo del enlace inválido: no indica el motivo ni el estado del turno (RN-15, RN-22). */
export const MENSAJE_ENLACE_INVALIDO = 'El enlace no es válido o ya no está vigente.';

/**
 * Único error del enlace público del recordatorio (DD-21). Un solo código y un mensaje fijo;
 * nunca recibe el error de origen, el estado del turno ni datos de pacientes o turnos.
 */
export class ErrorEnlacePublico extends Error {
  readonly codigo = 'ENLACE_INVALIDO';

  constructor() {
    super(MENSAJE_ENLACE_INVALIDO);
    this.name = 'ErrorEnlacePublico';
  }
}
