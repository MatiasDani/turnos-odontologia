// @ts-check
// Grilla de la agenda (C-15): filas de 15 minutos dentro del horario de atención, una columna por
// sillón, profesional o día. Cada turno es un botón con nombre accesible; los bloqueos, notas.
import { h, icono } from './dom.js';
import { aHHMM, aMinutos, ESTADOS, hora, minutosLocales } from './formato.js';

const PASO = 15;

/**
 * @typedef {import('./api.js').TurnoVista} TurnoVista
 * @typedef {import('./api.js').BloqueoVista} BloqueoVista
 * @typedef {{ titulo: string, subtitulo: string, hoy: boolean, turnos: TurnoVista[], bloqueos: BloqueoVista[], tramos: { desde: string, hasta: string }[] }} Columna
 */

/**
 * Nombre accesible de un turno: "09:00, Carla Prueba, Consulta/control, Confirmado".
 * @param {TurnoVista} t
 * @param {string} zona
 */
export function nombreTurno(t, zona) {
  return `${hora(t.inicio, zona)}, ${t.paciente.nombre} ${t.paciente.apellido}, ${t.prestacion.nombre}, ${ESTADOS[t.estado].texto}`;
}

/**
 * @param {{ columnas: Columna[], zona: string, etiqueta: string, inicio: number, fin: number, detalleColumna: 'profesional' | 'sillon' | 'ambos', seleccionado?: string, onTurno: (t: TurnoVista) => void, onBloqueo: (b: BloqueoVista) => void }} p
 */
export function dibujarGrilla(p) {
  const filas = Math.max(1, Math.ceil((p.fin - p.inicio) / PASO));
  const fila = (/** @type {number} */ minutos) => Math.max(1, Math.floor((minutos - p.inicio) / PASO) + 1);
  const horas = [];
  for (let m = p.inicio; m < p.fin; m += 30) horas.push(h('span', { style: { 'grid-row': 'span 2' }, text: aHHMM(m) }));
  const agenda = h(
    'div',
    { class: 'agenda', style: { '--cols': String(p.columnas.length), '--rows': String(filas), '--slot': '17px' } },
    h('div', { class: 'ag-head', text: 'Hora' }),
    ...p.columnas.map((c) => h('div', { class: `ag-head${c.hoy ? ' is-today' : ''}` }, c.titulo, h('small', { text: c.subtitulo }))),
    h('div', { class: 'ag-times', style: { 'grid-template-rows': `repeat(${filas}, 17px)` } }, ...horas),
    ...p.columnas.map((c) => columna(c)),
  );
  return h('div', { class: 'agenda-wrap', role: 'region', 'aria-label': p.etiqueta, tabindex: 0 }, agenda);

  /** @param {Columna} c */
  function columna(c) {
    const partes = [];
    // Fuera de horario: lo que no cubren los tramos del día.
    const tramos = c.tramos.map((t) => [aMinutos(t.desde), aMinutos(t.hasta)]).sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
    let cursor = p.inicio;
    for (const [desde = 0, hasta = 0] of [...tramos, [p.fin, p.fin]]) {
      if (desde > cursor) partes.push(h('div', { class: 'closed', style: { '--s': String(fila(cursor)), '--n': String(Math.max(1, (desde - cursor) / PASO)) }, text: 'Fuera de horario' }));
      cursor = Math.max(cursor, hasta);
    }
    for (const b of c.bloqueos) {
      const ini = Math.max(p.inicio, minutosLocales(b.inicio, p.zona));
      const finB = Math.min(p.fin, minutosLocales(b.fin, p.zona) || p.fin);
      const quien = b.profesional ? `${b.profesional.nombre} ${b.profesional.apellido}` : b.sillon?.nombre ?? '';
      partes.push(
        h(
          'button',
          {
            class: 'cell-block',
            type: 'button',
            style: { '--s': String(fila(ini)), '--n': String(Math.max(1, Math.ceil((finB - ini) / PASO))) },
            'aria-label': `Bloqueado de ${hora(b.inicio, p.zona)} a ${hora(b.fin, p.zona)}${b.motivo ? `, ${b.motivo}` : ''}${quien ? `, ${quien}` : ''}`,
            onclick: () => p.onBloqueo(b),
          },
          h('b', { text: 'Bloqueado' }),
          ` · ${hora(b.inicio, p.zona)} a ${hora(b.fin, p.zona)}`,
          h('br'),
          [b.motivo, quien].filter(Boolean).join(' · '),
        ),
      );
    }
    for (const t of c.turnos.filter((x) => x.ocupa)) {
      const ini = minutosLocales(t.inicio, p.zona);
      const n = Math.max(1, Math.round(t.duracionMinutos / PASO));
      const estado = ESTADOS[t.estado];
      const st = h('span', { class: 'st' }, icono(estado.icono, ''), estado.texto);
      const otro = p.detalleColumna === 'profesional' ? t.sillon.nombre : p.detalleColumna === 'sillon' ? `${t.profesional.nombre} ${t.profesional.apellido}` : t.sillon.nombre;
      const detalle = `${t.prestacion.nombre} · ${hora(t.inicio, p.zona)} a ${hora(t.fin, p.zona)} · ${otro}`;
      const compacto = n <= 3;
      partes.push(
        h(
          'button',
          {
            class: `cell-appt ${t.estado}${compacto ? ' compact' : ''}${p.seleccionado === t.id ? ' is-selected' : ''}`,
            type: 'button',
            style: { '--s': String(fila(ini)), '--n': String(n) },
            'aria-label': nombreTurno(t, p.zona),
            title: detalle,
            'data-turno': t.id,
            onclick: () => p.onTurno(t),
          },
          compacto
            ? [h('span', { class: 'top' }, h('b', { text: `${t.paciente.nombre} ${t.paciente.apellido}` }), st), n === 3 ? h('span', { text: detalle }) : null]
            : [h('b', { text: `${t.paciente.nombre} ${t.paciente.apellido}` }), h('span', { text: detalle }), st],
        ),
      );
    }
    return h('div', { class: 'ag-col' }, ...partes);
  }
}

export function leyenda() {
  return h(
    'div',
    { class: 'legend' },
    h('span', { class: 'muted', text: 'Estados:' }),
    ...['reservado', 'confirmado', 'atendido', 'ausente'].map((e) => {
      const estado = ESTADOS[/** @type {keyof typeof ESTADOS} */ (e)];
      return h('span', { class: `badge b-${e}` }, icono(estado.icono, ''), estado.texto);
    }),
    h('span', { class: 'muted', text: '· Rayado: bloqueado o fuera de horario' }),
  );
}
