// @ts-check
import { esc } from './dom.js';

/**
 * Diálogo de confirmación accesible con `<dialog>` nativo: foco atrapado, Escape cancela y el foco
 * vuelve al botón que lo abrió. Devuelve `true` solo si se confirma.
 * @param {{ titulo: string, descripcion: string, confirmar: string, cancelar: string, peligro?: boolean }} opciones
 * @returns {Promise<boolean>}
 */
export function confirmarConDialogo({ titulo, descripcion, confirmar, cancelar, peligro = false }) {
  const origen = document.activeElement;
  const dialogo = document.createElement('dialog');
  dialogo.className = 'dialog';
  dialogo.setAttribute('aria-labelledby', 'dlg-t');
  dialogo.setAttribute('aria-describedby', 'dlg-d');
  dialogo.innerHTML = `
    <h2 id="dlg-t">${esc(titulo)}</h2>
    <p id="dlg-d">${esc(descripcion)}</p>
    <div class="actions">
      <button type="button" class="btn btn-secondary" data-r="no">${esc(cancelar)}</button>
      <button type="button" class="btn ${peligro ? 'btn-danger' : 'btn-primary'}" data-r="si">${esc(confirmar)}</button>
    </div>`;
  document.body.append(dialogo);
  return new Promise((resolver) => {
    dialogo.addEventListener('click', (evento) => {
      const boton = evento.target instanceof Element ? evento.target.closest('button[data-r]') : null;
      if (boton instanceof HTMLElement) dialogo.close(boton.dataset['r'] === 'si' ? 'si' : 'no');
    });
    dialogo.addEventListener('close', () => {
      const confirmado = dialogo.returnValue === 'si';
      dialogo.remove();
      if (origen instanceof HTMLElement && origen.isConnected) origen.focus();
      resolver(confirmado);
    });
    dialogo.showModal();
    // El foco empieza en la opción segura (volver), no en la destructiva.
    /** @type {HTMLElement | null} */ (dialogo.querySelector('[data-r="no"]'))?.focus();
  });
}
