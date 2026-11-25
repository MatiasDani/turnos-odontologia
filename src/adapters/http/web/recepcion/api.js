// @ts-check
// Cliente `fetch` de la API interna (C-15, D5). Nunca lanza: devuelve `{ ok, ... }`. Agrega
// `Authorization: Bearer` y, ante un 401, borra la sesión y vuelve al login con el aviso de vencida.
import { borrarSesion, leerSesion } from './sesion.js';

const TIMEOUT_MS = 12_000;

/**
 * @typedef {{ codigo: string, mensaje?: string, campos?: string[], conflicto?: { inicio: string, fin: string }, turnos?: TurnoVista[], paciente?: PacienteResumen }} ErrorApi
 * @typedef {{ ok: false, red: boolean, estado: number, error: ErrorApi }} Fallo
 * @typedef {{ id: string, nombre: string, apellido: string }} Persona
 * @typedef {{ id: string, nombre: string }} Recurso
 * @typedef {{ id: string, estado: 'reservado' | 'confirmado' | 'cancelado' | 'ausente' | 'atendido', ocupa: boolean, origen: string, inicio: string, fin: string, duracionMinutos: number, paciente: Persona, prestacion: Recurso, profesional: Persona, sillon: Recurso }} TurnoVista
 * @typedef {{ id: string, inicio: string, fin: string, motivo?: string, profesional?: Persona, sillon?: Recurso }} BloqueoVista
 * @typedef {{ fecha: string, turnos: TurnoVista[], bloqueos: BloqueoVista[] }} DiaVista
 * @typedef {{ id: string, nombre: string, apellido: string, dni: string, telefono: string }} PacienteResumen
 * @typedef {{ consultorio: { nombre: string, zonaHoraria: string }, profesionales: Persona[], sillones: Recurso[], prestaciones: (Recurso & { duracionMinutos: number })[], horarios: { diaSemana: number, desde: string, hasta: string }[], usuario: { rol: 'administrador' | 'recepcion' | 'odontologo', profesionalId?: string } }} Catalogo
 * @typedef {{ inicio: string, fin: string, opciones: { profesionalId: string, sillonId: string }[] }} Hueco
 * @typedef {{ id: string, turnoId: string, enlaceWaMe: string, programadoPara: string, turno: TurnoVista | null }} PendienteWaMe
 */

/**
 * @template T
 * @param {string} metodo
 * @param {string} ruta
 * @param {unknown} [cuerpo]
 * @param {{ sinSesion?: boolean }} [opciones]
 * @returns {Promise<{ ok: true, datos: T } | Fallo>}
 */
