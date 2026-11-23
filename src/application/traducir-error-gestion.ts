import { RecursoNoEncontradoError, ReglaNegocioError } from '../domain/errores.js';
import { ErrorEnlacePublico } from './errores-enlace-publico.js';
import { ErrorGestionTurnoPublica } from './errores-gestion-turno-publica.js';

/**
 * Traduce los errores de los casos de uso delegados a errores públicos sin filtrado (DD-23).
 * RN-08 → `CONTACTAR_CONSULTORIO`; RN-10 o turno inexistente → `ENLACE_INVALIDO`; las reglas de
 * horario y los recursos de catálogo inexistentes → `HORARIO_NO_DISPONIBLE`. Cualquier otro error
 * se propaga sin enmascarar para no ocultar fallos técnicos.
 */
export function traducirErrorGestion(error: unknown): never {
  if (error instanceof ReglaNegocioError) {
    if (error.codigo === 'RN-08') throw new ErrorGestionTurnoPublica('CONTACTAR_CONSULTORIO');
    if (error.codigo === 'RN-10') throw new ErrorEnlacePublico();
    throw new ErrorGestionTurnoPublica('HORARIO_NO_DISPONIBLE');
  }
  if (error instanceof RecursoNoEncontradoError) {
    if (error.tipo === 'turno') throw new ErrorEnlacePublico();
    throw new ErrorGestionTurnoPublica('HORARIO_NO_DISPONIBLE');
  }
  throw error;
}
