// @ts-check
// Dar turno (C-15, Flujo 1): búsqueda de paciente con alta rápida, prestación y huecos libres del día.
// También exporta el selector de huecos que usa "Reprogramar".
import { api, mensajeDeFallo } from './api.js';
import { abrirDialogo, alertaError, avisar, h, icono } from './dom.js';
import { fechaLocal, hora } from './formato.js';

/**
 * @typedef {import('./agenda.js').Contexto} Contexto
 * @typedef {import('./api.js').Hueco} Hueco
 * @typedef {import('./api.js').Fallo} Fallo
 * @typedef {import('./api.js').PacienteResumen} PacienteResumen
 * @typedef {{ profesionalId: string, sillonId: string }} Opcion
 */

/**
 * Detalle de un rechazo de la API con su conflicto (RN-02, RN-03…).
 * @param {Fallo} fallo
 * @param {Contexto} ctx
 */
export function errorConConflicto(fallo, ctx) {
  const conflicto = fallo.error.conflicto;
  return alertaError(
    mensajeDeFallo(fallo),
    conflicto ? [h('p', { text: `Está ocupado de ${hora(conflicto.inicio, ctx.zona)} a ${hora(conflicto.fin, ctx.zona)}. Elegí otro horario.` })] : [],
  );
}

/**
 * Selector de huecos libres: fecha, profesional opcional y botones de horario (`aria-pressed`).
 * @param {Contexto} ctx
 * @param {{ prestacionId: () => string, fecha: string, profesionalId?: string }} inicial
 */
function selectorHuecos(ctx, inicial) {
  /** @type {{ hueco: Hueco, opcion: Opcion } | null} */
  let elegido = null;
  const fecha = h('input', { id: 'h-fecha', class: 'input mono', type: 'date', value: inicial.fecha });
  const profesional = h(
    'select',
    { id: 'h-profesional', class: 'select' },
    h('option', { value: '', text: 'Cualquiera' }),
    ...ctx.catalogo.profesionales
      .filter((p) => ctx.rol !== 'odontologo' || p.id === ctx.profesionalPropio)
      .map((p) => h('option', { value: p.id, text: `${p.nombre} ${p.apellido}`, selected: p.id === inicial.profesionalId })),
  );
  const sillon = h(
    'select',
    { id: 'h-sillon', class: 'select' },
    h('option', { value: '', text: 'Cualquiera libre' }),
    ...ctx.catalogo.sillones.map((s) => h('option', { value: s.id, text: s.nombre })),
  );
  const slots = h('div', { class: 'slots', role: 'group', 'aria-label': 'Horarios libres' });
  const nombreDe = (/** @type {string} */ id) => {
    const p = ctx.catalogo.profesionales.find((x) => x.id === id);
    return p ? `${p.nombre} ${p.apellido}` : id;
  };
  const sillonDe = (/** @type {string} */ id) => ctx.catalogo.sillones.find((x) => x.id === id)?.nombre ?? id;

  const cargar = async () => {
    elegido = null;
    slots.replaceChildren(h('p', { class: 'slots-vacio', text: 'Buscando horarios libres…' }));
    const prestacionId = inicial.prestacionId();
    if (!prestacionId || !fecha.value) {
      slots.replaceChildren(h('p', { class: 'slots-vacio', text: 'Elegí la prestación y la fecha.' }));
      return;
    }
    const r = await api.disponibilidad(prestacionId, fecha.value, profesional.value || undefined);
    if (!r.ok) {
      slots.replaceChildren(h('p', { class: 'slots-vacio', text: mensajeDeFallo(r) }));
      return;
    }
    const conSillon = r.datos.horarios
      .map((hueco) => ({ ...hueco, opciones: hueco.opciones.filter((o) => !sillon.value || o.sillonId === sillon.value) }))
      .filter((hueco) => hueco.opciones.length > 0);
    if (conSillon.length === 0) {
      slots.replaceChildren(h('p', { class: 'slots-vacio', text: 'No hay horarios libres ese día.' }));
      return;
    }
    slots.replaceChildren(
      ...conSillon.flatMap((hueco) => {
        const opcion = hueco.opciones[0];
        if (opcion === undefined) return [];
        const boton = h(
          'button',
          {
            class: 'slot',
            type: 'button',
            'aria-pressed': 'false',
            'aria-label': `${hora(hueco.inicio, ctx.zona)}, ${nombreDe(opcion.profesionalId)}, ${sillonDe(opcion.sillonId)}`,
            onclick: () => {
              elegido = { hueco, opcion };
              slots.querySelectorAll('.slot').forEach((x) => x.setAttribute('aria-pressed', String(x === boton)));
            },
          },
          hora(hueco.inicio, ctx.zona),
          h('small', { text: `${nombreDe(opcion.profesionalId).split(' ').slice(-1)[0]} · ${sillonDe(opcion.sillonId).replace('Sillón ', 'S')}` }),
        );
        return [boton];
      }),
    );
  };
  fecha.addEventListener('change', () => void cargar());
  profesional.addEventListener('change', () => void cargar());
  sillon.addEventListener('change', () => void cargar());
  const nodo = h(
    'div',
    { class: 'grid3' },
    h('div', { class: 'field' }, h('label', { for: 'h-fecha', text: 'Fecha' }), fecha),
    h('div', { class: 'field' }, h('label', { for: 'h-profesional', text: 'Profesional' }), profesional),
    h('div', { class: 'field' }, h('label', { for: 'h-sillon', text: 'Sillón' }), sillon),
    h('div', { class: 'field', style: { 'grid-column': '1 / -1' } }, h('span', { class: 'label', text: 'Horarios libres' }), slots),
  );
  return { nodo, cargar, elegido: () => elegido };
}

