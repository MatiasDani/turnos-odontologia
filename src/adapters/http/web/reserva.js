// @ts-check
// Reserva guiada en cuatro pasos (DD-30). Solo consume la API pública; el servidor decide los días
// reservables (RN-30), la anticipación (RN-08) y qué horarios están libres.
import { api } from './api.js';
import { crudo, enfocar, html, icono, pintar } from './dom.js';
import { capitalizar, fechaIso, fechaLarga, hora, nombreCompleto, partesDeDia } from './formato.js';
import { diaSiguiente, htmlCargando, htmlDias, htmlErrorDeCarga, htmlGrupos, htmlVacio, manejarTeclasDeRadio } from './selector.js';

/**
 * @typedef {import('./api.js').Catalogo} Catalogo
 * @typedef {import('./api.js').Prestacion} Prestacion
 * @typedef {import('./api.js').Profesional} Profesional
 * @typedef {import('./api.js').Horario} Horario
 * @typedef {import('./api.js').Reserva} Reserva
 * @typedef {{ dni: string, nombre: string, apellido: string, telefono: string, email: string, consentimiento: boolean }} Datos
 * @typedef {'dni' | 'nombre' | 'apellido' | 'telefono' | 'email' | 'consentimiento'} Campo
 * @typedef {'idle' | 'cargando' | 'ok' | 'error'} Carga
 * @typedef {{ paso: 1 | 2 | 3 | 4, catalogo: Catalogo | null, cargaCatalogo: Carga, prestacionId: string,
 *   profesionales: Profesional[], cargaProfesionales: Carga, profesionalId: string, fecha: string,
 *   horarios: Horario[], cargaHorarios: Carga, proximoDia: string | null, inicio: string, fin: string,
 *   datos: Datos, errores: Partial<Record<Campo, string>>, alerta: Alerta | null, oferta: Horario[] | null,
 *   enviando: boolean, reserva: Reserva | null }} Estado
 * @typedef {{ titulo: string, texto: string, accion?: { id: string, texto: string } }} Alerta
 */

const app = /** @type {HTMLElement} */ (document.getElementById('app'));
const LIMITE_BUSQUEDA_DIAS = 14;
const MENSAJES_CAMPO = {
  dni: 'El DNI tiene que tener 7 u 8 números.',
  nombre: 'Ingresá tu nombre.',
  apellido: 'Ingresá tu apellido.',
  telefono: 'Ingresá un teléfono para que el consultorio pueda contactarte.',
  telefonoFormato: 'Revisá el teléfono: ingresá el código de área y el número, por ejemplo 11 0000 0000.',
  email: 'Revisá el e-mail: tiene que tener un formato como nombre@correo.com.',
  consentimiento: 'Necesitamos tu consentimiento para reservar.',
};
/** Orden de los campos en el formulario (el foco va al primero inválido). */
const CAMPOS = /** @type {Campo[]} */ (['dni', 'nombre', 'apellido', 'telefono', 'email', 'consentimiento']);

/** @returns {Estado} */
function estadoInicial() {
  return {
    paso: 1,
    catalogo: null,
    cargaCatalogo: 'cargando',
    prestacionId: '',
    profesionales: [],
    cargaProfesionales: 'idle',
    profesionalId: '',
    fecha: '',
    horarios: [],
    cargaHorarios: 'idle',
    proximoDia: null,
    inicio: '',
    fin: '',
    datos: { dni: '', nombre: '', apellido: '', telefono: '', email: '', consentimiento: false },
    errores: {},
    alerta: null,
    oferta: null,
    enviando: false,
    reserva: null,
  };
}

let estado = estadoInicial();
let secuenciaHorarios = 0;

// ---------------------------------------------------------------- datos derivados

const zona = () => estado.catalogo?.consultorio.zonaHoraria ?? 'America/Argentina/Buenos_Aires';
const prestacion = () => estado.catalogo?.prestaciones.find((p) => p.id === estado.prestacionId);
const profesionalElegido = () => estado.profesionales.find((p) => p.id === estado.profesionalId);
const nombreProfesional = () => (estado.profesionalId === '' ? 'Cualquiera' : nombreCompleto(profesionalElegido() ?? { nombre: '', apellido: '' }));

