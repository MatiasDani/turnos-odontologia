import { CredencialesInvalidasError, SesionInvalidaError } from '../../application/errores-autenticacion.js';
import {
  AccesoDenegadoError,
  ConfiguracionInvalidaError,
  ConsultaInvalidaError,
  RecursoNoEncontradoError,
  ReglaNegocioError,
  type CodigoRN,
  type PacienteResumen,
} from '../../domain/errores.js';
import { ErrorMarcarRecordatorio } from '../../domain/errores-recordatorio.js';
import { ErrorEnlacePublico } from '../../application/errores-enlace-publico.js';
import { ErrorGestionTurnoPublica } from '../../application/errores-gestion-turno-publica.js';
import { ErrorReservaPublica } from '../../application/errores-reserva-publica.js';

export const MENSAJE_ERROR_INTERNO = 'Ocurrió un error. Probá de nuevo en unos minutos.';
export const MENSAJE_NO_ENCONTRADO = 'No encontramos lo que buscás.';

/** Estado HTTP fijo por código público (DD-29, D3). */
const ESTADO_POR_CODIGO: Readonly<Record<string, number>> = {
  DATOS_INVALIDOS: 400,
  ENLACE_INVALIDO: 404,
  HORARIO_NO_DISPONIBLE: 409,
  RESERVA_DUPLICADA: 409,
  RESERVA_EN_PASADO: 422,
  PRESTACION_NO_DISPONIBLE: 422,
  PROFESIONAL_NO_DISPONIBLE: 422,
  LIMITE_DE_TURNOS: 422,
  CONTACTAR_CONSULTORIO: 422,
  // C-09 (DD-37)
  CREDENCIALES_INVALIDAS: 401,
  SESION_INVALIDA: 401,
  ACCESO_DENEGADO: 403,
};

/** Mensaje fijo del acceso denegado: nunca expone el rol, la acción ni el recurso (RN-D-02). */
export const MENSAJE_ACCESO_DENEGADO = 'No tenés permiso para hacer esto.';

export interface CuerpoError {
  readonly error: {
    readonly codigo: string;
    readonly mensaje: string;
    readonly campos?: readonly string[];
    readonly nuevaOferta?: readonly { readonly inicio: string; readonly fin: string }[];
    /** Rutas internas (C-15): horario del turno o bloqueo en conflicto. */
    readonly conflicto?: { readonly inicio: string; readonly fin: string };
    /** Rutas internas (C-15, RN-35): el paciente que ya tiene el DNI. */
    readonly paciente?: PacienteResumen;
  };
}

/**
 * Mensajes fijos en español de cada regla, para las rutas internas de recepción (C-15, DD-41).
 * Las rutas públicas nunca llegan acá: traducen antes sus errores (RN-22).
 */
export const MENSAJES_RN: Readonly<Record<CodigoRN, string>> = {
  'RN-02': 'El profesional ya tiene un turno en ese horario.',
  'RN-03': 'El sillón ya está ocupado en ese horario.',
  'RN-06': 'La duración no es válida: tiene que ser un entero positivo múltiplo de 5 minutos.',
  'RN-07': 'El horario está fuera de la atención o hay un bloqueo.',
  'RN-08': 'El paciente solo puede cancelar o reprogramar con 24 h o más de anticipación.',
  'RN-10': 'El turno no está en un estado que permita esa acción.',
  'RN-16': 'Solo el personal del consultorio puede cambiar la duración del turno.',
  'RN-17': 'El turno tiene que entrar completo en un solo tramo de atención.',
  'RN-18': 'El profesional, el sillón o la prestación no están activos.',
  'RN-24': 'Todavía no empezó el turno: no se puede marcar atendido ni ausente.',
  'RN-27': 'No se puede desactivar: hay turnos futuros que lo usan.',
  'RN-31': 'No se puede bloquear: hay turnos en ese horario.',
  'RN-35': 'Ya existe un paciente con ese DNI.',
};

