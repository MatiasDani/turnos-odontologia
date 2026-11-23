// @ts-check
// Cliente `fetch` de la API pública (D10). Nunca lanza: devuelve `{ ok, ... }`. El token solo viaja
// como argumento y en la ruta; no se guarda en ningún almacenamiento.

const TIMEOUT_MS = 12_000;

/**
 * @typedef {{ nombre: string, zonaHoraria: string }} ConsultorioPublico
 * @typedef {{ desde: string, hasta: string }} DiasReservables
 * @typedef {{ id: string, nombre: string, duracionMinutos: number }} Prestacion
 * @typedef {{ consultorio: ConsultorioPublico, diasReservables: DiasReservables, prestaciones: Prestacion[] }} Catalogo
 * @typedef {{ id: string, nombre: string, apellido: string }} Profesional
 * @typedef {{ inicio: string, fin: string }} Horario
 * @typedef {{ fecha: string, zonaHoraria: string, horarios: Horario[] }} Disponibilidad
 * @typedef {{ inicio: string, fin: string, prestacion: { nombre: string }, profesional: { nombre: string, apellido: string } }} TurnoPublico
 * @typedef {TurnoPublico & { token: string }} Reserva
 * @typedef {TurnoPublico & { asistenciaConfirmada: boolean, gestionOnline: boolean, consultorio: { nombre: string, telefono: string, email: string, zonaHoraria: string }, diasReservables: DiasReservables }} VistaTurno
 * @typedef {{ codigo: string, campos?: string[], nuevaOferta?: Horario[] }} ErrorApi
 * @typedef {{ ok: true, datos: any }} Exito
 * @typedef {{ ok: false, red: boolean, estado: number, error: ErrorApi }} Fallo
 */

/**
 * @param {string} metodo
 * @param {string} ruta
 * @param {unknown} [cuerpo]
 * @returns {Promise<Exito | Fallo>}
 */
async function pedir(metodo, ruta, cuerpo) {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), TIMEOUT_MS);
  try {
    const respuesta = await fetch(ruta, {
      method: metodo,
      headers: {
        accept: 'application/json',
        ...(cuerpo === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
      signal: control.signal,
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    /** @type {any} */
    let datos = null;
    try {
      datos = await respuesta.json();
    } catch {
      datos = null;
    }
    if (respuesta.ok) return { ok: true, datos };
    const error = datos && typeof datos === 'object' && datos.error ? datos.error : { codigo: 'ERROR_INTERNO' };
    return { ok: false, red: false, estado: respuesta.status, error };
  } catch {
    return { ok: false, red: true, estado: 0, error: { codigo: 'RED' } };
  } finally {
    clearTimeout(reloj);
  }
}

const e = encodeURIComponent;

export const api = {
  /** @returns {Promise<{ ok: true, datos: Catalogo } | Fallo>} */
  catalogo: () => pedir('GET', '/public/prestaciones'),
  /** @param {string} prestacionId @returns {Promise<{ ok: true, datos: { profesionales: Profesional[] } } | Fallo>} */
  profesionales: (prestacionId) => pedir('GET', `/public/prestaciones/${e(prestacionId)}/profesionales`),
  /**
   * @param {{ prestacionId: string, fecha: string, profesionalId?: string }} consulta
   * @returns {Promise<{ ok: true, datos: Disponibilidad } | Fallo>}
   */
  disponibilidad: ({ prestacionId, fecha, profesionalId }) =>
    pedir(
      'GET',
      `/public/disponibilidad?prestacionId=${e(prestacionId)}&fecha=${e(fecha)}${profesionalId ? `&profesionalId=${e(profesionalId)}` : ''}`,
    ),
  /** @param {unknown} pedido @returns {Promise<{ ok: true, datos: Reserva } | Fallo>} */
  reservar: (pedido) => pedir('POST', '/public/reservas', pedido),
  /** @param {string} token @returns {Promise<{ ok: true, datos: VistaTurno } | Fallo>} */
  turno: (token) => pedir('GET', `/public/turnos/${e(token)}`),
  /** @param {string} token @returns {Promise<{ ok: true, datos: { asistenciaConfirmada: boolean, inicio: string, fin: string } } | Fallo>} */
  confirmar: (token) => pedir('POST', `/public/turnos/${e(token)}/confirmar`),
  /** @param {string} token @returns {Promise<{ ok: true, datos: TurnoPublico } | Fallo>} */
  cancelar: (token) => pedir('POST', `/public/turnos/${e(token)}/cancelar`),
  /** @param {string} token @param {string} fecha @returns {Promise<{ ok: true, datos: Disponibilidad } | Fallo>} */
  disponibilidadParaReprogramar: (token, fecha) =>
    pedir('GET', `/public/turnos/${e(token)}/disponibilidad?fecha=${e(fecha)}`),
  /** @param {string} token @param {string} inicio @returns {Promise<{ ok: true, datos: TurnoPublico } | Fallo>} */
  reprogramar: (token, inicio) => pedir('POST', `/public/turnos/${e(token)}/reprogramar`, { inicio }),
};