export async function pedir(metodo, ruta, cuerpo, opciones = {}) {
  const sesion = leerSesion();
  const control = new AbortController();
  const reloj = window.setTimeout(() => control.abort(), TIMEOUT_MS);
  try {
    const respuesta = await fetch(ruta, {
      method: metodo,
      headers: {
        accept: 'application/json',
        ...(cuerpo === undefined ? {} : { 'content-type': 'application/json' }),
        ...(opciones.sinSesion || sesion === null ? {} : { authorization: `Bearer ${sesion.token}` }),
      },
      ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
      signal: control.signal,
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    /** @type {unknown} */
    let datos = null;
    try {
      datos = await respuesta.json();
    } catch {
      datos = null;
    }
    if (respuesta.ok) return { ok: true, datos: /** @type {T} */ (datos) };
    const cuerpoError = datos !== null && typeof datos === 'object' && 'error' in datos ? datos.error : undefined;
    const error = cuerpoError !== null && typeof cuerpoError === 'object' ? /** @type {ErrorApi} */ (cuerpoError) : { codigo: 'ERROR_INTERNO' };
    if (respuesta.status === 401 && !opciones.sinSesion) {
      borrarSesion();
      window.location.assign('/recepcion/login?vencida=1');
    }
    return { ok: false, red: false, estado: respuesta.status, error };
  } catch {
    return { ok: false, red: true, estado: 0, error: { codigo: 'RED' } };
  } finally {
    window.clearTimeout(reloj);
  }
}

/** @param {string} texto */
const q = (texto) => encodeURIComponent(texto);

export const api = {
  /** @param {string} email @param {string} clave */
  login: (email, clave) => pedir(/** @type {const} */ ('POST'), '/auth/login', { email, clave }, { sinSesion: true }),
  /** @returns {Promise<{ ok: true, datos: Catalogo } | Fallo>} */
  catalogo: () => pedir('GET', '/interno/catalogo'),
  /**
   * @param {{ fecha: string, vista: 'dia' | 'semana', profesionalId?: string, sillonId?: string }} c
   * @returns {Promise<{ ok: true, datos: DiaVista | { dias: DiaVista[] } } | Fallo>}
   */
  agenda: (c) =>
    pedir('GET', `/interno/agenda?fecha=${q(c.fecha)}&vista=${c.vista}${c.profesionalId ? `&profesionalId=${q(c.profesionalId)}` : ''}${c.sillonId ? `&sillonId=${q(c.sillonId)}` : ''}`),
  /** @param {string} prestacionId @param {string} fecha @param {string} [profesionalId] @returns {Promise<{ ok: true, datos: { horarios: Hueco[] } } | Fallo>} */
  disponibilidad: (prestacionId, fecha, profesionalId) =>
    pedir('GET', `/interno/disponibilidad?prestacionId=${q(prestacionId)}&fecha=${q(fecha)}${profesionalId ? `&profesionalId=${q(profesionalId)}` : ''}`),
  /** @param {string} texto @returns {Promise<{ ok: true, datos: { pacientes: PacienteResumen[], hayMas: boolean } } | Fallo>} */
  buscarPacientes: (texto) => pedir('GET', `/interno/pacientes?texto=${q(texto)}`),
  /** @param {string} id @returns {Promise<{ ok: true, datos: PacienteResumen } | Fallo>} */
  paciente: (id) => pedir('GET', `/interno/pacientes/${q(id)}`),
  /** @param {Record<string, unknown>} datos @returns {Promise<{ ok: true, datos: PacienteResumen } | Fallo>} */
  altaPaciente: (datos) => pedir('POST', '/interno/pacientes', datos),
  /** @param {Record<string, unknown>} datos @returns {Promise<{ ok: true, datos: TurnoVista } | Fallo>} */
  darTurno: (datos) => pedir('POST', '/interno/turnos', datos),
  /** @param {string} id @param {'cancelar' | 'confirmar' | 'atendido' | 'ausente'} accion @returns {Promise<{ ok: true, datos: TurnoVista } | Fallo>} */
  accion: (id, accion) => pedir('POST', `/interno/turnos/${q(id)}/${accion}`),
  /** @param {string} id @param {Record<string, unknown>} datos @returns {Promise<{ ok: true, datos: TurnoVista } | Fallo>} */
  reprogramar: (id, datos) => pedir('POST', `/interno/turnos/${q(id)}/reprogramar`, datos),
  /** @param {Record<string, unknown>} datos @returns {Promise<{ ok: true, datos: BloqueoVista } | Fallo>} */
  bloquear: (datos) => pedir('POST', '/interno/bloqueos', datos),
  /** @param {string} id */
  liberar: (id) => pedir('POST', `/interno/bloqueos/${q(id)}/liberar`),
  /** @returns {Promise<{ ok: true, datos: { recordatorios: PendienteWaMe[] } } | Fallo>} */
  pendientesWaMe: () => pedir('GET', '/interno/recordatorios/wa-me'),
  /** @param {string} id */
  marcarEnviado: (id) => pedir('POST', `/interno/recordatorios/${q(id)}/enviado`),
};

/**
 * Mensaje en español de un fallo de la API para mostrar junto a la acción.
 * @param {Fallo} fallo
 */
export function mensajeDeFallo(fallo) {
  if (fallo.red) return 'No pudimos conectarnos. Revisá la conexión y probá de nuevo.';
  if (fallo.estado === 403) return 'No tenés permiso para hacer esto.';
  if (fallo.error.codigo === 'DATOS_INVALIDOS') return 'Revisá los datos marcados.';
  return fallo.error.mensaje ?? 'Ocurrió un error. Probá de nuevo en unos minutos.';
}
