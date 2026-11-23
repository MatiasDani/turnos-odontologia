// @ts-check
// Formato de fechas y horas del paciente en la zona del consultorio (DD-09). Sin dependencias.

/**
 * @param {string} instante ISO 8601
 * @param {string} zona zona IANA del consultorio
 * @returns {string} "11:00"
 */
export function hora(instante, zona) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: zona, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    new Date(instante),
  );
}

/**
 * @param {string} instante ISO 8601
 * @param {string} zona
 * @returns {string} "lunes 23 de noviembre"
 */
export function fechaLarga(instante, zona) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: zona, weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(instante),
  );
}

/**
 * Fecha local 'AAAA-MM-DD' de un instante en la zona.
 * @param {string} instante ISO 8601
 * @param {string} zona
 * @returns {string}
 */
export function fechaIso(instante, zona) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(instante),
  );
}

/**
 * Suma días a una fecha 'AAAA-MM-DD' (calendario).
 * @param {string} fecha
 * @param {number} dias
 * @returns {string}
 */
export function sumarDias(fecha, dias) {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(/** @type {number} */ (a), /** @type {number} */ (m) - 1, /** @type {number} */ (d) + dias))
    .toISOString()
    .slice(0, 10);
}

/**
 * Lista de días 'AAAA-MM-DD' de `desde` a `hasta` inclusive.
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
 * Partes de una fecha 'AAAA-MM-DD' para mostrar en el selector de días.
 * @param {string} fecha
 * @returns {{ semana: string, numero: string, mes: string, larga: string }}
 */
export function partesDeDia(fecha) {
  const instante = new Date(`${fecha}T12:00:00Z`);
  const f = (/** @type {Intl.DateTimeFormatOptions} */ o) => new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', ...o }).format(instante);
  return {
    semana: f({ weekday: 'short' }).replace('.', ''),
    numero: f({ day: 'numeric' }),
    mes: f({ month: 'short' }).replace('.', ''),
    larga: f({ weekday: 'long', day: 'numeric', month: 'long' }),
  };
}
