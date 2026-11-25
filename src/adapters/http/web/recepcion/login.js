// @ts-check
// Login del personal (C-15, interfaz-recepcion: "Inicio de sesión").
import { api } from './api.js';
import { buscar, h, icono } from './dom.js';
import { guardarSesion, leerSesion } from './sesion.js';

const formulario = buscar('#login', HTMLFormElement);
const email = buscar('#email', HTMLInputElement);
const clave = buscar('#clave', HTMLInputElement);
const aviso = buscar('#login-aviso', HTMLElement);
const boton = buscar('#ingresar', HTMLButtonElement);

if (leerSesion() !== null && !new URLSearchParams(window.location.search).has('vencida')) window.location.replace('/recepcion');

if (new URLSearchParams(window.location.search).has('vencida')) {
  aviso.replaceChildren(
    h('div', { class: 'alert a-info', role: 'status' }, icono('i-info'), h('div', {}, h('strong', { text: 'Tu sesión venció. Iniciá sesión de nuevo.' }))),
  );
}
email.focus();

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  boton.disabled = true;
  const r = await api.login(email.value, clave.value);
  boton.disabled = false;
  if (r.ok) {
    guardarSesion(/** @type {import('./sesion.js').Sesion} */ (r.datos));
    window.location.assign('/recepcion');
    return;
  }
  const texto = r.red ? 'No pudimos conectarnos. Probá de nuevo.' : 'E-mail o clave incorrectos.';
  aviso.replaceChildren(
    h('div', { class: 'alert a-danger', role: 'alert' }, icono('i-alert'), h('div', {}, h('strong', { text: texto }), r.red ? null : h('p', { text: 'Revisalos y probá de nuevo.' }))),
  );
  clave.value = '';
  clave.focus();
});
