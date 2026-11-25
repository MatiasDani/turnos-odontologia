// @ts-check
// Ayudas de DOM de la interfaz de recepción (C-15). El texto siempre va con `textContent`, nunca con
// `innerHTML`: los datos (nombres, motivos) nunca se interpretan como HTML.

/**
 * @typedef {string | number | boolean | undefined | null | ((ev: Event) => void)} ValorAtributo
 * @typedef {Node | string | null | undefined | false} Hijo
 */

/**
 * Crea un elemento. Las claves `on*` agregan listeners; `class` y `text` tienen atajos; `style`
 * acepta un objeto de propiedades CSS (CSSOM, compatible con la CSP sin `unsafe-inline`).
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} etiqueta
 * @param {Record<string, ValorAtributo | Record<string, string>>} [props]
 * @param {...(Hijo | Hijo[])} hijos
 * @returns {HTMLElementTagNameMap[K]}
 */
export function h(etiqueta, props = {}, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(props)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave === 'class') el.className = String(valor);
    else if (clave === 'text') el.textContent = String(valor);
    else if (clave === 'style' && typeof valor === 'object') {
      for (const [prop, v] of Object.entries(valor)) el.style.setProperty(prop, v);
    } else if (clave.startsWith('on') && typeof valor === 'function') {
      el.addEventListener(clave.slice(2), /** @type {(ev: Event) => void} */ (valor));
    } else if (valor === true) el.setAttribute(clave, '');
    else el.setAttribute(clave, String(valor));
  }
  for (const hijo of hijos.flat()) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(typeof hijo === 'string' ? document.createTextNode(hijo) : hijo);
  }
  return el;
}

/**
 * Ícono del sprite de la página.
 * @param {string} id
 * @param {string} [clase]
 */
export function icono(id, clase = 'icon') {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', clase);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const uso = document.createElementNS(ns, 'use');
  uso.setAttribute('href', `#${id}`);
  svg.append(uso);
  return svg;
}

/**
 * @template {HTMLElement} T
 * @param {string} selector
 * @param {new () => T} tipo
 * @param {ParentNode} [raiz]
 * @returns {T}
 */
export function buscar(selector, tipo, raiz = document) {
  const el = raiz.querySelector(selector);
  if (!(el instanceof tipo)) throw new Error(`Falta ${selector}`);
  return el;
}

/**
 * Aviso breve (toast) con `role="status"`.
 * @param {string} texto
 * @param {'ok' | 'error'} [tipo]
 */
export function avisar(texto, tipo = 'ok') {
  const zona = buscar('#avisos', HTMLElement);
  zona.replaceChildren(h('div', { class: `toast${tipo === 'error' ? ' toast-error' : ''}`, role: tipo === 'error' ? 'alert' : 'status', text: texto }));
  window.setTimeout(() => {
    if (zona.firstChild?.textContent === texto) zona.replaceChildren();
  }, 6000);
}

/**
 * Abre el diálogo nativo compartido (`#dlg`) con título, contenido y pie. Al cerrarse devuelve el
 * foco al elemento que lo abrió.
 * @param {{ titulo: string, subtitulo?: string, cuerpo: Hijo[], pie: Hijo[], chico?: boolean, rol?: 'dialog' | 'alertdialog' }} contenido
 */
export function abrirDialogo(contenido) {
  const dialogo = buscar('#dlg', HTMLDialogElement);
  const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialogo.className = `dialog${contenido.chico ? ' sm' : ''}`;
  dialogo.setAttribute('role', contenido.rol ?? 'dialog');
  const cerrar = () => dialogo.close();
  dialogo.replaceChildren(
    h(
      'div',
      { class: 'dialog-head' },
      h('div', {}, h('h2', { id: 'dlg-titulo', text: contenido.titulo }), contenido.subtitulo ? h('p', { class: 'small muted', text: contenido.subtitulo }) : null),
      contenido.chico ? null : h('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'aria-label': 'Cerrar', onclick: cerrar }, icono('i-x')),
    ),
    ...contenido.cuerpo.filter((x) => x !== null && x !== undefined && x !== false).map((x) => (typeof x === 'string' ? h('p', { text: x }) : /** @type {Node} */ (x))),
    contenido.pie.length > 0 ? h('div', { class: 'dialog-foot' }, ...contenido.pie) : '',
  );
  dialogo.addEventListener('close', () => previo?.focus(), { once: true });
  if (!dialogo.open) dialogo.showModal();
  return { dialogo, cerrar };
}

/**
 * Alerta de error dentro de un formulario (`role="alert"`).
 * @param {string} titulo
 * @param {Hijo[]} [detalle]
 */
export function alertaError(titulo, detalle = []) {
  return h('div', { class: 'alert a-danger', role: 'alert' }, icono('i-alert'), h('div', {}, h('strong', { text: titulo }), ...detalle));
}