/** @param {string} inicio @param {string} fin */
const rango = (inicio, fin) => `${hora(inicio, zona())} a ${hora(fin, zona())}`;

// ---------------------------------------------------------------- carga

async function cargarCatalogo() {
  estado.cargaCatalogo = 'cargando';
  dibujar();
  const r = await api.catalogo();
  if (!r.ok) {
    estado.cargaCatalogo = 'error';
    dibujar();
    return;
  }
  estado.catalogo = r.datos;
  estado.cargaCatalogo = 'ok';
  const nombre = r.datos.consultorio.nombre;
  document.getElementById('nombre-consultorio')?.replaceChildren(nombre);
  document.getElementById('pie-consultorio')?.replaceChildren(`${nombre} · `);
  document.title = `Reservá tu turno - ${nombre}`;
  dibujar();
}

async function cargarProfesionales() {
  estado.cargaProfesionales = 'cargando';
  dibujar();
  const r = await api.profesionales(estado.prestacionId);
  if (!r.ok) {
    estado.cargaProfesionales = 'error';
  } else {
    estado.profesionales = r.datos.profesionales;
    estado.cargaProfesionales = 'ok';
  }
  dibujar();
}

/** Carga los horarios del día elegido; ignora respuestas de consultas anteriores. */
async function cargarHorarios() {
  if (estado.fecha === '') return;
  const secuencia = ++secuenciaHorarios;
  estado.cargaHorarios = 'cargando';
  estado.proximoDia = null;
  dibujar();
  const r = await api.disponibilidad({
    prestacionId: estado.prestacionId,
    fecha: estado.fecha,
    ...(estado.profesionalId === '' ? {} : { profesionalId: estado.profesionalId }),
  });
  if (secuencia !== secuenciaHorarios) return;
  if (!r.ok) {
    estado.cargaHorarios = 'error';
    dibujar();
    return;
  }
  estado.horarios = r.datos.horarios;
  estado.cargaHorarios = 'ok';
  dibujar();
  if (estado.horarios.length === 0) void buscarProximoDia(secuencia);
}

/** Busca el próximo día con horarios libres para ofrecerlo en el estado vacío. */
/** @param {number} secuencia */
async function buscarProximoDia(secuencia) {
  const hasta = estado.catalogo?.diasReservables.hasta ?? '';
  let dia = estado.fecha;
  for (let i = 0; i < LIMITE_BUSQUEDA_DIAS; i++) {
    dia = diaSiguiente(dia);
    if (dia > hasta) break;
    const r = await api.disponibilidad({
      prestacionId: estado.prestacionId,
      fecha: dia,
      ...(estado.profesionalId === '' ? {} : { profesionalId: estado.profesionalId }),
    });
    if (secuencia !== secuenciaHorarios) return;
    if (!r.ok) break;
    if (r.datos.horarios.length > 0) {
      estado.proximoDia = dia;
      dibujar();
      return;
    }
  }
}

// ---------------------------------------------------------------- acciones

/** @param {1 | 2 | 3 | 4} paso */
function irAPaso(paso) {
  estado.paso = paso;
  estado.alerta = null;
  dibujar();
  const titulo = document.getElementById('h1');
  enfocar(titulo);
  window.scrollTo({ top: 0 });
}

function continuar() {
  if (estado.paso === 1 && estado.prestacionId !== '') {
    estado.profesionalId = '';
    estado.profesionales = [];
    estado.inicio = '';
    estado.fin = '';
    estado.horarios = [];
    estado.fecha = estado.catalogo?.diasReservables.desde ?? '';
    irAPaso(2);
    void cargarProfesionales();
    void cargarHorarios();
  } else if (estado.paso === 2 && estado.inicio !== '') {
    estado.oferta = null;
    irAPaso(3);
  } else if (estado.paso === 3) {
    void enviar();
  }
}

/** @param {string} profesionalId */
function elegirProfesional(profesionalId) {
  if (profesionalId === estado.profesionalId) return;
  estado.profesionalId = profesionalId;
  estado.inicio = '';
  estado.fin = '';
  void cargarHorarios();
}

