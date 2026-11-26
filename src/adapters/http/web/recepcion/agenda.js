// @ts-check
// Controlador de la agenda de recepción (C-15, interfaz-recepcion). Estado en la URL (fecha, vista,
// modo, recurso) para que recargar conserve la vista; la sesión vive en `sessionStorage` (DD-38).
import { api, mensajeDeFallo } from './api.js';
import { abrirDarTurno } from './dar-turno.js';
import { abrirBloqueo, abrirLiberar } from './bloqueo.js';
import { dibujarDetalle } from './detalle.js';
import { buscar, h, icono } from './dom.js';
import { aMinutos, diaSemana, fechaCorta, fechaLarga, fechaLocal, lunesDe, nombreMes, sumarDias } from './formato.js';
import { dibujarGrilla, leyenda } from './grilla.js';
import { borrarSesion, leerSesion } from './sesion.js';
import { dibujarWaMe } from './wa-me.js';

/**
 * @typedef {import('./api.js').Catalogo} Catalogo
 * @typedef {import('./api.js').TurnoVista} TurnoVista
 * @typedef {import('./api.js').BloqueoVista} BloqueoVista
 * @typedef {import('./api.js').DiaVista} DiaVista
 * @typedef {{ catalogo: Catalogo, zona: string, rol: Catalogo['usuario']['rol'], profesionalPropio?: string, fecha: () => string, hoy: () => string, recargar: (fecha?: string) => Promise<void>, seleccionar: (t: TurnoVista | null) => void }} Contexto
 */

const sesion = leerSesion();
if (sesion === null) window.location.replace('/recepcion/login');

const el = {
  agenda: buscar('#agenda', HTMLElement),
  panel: buscar('#panel', HTMLElement),
  titulo: buscar('#titulo', HTMLElement),
  hoyMarca: buscar('#hoy-marca', HTMLElement),
  vDia: buscar('#v-dia', HTMLButtonElement),
  vSemana: buscar('#v-semana', HTMLButtonElement),
  modo: buscar('#modo', HTMLElement),
  mSillon: buscar('#m-sillon', HTMLButtonElement),
  mProfesional: buscar('#m-profesional', HTMLButtonElement),
  recurso: buscar('#recurso', HTMLSelectElement),
  miAgenda: buscar('#mi-agenda', HTMLElement),
  fecha: buscar('#fecha', HTMLInputElement),
  darTurno: buscar('#btn-dar-turno', HTMLButtonElement),
  bloquear: buscar('#btn-bloquear', HTMLButtonElement),
};

const params = new URLSearchParams(window.location.search);
const estado = {
  fecha: params.get('fecha') ?? '',
  vista: /** @type {'dia' | 'semana'} */ (params.get('vista') === 'semana' ? 'semana' : 'dia'),
  modo: /** @type {'sillon' | 'profesional'} */ (params.get('modo') === 'profesional' ? 'profesional' : 'sillon'),
  recurso: params.get('recurso') ?? '',
  /** @type {TurnoVista | null} */
  seleccionado: null,
};

/** @type {Contexto | null} */
let ctx = null;

function guardarUrl() {
  const p = new URLSearchParams({ fecha: estado.fecha, vista: estado.vista, modo: estado.modo });
  if (estado.recurso) p.set('recurso', estado.recurso);
  window.history.replaceState(null, '', `/recepcion?${p.toString()}`);
}

/** @param {Catalogo} catalogo */
function rangoHorario(catalogo) {
  const desdes = catalogo.horarios.map((x) => aMinutos(x.desde));
  const hastas = catalogo.horarios.map((x) => aMinutos(x.hasta));
  return { inicio: desdes.length ? Math.min(...desdes) : 540, fin: hastas.length ? Math.max(...hastas) : 1140 };
}

/** @param {string} fecha @param {Catalogo} catalogo */
const tramosDe = (fecha, catalogo) => catalogo.horarios.filter((x) => x.diaSemana === diaSemana(fecha));

