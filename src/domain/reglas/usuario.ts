import type { Rol, RolInterno } from '../actor.js';
import type { ResultadoConfiguracion } from './configuracion.js';

/** RN-32: largo de la clave de un usuario interno, ambos inclusive. */
export const CLAVE_MINIMA = 10;
export const CLAVE_MAXIMA = 128;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@.][^\s@]*$/;

/** E-mail recortado y en minúsculas, o `null` si no tiene la forma `algo@dominio.tld` (DD-35). */
export function normalizarEmail(valor: string): string | null {
  const normalizado = valor.trim().toLowerCase();
  return EMAIL.test(normalizado) ? normalizado : null;
}

/** RN-32: la clave tiene entre 10 y 128 caracteres. El motivo nunca repite la clave (RN-D-03). */
export function validarClave(clave: string): ResultadoConfiguracion<string> {
  if (clave.length < CLAVE_MINIMA || clave.length > CLAVE_MAXIMA) {
    return { ok: false, campo: 'clave', motivo: `debe tener entre ${CLAVE_MINIMA} y ${CLAVE_MAXIMA} caracteres` };
  }
  return { ok: true, valor: clave };
}

export interface DatosUsuario {
  readonly email: string;
  readonly rol: Rol;
  readonly profesionalId?: string | undefined;
  readonly clave: string;
}

export interface DatosUsuarioValidos {
  readonly email: string;
  readonly rol: RolInterno;
  readonly profesionalId?: string;
  readonly clave: string;
}

/**
 * Valida un alta de usuario (DD-35) y devuelve el primer campo inválido en este orden: `rol`,
 * `profesionalId`, `email`, `clave`. Pura: la existencia del profesional y la unicidad del
 * e-mail las verifica el caso de uso.
 */
export function validarDatosUsuario(datos: DatosUsuario): ResultadoConfiguracion<DatosUsuarioValidos> {
  const { rol, profesionalId } = datos;
  if (rol === 'paciente') {
    return { ok: false, campo: 'rol', motivo: 'el paciente no tiene usuario: opera con el token de su turno' };
  }
  if (rol === 'odontologo' && (profesionalId === undefined || profesionalId.trim() === '')) {
    return { ok: false, campo: 'profesionalId', motivo: 'el odontólogo debe estar vinculado a un profesional' };
  }
  if (rol !== 'odontologo' && profesionalId !== undefined) {
    return { ok: false, campo: 'profesionalId', motivo: 'solo el odontólogo se vincula a un profesional' };
  }
  const email = normalizarEmail(datos.email);
  if (email === null) return { ok: false, campo: 'email', motivo: 'debe tener la forma nombre@dominio' };
  const clave = validarClave(datos.clave);
  if (!clave.ok) return clave;
  return {
    ok: true,
    valor: { email, rol, ...(rol === 'odontologo' && profesionalId !== undefined ? { profesionalId } : {}), clave: datos.clave },
  };
}
