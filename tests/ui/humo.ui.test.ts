import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { cerrarNavegador, iniciarArnes, type Arnes } from './arnes.js';

let arnes: Arnes;
beforeAll(async () => {
  arnes = await iniciarArnes();
});
afterAll(async () => {
  await arnes.cerrar();
  await cerrarNavegador();
});

describe('Humo de la interfaz', () => {
  test('la página de reserva carga sin errores de consola', async () => {
    const { page, errores } = await arnes.nuevaPagina();
    await page.goto(`${arnes.url}/public/reservar`);
    await page.getByRole('heading', { name: '¿Qué necesitás?' }).waitFor();
    expect(errores).toEqual([]);
  });

  test('la página de gestión carga sin errores de consola', async () => {
    const { page, errores } = await arnes.nuevaPagina();
    await page.goto(`${arnes.url}/public/turnos/${arnes.token}`);
    await page.waitForLoadState('networkidle');
    expect(errores).toEqual([]);
  });
});