/** @param {string} titulo @param {string} texto @param {Node | null} [accion] @param {string} [iconoId] */
function cajaEstado(titulo, texto, accion = null, iconoId = 'i-empty') {
  return h('div', { class: 'agenda-wrap' }, h('div', { class: 'state-box', role: 'status' }, icono(iconoId, ''), h('h2', { text: titulo }), h('p', { text: texto }), accion));
}

function dibujarToolbar() {
  if (ctx === null) return;
  const odontologo = ctx.rol === 'odontologo';
  el.vDia.setAttribute('aria-pressed', String(estado.vista === 'dia'));
  el.vSemana.setAttribute('aria-pressed', String(estado.vista === 'semana'));
  el.mSillon.setAttribute('aria-pressed', String(estado.modo === 'sillon'));
  el.mProfesional.setAttribute('aria-pressed', String(estado.modo === 'profesional'));
  el.modo.hidden = odontologo || estado.vista === 'semana';
  el.recurso.hidden = odontologo || estado.vista === 'dia';
  el.miAgenda.hidden = !odontologo;
  el.darTurno.hidden = odontologo;
  el.fecha.value = estado.fecha;
  const hoy = ctx.hoy();
  if (estado.vista === 'dia') {
    el.titulo.textContent = fechaLarga(estado.fecha);
    el.hoyMarca.hidden = estado.fecha !== hoy;
  } else {
    const lunes = lunesDe(estado.fecha);
    el.titulo.textContent = `Semana del ${fechaCorta(lunes).split(' ')[1]} al ${fechaLarga(sumarDias(lunes, 6)).replace(/^\S+ /, '')}`;
    el.hoyMarca.hidden = true;
  }
}

function dibujarPanel() {
  if (ctx === null) return;
  if (estado.seleccionado !== null) {
    void dibujarDetalle(el.panel, estado.seleccionado, ctx);
  } else if (ctx.rol !== 'odontologo') {
    void dibujarWaMe(el.panel, ctx);
  } else {
    el.panel.replaceChildren(h('aside', { class: 'panel' }, h('h2', { text: 'Tu agenda' }), h('p', { class: 'small muted', text: 'Elegí un turno para ver el detalle y marcar atendido o ausente.' })));
  }
}

/** En el celular el panel queda debajo de la grilla: al elegir un turno se desplaza hasta el detalle. */
function mostrarPanelEnCelular() {
  if (!window.matchMedia('(max-width: 768px)').matches) return;
  const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.panel.scrollIntoView({ block: 'start', behavior: sinMovimiento ? 'auto' : 'smooth' });
}