/** @param {string} fecha */
function elegirDia(fecha) {
  if (fecha === estado.fecha) return;
  estado.fecha = fecha;
  estado.inicio = '';
  estado.fin = '';
  void cargarHorarios();
}

/** @param {string} inicio @param {string} fin */
function elegirHorario(inicio, fin) {
  estado.inicio = inicio;
  estado.fin = fin;
  dibujar();
}

/** @returns {Partial<Record<Campo, string>>} */
function validarDatos() {
  const d = estado.datos;
  /** @type {Partial<Record<Campo, string>>} */
  const errores = {};
  if (!/^\d{7,8}$/.test(d.dni.replaceAll('.', '').trim())) errores.dni = MENSAJES_CAMPO.dni;
  if (d.nombre.trim() === '' || d.nombre.trim().length > 80) errores.nombre = MENSAJES_CAMPO.nombre;
  if (d.apellido.trim() === '' || d.apellido.trim().length > 80) errores.apellido = MENSAJES_CAMPO.apellido;
  const digitos = d.telefono.replace(/\D/g, '').length;
  if (d.telefono.trim() === '') errores.telefono = MENSAJES_CAMPO.telefono;
  else if (digitos < 8 || digitos > 15) errores.telefono = MENSAJES_CAMPO.telefonoFormato;
  if (d.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) errores.email = MENSAJES_CAMPO.email;
  if (!d.consentimiento) errores.consentimiento = MENSAJES_CAMPO.consentimiento;
  return errores;
}

/** @param {number} cantidad */
function alertaDeRevision(cantidad) {
  return { titulo: `Revisá ${cantidad} ${cantidad === 1 ? 'dato' : 'datos'}`, texto: 'Marcamos cada campo con lo que hay que corregir.' };
}

function enfocarPrimerInvalido() {
  enfocar(app.querySelector('[aria-invalid="true"]'));
}

async function enviar() {
  if (estado.enviando) return;
  const errores = validarDatos();
  estado.errores = errores;
  const cantidad = Object.keys(errores).length;
  if (cantidad > 0) {
    estado.alerta = alertaDeRevision(cantidad);
    dibujar();
    enfocarPrimerInvalido();
    return;
  }
  estado.alerta = null;
  estado.enviando = true;
  dibujar();
  const d = estado.datos;
  const r = await api.reservar({
    prestacionId: estado.prestacionId,
    inicio: estado.inicio,
    ...(estado.profesionalId === '' ? {} : { profesionalId: estado.profesionalId }),
    paciente: {
      dni: d.dni.trim(),
      nombre: d.nombre.trim(),
      apellido: d.apellido.trim(),
      telefono: d.telefono.trim(),
      ...(d.email.trim() === '' ? {} : { email: d.email.trim() }),
      consentimientoContacto: true,
    },
  });
  estado.enviando = false;
  if (r.ok) {
    estado.reserva = r.datos;
    estado.oferta = null;
    irAPaso(4);
    return;
  }
  manejarErrorDeReserva(r);
}