/**
 * Diálogo de elegir hueco (reprogramar).
 * @param {Contexto} ctx
 * @param {{ titulo: string, subtitulo: string, prestacionId: string, fecha: string, profesionalId?: string, textoBoton: string, confirmar: (hueco: Hueco, opcion: Opcion) => Promise<Fallo | null> }} p
 */
export async function elegirHueco(ctx, p) {
  const selector = selectorHuecos(ctx, { prestacionId: () => p.prestacionId, fecha: p.fecha, ...(p.profesionalId ? { profesionalId: p.profesionalId } : {}) });
  const errores = h('div', { 'aria-live': 'polite' });
  const { cerrar } = abrirDialogo({
    titulo: p.titulo,
    subtitulo: p.subtitulo,
    cuerpo: [selector.nodo, errores],
    pie: [
      h('button', { class: 'btn btn-secondary', type: 'button', text: 'Cancelar', onclick: () => cerrar() }),
      h('button', {
        class: 'btn btn-primary',
        type: 'button',
        text: p.textoBoton,
        onclick: async () => {
          const elegido = selector.elegido();
          if (elegido === null) {
            errores.replaceChildren(alertaError('Elegí un horario de la lista.'));
            return;
          }
          const fallo = await p.confirmar(elegido.hueco, elegido.opcion);
          if (fallo === null) cerrar();
          else errores.replaceChildren(errorConConflicto(fallo, ctx));
        },
      }),
    ],
  });
  await selector.cargar();
}

/**
 * Formulario de alta rápida (DD-40): mismos datos que la reserva online.
 * @param {(paciente: PacienteResumen) => void} alElegir
 * @param {() => void} alVolver
 * @param {string} textoInicial
 */