async function cargar() {
  if (ctx === null) return;
  const c = ctx;
  dibujarToolbar();
  guardarUrl();
  el.agenda.setAttribute('aria-busy', 'true');
  el.agenda.replaceChildren(
    h('div', { class: 'agenda-wrap' }, h('div', { class: 'state-box', role: 'status' }, h('div', { class: 'spinner', 'aria-hidden': 'true' }), h('h2', { text: 'Cargando agenda…' }))),
  );
  /** @type {{ fecha: string, vista: 'dia' | 'semana', profesionalId?: string, sillonId?: string }} */
  const consulta = { fecha: estado.fecha, vista: estado.vista };
  if (estado.vista === 'semana' && c.rol !== 'odontologo') {
    const [tipo, id] = estado.recurso.split(':');
    if (tipo === 'p' && id) consulta.profesionalId = id;
    if (tipo === 's' && id) consulta.sillonId = id;
  }
  const r = await api.agenda(consulta);
  el.agenda.setAttribute('aria-busy', 'false');
  if (!r.ok) {
    const reintentar = h('button', { class: 'btn btn-primary', type: 'button', text: 'Reintentar', onclick: () => void cargar() });
    el.agenda.replaceChildren(
      r.estado === 403
        ? cajaEstado('No tenés permiso para hacer esto.', 'Tu rol no puede ver esta agenda.', null, 'i-lock')
        : r.red
          ? cajaEstado('No pudimos cargar la agenda.', 'Revisá la conexión y probá de nuevo.', reintentar, 'i-wifi')
          : cajaEstado('No pudimos cargar la agenda.', mensajeDeFallo(r), reintentar, 'i-alert'),
    );
    return;
  }
  const { inicio, fin } = rangoHorario(c.catalogo);
  const hoy = c.hoy();
  /** @type {import('./grilla.js').Columna[]} */
  let columnas;
  let etiqueta;
  /** @type {'profesional' | 'sillon' | 'ambos'} */
  let detalleColumna = 'ambos';
  if ('dias' in r.datos) {
    const dias = r.datos.dias.filter((d) => tramosDe(d.fecha, c.catalogo).length > 0 || d.turnos.some((t) => t.ocupa) || d.bloqueos.length > 0);
    columnas = dias.map((d) => ({ titulo: fechaCorta(d.fecha), subtitulo: nombreMes(d.fecha), hoy: d.fecha === hoy, turnos: d.turnos, bloqueos: d.bloqueos, tramos: tramosDe(d.fecha, c.catalogo) }));
    etiqueta = `Semana de ${el.recurso.selectedOptions[0]?.textContent ?? 'mi agenda'}`;
  } else {
    const dia = r.datos;
    if (!dia.turnos.some((t) => t.ocupa) && dia.bloqueos.length === 0) {
      el.agenda.replaceChildren(
        cajaEstado(
          'No hay turnos para este día.',
          c.rol === 'odontologo' ? 'Elegí otra fecha.' : 'Podés dar un turno o elegir otra fecha.',
          c.rol === 'odontologo' ? null : h('button', { class: 'btn btn-primary', type: 'button', onclick: () => abrirDarTurno(c) }, icono('i-plus'), 'Dar turno'),
        ),
      );
      dibujarPanel();
      return;
    }
    const tramos = tramosDe(dia.fecha, c.catalogo);
    if (estado.modo === 'sillon' && c.rol !== 'odontologo') {
      detalleColumna = 'sillon';
      columnas = c.catalogo.sillones.map((s) => ({
        titulo: s.nombre,
        subtitulo: [...new Set(dia.turnos.filter((t) => t.sillon.id === s.id && t.ocupa).map((t) => `${t.profesional.nombre} ${t.profesional.apellido}`))].join(' y ') || 'Libre',
        hoy: false,
        turnos: dia.turnos.filter((t) => t.sillon.id === s.id),
        bloqueos: dia.bloqueos.filter((b) => b.sillon?.id === s.id),
        tramos,
      }));
    } else {
      detalleColumna = 'profesional';
      const profesionales = c.rol === 'odontologo' ? c.catalogo.profesionales.filter((p) => p.id === c.profesionalPropio) : c.catalogo.profesionales;
      columnas = profesionales.map((p) => ({
        titulo: `${p.nombre} ${p.apellido}`,
        subtitulo: [...new Set(dia.turnos.filter((t) => t.profesional.id === p.id && t.ocupa).map((t) => t.sillon.nombre))].join(', ') || 'Sin turnos',
        hoy: false,
        turnos: dia.turnos.filter((t) => t.profesional.id === p.id),
        bloqueos: dia.bloqueos.filter((b) => b.profesional?.id === p.id),
        tramos,
      }));
    }
    etiqueta = `Agenda del ${fechaLarga(dia.fecha).toLowerCase()} por ${detalleColumna === 'sillon' ? 'sillón' : 'profesional'}`;
  }
  el.agenda.replaceChildren(
    h('div', { class: 'ag-top' }, leyenda()),
    dibujarGrilla({
      columnas,
      zona: c.zona,
      etiqueta,
      inicio,
      fin,
      detalleColumna,
      ...(estado.seleccionado ? { seleccionado: estado.seleccionado.id } : {}),
      onTurno: (t) => {
        estado.seleccionado = t;
        dibujarPanel();
        el.agenda.querySelectorAll('.cell-appt.is-selected').forEach((x) => x.classList.remove('is-selected'));
        el.agenda.querySelector(`[data-turno="${CSS.escape(t.id)}"]`)?.classList.add('is-selected');
        mostrarPanelEnCelular();
      },
      onBloqueo: (b) => abrirLiberar(b, c),
    }),
  );
  dibujarPanel();
}