/** @param {import('./api.js').Fallo} fallo */
function manejarErrorDeReserva(fallo) {
  const { codigo, campos, nuevaOferta } = fallo.error;
  estado.oferta = null;
  if (fallo.red) {
    estado.alerta = { titulo: 'No pudimos confirmar tu turno', texto: 'Revisá tu conexión y probá de nuevo. Tus datos siguen cargados.' };
  } else if (codigo === 'DATOS_INVALIDOS') {
    const mapa = /** @type {Record<string, Campo>} */ ({
      'paciente.dni': 'dni',
      'paciente.nombre': 'nombre',
      'paciente.apellido': 'apellido',
      'paciente.telefono': 'telefono',
      'paciente.email': 'email',
      'paciente.consentimientoContacto': 'consentimiento',
    });
    /** @type {Partial<Record<Campo, string>>} */
    const errores = {};
    for (const c of campos ?? []) {
      const campo = mapa[c];
      if (campo !== undefined) errores[campo] = campo === 'telefono' ? MENSAJES_CAMPO.telefonoFormato : MENSAJES_CAMPO[campo];
    }
    estado.errores = errores;
    const cantidad = Object.keys(errores).length;
    estado.alerta =
      cantidad > 0
        ? alertaDeRevision(cantidad)
        : { titulo: 'Revisá la prestación y el horario', texto: 'Algo de lo que elegiste ya no es válido. Volvé a elegir y probá de nuevo.', accion: { id: 'volver', texto: 'Volver a elegir' } };
  } else if (codigo === 'HORARIO_NO_DISPONIBLE') {
    const oferta = nuevaOferta ?? [];
    estado.oferta = oferta;
    estado.alerta =
      oferta.length > 0
        ? {
            titulo: 'Ese horario se acaba de ocupar',
            texto: `Alguien reservó las ${hora(estado.inicio, zona())} mientras completabas tus datos. Elegí otro horario del ${fechaLarga(estado.inicio, zona())}; tus datos quedan cargados.`,
          }
        : { titulo: 'Ese horario se acaba de ocupar', texto: 'Ya no queda disponible. Elegí otro día u horario; tus datos quedan cargados.', accion: { id: 'volver', texto: 'Elegir otro horario' } };
    estado.inicio = '';
    estado.fin = '';
  } else if (codigo === 'RESERVA_DUPLICADA') {
    estado.alerta = { titulo: 'Ya tenés una reserva para ese horario', texto: 'Si necesitás cambiarla, usá el enlace de gestión que recibiste o comunicate con el consultorio.' };
  } else if (codigo === 'LIMITE_DE_TURNOS') {
    estado.alerta = { titulo: 'Llegaste al máximo de turnos online', texto: 'Para reservar otro, comunicate con el consultorio.' };
  } else if (codigo === 'RESERVA_EN_PASADO' || codigo === 'PRESTACION_NO_DISPONIBLE' || codigo === 'PROFESIONAL_NO_DISPONIBLE') {
    estado.alerta = { titulo: 'Esa opción ya no está disponible', texto: 'Volvé a elegir la prestación, el profesional o el horario.', accion: { id: 'volver', texto: 'Volver a elegir' } };
  } else {
    estado.alerta = { titulo: 'No pudimos confirmar tu turno', texto: 'Ocurrió un problema de nuestro lado. Probá de nuevo en unos minutos.' };
  }
  dibujar();
  if (Object.keys(estado.errores).length > 0 && codigo === 'DATOS_INVALIDOS') enfocarPrimerInvalido();
  else enfocar(app.querySelector('[role="alert"]'));
}

async function copiarEnlace() {
  const campo = document.getElementById('enlace');
  const estadoCopia = document.getElementById('estado-copia');
  if (!(campo instanceof HTMLInputElement) || !estadoCopia) return;
  try {
    await navigator.clipboard.writeText(campo.value);
    estadoCopia.textContent = 'Enlace copiado.';
  } catch {
    campo.select();
    estadoCopia.textContent = 'Copialo manualmente: el enlace quedó seleccionado.';
  }
}

// ---------------------------------------------------------------- vistas

function aside() {
  const e = estado;
  const p = prestacion();
  const pendiente = crudo('<dd class="pending">Sin elegir</dd>');
  const conProfesional = e.paso >= 2 || e.reserva !== null;
  return html`<aside class="aside" aria-label="Resumen de tu turno"><div class="panel">
    <h2>Tu turno</h2>
    <dl class="summary">
      <div><dt>Prestación</dt>${p ? html`<dd>${p.nombre} · ${p.duracionMinutos} min</dd>` : pendiente}</div>
      <div><dt>Profesional</dt>${conProfesional ? html`<dd>${e.reserva ? nombreCompleto(e.reserva.profesional) : nombreProfesional()}</dd>` : pendiente}</div>
      <div><dt>Día</dt>${e.paso >= 2 && e.fecha ? html`<dd>${capitalizar(e.reserva ? fechaLarga(e.reserva.inicio, zona()) : partesDeDia(e.fecha).larga)}</dd>` : pendiente}</div>
      <div><dt>Horario</dt>${e.inicio ? html`<dd>${rango(e.inicio, e.fin)}</dd>` : e.reserva ? html`<dd>${rango(e.reserva.inicio, e.reserva.fin)}</dd>` : pendiente}</div>
    </dl>
    <p class="note">Podés cancelar o reprogramar online hasta 24 h antes del turno.</p>
  </div></aside>`;
}

