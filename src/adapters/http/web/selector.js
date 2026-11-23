// @ts-check
// Piezas de interfaz compartidas por la reserva y la reprogramación: selector de días, grupos de
// horarios, estados de carga y vacío, y navegación por teclado de los grupos de opciones.
import { crudo, enfocar, html, icono } from './dom.js';
import { hora, horaEntera, listarDias, partesDeDia } from './formato.js';

/** @typedef {import('./api.js').Horario} Horario */

/**
 * Selector de días `radiogroup` desde hoy hasta el último día reservable (RN-30, lo informa el servidor).
 * @param {{ desde: string, hasta: string }} dias
 * @param {string} seleccionado
 */
export function htmlDias(dias, seleccionado) {
  const botones = listarDias(dias.desde, dias.hasta).map((f) => {
    const p = partesDeDia(f);
    const sel = f === seleccionado;
    return html`<button type="button" class="day" role="radio" aria-checked="${sel}" tabindex="${sel ? 0 : -1}" aria-label="${p.larga}" data-accion="dia" data-fecha="${f}" data-k="dia-${f}">${f === dias.desde ? html`<span class="today">Hoy</span>` : html`<small>${p.semana}</small>`}<b>${p.numero}</b><small>${p.mes}</small></button>`;
  });
  const hasta = partesDeDia(dias.hasta);
  return html`<div><div class="field-title" id="t-dia">Día <span>hasta el ${hasta.semana} ${hasta.numero} de ${hasta.larga.split(' de ')[1] ?? ''}</span></div><div class="days" role="radiogroup" aria-labelledby="t-dia">${botones}</div></div>`;
}

/**
 * Horarios agrupados en mañana y tarde, como botones de dos estados.
 * @param {Horario[]} lista
 * @param {string} seleccionado inicio ISO elegido
 * @param {string} zona
 * @param {string} etiqueta
 */
export function htmlGrupos(lista, seleccionado, zona, etiqueta) {
  const grupo = (/** @type {string} */ nombre, /** @type {Horario[]} */ items) =>
    items.length === 0
      ? ''
      : html`<div class="slot-group"><h3>${nombre}</h3><div class="slots">${items.map(
          (h) => html`<button type="button" class="slot" aria-pressed="${h.inicio === seleccionado}" data-accion="horario" data-inicio="${h.inicio}" data-fin="${h.fin}" data-k="slot-${h.inicio}">${hora(h.inicio, zona)}</button>`,
        )}</div></div>`;
  return html`<div role="group" aria-label="${etiqueta}">${grupo('Mañana', lista.filter((h) => horaEntera(h.inicio, zona) < 13))}${grupo('Tarde', lista.filter((h) => horaEntera(h.inicio, zona) >= 13))}</div>`;
}

/** Indicador de carga anunciado a lectores de pantalla, con esqueletos. @param {string} texto */
export function htmlCargando(texto) {
  const esqueletos = Array.from({ length: 12 }, () => '<div class="skeleton" aria-hidden="true"></div>').join('');
  return html`<div aria-busy="true"><p class="loading-line" role="status"><span class="spinner" aria-hidden="true"></span>${texto}</p><div class="slots">${crudo(esqueletos)}</div></div>`;
}

/**
 * Estado vacío con una acción para seguir: el próximo día con horarios, o elegir otro día.
 * @param {string | null} proximo 'AAAA-MM-DD' del próximo día con horarios, si ya se encontró
 * @param {string} [sugerencia] qué más probar además de otro día
 */
export function htmlVacio(proximo, sugerencia = ' o con “Cualquiera”') {
  return html`<div class="empty" role="status">${icono('i-cal', 'icon-lg')}<h3>No hay horarios libres este día</h3><p>El consultorio no atiende o ya está completo. Probá con otro día${sugerencia}.</p>${
    proximo !== null
      ? html`<button type="button" class="btn btn-secondary" data-accion="dia" data-fecha="${proximo}" data-k="ver-proximo">Ver el ${partesDeDia(proximo).larga.replace(/ de .*/, '')}</button>`
      : html`<button type="button" class="btn btn-secondary" data-accion="elegir-otro-dia" data-k="otro-dia">Elegir otro día</button>`
  }</div>`;
}

/** Error de carga con "Reintentar". @param {string} titulo @param {string} accion */
export function htmlErrorDeCarga(titulo, accion) {
  return html`<div class="alert a-danger" role="alert">${icono('i-alert')}<div><strong>${titulo}</strong><p>Revisá tu conexión y probá de nuevo.</p><button type="button" class="btn btn-secondary" data-accion="${accion}" data-k="${accion}">Reintentar</button></div></div>`;
}

/**
 * Navegación con flechas, Inicio y Fin de un `radiogroup` (selección y foco).
 * @param {KeyboardEvent} evento
 * @param {HTMLElement} contenedor
 */
export function manejarTeclasDeRadio(evento, contenedor) {
  const t = evento.target;
  if (!(t instanceof HTMLElement) || t.getAttribute('role') !== 'radio') return;
  const grupo = t.closest('[role="radiogroup"]');
  if (!grupo) return;
  const opciones = /** @type {HTMLElement[]} */ ([...grupo.querySelectorAll('[role="radio"]')]);
  const i = opciones.indexOf(t);
  /** @type {Record<string, number>} */
  const salto = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  let destino = -1;
  if (evento.key in salto) destino = Math.min(opciones.length - 1, Math.max(0, i + (salto[evento.key] ?? 0)));
  else if (evento.key === 'Home') destino = 0;
  else if (evento.key === 'End') destino = opciones.length - 1;
  if (destino < 0) return;
  evento.preventDefault();
  const siguiente = opciones[destino];
  if (!siguiente) return;
  siguiente.click();
  const clave = siguiente.dataset['k'];
  if (clave) enfocar(contenedor.querySelector(`[data-k="${CSS.escape(clave)}"]`));
}

/**
 * Próximo día 'AAAA-MM-DD' (calendario).
 * @param {string} fecha
 */
export function diaSiguiente(fecha) {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a ?? 0, (m ?? 1) - 1, (d ?? 1) + 1)).toISOString().slice(0, 10);
}
