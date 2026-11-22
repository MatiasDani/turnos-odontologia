import type { BloqueoHorario } from './bloqueo-horario.js';
import type { EstadoTurno, Turno } from './turno.js';

export type CodigoRN =
  | 'RN-02'
  | 'RN-03'
  | 'RN-06'
  | 'RN-07'
  | 'RN-08'
  | 'RN-10'
  | 'RN-16'
  | 'RN-17'
  | 'RN-18'
  | 'RN-24';
export type RecursoBloqueado = 'profesional' | 'sillon';

/** Resultado de una regla pura que no se cumple. */
export interface Violacion {
  readonly codigo: CodigoRN;
  readonly turnoEnConflicto?: Turno;
  readonly bloqueoEnConflicto?: BloqueoHorario;
  readonly recursoBloqueado?: RecursoBloqueado;
  /** Estado del turno que impide la transición pedida (RN-10). */
  readonly estadoActual?: EstadoTurno;
}

export class ReglaNegocioError extends Error {
  readonly codigo: CodigoRN;
  readonly turnoEnConflicto?: Turno;
  readonly bloqueoEnConflicto?: BloqueoHorario;
  readonly recursoBloqueado?: RecursoBloqueado;
  readonly estadoActual?: EstadoTurno;

  constructor(violacion: Violacion) {
    super(`Regla de negocio violada: ${violacion.codigo}`);
    this.name = 'ReglaNegocioError';
    this.codigo = violacion.codigo;
    if (violacion.turnoEnConflicto !== undefined) this.turnoEnConflicto = violacion.turnoEnConflicto;
    if (violacion.bloqueoEnConflicto !== undefined) this.bloqueoEnConflicto = violacion.bloqueoEnConflicto;
    if (violacion.recursoBloqueado !== undefined) this.recursoBloqueado = violacion.recursoBloqueado;
    if (violacion.estadoActual !== undefined) this.estadoActual = violacion.estadoActual;
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

/**
 * Consulta de disponibilidad mal formada (límites de entrada, RN-13). No es una regla de agenda,
 * por eso no amplía `CodigoRN`.
 */
export class ConsultaInvalidaError extends Error {
  readonly campo: 'rango' | 'paso';
  readonly motivo: string;

  constructor(campo: 'rango' | 'paso', motivo: string) {
    super(`Consulta inválida (${campo}): ${motivo}`);
    this.name = 'ConsultaInvalidaError';
    this.campo = campo;
    this.motivo = motivo;
  }
}