/** @param {number} n @param {string} nombre */
function cabeceraDePaso(n, nombre) {
  const barras = [1, 2, 3, 4].map((i) => (i <= n ? '<li class="on"></li>' : '<li class=""></li>')).join('');
  return html`<ol class="steps" aria-hidden="true">${crudo(barras)}</ol><p class="step-label">Paso ${n} de 4 · ${nombre}</p>`;
}

/** @param {Alerta} a @param {string} [tipo] */
function alerta(a, tipo = 'a-danger') {
  return html`<div class="alert ${tipo}" role="alert">${icono('i-alert')}<div><strong>${a.titulo}</strong><p>${a.texto}</p>${
    a.accion ? html`<button type="button" class="btn btn-secondary" data-accion="${a.accion.id}" data-k="alerta-accion">${a.accion.texto}</button>` : ''
  }</div></div>`;
}

function pasoPrestacion() {
  const e = estado;
  let cuerpo;
  if (e.cargaCatalogo === 'cargando') cuerpo = htmlCargando('Cargando prestaciones…');
  else if (e.cargaCatalogo === 'error') {
    cuerpo = html`<div class="alert a-danger" role="alert">${icono('i-alert')}<div><strong>No pudimos cargar las prestaciones</strong><p>Revisá tu conexión y probá de nuevo. Si el problema sigue, llamá al consultorio.</p><button type="button" class="btn btn-secondary" data-accion="reintentar-catalogo" data-k="reintentar">Reintentar</button></div></div>`;
  } else {
    const lista = (e.catalogo?.prestaciones ?? []).map(
      (p) => html`<label class="choice ${p.id === e.prestacionId ? 'is-on' : ''}"><input type="radio" name="prestacion" value="${p.id}" data-k="prestacion-${p.id}" ${crudo(p.id === e.prestacionId ? 'checked' : '')}><span class="dot"></span><span class="grow"><b>${p.nombre}</b><span class="dur">Duración aproximada: <span class="mono">${p.duracionMinutos} min</span></span></span></label>`,
    );
    cuerpo = html`<fieldset class="choices"><legend class="visually-hidden">Prestación</legend>${lista}</fieldset>
    <div class="sticky-actions"><button type="button" class="btn btn-primary" data-accion="continuar" data-k="continuar" ${crudo(e.prestacionId === '' ? 'disabled' : '')}>Continuar</button></div>`;
  }
  return html`<div class="layout with-aside"><section class="panel" aria-labelledby="h1">
    ${cabeceraDePaso(1, 'Prestación')}
    <div class="page-head"><h1 id="h1" tabindex="-1">¿Qué necesitás?</h1><p>Elegí la prestación. La duración es aproximada y la define el consultorio.</p></div>
    ${cuerpo}
  </section>${aside()}</div>`;
}

function seccionProfesional() {
  const e = estado;
  const chips = [{ id: '', nombre: 'Cualquiera', apellido: '' }, ...e.profesionales].map(
    (p) => html`<button type="button" class="chip" role="radio" aria-checked="${p.id === e.profesionalId}" tabindex="${p.id === e.profesionalId ? 0 : -1}" data-accion="profesional" data-id="${p.id}" data-k="prof-${p.id || 'cualquiera'}">${p.id === '' ? 'Cualquiera' : nombreCompleto(p)}</button>`,
  );
  const aviso =
    e.cargaProfesionales === 'error'
      ? html`<p class="hint mt-2">No pudimos cargar los profesionales. Podés seguir con “Cualquiera”. <button type="button" class="btn btn-secondary" data-accion="reintentar-profesionales" data-k="reintentar-prof">Reintentar</button></p>`
      : e.cargaProfesionales === 'cargando'
        ? html`<p class="loading-line mt-2" role="status"><span class="spinner" aria-hidden="true"></span>Cargando profesionales…</p>`
        : '';
  return html`<div><div class="field-title" id="t-prof">Profesional <span>opcional</span></div><div class="chips" role="radiogroup" aria-labelledby="t-prof">${chips}</div>${aviso}</div>`;
}

