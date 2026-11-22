import type { Rol } from '../actor.js';
import type { Violacion } from '../errores.js';
import type { EstadoTurno, Turno } from '../turno.js';

/** Estados desde los que se permite pasar a `cancelado` (transiciones de la KB 04, DD-19). */
const ESTADOS_CANCELABLES: readonly EstadoTurno[] = ['reservado', 'confirmado'];

/** Anticipación mínima del paciente (RN-08): 24 h, umbral inclusivo. */
const ANTICIPACION_MINIMA_PACIENTE_MS = 24 * 60 * 60_000;

/**
 * Regla pura de cancelación (DD-19). Orden fijo: estado (RN-10), luego anticipación del
 * paciente (RN-08). El personal del consultorio no tiene restricción de anticipación.
 * La anticipación es una duración absoluta en milisegundos (Argentina no tiene horario de verano).
 * Devuelve la primera violación o `null` si el turno se puede cancelar.
 */
export function evaluarCancelacion(turno: Turno, rol: Rol, ahora: Date): Violacion | null {
  if (!ESTADOS_CANCELABLES.includes(turno.estado)) {
    return { codigo: 'RN-10', estadoActual: turno.estado };
  }
  if (rol === 'paciente' && turno.inicio.getTime() - ahora.getTime() < ANTICIPACION_MINIMA_PACIENTE_MS) {
    return { codigo: 'RN-08' };
  }
  return null;
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