function errorDeRegla(error: ReglaNegocioError): RespuestaError {
  const conflicto = error.turnoEnConflicto ?? error.bloqueoEnConflicto;
  return {
    estado: 409,
    inesperado: false,
    cuerpo: {
      error: {
        codigo: error.codigo,
        mensaje: MENSAJES_RN[error.codigo],
        ...(conflicto === undefined ? {} : { conflicto: { inicio: conflicto.inicio.toISOString(), fin: conflicto.fin.toISOString() } }),
        ...(error.pacienteExistente === undefined ? {} : { paciente: error.pacienteExistente }),
      },
    },
  };
}

export interface RespuestaError {
  readonly estado: number;
  readonly cuerpo: CuerpoError;
  /** `true` si el error no es público y debe registrarse (con su traza, sin el pedido). */
  readonly inesperado: boolean;
}

function esErrorDeParseoDeFastify(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { code, statusCode } = error as { code?: unknown; statusCode?: unknown };
  return typeof code === 'string' && code.startsWith('FST_ERR_CTP') && typeof statusCode === 'number' && statusCode < 500;
}

/** Traduce cualquier error a la forma pública `{ error: { codigo, mensaje, ... } }` (RN-22). */
export function traducirError(error: unknown): RespuestaError {
  if (error instanceof ErrorReservaPublica) {
    return {
      estado: ESTADO_POR_CODIGO[error.codigo] ?? 500,
      inesperado: false,
      cuerpo: {
        error: {
          codigo: error.codigo,
          mensaje: error.message,
          ...(error.campos === undefined ? {} : { campos: error.campos }),
          ...(error.nuevaOferta === undefined
            ? {}
            : { nuevaOferta: error.nuevaOferta.map((h) => ({ inicio: h.inicio.toISOString(), fin: h.fin.toISOString() })) }),
        },
      },
    };
  }
  if (error instanceof ErrorGestionTurnoPublica) {
    return {
      estado: ESTADO_POR_CODIGO[error.codigo] ?? 500,
      inesperado: false,
      cuerpo: { error: { codigo: error.codigo, mensaje: error.message } },
    };
  }
  if (error instanceof ErrorEnlacePublico) {
    return {
      estado: ESTADO_POR_CODIGO['ENLACE_INVALIDO'] ?? 404,
      inesperado: false,
      cuerpo: { error: { codigo: error.codigo, mensaje: error.message } },
    };
  }
  if (error instanceof CredencialesInvalidasError || error instanceof SesionInvalidaError) {
    return { estado: 401, inesperado: false, cuerpo: { error: { codigo: error.codigo, mensaje: error.message } } };
  }
  if (error instanceof AccesoDenegadoError) {
    return { estado: 403, inesperado: false, cuerpo: { error: { codigo: 'ACCESO_DENEGADO', mensaje: MENSAJE_ACCESO_DENEGADO } } };
  }
  if (error instanceof ReglaNegocioError) return errorDeRegla(error);
  if (error instanceof ErrorMarcarRecordatorio) {
    const estado = error.codigo === 'RECORDATORIO_NO_ENCONTRADO' ? 404 : 409;
    return { estado, inesperado: false, cuerpo: { error: { codigo: error.codigo, mensaje: error.message } } };
  }
  if (error instanceof RecursoNoEncontradoError) {
    return { estado: 404, inesperado: false, cuerpo: { error: { codigo: 'NO_ENCONTRADO', mensaje: MENSAJE_NO_ENCONTRADO } } };
  }
  if (error instanceof ConfiguracionInvalidaError || error instanceof ConsultaInvalidaError) {
    const campos = error instanceof ConfiguracionInvalidaError ? error.campos : [error.campo];
    return traducirError(new ErrorReservaPublica('DATOS_INVALIDOS', { campos: [...campos] }));
  }
  if (esErrorDeParseoDeFastify(error)) {
    const publico = new ErrorReservaPublica('DATOS_INVALIDOS', { campos: ['pedido'] });
    return traducirError(publico);
  }
  return {
    estado: 500,
    inesperado: true,
    cuerpo: { error: { codigo: 'ERROR_INTERNO', mensaje: MENSAJE_ERROR_INTERNO } },
  };
}
