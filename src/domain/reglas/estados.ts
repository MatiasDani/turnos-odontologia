import type { Violacion } from '../errores.js';
import type { Turno } from '../turno.js';
import { puedeTransicionar } from './transiciones.js';

/** Estados a los que llevan los casos de uso de C-04. La cancelación tiene su propia regla (DD-19). */
export type EstadoDestino = 'confirmado' | 'atendido' | 'ausente';

/**
 * Regla pura de confirmación y cierre del turno (DD-20). Orden fijo: transición de estado
 * (RN-10, tabla única), luego hora del turno para el cierre (RN-24: `ahora >= inicio`, inclusivo).
 * Confirmar no tiene restricción horaria. Devuelve la primera violación o `null`.
 */
export function evaluarCambioDeEstado(turno: Turno, hacia: EstadoDestino, ahora: Date): Violacion | null {
  if (!puedeTransicionar(turno.estado, hacia)) {
    return { codigo: 'RN-10', estadoActual: turno.estado };
  }
  if (hacia !== 'confirmado' && ahora.getTime() < turno.inicio.getTime()) {
    return { codigo: 'RN-24' };
  }
  return null;
}

/**
 * Turno en el estado `hacia` (DD-20). Pura: no modifica `turno`.
 * Precondición: `evaluarCambioDeEstado(turno, hacia, ahora)` devolvió `null`.
 */
export function cambiarEstado(turno: Turno, hacia: EstadoDestino): Turno {
  return { ...turno, estado: hacia };
}
