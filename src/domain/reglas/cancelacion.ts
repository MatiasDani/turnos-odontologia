import type { Rol } from '../actor.js';
import type { Violacion } from '../errores.js';
import type { Turno } from '../turno.js';
import { evaluarAnticipacionPaciente } from './anticipacion.js';
import { puedeTransicionar } from './transiciones.js';

/**
 * Regla pura de cancelación (DD-19). Orden fijo: estado (RN-10, según la tabla única de
 * transiciones de DD-20), luego anticipación del paciente (RN-08 compartida con la reprogramación,
 * DD-22). Devuelve la primera violación o `null` si el turno se puede cancelar.
 */
export function evaluarCancelacion(turno: Turno, rol: Rol, ahora: Date): Violacion | null {
  if (!puedeTransicionar(turno.estado, 'cancelado')) {
    return { codigo: 'RN-10', estadoActual: turno.estado };
  }
  return evaluarAnticipacionPaciente(turno, rol, ahora);
}

/**
 * Turno cancelado por `rol` en el instante `ahora` (DD-19). Pura: no modifica `turno` y copia
 * el instante para que el registro no comparta el `Date` de quien llama.
 * Precondición: `evaluarCancelacion(turno, rol, ahora)` devolvió `null`.
 */
export function cancelar(turno: Turno, rol: Rol, ahora: Date): Turno {
  return {
    ...turno,
    estado: 'cancelado',
    canceladoPor: rol,
    canceladoEn: new Date(ahora.getTime()),
  };
}
