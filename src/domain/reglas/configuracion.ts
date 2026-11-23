import type { CampoConfiguracion } from '../errores.js';
import type { HorarioAtencion } from '../horario-atencion.js';
import { aMinutos } from './horario.js';

/** Resultado de validar datos de configuración: el valor normalizado o el primer campo inválido. */
export type ResultadoConfiguracion<T> =
  | { readonly ok: true; readonly valor: T }
  | { readonly ok: false; readonly campo: CampoConfiguracion; readonly motivo: string };

const LONGITUD_MAXIMA = 80;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const invalido = (campo: CampoConfiguracion, motivo: string): ResultadoConfiguracion<never> => ({
  ok: false,
  campo,
  motivo,
});

/** RN-29: recorta los extremos; `null` si queda vacío o supera los 80 caracteres. */
export function normalizarNombre(valor: string): string | null {
  const recortado = valor.trim();
  return recortado.length === 0 || recortado.length > LONGITUD_MAXIMA ? null : recortado;
}

const MOTIVO_NOMBRE = `debe tener entre 1 y ${LONGITUD_MAXIMA} caracteres`;

export interface DatosProfesional {
  readonly nombre: string;
  readonly apellido: string;
  readonly matricula?: string | undefined;
  readonly prestacionIds: readonly string[];
}

/** RN-29: orden de comprobación nombre → apellido → matrícula → prestacionIds. */
export function validarProfesional(datos: DatosProfesional): ResultadoConfiguracion<DatosProfesional> {
  const nombre = normalizarNombre(datos.nombre);
  if (nombre === null) return invalido('nombre', MOTIVO_NOMBRE);
  const apellido = normalizarNombre(datos.apellido);
  if (apellido === null) return invalido('apellido', MOTIVO_NOMBRE);
  let matricula: string | undefined;
  if (datos.matricula !== undefined) {
    const normalizada = normalizarNombre(datos.matricula);
    if (normalizada === null) return invalido('matricula', MOTIVO_NOMBRE);
    matricula = normalizada;
  }
  if (new Set(datos.prestacionIds).size !== datos.prestacionIds.length) {
    return invalido('prestacionIds', 'no puede tener prestaciones repetidas');
  }
  return {
    ok: true,
    valor: {
      nombre,
      apellido,
      ...(matricula === undefined ? {} : { matricula }),
      prestacionIds: datos.prestacionIds,
    },
  };
}

export interface DatosSillon {
  readonly nombre: string;
}

export function validarSillon(datos: DatosSillon): ResultadoConfiguracion<DatosSillon> {
  const nombre = normalizarNombre(datos.nombre);
  return nombre === null ? invalido('nombre', MOTIVO_NOMBRE) : { ok: true, valor: { nombre } };
}

export interface DatosPrestacion {
  readonly nombre: string;
  readonly duracionMinutos: number;
}

/** RN-29: nombre y luego duración (entero > 0 y múltiplo de 5, misma condición que RN-06). */
export function validarPrestacion(datos: DatosPrestacion): ResultadoConfiguracion<DatosPrestacion> {
  const nombre = normalizarNombre(datos.nombre);
  if (nombre === null) return invalido('nombre', MOTIVO_NOMBRE);
  const { duracionMinutos } = datos;
  if (!Number.isInteger(duracionMinutos) || duracionMinutos <= 0 || duracionMinutos % 5 !== 0) {
    return invalido('duracionMinutos', 'debe ser un entero mayor a 0 y múltiplo de 5');
  }
  return { ok: true, valor: { nombre, duracionMinutos } };
}

export interface DatosTramo {
  readonly diaSemana: number;
  readonly desde: string;
  readonly hasta: string;
}

/** RN-29: orden diaSemana → desde → hasta; `desde >= hasta` se informa en `hasta`. */
export function validarTramo(datos: DatosTramo): ResultadoConfiguracion<DatosTramo> {
  const { diaSemana, desde, hasta } = datos;
  if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) {
    return invalido('diaSemana', 'debe ser un entero de 0 (domingo) a 6 (sábado)');
  }
  if (!HORA.test(desde)) return invalido('desde', 'debe tener formato HH:mm de 24 horas');
  if (!HORA.test(hasta)) return invalido('hasta', 'debe tener formato HH:mm de 24 horas');
  if (aMinutos(desde) >= aMinutos(hasta)) return invalido('hasta', 'debe ser posterior a desde');
  return { ok: true, valor: { diaSemana, desde, hasta } };
}

/**
 * RN-29, RN-05: primer tramo (por `desde`) del mismo día y del mismo ámbito (consultorio o mismo
 * profesional) que se solapa en intervalo semiabierto con el candidato. `excluirId` evita el choque
 * del tramo consigo mismo al modificarlo.
 */
export function tramoEnConflicto(
  tramo: DatosTramo & { readonly profesionalId?: string | undefined },
  existentes: readonly HorarioAtencion[],
  excluirId?: string,
): HorarioAtencion | undefined {
  const desde = aMinutos(tramo.desde);
  const hasta = aMinutos(tramo.hasta);
  return existentes
    .filter(
      (h) =>
        h.id !== excluirId &&
        h.diaSemana === tramo.diaSemana &&
        h.profesionalId === tramo.profesionalId &&
        desde < aMinutos(h.hasta) &&
        aMinutos(h.desde) < hasta,
    )
    .sort((a, b) => aMinutos(a.desde) - aMinutos(b.desde))[0];
}
