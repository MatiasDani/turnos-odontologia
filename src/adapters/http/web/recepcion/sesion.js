// @ts-check
// Sesión del personal en la pestaña (DD-38): solo `sessionStorage`, nunca `localStorage` ni la URL.
// Si el almacenamiento no está disponible, la sesión vive solo en memoria.

const CLAVE = 'turnos.recepcion.sesion';

/**
 * @typedef {{ id: string, email: string, rol: 'administrador' | 'recepcion' | 'odontologo', profesionalId?: string, venceEn: string }} UsuarioSesion
 * @typedef {{ token: string, usuario: UsuarioSesion }} Sesion
 */

/** @type {Sesion | null} */
let enMemoria = null;

/** @returns {Sesion | null} */
export function leerSesion() {
  try {
    const texto = window.sessionStorage.getItem(CLAVE);
    if (texto !== null) return /** @type {Sesion} */ (JSON.parse(texto));
  } catch {
    // Sin storage: se usa la copia en memoria.
  }
  return enMemoria;
}

/** @param {Sesion} sesion */
export function guardarSesion(sesion) {
  enMemoria = sesion;
  try {
    window.sessionStorage.setItem(CLAVE, JSON.stringify(sesion));
  } catch {
    // Sin storage: queda solo en memoria.
  }
}

export function borrarSesion() {
  enMemoria = null;
  try {
    window.sessionStorage.removeItem(CLAVE);
  } catch {
    // Nada que borrar.
  }
}
