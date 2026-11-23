import type { Prestacion } from '../domain/prestacion.js';
import type { Profesional } from '../domain/profesional.js';
import type { Turno } from '../domain/turno.js';

/**
 * Respuesta pública del turno (DD-18, DD-23): sin token, sillón, paciente, estado ni datos ajenos.
 * Lo devuelven la consulta y la reprogramación por token; cancelar devuelve el del turno cancelado.
 */
export interface TurnoPublico {
  readonly turnoId: string;
  readonly inicio: Date;
  readonly fin: Date;
  readonly prestacion: { readonly nombre: string };
  readonly profesional: { readonly nombre: string; readonly apellido: string };
}

export function aTurnoPublico(turno: Turno, prestacion: Prestacion, profesional: Profesional): TurnoPublico {
  return {
    turnoId: turno.id,
    inicio: turno.inicio,
    fin: turno.fin,
    prestacion: { nombre: prestacion.nombre },
    profesional: { nombre: profesional.nombre, apellido: profesional.apellido },
  };
}