function seccionDias() {
  return estado.catalogo ? htmlDias(estado.catalogo.diasReservables, estado.fecha) : '';
}

/** @param {Horario[]} lista @param {string} etiqueta */
function listaDeHorarios(lista, etiqueta) {
  return htmlGrupos(lista, estado.inicio, zona(), etiqueta);
}

function seccionHorarios() {
  const e = estado;
  const dia = e.fecha ? partesDeDia(e.fecha).larga : '';
  const titulo = html`<div class="field-title" id="t-hora">Horarios libres <span>${dia}</span></div>`;
  let cuerpo;
  if (e.cargaHorarios === 'cargando' || e.cargaHorarios === 'idle') cuerpo = htmlCargando('Buscando horarios libres…');
  else if (e.cargaHorarios === 'error') {
    cuerpo = htmlErrorDeCarga('No pudimos cargar los horarios', 'reintentar-horarios');
  } else if (e.horarios.length === 0) {
    cuerpo = htmlVacio(e.proximoDia);
  } else cuerpo = listaDeHorarios(e.horarios, 'Horarios libres');
  return html`<div id="seccion-horarios">${titulo}${cuerpo}</div>`;
}

function pasoHorario() {
  const e = estado;
  const p = prestacion();
  return html`<div class="layout with-aside"><section class="panel" aria-labelledby="h1">
    ${cabeceraDePaso(2, 'Profesional y horario')}
    <div class="page-head"><h1 id="h1" tabindex="-1">Elegí día y horario</h1><p>Mostramos solo horarios libres de verdad, para los próximos 30 días.</p></div>
    <p class="summary-inline"><b>${p?.nombre ?? ''}</b> · ${p?.duracionMinutos ?? ''} min · <b>${nombreProfesional()}</b>${e.inicio ? html` · <b>${partesDeDia(fechaIso(e.inicio, zona())).corta} ${hora(e.inicio, zona())}</b>` : ''}</p>
    <div class="stack">${seccionProfesional()}${seccionDias()}${seccionHorarios()}</div>
    <div class="sticky-actions"><button type="button" class="btn btn-secondary" data-accion="volver" data-k="volver">Volver</button><button type="button" class="btn btn-primary" data-accion="continuar" data-k="continuar" ${crudo(e.inicio === '' || e.cargaHorarios !== 'ok' ? 'disabled' : '')}>Continuar</button></div>
  </section>${aside()}</div>`;
}

/** @param {Campo} campo @param {string} id */
function errorDe(campo, id) {
  const mensaje = estado.errores[campo];
  return mensaje ? html`<p class="err" id="${id}-e">${icono('i-alert')}${mensaje}</p>` : '';
}

/** @param {Campo} campo @param {string} id @param {string} [ayuda] */
function describe(campo, id, ayuda = '') {
  return [ayuda ? `${id}-h` : '', estado.errores[campo] ? `${id}-e` : ''].filter(Boolean).join(' ');
}