function formularioAlta(alElegir, alVolver, textoInicial) {
  const soloDigitos = /^\d+$/.test(textoInicial.trim());
  const campo = (/** @type {string} */ id, /** @type {string} */ etiqueta, /** @type {string} */ valor = '', /** @type {string} */ ayuda = '') =>
    h('div', { class: 'field' }, h('label', { for: `a-${id}`, text: etiqueta }), h('input', { id: `a-${id}`, name: id, class: 'input', value: valor }), ayuda ? h('p', { class: 'hint', text: ayuda }) : null, h('p', { class: 'field-err', id: `a-${id}-err` }));
  const consentimiento = h('input', { id: 'a-consentimiento', type: 'checkbox' });
  const errores = h('div', { 'aria-live': 'polite' });
  const form = h(
    'form',
    { id: 'alta', novalidate: true },
    h('div', { class: 'grid2' }, campo('dni', 'DNI', soloDigitos ? textoInicial.trim() : ''), campo('telefono', 'Teléfono', '', 'Con código de área.'), campo('nombre', 'Nombre', soloDigitos ? '' : textoInicial.trim()), campo('apellido', 'Apellido'), h('div', { style: { 'grid-column': '1 / -1' } }, campo('email', 'E-mail (opcional)'))),
    h('label', { class: 'check', for: 'a-consentimiento' }, consentimiento, ' El paciente acepta que el consultorio lo contacte por teléfono, WhatsApp o e-mail para gestionar sus turnos.'),
    errores,
    h('div', { class: 'dialog-foot' }, h('button', { class: 'btn btn-secondary', type: 'button', text: 'Volver a la búsqueda', onclick: alVolver }), h('button', { class: 'btn btn-primary', type: 'submit', text: 'Guardar y elegir' })),
  );
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const valor = (/** @type {string} */ id) => /** @type {HTMLInputElement} */ (form.querySelector(`#a-${id}`)).value;
    form.querySelectorAll('.field-err').forEach((x) => (x.textContent = ''));
    form.querySelectorAll('input[aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid'));
    const email = valor('email').trim();
    const r = await api.altaPaciente({ dni: valor('dni'), nombre: valor('nombre'), apellido: valor('apellido'), telefono: valor('telefono'), ...(email ? { email } : {}), consentimientoContacto: consentimiento.checked });
    if (r.ok) {
      alElegir(r.datos);
      return;
    }
    if (r.error.codigo === 'RN-35' && r.error.paciente) {
      const existente = r.error.paciente;
      errores.replaceChildren(
        h(
          'div',
          { class: 'alert a-warning', role: 'alert' },
          icono('i-alert'),
          h(
            'div',
            {},
            h('strong', { text: 'Ya existe un paciente con ese DNI.' }),
            h('p', { text: `${existente.nombre} ${existente.apellido} · DNI ${existente.dni} · ${existente.telefono}` }),
            h('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: `Elegir a ${existente.nombre} ${existente.apellido}`, onclick: () => alElegir(existente) }),
          ),
        ),
      );
      return;
    }
    for (const c of r.error.campos ?? []) {
      const nombre = c === 'consentimientoContacto' ? 'consentimiento' : c;
      form.querySelector(`#a-${nombre}`)?.setAttribute('aria-invalid', 'true');
      const err = form.querySelector(`#a-${nombre}-err`);
      if (err) err.textContent = 'Revisá este dato.';
    }
    errores.replaceChildren(alertaError(r.error.campos?.includes('consentimientoContacto') ? 'Falta el consentimiento de contacto o hay datos inválidos.' : mensajeDeFallo(r)));
  });
  return form;
}

/**
 * Diálogo "Dar turno".
 * @param {Contexto} ctx
 */
