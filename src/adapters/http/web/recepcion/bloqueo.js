// @ts-check
// Bloquear y liberar horarios (C-15, C-06). Con turnos en el intervalo, se listan y no se bloquea (RN-31).
import { api, mensajeDeFallo } from './api.js';
import { abrirDialogo, alertaError, avisar, h } from './dom.js';
import { hora, instanteLocal } from './formato.js';

/** @typedef {import('./agenda.js').Contexto} Contexto */

/** @param {Contexto} ctx */
export function abrirBloqueo(ctx) {
  const odontologo = ctx.rol === 'odontologo';
  let tipo = /** @type {'profesional' | 'sillon'} */ ('profesional');
  const recurso = h('select', { id: 'b-recurso', class: 'select' });
  const llenarRecursos = () => {
    const opciones =
      tipo === 'profesional'
        ? ctx.catalogo.profesionales.filter((p) => !odontologo || p.id === ctx.profesionalPropio).map((p) => h('option', { value: p.id, text: `${p.nombre} ${p.apellido}` }))
        : ctx.catalogo.sillones.map((s) => h('option', { value: s.id, text: s.nombre }));
    recurso.replaceChildren(...opciones);
  };
  const botonTipo = (/** @type {'profesional' | 'sillon'} */ valor, /** @type {string} */ texto) =>
    h('button', {
      type: 'button',
      role: 'radio',
      'aria-checked': String(valor === tipo),
      'aria-pressed': String(valor === tipo),
      text: texto,
      onclick: (/** @type {Event} */ ev) => {
        tipo = valor;
        const grupo = /** @type {HTMLElement} */ (ev.currentTarget).parentElement;
        grupo?.querySelectorAll('button').forEach((b) => {
          const activo = b === ev.currentTarget;
          b.setAttribute('aria-checked', String(activo));
          b.setAttribute('aria-pressed', String(activo));
        });
        llenarRecursos();
      },
    });
  llenarRecursos();
  const fecha = h('input', { id: 'b-fecha', class: 'input mono', type: 'date', value: ctx.fecha() });
  const desde = h('input', { id: 'b-desde', class: 'input mono', type: 'time', value: '09:00', step: '900' });
  const hasta = h('input', { id: 'b-hasta', class: 'input mono', type: 'time', value: '10:00', step: '900' });
  const motivo = h('input', { id: 'b-motivo', class: 'input', maxlength: '120' });
  const errores = h('div', { 'aria-live': 'polite' });
  const { cerrar } = abrirDialogo({
    titulo: 'Bloquear horario',
    subtitulo: 'Licencias, capacitaciones o mantenimiento. Nadie puede dar turnos encima.',
    cuerpo: [
      odontologo ? null : h('div', { class: 'field' }, h('span', { class: 'label', text: 'Qué se bloquea' }), h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Qué se bloquea' }, botonTipo('profesional', 'Un profesional'), botonTipo('sillon', 'Un sillón'))),
      h(
        'div',
        { class: 'grid2' },
        h('div', { class: 'field' }, h('label', { for: 'b-recurso', text: 'Profesional o sillón' }), recurso),
        h('div', { class: 'field' }, h('label', { for: 'b-fecha', text: 'Fecha' }), fecha),
        h('div', { class: 'field' }, h('label', { for: 'b-desde', text: 'Desde' }), desde),
        h('div', { class: 'field' }, h('label', { for: 'b-hasta', text: 'Hasta' }), hasta),
        h('div', { class: 'field', style: { 'grid-column': '1 / -1' } }, h('label', { for: 'b-motivo', text: 'Motivo (opcional)' }), motivo),
      ),
      errores,
    ],
    pie: [
      h('button', { class: 'btn btn-secondary', type: 'button', text: 'Cancelar', onclick: () => cerrar() }),
      h('button', {
        class: 'btn btn-primary',
        type: 'button',
        text: 'Bloquear',
        onclick: async () => {
          const r = await api.bloquear({
            [tipo === 'profesional' ? 'profesionalId' : 'sillonId']: recurso.value,
            inicio: instanteLocal(fecha.value, desde.value, ctx.zona),
            fin: instanteLocal(fecha.value, hasta.value, ctx.zona),
            ...(motivo.value.trim() ? { motivo: motivo.value.trim() } : {}),
          });
          if (r.ok) {
            cerrar();
            avisar('Horario bloqueado');
            await ctx.recargar(fecha.value);
            return;
          }
          if (r.error.codigo === 'RN-31' && r.error.turnos) {
            errores.replaceChildren(
              alertaError('No se puede bloquear: hay turnos en ese horario.', [
                h('p', { text: 'Reprogramalos o cancelalos primero, o elegí otro horario:' }),
                h('ul', { class: 'conflicts' }, ...r.error.turnos.map((t) => h('li', { text: `${hora(t.inicio, ctx.zona)} a ${hora(t.fin, ctx.zona)} · ${t.paciente.nombre} ${t.paciente.apellido}` }))),
              ]),
            );
            return;
          }
          errores.replaceChildren(alertaError(mensajeDeFallo(r)));
        },
      }),
    ],
  });
}

/**
 * @param {import('./api.js').BloqueoVista} b
 * @param {Contexto} ctx
 */
export function abrirLiberar(b, ctx) {
  const errores = h('div', { 'aria-live': 'polite' });
  const quien = b.profesional ? `${b.profesional.nombre} ${b.profesional.apellido}` : b.sillon?.nombre ?? '';
  const { cerrar } = abrirDialogo({
    titulo: '¿Liberar este bloqueo?',
    chico: true,
    rol: 'alertdialog',
    cuerpo: [h('p', { class: 'muted', text: `${quien}, de ${hora(b.inicio, ctx.zona)} a ${hora(b.fin, ctx.zona)}${b.motivo ? ` (${b.motivo})` : ''}. El horario vuelve a quedar disponible.` }), errores],
    pie: [
      h('button', { class: 'btn btn-secondary', type: 'button', text: 'Volver', onclick: () => cerrar() }),
      h('button', {
        class: 'btn btn-primary',
        type: 'button',
        text: 'Liberar',
        onclick: async () => {
          const r = await api.liberar(b.id);
          if (!r.ok) {
            errores.replaceChildren(alertaError(mensajeDeFallo(r)));
            return;
          }
          cerrar();
          avisar('Bloqueo liberado');
          await ctx.recargar();
        },
      }),
    ],
  });
}