function pasoDatos() {
  const e = estado;
  const d = e.datos;
  const p = prestacion();
  const inv = (/** @type {Campo} */ c) => (e.errores[c] ? 'true' : 'false');
  const formulario = html`<form class="form-grid" novalidate data-form="datos">
    <div class="field"><label for="dni">DNI</label><input class="input" id="dni" name="dni" type="text" value="${d.dni}" aria-invalid="${inv('dni')}" aria-describedby="${describe('dni', 'dni', 'h')}" inputmode="numeric" autocomplete="off" data-k="f-dni"><p class="hint" id="dni-h">Sin puntos. Ej.: 30000001</p>${errorDe('dni', 'dni')}</div>
    <div class="field"><label for="nom">Nombre</label><input class="input" id="nom" name="nombre" type="text" value="${d.nombre}" aria-invalid="${inv('nombre')}" aria-describedby="${describe('nombre', 'nom')}" autocomplete="given-name" data-k="f-nom">${errorDe('nombre', 'nom')}</div>
    <div class="field"><label for="ape">Apellido</label><input class="input" id="ape" name="apellido" type="text" value="${d.apellido}" aria-invalid="${inv('apellido')}" aria-describedby="${describe('apellido', 'ape')}" autocomplete="family-name" data-k="f-ape">${errorDe('apellido', 'ape')}</div>
    <div class="field"><label for="tel">Teléfono</label><input class="input" id="tel" name="telefono" type="tel" value="${d.telefono}" aria-invalid="${inv('telefono')}" aria-describedby="${describe('telefono', 'tel', 'h')}" autocomplete="tel" data-k="f-tel"><p class="hint" id="tel-h">Con código de área. Ej.: 11 0000 0000</p>${errorDe('telefono', 'tel')}</div>
    <div class="field full"><label for="mail">E-mail <span class="opt">(opcional)</span></label><input class="input" id="mail" name="email" type="email" value="${d.email}" aria-invalid="${inv('email')}" aria-describedby="${describe('email', 'mail', 'h')}" autocomplete="email" data-k="f-mail"><p class="hint" id="mail-h">Te mandamos el recordatorio y el enlace para gestionar el turno.</p>${errorDe('email', 'mail')}</div>
    <div class="field full"><div class="check ${e.errores.consentimiento ? 'is-invalid' : ''}"><input type="checkbox" id="cons" name="consentimiento" ${crudo(d.consentimiento ? 'checked' : '')} aria-invalid="${inv('consentimiento')}" aria-describedby="${describe('consentimiento', 'cons')}" data-k="f-cons"><label for="cons">Acepto que el consultorio me contacte por teléfono, WhatsApp o e-mail para gestionar este turno.</label></div>${errorDe('consentimiento', 'cons')}</div>
  </form>`;
  const otros = e.oferta !== null && e.oferta.length > 0
    ? html`<div><div class="field-title">Horarios libres <span>${fechaLarga(e.oferta[0]?.inicio ?? '', zona())}</span></div>${listaDeHorarios(e.oferta, 'Otros horarios libres')}</div>`
    : '';
  const resumen = e.inicio ? html`<b>${partesDeDia(fechaIso(e.inicio, zona())).corta} ${hora(e.inicio, zona())}</b>` : html`<b>Sin horario</b>`;
  return html`<div class="layout with-aside"><section class="panel" aria-labelledby="h1">
    ${cabeceraDePaso(3, 'Tus datos')}
    <div class="page-head"><h1 id="h1" tabindex="-1">Completá tus datos</h1><p>No hace falta crear una cuenta. Solo los usamos para este turno.</p></div>
    <p class="summary-inline"><b>${p?.nombre ?? ''}</b> · ${resumen} · ${nombreProfesional()}</p>
    <div class="stack">${e.alerta ? alerta(e.alerta) : ''}${otros}${formulario}</div>
    <div class="sticky-actions"><button type="button" class="btn btn-secondary" data-accion="volver" data-k="volver">Volver</button><button type="button" class="btn btn-primary" data-accion="continuar" data-k="continuar" ${crudo(e.enviando || e.inicio === '' ? 'disabled' : '')}>${e.enviando ? 'Confirmando…' : 'Confirmar turno'}</button></div>
  </section>${aside()}</div>`;
}

