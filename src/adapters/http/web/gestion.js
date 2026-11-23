// @ts-check
// Gestión del turno desde el enlace con token (DD-30, DD-31). La página es estática: el token sale de
// la URL, viaja solo en los pedidos a la API y nunca se guarda. El servidor decide RN-08 y RN-30.
import { api } from './api.js';
import { confirmarConDialogo } from './dialogo.js';
import { crudo, enfocar, html, icono, pintar } from './dom.js';
import { capitalizar, fechaLarga, hora, nombreCompleto, partesDeDia } from './formato.js';
import { diaSiguiente, htmlCargando, htmlDias, htmlErrorDeCarga, htmlGrupos, htmlVacio, manejarTeclasDeRadio } from './selector.js';

/**
 * @typedef {import('./api.js').VistaTurno} VistaTurno
 * @typedef {import('./api.js').Horario} Horario
 * @typedef {'cargando' | 'idle' | 'ok' | 'error'} Carga
 * @typedef {{ tipo: 'a-success' | 'a-info' | 'a-warning' | 'a-danger', titulo: string, texto: string }} Aviso
 * @typedef {{ pantalla: 'cargando' | 'detalle' | 'reprogramar' | 'cancelado' | 'invalido' | 'error', vista: VistaTurno | null,
 *   aviso: Aviso | null, ocupado: boolean, fecha: string, horarios: Horario[], cargaHorarios: Carga,
 *   proximoDia: string | null, inicio: string, fin: string }} Estado
 */

const app = /** @type {HTMLElement} */ (document.getElementById('app'));
const partesRuta = location.pathname.split('/').filter(Boolean);
const TOKEN = partesRuta[2] ?? '';
const VENGO_DE_CONFIRMAR = partesRuta[3] === 'confirmar';
const LIMITE_BUSQUEDA_DIAS = 14;

/** @type {Estado} */
let estado = {
  pantalla: 'cargando',
  vista: null,
  aviso: null,
  ocupado: false,
  fecha: '',
  horarios: [],
  cargaHorarios: 'idle',
  proximoDia: null,
  inicio: '',
  fin: '',
};
let secuencia = 0;

const zona = () => estado.vista?.consultorio.zonaHoraria ?? 'America/Argentina/Buenos_Aires';

// ---------------------------------------------------------------- carga y acciones

async function cargar() {
  estado.pantalla = 'cargando';
  dibujar();
  const r = await api.turno(TOKEN);
  if (r.ok) {
    estado.vista = r.datos;
    estado.pantalla = 'detalle';
    const nombre = r.datos.consultorio.nombre;
    document.getElementById('nombre-consultorio')?.replaceChildren(nombre);
    document.getElementById('pie-consultorio')?.replaceChildren(`${nombre} · `);
    document.title = `Tu turno - ${nombre}`;
    dibujar();
    if (VENGO_DE_CONFIRMAR && !r.datos.asistenciaConfirmada) enfocar(document.getElementById('confirmar'));
    else enfocar(document.getElementById('h1'));
    return;
  }
  estado.pantalla = r.error.codigo === 'ENLACE_INVALIDO' ? 'invalido' : 'error';
  dibujar();
  if (estado.pantalla === 'invalido') enfocar(document.getElementById('h1'));
}

/**
 * Pasa a la pantalla de enlace inválido si el servidor lo informa; devuelve `true` si lo hizo.
 * @param {import('./api.js').Fallo} fallo
 */
function siEnlaceInvalido(fallo) {
  if (fallo.error.codigo !== 'ENLACE_INVALIDO') return false;
  estado.pantalla = 'invalido';
  estado.vista = null;
  dibujar();
  enfocar(document.getElementById('h1'));
  return true;
}

/** @param {string} titulo @param {string} texto */
const avisoDeError = (titulo, texto) => /** @type {Aviso} */ ({ tipo: 'a-danger', titulo, texto });

async function confirmarAsistencia() {
  const r = await api.confirmar(TOKEN);
  if (!r.ok) {
    if (siEnlaceInvalido(r)) return;
    estado.aviso = avisoDeError('No pudimos confirmar tu asistencia', 'Revisá tu conexión y probá de nuevo.');
    dibujar();
    enfocar(app.querySelector('[role="alert"]'));
    return;
  }
  if (estado.vista) estado.vista = { ...estado.vista, asistenciaConfirmada: true };
  estado.aviso = { tipo: 'a-success', titulo: 'Gracias por confirmar', texto: 'Te esperamos en el consultorio.' };
  dibujar();
  enfocar(app.querySelector('.alert'));
}

