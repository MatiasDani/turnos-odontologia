// @ts-check
// Formato de fechas y horas del paciente en la zona del consultorio (DD-09). Sin dependencias.

/**
 * @param {Date} fecha
 * @param {string} zona
 * @param {Intl.DateTimeFormatOptions} opciones
 * @returns {Record<string, string>}
 */
function partes(fecha, zona, opciones) {
  /** @type {Record<string, string>} */
  const resultado = {};
  for (const p of new Intl.DateTimeFormat('es-AR', { timeZone: zona, hourCycle: 'h23', ...opciones }).formatToParts(fecha)) {
    resultado[p.type] = p.value;
  }
  return resultado;
}

/** @param {string} texto */
export function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * @param {string} semana "lunes"
 * @param {string} dia "23"
 * @param {string} mes "noviembre"
 */
function componerFecha(semana, dia, mes) {
  return `${semana} ${dia} de ${mes}`;
}

/**
 * Hora local "11:00" de un instante ISO 8601.
 * @param {string} instante
 * @param {string} zona zona IANA del consultorio
 * @returns {string}
 */
export function hora(instante, zona) {
  const p = partes(new Date(instante), zona, { hour: '2-digit', minute: '2-digit' });
  return `${p['hour']}:${p['minute']}`;
}

/**
 * Hora local como número (0 a 23) de un instante ISO 8601.
 * @param {string} instante
 * @param {string} zona
 * @returns {number}
 */
export function horaEntera(instante, zona) {
  return Number(partes(new Date(instante), zona, { hour: '2-digit' })['hour']);
}

/**
 * "lunes 23 de noviembre" en la zona del consultorio.
 * @param {string} instante ISO 8601
 * @param {string} zona
 * @returns {string}
 */
export function fechaLarga(instante, zona) {
  const p = partes(new Date(instante), zona, { weekday: 'long', day: 'numeric', month: 'long' });
  return componerFecha(p['weekday'] ?? '', p['day'] ?? '', p['month'] ?? '');
}

/**
 * Fecha local 'AAAA-MM-DD' de un instante en la zona.
 * @param {string} instante ISO 8601
 * @param {string} zona
 * @returns {string}
 */
export function fechaIso(instante, zona) {
  const p = partes(new Date(instante), zona, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${p['year']}-${p['month']}-${p['day']}`;
}

/**
 * Suma días a una fecha 'AAAA-MM-DD' (calendario).
 * @param {string} fecha
 * @param {number} dias
 * @returns {string}
 */
export function sumarDias(fecha, dias) {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a ?? 0, (m ?? 1) - 1, (d ?? 1) + dias)).toISOString().slice(0, 10);
}

/**
 * Lista de días 'AAAA-MM-DD' de `desde` a `hasta` inclusive (máximo 40).
 * @param {string} desde
 * @param {string} hasta
 * @returns {string[]}
 */
export function listarDias(desde, hasta) {
  /** @type {string[]} */
  const dias = [];
  for (let d = desde; d <= hasta && dias.length < 40; d = sumarDias(d, 1)) dias.push(d);
  return dias;
}

/**
 * Partes de una fecha 'AAAA-MM-DD' (día de calendario, sin zona) para mostrar.
 * @param {string} fecha
 * @returns {{ semana: string, numero: string, mes: string, larga: string, corta: string }}
 */
export function partesDeDia(fecha) {
  const instante = new Date(`${fecha}T12:00:00Z`);
  const largo = partes(instante, 'UTC', { weekday: 'long', day: 'numeric', month: 'long' });
  const breve = partes(instante, 'UTC', { weekday: 'short', month: 'short', day: '2-digit' });
  const numerico = partes(instante, 'UTC', { month: '2-digit' });
  return {
    semana: (breve['weekday'] ?? '').replace('.', ''),
    numero: largo['day'] ?? '',
    mes: (breve['month'] ?? '').replace('.', ''),
    larga: componerFecha(largo['weekday'] ?? '', largo['day'] ?? '', largo['month'] ?? ''),
    corta: `${capitalizar((breve['weekday'] ?? '').replace('.', ''))} ${breve['day']}/${numerico['month']}`,
  };
}

/**
 * Nombre completo "Ana Ejemplo".
 * @param {{ nombre: string, apellido: string }} persona
 */
export function nombreCompleto(persona) {
  return `${persona.nombre} ${persona.apellido}`;
}
