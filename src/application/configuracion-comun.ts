import {
  ConfiguracionInvalidaError,
  RecursoNoEncontradoError,
  ReglaNegocioError,
} from '../domain/errores.js';
import type { ResultadoConfiguracion } from '../domain/reglas/configuracion.js';
import { evaluarDesactivacion } from '../domain/reglas/desactivacion.js';
import type { Turno } from '../domain/turno.js';

/** Resuelve la entidad o rechaza con `RecursoNoEncontradoError(tipo, id)` (sin código RN). */
export async function obtenerOFallar<T>(
  tipo: string,
  id: string,
  buscar: Promise<T | undefined>,
): Promise<T> {
  const encontrado = await buscar;
  if (encontrado === undefined) throw new RecursoNoEncontradoError(tipo, id);
  return encontrado;
}

/** Devuelve el valor normalizado o rechaza con `ConfiguracionInvalidaError` del primer campo inválido. */
export function valorOFallar<T>(resultado: ResultadoConfiguracion<T>): T {
  if (!resultado.ok) throw new ConfiguracionInvalidaError(resultado.campo, resultado.motivo);
  return resultado.valor;
}

/** RN-27: rechaza con la lista completa de turnos activos futuros del recurso, si los hay. */
export function exigirSinTurnosActivosFuturos(turnos: readonly Turno[], ahora: Date): void {
  const violacion = evaluarDesactivacion(turnos, ahora);
  if (violacion !== null) throw new ReglaNegocioError(violacion);
}
