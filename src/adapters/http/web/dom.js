// @ts-check
// Plantillas HTML con escape automático y utilidades de DOM. Sin dependencias.

class Crudo {
  /** @param {string} texto */
  constructor(texto) {
    this.texto = texto;
  }
}

/**
 * Marca un fragmento ya seguro (por ejemplo, el resultado de otra plantilla).
 * @param {string} texto
 */
export function crudo(texto) {
  return new Crudo(texto);
}

/** @param {unknown} valor */
export function esc(valor) {
  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Etiqueta de plantilla: escapa cada valor salvo los marcados con `crudo()`; los arreglos se unen.
 * @param {TemplateStringsArray} cadenas
 * @param {...unknown} valores
 * @returns {Crudo}
 */
export function html(cadenas, ...valores) {
  let salida = cadenas[0] ?? '';
  valores.forEach((v, i) => {
    const lista = Array.isArray(v) ? v : [v];
    salida += lista.map((x) => (x instanceof Crudo ? x.texto : x === null || x === undefined || x === false ? '' : esc(x))).join('');
    salida += cadenas[i + 1] ?? '';
  });
  return new Crudo(salida);
}

/**
 * Ícono del sprite de la página.
 * @param {string} nombre i-alert, i-check, i-info, i-cal, i-tooth, i-user, i-pin, i-phone, i-mail, i-copy, i-clock, i-link
 * @param {string} [clase]
 */
export function icono(nombre, clase = 'icon') {
  return crudo(`<svg class="${esc(clase)}" aria-hidden="true" focusable="false"><use href="#${esc(nombre)}"/></svg>`);
}

/**
 * Escribe una plantilla en un contenedor y restaura el foco y el desplazamiento de los días.
 * Los elementos enfocables se identifican con `data-k` para sobrevivir al re-render.
 * @param {HTMLElement} contenedor
 * @param {Crudo} plantilla
 */
export function pintar(contenedor, plantilla) {
  const activo = document.activeElement;
  const clave = activo instanceof HTMLElement && contenedor.contains(activo) ? activo.dataset['k'] : undefined;
  const desplazamiento = contenedor.querySelector('.days')?.scrollLeft ?? 0;
  contenedor.innerHTML = plantilla.texto;
  const dias = contenedor.querySelector('.days');
  if (dias) dias.scrollLeft = desplazamiento;
  if (clave !== undefined) {
    const nuevo = contenedor.querySelector(`[data-k="${CSS.escape(clave)}"]`);
    if (nuevo instanceof HTMLElement) nuevo.focus({ preventScroll: true });
  }
}

/**
 * Lleva el foco a un elemento y lo muestra, sin animación.
 * @param {Element | null} elemento
 */
export function enfocar(elemento) {
  if (elemento instanceof HTMLElement) elemento.focus();
}

/** @param {string} selector @param {ParentNode} [raiz] */
export function q(selector, raiz = document) {
  return raiz.querySelector(selector);
}
