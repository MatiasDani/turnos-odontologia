import type { BloqueoHorario } from './bloqueo-horario.js';
import type { Turno } from './turno.js';

export type CodigoRN = 'RN-02' | 'RN-03' | 'RN-06' | 'RN-07' | 'RN-16' | 'RN-17' | 'RN-18';
export type RecursoBloqueado = 'profesional' | 'sillon';

/** Resultado de una regla pura que no se cumple. */
export interface Violacion {
  readonly codigo: CodigoRN;
  readonly turnoEnConflicto?: Turno;
  readonly bloqueoEnConflicto?: BloqueoHorario;
  readonly recursoBloqueado?: RecursoBloqueado;
}

export class ReglaNegocioError extends Error {
  readonly codigo: CodigoRN;
  readonly turnoEnConflicto?: Turno;
  readonly bloqueoEnConflicto?: BloqueoHorario;
  readonly recursoBloqueado?: RecursoBloqueado;

  constructor(violacion: Violacion) {
    super(`Regla de negocio violada: ${violacion.codigo}`);
    this.name = 'ReglaNegocioError';
    this.codigo = violacion.codigo;
    if (violacion.turnoEnConflicto !== undefined) this.turnoEnConflicto = violacion.turnoEnConflicto;
    if (violacion.bloqueoEnConflicto !== undefined) this.bloqueoEnConflicto = violacion.bloqueoEnConflicto;
    if (violacion.recursoBloqueado !== undefined) this.recursoBloqueado = violacion.recursoBloqueado;
  }
}

export class RecursoNoEncontradoError extends Error {
  readonly tipo: string;
  readonly id: string;

  constructor(tipo: string, id: string) {
    super(`Recurso no encontrado: ${tipo} ${id}`);
    this.name = 'RecursoNoEncontradoError';
    this.tipo = tipo;
    this.id = id;
  }
}
