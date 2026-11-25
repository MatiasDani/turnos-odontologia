// @ts-check
// Formato de fechas y horas en la zona del consultorio (C-15). Los instantes llegan en ISO UTC.

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * Hora local `HH:mm` de un instante.
 * @param {string} iso
 * @param {string} zona
 */
export function hora(iso, zona) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: zona, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}

/**
 * Minutos desde medianoche local de un instante.
 * @param {string} iso
 * @param {string} zona
 */
export function minutosLocales(iso, zona) {
  const [hh = 0, mm = 0] = hora(iso, zona).split(':').map(Number);
  return hh * 60 + mm;
}

/**
 * Fecha local `YYYY-MM-DD` de un instante.
 * @param {Date} instante
 * @param {string} zona
 */
export function fechaLocal(instante, zona) {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instante);
  const v = (/** @type {string} */ t) => partes.find((p) => p.type === t)?.value ?? '';
  return `${v('year')}-${v('month')}-${v('day')}`;
}

/** @param {string} fecha `YYYY-MM-DD` */
function utc(fecha) {
  return new Date(`${fecha}T12:00:00Z`);
}

/** @param {string} fecha @param {number} dias */
export function sumarDias(fecha, dias) {
  const d = utc(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** @param {string} fecha */
export function diaSemana(fecha) {
  return utc(fecha).getUTCDay();
}

/** Lunes de la semana de `fecha`. @param {string} fecha */
export function lunesDe(fecha) {
  return sumarDias(fecha, -((diaSemana(fecha) + 6) % 7));
}

/** "Martes 24 de noviembre". @param {string} fecha */
export function fechaLarga(fecha) {
  const d = utc(fecha);
  const dia = DIAS[d.getUTCDay()] ?? '';
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

/** "noviembre". @param {string} fecha */
export function nombreMes(fecha) {
  return MESES[utc(fecha).getUTCMonth()] ?? '';
}

/** "Mar 24". @param {string} fecha */
export function fechaCorta(fecha) {
  const d = utc(fecha);
  return `${DIAS_CORTOS[d.getUTCDay()]} ${d.getUTCDate()}`;
}

/** "24/11/2026". @param {string} fecha */
export function fechaNumerica(fecha) {
  const [a, m, d] = fecha.split('-');
  return `${d}/${m}/${a}`;
}

/** @param {string} hhmm */
export function aMinutos(hhmm) {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** @param {number} minutos */
export function aHHMM(minutos) {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

/**
 * ISO con el desfase de la zona del consultorio para un día y hora local (Argentina no tiene horario
 * de verano: el desfase se calcula una vez por fecha).
 * @param {string} fecha
 * @param {string} hhmm
 * @param {string} zona
 */
export function instanteLocal(fecha, hhmm, zona) {
  const pared = new Date(`${fecha}T${hhmm}:00Z`);
  const comoLocal = new Date(`${fechaLocal(pared, zona)}T${hora(pared.toISOString(), zona)}:00Z`);
  const desfase = comoLocal.getTime() - pared.getTime();
  return new Date(pared.getTime() - desfase).toISOString();
}

export const ESTADOS = /** @type {const} */ ({
  reservado: { texto: 'Reservado', icono: 'i-res' },
  confirmado: { texto: 'Confirmado', icono: 'i-check' },
  atendido: { texto: 'Atendido', icono: 'i-dot' },
  ausente: { texto: 'Ausente', icono: 'i-alert' },
  cancelado: { texto: 'Cancelado', icono: 'i-x' },
});