export function abrirDarTurno(ctx) {
  /** @type {PacienteResumen | null} */
  let paciente = null;
  const errores = h('div', { 'aria-live': 'polite' });
  const prestacion = h(
    'select',
    { id: 'd-prestacion', class: 'select' },
    ...ctx.catalogo.prestaciones.map((p) => h('option', { value: p.id, text: `${p.nombre} (${p.duracionMinutos} min)` })),
  );
  const selector = selectorHuecos(ctx, { prestacionId: () => prestacion.value, fecha: ctx.fecha() });
  prestacion.addEventListener('change', () => void selector.cargar());

  const buscador = h('input', { id: 'd-paciente', class: 'input', role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'd-resultados', 'aria-autocomplete': 'list', autocomplete: 'off' });
  const resultados = h('ul', { id: 'd-resultados', class: 'results', role: 'listbox', 'aria-label': 'Pacientes encontrados', hidden: true });
  const elegidoNodo = h('div', { hidden: true });
  const zonaPaciente = h('div', { class: 'field combo' }, h('label', { for: 'd-paciente', text: 'Paciente' }), buscador, h('p', { class: 'hint', text: 'Buscá por DNI o por nombre (3 letras o más).' }), resultados);
  const contenedor = h('div', {}, zonaPaciente, elegidoNodo);
  const turnoCampos = h('div', { class: 'grid2' }, h('div', { class: 'field', style: { 'grid-column': '1 / -1' } }, h('label', { for: 'd-prestacion', text: 'Prestación' }), prestacion));

  /** @param {PacienteResumen} p */
  const elegir = (p) => {
    paciente = p;
    resultados.hidden = true;
    buscador.setAttribute('aria-expanded', 'false');
    zonaPaciente.hidden = true;
    elegidoNodo.hidden = false;
    elegidoNodo.replaceChildren(
      h(
        'div',
        { class: 'chosen' },
        h('span', {}, h('b', { text: `${p.nombre} ${p.apellido}` }), h('span', { class: 'mono muted', text: ` · DNI ${p.dni} · ${p.telefono}` })),
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Cambiar', onclick: () => { paciente = null; zonaPaciente.hidden = false; elegidoNodo.hidden = true; buscador.focus(); } }),
      ),
    );
    vistaAlta.hidden = true;
    vistaTurno.hidden = false;
  };

  const vistaAlta = h('div', { hidden: true });
  const abrirAlta = () => {
    vistaTurno.hidden = true;
    vistaAlta.hidden = false;
    vistaAlta.replaceChildren(formularioAlta(elegir, () => { vistaAlta.hidden = true; vistaTurno.hidden = false; buscador.focus(); }, buscador.value));
    vistaAlta.querySelector('input')?.focus();
  };

  let temporizador = 0;
  let pedido = 0;
  buscador.addEventListener('input', () => {
    window.clearTimeout(temporizador);
    const texto = buscador.value;
    if (texto.trim().length < 3) {
      resultados.hidden = true;
      buscador.setAttribute('aria-expanded', 'false');
      return;
    }
    temporizador = window.setTimeout(async () => {
      const mio = ++pedido;
      const r = await api.buscarPacientes(texto);
      if (mio !== pedido) return;
      const opciones = r.ok
        ? r.datos.pacientes.map((p) =>
            h('li', { role: 'option', 'aria-selected': 'false' }, h('button', { class: 'result', type: 'button', onclick: () => elegir(p) }, h('b', { text: `${p.nombre} ${p.apellido}` }), h('span', { class: 'mono muted', text: `DNI ${p.dni} · ${p.telefono}` }))),
          )
        : [h('li', { class: 'result', text: mensajeDeFallo(r) })];
      if (r.ok && r.datos.pacientes.length === 0) opciones.push(h('li', { class: 'result muted', text: 'No encontramos pacientes con ese texto.' }));
      if (r.ok && r.datos.hayMas) opciones.push(h('li', { class: 'result muted', text: 'Hay más resultados: afiná la búsqueda.' }));
      opciones.push(h('li', { role: 'option', 'aria-selected': 'false' }, h('button', { class: 'result add', type: 'button', onclick: abrirAlta }, icono('i-plus'), 'Dar de alta un paciente nuevo')));
      resultados.replaceChildren(...opciones);
      resultados.hidden = false;
      buscador.setAttribute('aria-expanded', 'true');
    }, 250);
  });

  const darTurno = h('button', {
    class: 'btn btn-primary',
    type: 'button',
    text: 'Dar turno',
    onclick: async () => {
      const elegido = selector.elegido();
      if (paciente === null) {
        errores.replaceChildren(alertaError('Elegí o da de alta al paciente.'));
        return;
      }
      if (elegido === null) {
        errores.replaceChildren(alertaError('Elegí un horario de la lista.'));
        return;
      }
      const r = await api.darTurno({ pacienteId: paciente.id, prestacionId: prestacion.value, inicio: elegido.hueco.inicio, ...elegido.opcion });
      if (!r.ok) {
        errores.replaceChildren(errorConConflicto(r, ctx));
        return;
      }
      cerrar();
      avisar('Turno dado');
      await ctx.recargar(fechaLocal(new Date(r.datos.inicio), ctx.zona));
    },
  });
  const vistaTurno = h('div', { style: { display: 'grid', gap: 'var(--space-4)' } }, contenedor, turnoCampos, selector.nodo, errores, h('div', { class: 'dialog-foot' }, h('button', { class: 'btn btn-secondary', type: 'button', text: 'Cancelar', onclick: () => cerrar() }), darTurno));
  const { cerrar } = abrirDialogo({ titulo: 'Dar turno', cuerpo: [vistaTurno, vistaAlta], pie: [] });
  buscador.focus();
  void selector.cargar();
}
