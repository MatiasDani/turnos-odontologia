import type { Rol } from '../actor.js';
import type { Violacion } from '../errores.js';
import type { Turno } from '../turno.js';
import { evaluarAnticipacionPaciente } from './anticipacion.js';

/** Estados desde los que se puede reprogramar (DD-22). La reprogramación no cambia el estado. */
const ESTADOS_REPROGRAMABLES = ['reservado', 'confirmado'] as const;

/**
 * Regla pura de reprogramación (DD-22). Orden fijo: estados admitidos (RN-10), luego anticipación
 * del paciente (RN-08). Devuelve la primera violación o `null` si el turno se puede mover.
 */
export function evaluarReprogramacion(turno: Turno, rol: Rol, ahora: Date): Violacion | null {
  if (!ESTADOS_REPROGRAMABLES.includes(turno.estado as (typeof ESTADOS_REPROGRAMABLES)[number])) {
    return { codigo: 'RN-10', estadoActual: turno.estado };
  }
  return evaluarAnticipacionPaciente(turno, rol, ahora);
}

/** Datos que cambian al mover un turno. Los recursos omitidos se conservan. */
export interface DatosMovimiento {
  readonly inicio: Date;
  readonly fin: Date;
  readonly duracionMinutos: number;
  readonly profesionalId?: string;
  readonly sillonId?: string;
  readonly prestacionId?: string;
}

/**
 * Turno movido a otro horario o recursos (US-005, RN-11). Puro: no modifica `turno` y copia las
 * fechas. Conserva identidad, paciente, estado, origen y registro de cancelación.
 * Precondición: `evaluarReprogramacion(turno, rol, ahora)` devolvió `null`.
 */
export function moverTurno(turno: Turno, datos: DatosMovimiento): Turno {
  return {
    ...turno,
    inicio: new Date(datos.inicio.getTime()),
    fin: new Date(datos.fin.getTime()),
    duracionMinutos: datos.duracionMinutos,
    ...(datos.profesionalId === undefined ? {} : { profesionalId: datos.profesionalId }),
    ...(datos.sillonId === undefined ? {} : { sillonId: datos.sillonId }),
    ...(datos.prestacionId === undefined ? {} : { prestacionId: datos.prestacionId }),
  };
}
