import { CredencialesInvalidasError, SesionInvalidaError } from '../../application/errores-autenticacion.js';
import { AccesoDenegadoError } from '../../domain/errores.js';
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