/** @param {number} dias */
function mover(dias) {
  estado.fecha = sumarDias(estado.fecha, estado.vista === 'semana' ? dias * 7 : dias);
  estado.seleccionado = null;
  void cargar();
}

async function iniciar() {
  if (sesion === null) return;
  buscar('#usuario-email', HTMLElement).textContent = sesion.usuario.email;
  buscar('#salir', HTMLButtonElement).addEventListener('click', () => {
    borrarSesion();
    window.location.assign('/recepcion/login');
  });
  const r = await api.catalogo();
  if (!r.ok) {
    el.agenda.replaceChildren(
      cajaEstado('No pudimos cargar la agenda.', mensajeDeFallo(r), h('button', { class: 'btn btn-primary', type: 'button', text: 'Reintentar', onclick: () => window.location.reload() }), 'i-wifi'),
    );
    return;
  }
  const catalogo = r.datos;
  const zona = catalogo.consultorio.zonaHoraria;
  const rol = catalogo.usuario.rol;
  buscar('#consultorio', HTMLElement).textContent = catalogo.consultorio.nombre;
  buscar('#usuario-rol', HTMLElement).textContent = rol === 'odontologo' ? 'Odontólogo' : rol === 'administrador' ? 'Administrador' : 'Recepción';
  if (estado.fecha === '') estado.fecha = fechaLocal(new Date(), zona);
  el.recurso.replaceChildren(
    ...catalogo.profesionales.map((p) => h('option', { value: `p:${p.id}`, text: `${p.nombre} ${p.apellido}` })),
    ...catalogo.sillones.map((s) => h('option', { value: `s:${s.id}`, text: s.nombre })),
  );
  if (!estado.recurso) estado.recurso = el.recurso.options[0]?.value ?? '';
  el.recurso.value = estado.recurso;
  const propio = catalogo.profesionales.find((p) => p.id === catalogo.usuario.profesionalId);
  if (propio) el.miAgenda.textContent = `Mi agenda · ${propio.nombre} ${propio.apellido}`;

  ctx = {
    catalogo,
    zona,
    rol,
    ...(catalogo.usuario.profesionalId ? { profesionalPropio: catalogo.usuario.profesionalId } : {}),
    fecha: () => estado.fecha,
    hoy: () => fechaLocal(new Date(), zona),
    recargar: async (fecha) => {
      if (fecha) estado.fecha = fecha;
      estado.seleccionado = null;
      await cargar();
    },
    seleccionar: (t) => {
      estado.seleccionado = t;
      dibujarPanel();
    },
  };
  const c = ctx;
  el.vDia.addEventListener('click', () => { estado.vista = 'dia'; void cargar(); });
  el.vSemana.addEventListener('click', () => { estado.vista = 'semana'; void cargar(); });
  el.mSillon.addEventListener('click', () => { estado.modo = 'sillon'; void cargar(); });
  el.mProfesional.addEventListener('click', () => { estado.modo = 'profesional'; void cargar(); });
  el.recurso.addEventListener('change', () => { estado.recurso = el.recurso.value; void cargar(); });
  buscar('#anterior', HTMLButtonElement).addEventListener('click', () => mover(-1));
  buscar('#siguiente', HTMLButtonElement).addEventListener('click', () => mover(1));
  buscar('#hoy', HTMLButtonElement).addEventListener('click', () => { estado.fecha = c.hoy(); estado.seleccionado = null; void cargar(); });
  el.fecha.addEventListener('change', () => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(el.fecha.value)) { estado.fecha = el.fecha.value; estado.seleccionado = null; void cargar(); }
  });
  el.darTurno.addEventListener('click', () => abrirDarTurno(c));
  el.bloquear.addEventListener('click', () => abrirBloqueo(c));
  await cargar();
}

void iniciar();
