import type { Rol } from '../actor.js';
import type { Violacion } from '../errores.js';
import type { Turno } from '../turno.js';

/** Anticipación mínima del paciente (RN-08): 24 h, umbral inclusivo. */
const ANTICIPACION_MINIMA_PACIENTE_MS = 24 * 60 * 60_000;

/**
 * Regla pura de anticipación (RN-08, DD-22). Compartida por cancelación y reprogramación para no
 * duplicar la constante de 24 h. El personal del consultorio no tiene restricción de anticipación.
 * La anticipación es una duración absoluta en milisegundos (Argentina no tiene horario de verano).
 */
export function evaluarAnticipacionPaciente(turno: Turno, rol: Rol, ahora: Date): Violacion | null {
  if (rol === 'paciente' && turno.inicio.getTime() - ahora.getTime() < ANTICIPACION_MINIMA_PACIENTE_MS) {
    return { codigo: 'RN-08' };
  }
  return null;
}
