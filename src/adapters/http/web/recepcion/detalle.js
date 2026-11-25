// @ts-check
// Panel de detalle de un turno y sus acciones (C-15): confirmar, reprogramar, cancelar, atendido y
// ausente, según el estado y el rol. El servidor decide los permisos; acá solo se ocultan.
import { api, mensajeDeFallo } from './api.js';
import { abrirDialogo, alertaError, avisar, h, icono } from './dom.js';
import { ESTADOS, fechaCorta, fechaLocal, hora } from './formato.js';
import { elegirHueco } from './dar-turno.js';

/**
 * @typedef {import('./api.js').TurnoVista} TurnoVista
 * @typedef {import('./agenda.js').Contexto} Contexto
 */

/**
 * @param {HTMLElement} panel
 * @param {TurnoVista} t
 * @param {Contexto} ctx
 */
export async function dibujarDetalle(panel, t, ctx) {
  const zona = ctx.zona;
  const personal = ctx.rol !== 'odontologo';
  const empezo = new Date(t.inicio).getTime() <= Date.now();
  const activo = t.estado === 'reservado' || t.estado === 'confirmado';
  const estado = ESTADOS[t.estado];
  const contacto = h('div', { class: 'dl', role: 'presentation' });
  const acciones = h('div', { class: 'actions' });
  const errores = h('div', { 'aria-live': 'polite' });

  /** @param {'cancelar' | 'confirmar' | 'atendido' | 'ausente'} accion @param {string} exito */
  const ejecutar = async (accion, exito) => {
    const r = await api.accion(t.id, accion);
    if (!r.ok) {
      errores.replaceChildren(alertaError(mensajeDeFallo(r)));
      return;
    }
    avisar(exito);
    await ctx.recargar();
  };

  if (personal && t.estado === 'reservado') acciones.append(h('button', { class: 'btn btn-secondary', type: 'button', text: 'Confirmar', onclick: () => void ejecutar('confirmar', 'Turno confirmado') }));
  if (t.estado === 'confirmado' && empezo) {
    acciones.append(
      h('button', { class: 'btn btn-secondary', type: 'button', text: 'Atendido', onclick: () => void ejecutar('atendido', 'Turno marcado como atendido') }),
      h('button', { class: 'btn btn-secondary', type: 'button', text: 'Ausente', onclick: () => void ejecutar('ausente', 'Turno marcado como ausente. El horario quedó libre.') }),
    );
  }
  if (personal && activo) {
    acciones.append(
      h('button', { class: 'btn btn-secondary', type: 'button', text: 'Reprogramar', onclick: () => abrirReprogramar(t, ctx) }),
      h('button', {
        class: 'btn btn-danger',
        type: 'button',
        text: 'Cancelar turno',
        onclick: () => {
          const { cerrar } = abrirDialogo({
            titulo: '¿Cancelar este turno?',
            chico: true,
            rol: 'alertdialog',
            cuerpo: [
              h('p', {
                class: 'muted',
                text: `${t.paciente.nombre} ${t.paciente.apellido}, ${fechaCorta(fechaLocal(new Date(t.inicio), zona)).toLowerCase()} de ${hora(t.inicio, zona)} a ${hora(t.fin, zona)} con ${t.profesional.nombre} ${t.profesional.apellido}. El horario del ${t.sillon.nombre} va a quedar libre.`,
              }),
            ],
            pie: [
              h('button', { class: 'btn btn-secondary', type: 'button', text: 'Volver', autofocus: true, onclick: () => cerrar() }),
              h('button', {
                class: 'btn btn-danger',
                type: 'button',
                text: 'Sí, cancelar turno',
                onclick: async () => {
                  cerrar();
                  await ejecutar('cancelar', 'Turno cancelado. El horario quedó libre.');
                },
              }),
            ],
          });
        },
      }),
    );
  }

  panel.replaceChildren(
    h(
      'aside',
      { class: 'panel', 'aria-labelledby': 'det-t' },
      h('div', { class: 'panel-head' }, h('h2', { id: 'det-t', text: 'Turno' }), h('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'aria-label': 'Cerrar detalle', onclick: () => ctx.seleccionar(null) }, icono('i-x'))),
      h('p', {}, h('b', { text: `${t.paciente.nombre} ${t.paciente.apellido}` })),
      h('span', { class: `badge b-${t.estado}`, style: { 'justify-self': 'start' } }, icono(estado.icono, ''), estado.texto),
      h(
        'dl',
        { class: 'dl' },
        h('dt', { text: 'Horario' }), h('dd', { class: 'mono', text: `${fechaCorta(fechaLocal(new Date(t.inicio), zona))} · ${hora(t.inicio, zona)} a ${hora(t.fin, zona)}` }),
        h('dt', { text: 'Prestación' }), h('dd', { text: `${t.prestacion.nombre} · ${t.duracionMinutos} min` }),
        h('dt', { text: 'Profesional' }), h('dd', { text: `${t.profesional.nombre} ${t.profesional.apellido}` }),
        h('dt', { text: 'Sillón' }), h('dd', { text: t.sillon.nombre }),
      ),
      contacto,
      h('hr', { class: 'divider' }),
      acciones.childElementCount > 0 ? acciones : h('p', { class: 'small muted', text: 'No hay acciones disponibles para este turno.' }),
      errores,
    ),
  );

  if (personal) {
    const r = await api.paciente(t.paciente.id);
    if (r.ok) {
      contacto.className = 'dl';
      contacto.replaceChildren(h('dt', { text: 'DNI' }), h('dd', { class: 'mono', text: r.datos.dni }), h('dt', { text: 'Teléfono' }), h('dd', { class: 'mono', text: r.datos.telefono }));
    }
  }
}

/**
 * @param {TurnoVista} t
 * @param {Contexto} ctx
 */
function abrirReprogramar(t, ctx) {
  const fechaTurno = fechaLocal(new Date(t.inicio), ctx.zona);
  void elegirHueco(ctx, {
    titulo: 'Reprogramar turno',
    subtitulo: `${t.paciente.nombre} ${t.paciente.apellido} · ${t.prestacion.nombre} · ${hora(t.inicio, ctx.zona)} con ${t.profesional.nombre} ${t.profesional.apellido}`,
    prestacionId: t.prestacion.id,
    fecha: fechaTurno,
    profesionalId: t.profesional.id,
    textoBoton: 'Reprogramar',
    confirmar: async (hueco, opcion) => {
      const r = await api.reprogramar(t.id, { inicio: hueco.inicio, profesionalId: opcion.profesionalId, sillonId: opcion.sillonId });
      if (!r.ok) return r;
      avisar('Turno reprogramado');
      await ctx.recargar(fechaLocal(new Date(r.datos.inicio), ctx.zona));
      return null;
    },
  });
}
