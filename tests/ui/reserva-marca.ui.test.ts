import { afterAll, afterEach, beforeEach, describe, expect, test } from 'vitest';
import { cerrarNavegador, ESCRITORIO, iniciarArnes, type Arnes } from './arnes.js';
import { abrirReserva } from './flujos.js';

/** Escenarios de marca y diseño adaptable de `specs/interfaz-paciente/spec.md` (mejora-visual-ui). */
let arnes: Arnes;
beforeEach(async () => {
  arnes = await iniciarArnes();
});
afterEach(async () => {
  await arnes.cerrar();
});
afterAll(cerrarNavegador);

describe('Accesibilidad y diseño adaptable (marca)', () => {
  test('Encabezado con la marca aprobada', async () => {
    const { page } = await arnes.nuevaPagina(ESCRITORIO);
    await abrirReserva(page, arnes.url);
    const encabezado = page.locator('header.topbar');
    const texto = await encabezado.innerText();
    expect(texto).toContain('Turnos Odonto');
    for (const prohibido of ['(TBD)', 'LOGO PROVISIONAL']) expect(texto).not.toContain(prohibido);
    await expect(encabezado.getByRole('link', { name: 'Turnos Odonto, inicio' }).getAttribute('href')).resolves.toBe('/');
  });

  test('Sin desplazamiento horizontal en 375 px en la reserva', async () => {
    const { page } = await arnes.nuevaPagina({ ancho: 375, alto: 812 });
    await abrirReserva(page, arnes.url);
    await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).resolves.toBe(true);
  });
});
