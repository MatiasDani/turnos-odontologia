import type { Violacion } from '../errores.js';
import type { Prestacion } from '../prestacion.js';
import type { Profesional } from '../profesional.js';
import type { Sillon } from '../sillon.js';

/** RN-18: profesional, sillón y prestación deben estar activos. */
export function validarRecursosActivos(recursos: {
  profesional: Profesional;
  sillon: Sillon;
  prestacion: Prestacion;
}): Violacion | null {
  const { profesional, sillon, prestacion } = recursos;
  return profesional.activo && sillon.activo && prestacion.activa ? null : { codigo: 'RN-18' };
}