async function cancelarTurno() {
  const v = estado.vista;
  if (!v) return;
  const z = zona();
  const confirmado = await confirmarConDialogo({
    titulo: '¿Cancelar tu turno?',
    descripcion: `${capitalizar(fechaLarga(v.inicio, z))} a las ${hora(v.inicio, z)} con ${nombreCompleto(v.profesional)}. El horario va a quedar libre para otra persona y no se puede deshacer.`,
    confirmar: 'Sí, cancelar turno',
    cancelar: 'Volver',
    peligro: true,
  });
  if (!confirmado) return;
  const r = await api.cancelar(TOKEN);
  if (!r.ok) {
    if (siEnlaceInvalido(r)) return;
    if (r.error.codigo === 'CONTACTAR_CONSULTORIO') {
      estado.vista = { ...v, gestionOnline: false };
      estado.aviso = null;
    } else {
      estado.aviso = avisoDeError('No pudimos cancelar tu turno', 'Revisá tu conexión y probá de nuevo.');
    }
    dibujar();
    enfocar(app.querySelector('.alert'));
    return;
  }
  estado.pantalla = 'cancelado';
  estado.aviso = null;
  dibujar();
  enfocar(app.querySelector('.alert'));
}

function abrirReprogramacion() {
  const v = estado.vista;
  if (!v) return;
  estado.pantalla = 'reprogramar';
  estado.aviso = null;
  estado.ocupado = false;
  estado.inicio = '';
  estado.fin = '';
  estado.fecha = v.diasReservables.desde;
  dibujar();
  enfocar(document.getElementById('h1'));
  void cargarHorarios();
}

async function cargarHorarios() {
  const mia = ++secuencia;
  estado.cargaHorarios = 'cargando';
  estado.proximoDia = null;
  dibujar();
  const r = await api.disponibilidadParaReprogramar(TOKEN, estado.fecha);
  if (mia !== secuencia) return;
  if (!r.ok) {
    if (siEnlaceInvalido(r)) return;
    estado.cargaHorarios = 'error';
    dibujar();
    return;
  }
  estado.horarios = r.datos.horarios;
  estado.cargaHorarios = 'ok';
  dibujar();
  if (estado.horarios.length === 0) void buscarProximoDia(mia);
}

/** @param {number} mia */
async function buscarProximoDia(mia) {
  const hasta = estado.vista?.diasReservables.hasta ?? '';
  let dia = estado.fecha;
  for (let i = 0; i < LIMITE_BUSQUEDA_DIAS; i++) {
    dia = diaSiguiente(dia);
    if (dia > hasta) return;
    const r = await api.disponibilidadParaReprogramar(TOKEN, dia);
    if (mia !== secuencia || !r.ok) return;
    if (r.datos.horarios.length > 0) {
      estado.proximoDia = dia;
      dibujar();
      return;
    }
  }
}

/** @param {string} fecha */
function elegirDia(fecha) {
  if (fecha === estado.fecha) return;
  estado.fecha = fecha;
  estado.inicio = '';
  estado.fin = '';
  estado.ocupado = false;
  void cargarHorarios();
}

async function confirmarReprogramacion() {
  if (estado.inicio === '') return;
  const r = await api.reprogramar(TOKEN, estado.inicio);
  if (!r.ok) {
    if (siEnlaceInvalido(r)) return;
    if (r.error.codigo === 'HORARIO_NO_DISPONIBLE') {
      estado.ocupado = true;
      estado.inicio = '';
      estado.fin = '';
      dibujar();
      enfocar(app.querySelector('[role="alert"]'));
      void cargarHorarios();
      return;
    }
    if (r.error.codigo === 'CONTACTAR_CONSULTORIO' && estado.vista) {
      estado.vista = { ...estado.vista, gestionOnline: false };
      estado.pantalla = 'detalle';
      estado.aviso = null;
      dibujar();
      return;
    }
    estado.aviso = avisoDeError('No pudimos cambiar tu turno', 'Revisá tu conexión y probá de nuevo.');
    dibujar();
    enfocar(app.querySelector('[role="alert"]'));
    return;
  }
  const actualizado = await api.turno(TOKEN);
  if (actualizado.ok) estado.vista = actualizado.datos;
  else if (estado.vista) estado.vista = { ...estado.vista, ...r.datos };
  estado.pantalla = 'detalle';
  estado.aviso = { tipo: 'a-success', titulo: 'Cambiamos tu turno', texto: 'El mismo enlace sigue sirviendo para el turno nuevo.' };
  dibujar();
  enfocar(document.getElementById('h1'));
}