function pasoConfirmacion() {
  const r = /** @type {Reserva} */ (estado.reserva);
  const z = zona();
  const enlace = `${location.origin}/public/turnos/${r.token}`;
  const hecho = (/** @type {string} */ icon, /** @type {string} */ titulo, /** @type {ReturnType<typeof html>} */ valor) =>
    html`<div>${icono(icon)}<div><dt>${titulo}</dt><dd>${valor}</dd></div></div>`;
  return html`<div class="layout with-aside"><section class="panel" aria-labelledby="h1">
    ${cabeceraDePaso(4, 'Listo')}
    <div class="success-head"><span class="success-mark">${icono('i-check', '')}</span><div><h1 id="h1" tabindex="-1">Turno reservado</h1><p class="muted">Te esperamos en el consultorio.</p></div></div>
    <dl class="facts">
      ${hecho('i-cal', 'Día y horario', html`${capitalizar(fechaLarga(r.inicio, z))} · <span class="mono">${rango(r.inicio, r.fin)}</span>`)}
      ${hecho('i-tooth', 'Prestación', html`${r.prestacion.nombre}`)}
      ${hecho('i-user', 'Profesional', html`${nombreCompleto(r.profesional)}`)}
      ${hecho('i-pin', 'Dónde', html`${estado.catalogo?.consultorio.nombre ?? ''}`)}
    </dl>
    <div class="link-box">
      <h2>Guardá este enlace para gestionar tu turno</h2>
      <p class="hint">Con él podés confirmar, cancelar o reprogramar. Lo mostramos una sola vez.</p>
      <div class="link-row"><label for="enlace" class="visually-hidden">Enlace de gestión</label><input id="enlace" readonly value="${enlace}"><button type="button" class="btn btn-secondary" data-accion="copiar" data-k="copiar">${icono('i-copy')}Copiar enlace</button></div>
      <p class="hint link-copy-status" id="estado-copia" role="status"></p>
    </div>
    <div class="alert a-info mt-4">${icono('i-info')}<div><strong>Si te llega un recordatorio por e-mail</strong><p>Usá el enlace de ese e-mail: cada recordatorio trae uno nuevo y el anterior deja de funcionar.</p></div></div>
    <div class="actions"><button type="button" class="btn btn-secondary" data-accion="otro-turno" data-k="otro">Reservar otro turno</button><a class="btn btn-primary" href="/public/turnos/${r.token}">Ver mi turno</a></div>
  </section>${aside()}</div>`;
}

function vista() {
  switch (estado.paso) {
    case 1:
      return pasoPrestacion();
    case 2:
      return pasoHorario();
    case 3:
      return pasoDatos();
    default:
      return pasoConfirmacion();
  }
}

function dibujar() {
  pintar(app, vista());
  app.setAttribute('aria-busy', String(estado.cargaCatalogo === 'cargando'));
}

// ---------------------------------------------------------------- eventos

app.addEventListener('click', (evento) => {
  const origen = evento.target instanceof Element ? evento.target.closest('[data-accion]') : null;
  if (!(origen instanceof HTMLElement) || /** @type {HTMLButtonElement} */ (origen).disabled) return;
  const { accion, id, fecha, inicio, fin } = origen.dataset;
  switch (accion) {
    case 'reintentar-catalogo':
      void cargarCatalogo();
      break;
    case 'reintentar-profesionales':
      void cargarProfesionales();
      break;
    case 'reintentar-horarios':
      void cargarHorarios();
      break;
    case 'continuar':
      continuar();
      break;
    case 'volver':
      irAPaso(estado.paso === 3 ? 2 : 1);
      break;
    case 'profesional':
      elegirProfesional(id ?? '');
      break;
    case 'dia':
      if (fecha) elegirDia(fecha);
      break;
    case 'horario':
      if (inicio && fin) elegirHorario(inicio, fin);
      break;
    case 'elegir-otro-dia':
      enfocar(app.querySelector('.day[aria-checked="true"]'));
      break;
    case 'copiar':
      void copiarEnlace();
      break;
    case 'otro-turno': {
      const catalogo = estado.catalogo;
      estado = { ...estadoInicial(), catalogo, cargaCatalogo: 'ok' };
      irAPaso(1);
      break;
    }
    default:
      break;
  }
});

app.addEventListener('change', (evento) => {
  const t = evento.target;
  if (t instanceof HTMLInputElement && t.name === 'prestacion') {
    estado.prestacionId = t.value;
    dibujar();
  } else if (t instanceof HTMLInputElement && t.name === 'consentimiento') {
    estado.datos.consentimiento = t.checked;
  }
});

app.addEventListener('input', (evento) => {
  const t = evento.target;
  if (!(t instanceof HTMLInputElement) || t.type === 'checkbox' || !t.form) return;
  if (t.name in estado.datos) estado.datos[/** @type {'dni' | 'nombre' | 'apellido' | 'telefono' | 'email'} */ (t.name)] = t.value;
});

app.addEventListener('keydown', (evento) => manejarTeclasDeRadio(evento, app));

void cargarCatalogo();
