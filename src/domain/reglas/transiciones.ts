import type { EstadoTurno } from '../turno.js';

/**
 * Única tabla de transiciones de estado del turno (KB 04, DD-20). Al ser un `Record` de todos los
 * estados, agregar un estado nuevo obliga a definir sus transiciones. Ningún estado se lista a sí
 * mismo, así que repetir una transición no está permitido.
 */
const TRANSICIONES: Readonly<Record<EstadoTurno, readonly EstadoTurno[]>> = {
  reservado: ['confirmado', 'cancelado'],
  confirmado: ['atendido', 'ausente', 'cancelado'],
  cancelado: [],
  ausente: [],
  atendido: [],
};

/** `true` si un turno en estado `desde` puede pasar a `hacia` (RN-10). */
export function puedeTransicionar(desde: EstadoTurno, hacia: EstadoTurno): boolean {
  return TRANSICIONES[desde].includes(hacia);
}