// ---------------------------------------------------------------- vistas

const ICONO_RESERVADO = crudo('<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>');
const ICONO_CONFIRMADO = crudo('<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m2.5 6.3 2.2 2.2 4.8-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>');
const ICONO_CANCELADO = crudo('<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 3 6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>');

/** Teléfono sin espacios ni guiones para el enlace `tel:`. @param {string} telefono */
const telefonoParaEnlace = (telefono) => telefono.replace(/[^\d+]/g, '');

/** @param {VistaTurno} v @param {string} clase */
function botonesDeContacto(v, clase = 'contact-list') {
  return html`<div class="${clase}"><a class="btn btn-secondary" href="tel:${telefonoParaEnlace(v.consultorio.telefono)}">${icono('i-phone')}<span class="nowrap">${v.consultorio.telefono}</span></a><a class="btn btn-secondary" href="mailto:${v.consultorio.email}">${icono('i-mail')}<span class="nowrap">${v.consultorio.email}</span></a></div>`;
}

/** @param {VistaTurno} v @param {boolean} sinCuenta */
function aside(v, sinCuenta = false) {
  return html`<aside class="aside always" aria-label="Contacto del consultorio"><div class="panel">
    ${sinCuenta ? html`<h2>${v.consultorio.nombre}</h2>` : html`<h2>¿Necesitás ayuda?</h2><p class="small muted">Comunicate con el consultorio.</p>`}
    ${botonesDeContacto(v)}
  </div></aside>`;
}

/** @param {VistaTurno} v @param {'reservado' | 'confirmado' | 'cancelado'} tipo */
function cabeceraDeTurno(v, tipo) {
  const z = v.consultorio.zonaHoraria;
  const badge =
    tipo === 'cancelado'
      ? html`<span class="badge b-cancelado">${ICONO_CANCELADO}Cancelado</span>`
      : tipo === 'confirmado'
        ? html`<span class="badge b-confirmado">${ICONO_CONFIRMADO}Asistencia confirmada</span>`
        : html`<span class="badge b-reservado">${ICONO_RESERVADO}Reservado · falta confirmar asistencia</span>`;
  const hecho = (/** @type {string} */ i, /** @type {string} */ t, /** @type {string} */ valor) =>
    html`<div>${icono(i)}<div><dt>${t}</dt><dd>${valor}</dd></div></div>`;
  return html`<div class="page-head"><p class="step-label">Tu turno</p>${badge}</div>
    <div class="turno-when"><h1 id="h1" class="date" tabindex="-1">${capitalizar(fechaLarga(v.inicio, z))}</h1><span class="time">${hora(v.inicio, z)} a ${hora(v.fin, z)}</span></div>
    <dl class="facts">${hecho('i-tooth', 'Prestación', v.prestacion.nombre)}${hecho('i-user', 'Profesional', nombreCompleto(v.profesional))}${hecho('i-pin', 'Dónde', v.consultorio.nombre)}</dl>`;
}

/** @param {Aviso} a */
function avisoHtml(a) {
  const icon = a.tipo === 'a-success' ? 'i-check' : a.tipo === 'a-danger' ? 'i-alert' : a.tipo === 'a-warning' ? 'i-clock' : 'i-info';
  const rol = a.tipo === 'a-danger' ? 'alert' : 'status';
  return html`<div class="alert ${a.tipo} mt-4" role="${rol}" tabindex="-1">${icono(icon)}<div><strong>${a.titulo}</strong><p>${a.texto}</p></div></div>`;
}

