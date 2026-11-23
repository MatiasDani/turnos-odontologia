import type { Rol } from './actor.js';
import type { BloqueoHorario } from './bloqueo-horario.js';
import type { HorarioAtencion } from './horario-atencion.js';
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
  | 'RN-24'
  | 'RN-27';
export type RecursoBloqueado = 'profesional' | 'sillon';

/** Resultado de una regla pura que no se cumple. */
export interface Violacion {
  readonly codigo: CodigoRN;
  readonly turnoEnConflicto?: Turno;
  /** Todos los turnos que impiden desactivar un recurso, por `inicio` y luego `id` (RN-27). */
  readonly turnosEnConflicto?: readonly Turno[];
  readonly bloqueoEnConflicto?: BloqueoHorario;
  readonly recursoBloqueado?: RecursoBloqueado;
  /** Estado del turno que impide la transición pedida (RN-10). */
  readonly estadoActual?: EstadoTurno;
}

export class ReglaNegocioError extends Error {
  readonly codigo: CodigoRN;
  readonly turnoEnConflicto?: Turno;
  readonly turnosEnConflicto?: readonly Turno[];
  readonly bloqueoEnConflicto?: BloqueoHorario;
  readonly recursoBloqueado?: RecursoBloqueado;
  readonly estadoActual?: EstadoTurno;

  constructor(violacion: Violacion) {
    super(`Regla de negocio violada: ${violacion.codigo}`);
    this.name = 'ReglaNegocioError';
    this.codigo = violacion.codigo;
    if (violacion.turnoEnConflicto !== undefined) this.turnoEnConflicto = violacion.turnoEnConflicto;
    if (violacion.turnosEnConflicto !== undefined) this.turnosEnConflicto = violacion.turnosEnConflicto;
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

/**
 * Un rol sin permiso intentó una operación (C-05, DD-28). No es una regla de agenda: no amplía
 * `CodigoRN`. C-09 puede ampliarla.
 */
export class AccesoDenegadoError extends Error {
  readonly rol: Rol;
  readonly operacion: string;

  constructor(rol: Rol, operacion: string) {
    super(`Acceso denegado: el rol ${rol} no puede ${operacion}`);
    this.name = 'AccesoDenegadoError';
    this.rol = rol;
    this.operacion = operacion;
  }
}

export type CampoConfiguracion =
  | 'nombre'
  | 'apellido'
  | 'matricula'
  | 'prestacionIds'
  | 'duracionMinutos'
  | 'diaSemana'
  | 'desde'
  | 'hasta'
  | 'tramo';

/**
 * Dato de configuración inválido (RN-29, DD-27). Sin código RN: es validación de entrada, como
 * `ConsultaInvalidaError`. En un solapamiento de tramos informa el tramo en conflicto.
 */
export class ConfiguracionInvalidaError extends Error {
  readonly campo: CampoConfiguracion;
  readonly motivo: string;
  readonly tramoEnConflicto?: HorarioAtencion;

  constructor(campo: CampoConfiguracion, motivo: string, tramoEnConflicto?: HorarioAtencion) {
    super(`Configuración inválida (${campo}): ${motivo}`);
    this.name = 'ConfiguracionInvalidaError';
    this.campo = campo;
    this.motivo = motivo;
    if (tramoEnConflicto !== undefined) this.tramoEnConflicto = tramoEnConflicto;
  }
}
