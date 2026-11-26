import { afterAll, afterEach, beforeEach, describe, expect, test } from 'vitest';
import { cerrarNavegador, ESCRITORIO, iniciarArnes, type Arnes } from './arnes.js';

/** Escenarios de `specs/portada/spec.md` (mejora-visual-ui). */
let arnes: Arnes;
beforeEach(async () => {
  arnes = await iniciarArnes();
});
afterEach(async () => {
  await arnes.cerrar();
});
afterAll(cerrarNavegador);

describe('La portada ofrece reservar e ingresar', () => {
  test('La portada ofrece reservar e ingresar', async () => {
    const { page, errores } = await arnes.nuevaPagina(ESCRITORIO);
    await page.goto(`${arnes.url}/`);
    const reservar = page.getByRole('link', { name: 'Reservar turno' });
    const ingresar = page.getByRole('link', { name: 'Soy del consultorio' });
    await expect(reservar.getAttribute('href')).resolves.toBe('/public/reservar');
    await expect(ingresar.getAttribute('href')).resolves.toBe('/recepcion/login');
    for (const enlace of [reservar, ingresar]) {
      const caja = await enlace.boundingBox();
      expect((caja?.y ?? 0) + (caja?.height ?? 0)).toBeLessThanOrEqual(ESCRITORIO.alto);
    }
    await expect(page.getByRole('heading', { level: 1 }).count()).resolves.toBe(1);
    const cuerpo = await page.locator('body').innerText();
    expect(cuerpo).toContain('Turnos Odonto');
    expect(cuerpo).not.toContain('(TBD)');
    expect(errores).toEqual([]);
  });

  test('Reservar desde la portada', async () => {
    const { page } = await arnes.nuevaPagina(ESCRITORIO);
    await page.goto(`${arnes.url}/`);
    await page.getByRole('link', { name: 'Reservar turno' }).click();
    await page.getByRole('heading', { name: '¿Qué necesitás?' }).waitFor();
    expect(new URL(page.url()).pathname).toBe('/public/reservar');
  });

  test('Portada en el celular', async () => {
    const { page } = await arnes.nuevaPagina({ ancho: 375, alto: 812 });
    await page.goto(`${arnes.url}/`);
    await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).resolves.toBe(true);
    for (const nombre of ['Reservar turno', 'Soy del consultorio']) {
      const caja = await page.getByRole('link', { name: nombre }).boundingBox();
      expect(caja?.height, nombre).toBeGreaterThanOrEqual(44);
      expect((caja?.y ?? 0) + (caja?.height ?? 0), nombre).toBeLessThanOrEqual(812);
    }
  });
});