/** Límite para gestionar online: 24 h antes del turno (solo para mostrar; decide el servidor). @param {VistaTurno} v */
function limiteDeGestion(v) {
  const z = v.consultorio.zonaHoraria;
  const limite = new Date(new Date(v.inicio).getTime() - 24 * 60 * 60_000).toISOString();
  const dia = fechaLarga(limite, z).split(' de ')[0] ?? '';
  return html`<p class="deadline">${icono('i-clock')}<span>Podés cancelar o reprogramar online hasta el <b>${dia} a las ${hora(limite, z)}</b> (24 h antes).</span></p>`;
}

function pantallaDetalle() {
  const v = /** @type {VistaTurno} */ (estado.vista);
  const confirmar = v.asistenciaConfirmada ? '' : html`<button type="button" class="btn btn-primary" id="confirmar" data-accion="confirmar" data-k="confirmar">Confirmar asistencia</button>`;
  const aviso = estado.aviso ? avisoHtml(estado.aviso) : '';
  const cuerpo = v.gestionOnline
    ? html`${aviso}<div class="actions"><button type="button" class="btn btn-danger-ghost" data-accion="cancelar" data-k="cancelar">Cancelar turno</button><button type="button" class="btn btn-secondary" data-accion="reprogramar" data-k="reprogramar">Reprogramar</button>${confirmar}</div>${limiteDeGestion(v)}`
    : html`<div class="alert a-warning mt-4" role="status">${icono('i-clock')}<div><strong>Faltan menos de 24 h para tu turno</strong><p>Ya no se puede cancelar ni reprogramar online. Si no podés venir, avisá al consultorio:</p>${botonesDeContacto(v)}</div></div>${aviso}${confirmar === '' ? '' : html`<div class="actions">${confirmar}</div>`}`;
  return html`<div class="layout with-aside"><section class="panel" aria-labelledby="h1">
    ${cabeceraDeTurno(v, v.asistenciaConfirmada ? 'confirmado' : 'reservado')}
    ${cuerpo}
  </section>${aside(v, !v.gestionOnline)}</div>`;
}

function pantallaCancelado() {
  const v = /** @type {VistaTurno} */ (estado.vista);
  return html`<div class="layout with-aside"><section class="panel" aria-labelledby="h1">
    ${cabeceraDeTurno(v, 'cancelado')}
    <div class="alert a-success mt-4" role="status" tabindex="-1">${icono('i-check')}<div><strong>Cancelaste tu turno.</strong><p>El horario quedó libre. Si querés, podés reservar otro.</p></div></div>
    <div class="actions"><a class="btn btn-primary" href="/public/reservar">Reservar un turno nuevo</a></div>
  </section>${aside(v)}</div>`;
}

function pantallaReprogramar() {
  const v = /** @type {VistaTurno} */ (estado.vista);
  const e = estado;
  const z = zona();
  let horarios;
  if (e.cargaHorarios === 'cargando' || e.cargaHorarios === 'idle') horarios = htmlCargando('Buscando horarios libres…');
  else if (e.cargaHorarios === 'error') horarios = htmlErrorDeCarga('No pudimos cargar los horarios', 'reintentar-horarios');
  else if (e.horarios.length === 0) horarios = htmlVacio(e.proximoDia, '');
  else horarios = htmlGrupos(e.horarios, e.inicio, z, 'Horarios libres');
  const dia = partesDeDia(e.fecha);
  const seleccion = e.inicio ? `${dia.semana} ${dia.numero}, ${hora(e.inicio, z)}` : '';
  const alertaOcupado = e.ocupado
    ? html`<div class="alert a-danger" role="alert" tabindex="-1">${icono('i-alert')}<div><strong>Ese horario se acaba de ocupar</strong><p>Elegí otro horario de la lista.</p></div></div>`
    : e.aviso
      ? avisoHtml(e.aviso)
      : '';
  return html`<div class="layout with-aside"><section class="panel" aria-labelledby="h1">
    <p class="step-label">Reprogramar turno</p>
    <div class="page-head"><h1 id="h1" tabindex="-1">Elegí el nuevo horario</h1><p>Seguís con ${nombreCompleto(v.profesional)} y la misma prestación. Tu turno actual se mantiene hasta que confirmes el cambio.</p></div>
    <p class="summary-inline">Turno actual: <b>${partesDeDia(fechaLocalDe(v.inicio, z)).corta} ${hora(v.inicio, z)}</b> · ${v.prestacion.nombre} · ${nombreCompleto(v.profesional)}</p>
    <div class="stack">${alertaOcupado}${htmlDias(v.diasReservables, e.fecha)}<div><div class="field-title" id="t-hora">Horarios libres <span>${partesDeDia(e.fecha).larga}</span></div>${horarios}</div></div>
    <div class="alert a-info mt-4">${icono('i-info')}<div><p>El mismo enlace sigue sirviendo para el turno nuevo.</p></div></div>
    <div class="sticky-actions"><button type="button" class="btn btn-secondary" data-accion="volver" data-k="volver">Volver</button><button type="button" class="btn btn-primary" data-accion="confirmar-cambio" data-k="confirmar-cambio" ${crudo(e.inicio === '' ? 'disabled' : '')}>${e.inicio ? `Cambiar a ${seleccion}` : 'Cambiar horario'}</button></div>
  </section>${aside(v)}</div>`;
}

