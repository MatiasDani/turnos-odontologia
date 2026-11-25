// @ts-check
// Panel "Recordatorios por WhatsApp" (C-15, C-13): pendientes con enlace `wa.me` y "Marcar enviado".
import { api, mensajeDeFallo } from './api.js';
import { avisar, h, icono } from './dom.js';
import { fechaCorta, fechaLocal, hora } from './formato.js';

/**
 * @param {HTMLElement} panel
 * @param {import('./agenda.js').Contexto} ctx
 */
export async function dibujarWaMe(panel, ctx) {
  const lista = h('ul', { class: 'lista-limpia' });
  const contador = h('span', { class: 'count', text: '…' });
  panel.replaceChildren(
    h(
      'aside',
      { class: 'panel', 'aria-labelledby': 'wa-t' },
      h('div', { class: 'panel-head' }, h('h2', { id: 'wa-t', text: 'Recordatorios por WhatsApp' }), contador),
      h('p', { class: 'small muted', text: 'Abrí el mensaje, envialo desde tu WhatsApp y marcalo como enviado.' }),
      lista,
    ),
  );
  const r = await api.pendientesWaMe();
  if (!r.ok) {
    contador.textContent = '–';
    lista.replaceChildren(h('li', { class: 'small muted', text: mensajeDeFallo(r) }));
    return;
  }
  const pendientes = r.datos.recordatorios.filter((x) => x.turno !== null);
  contador.textContent = String(pendientes.length);
  if (pendientes.length === 0) {
    lista.replaceChildren(h('li', { class: 'small muted', text: 'No hay recordatorios pendientes.' }));
    return;
  }
  lista.replaceChildren(
    ...pendientes.flatMap((p) => {
      const t = p.turno;
      if (t === null) return [];
      const nombre = `${t.paciente.nombre} ${t.paciente.apellido}`;
      const item = h(
        'li',
        { class: 'wa-item' },
        h('b', { text: nombre }),
        h('span', { class: 'small muted', text: `${fechaCorta(fechaLocal(new Date(t.inicio), ctx.zona))} · ${hora(t.inicio, ctx.zona)} · ${t.prestacion.nombre} · ${t.profesional.nombre} ${t.profesional.apellido}` }),
        h(
          'div',
          { class: 'row' },
          h('a', { class: 'btn btn-secondary btn-sm', href: p.enlaceWaMe, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `Abrir WhatsApp para ${nombre}` }, icono('i-chat'), 'Abrir WhatsApp'),
          ctx.rol === 'recepcion'
            ? h('button', {
                class: 'btn btn-ghost btn-sm',
                type: 'button',
                text: 'Marcar enviado',
                'aria-label': `Marcar enviado el recordatorio de ${nombre}`,
                onclick: async () => {
                  const m = await api.marcarEnviado(p.id);
                  if (!m.ok) {
                    avisar(mensajeDeFallo(m), 'error');
                    return;
                  }
                  item.remove();
                  contador.textContent = String(Number(contador.textContent) - 1);
                  avisar(`Recordatorio de ${nombre} marcado como enviado.`);
                },
              })
            : null,
        ),
      );
      return [item];
    }),
  );
}