/** @param {string} instante @param {string} z */
function fechaLocalDe(instante, z) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: z, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(instante));
  return p;
}

function pantallaInvalida() {
  return html`<div class="layout"><section class="panel panel-narrow" aria-labelledby="h1">
    <div class="success-head"><span class="success-mark is-danger">${icono('i-link', '')}</span><h1 id="h1" tabindex="-1">El enlace no es válido o ya no está vigente.</h1></div>
    <div class="stack-sm muted"><p>Si recibiste un recordatorio por e-mail, abrí el enlace de ese último e-mail: cada recordatorio reemplaza al enlace anterior.</p><p>Si el turno ya pasó o fue cancelado, el enlace deja de funcionar. Ante cualquier duda, comunicate con el consultorio.</p></div>
    <div class="actions"><a class="btn btn-primary" href="/public/reservar">Reservar un turno</a></div>
  </section></div>`;
}

function pantallaError() {
  return html`<div class="layout"><section class="panel panel-narrow" aria-labelledby="h1">
    <h1 id="h1" tabindex="-1" class="visually-hidden">Tu turno</h1>
    ${htmlErrorDeCarga('No pudimos cargar tu turno', 'reintentar')}
  </section></div>`;
}

function vista() {
  switch (estado.pantalla) {
    case 'cargando':
      return html`<div class="layout"><section class="panel panel-narrow" aria-labelledby="h1"><h1 id="h1" tabindex="-1" class="visually-hidden">Tu turno</h1>${htmlCargando('Buscando tu turno…')}</section></div>`;
    case 'detalle':
      return pantallaDetalle();
    case 'reprogramar':
      return pantallaReprogramar();
    case 'cancelado':
      return pantallaCancelado();
    case 'invalido':
      return pantallaInvalida();
    default:
      return pantallaError();
  }
}

function dibujar() {
  pintar(app, vista());
  app.setAttribute('aria-busy', String(estado.pantalla === 'cargando'));
}

// ---------------------------------------------------------------- eventos

app.addEventListener('click', (evento) => {
  const origen = evento.target instanceof Element ? evento.target.closest('[data-accion]') : null;
  if (!(origen instanceof HTMLElement) || /** @type {HTMLButtonElement} */ (origen).disabled) return;
  const { accion, fecha, inicio, fin } = origen.dataset;
  switch (accion) {
    case 'reintentar':
      void cargar();
      break;
    case 'reintentar-horarios':
      void cargarHorarios();
      break;
    case 'confirmar':
      void confirmarAsistencia();
      break;
    case 'cancelar':
      void cancelarTurno();
      break;
    case 'reprogramar':
      abrirReprogramacion();
      break;
    case 'volver':
      estado.pantalla = 'detalle';
      estado.aviso = null;
      dibujar();
      enfocar(document.getElementById('h1'));
      break;
    case 'dia':
      if (fecha) elegirDia(fecha);
      break;
    case 'horario':
      if (inicio && fin) {
        estado.inicio = inicio;
        estado.fin = fin;
        estado.ocupado = false;
        dibujar();
      }
      break;
    case 'elegir-otro-dia':
      enfocar(app.querySelector('.day[aria-checked="true"]'));
      break;
    case 'confirmar-cambio':
      void confirmarReprogramacion();
      break;
    default:
      break;
  }
});

app.addEventListener('keydown', (evento) => manejarTeclasDeRadio(evento, app));

void cargar();
