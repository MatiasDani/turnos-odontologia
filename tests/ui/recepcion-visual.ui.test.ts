import { afterAll, afterEach, describe, expect, test } from 'vitest';
import { cerrarTodo, iniciarArnesRecepcion, type ArnesRecepcion } from './arnes-recepcion.js';

/** Escenarios visuales de `specs/interfaz-recepcion/spec.md` (mejora-visual-ui). `ahora`: lunes 23/11 10:00; `t-base` martes 09:00. */
let arnes: ArnesRecepcion | undefined;
afterEach(async () => {
  await arnes?.cerrar();
  arnes = undefined;
});
afterAll(async () => {
  await cerrarTodo();
});
const iniciar = async () => (arnes = await iniciarArnesRecepcion());
const CELULAR = { ancho: 375, alto: 812 } as const;

describe('Agenda legible en escritorio', () => {
  test('Nombre completo en un turno corto', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24', { ancho: 1280, alto: 800 });
    const nombre = page.locator('[data-turno="t-base"] b');
    await expect(nombre.textContent()).resolves.toBe('Carla Prueba');
    const medidas = await nombre.evaluate((b) => ({ contenido: b.scrollWidth, visible: b.clientWidth }));
    expect(medidas.contenido).toBeLessThanOrEqual(medidas.visible);
  });

  test('La navegación solo lleva a pantallas que existen', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24');
    const enlaces = await page.locator('.topbar a').evaluateAll((as) => as.map((x) => ({ href: x.getAttribute('href'), nombre: x.getAttribute('aria-label') })));
    expect(enlaces).toEqual([{ href: '/', nombre: 'Turnos Odonto, inicio' }]);
    await expect(page.getByRole('link', { name: 'Agenda' }).count()).resolves.toBe(0);
    await expect(page.getByRole('link', { name: 'Reserva online' }).count()).resolves.toBe(0);
  });

  test('La recepción muestra la marca definitiva', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24');
    const marca = await page.locator('.topbar').innerText();
    expect(marca).toContain('Turnos Odonto');
    for (const texto of ['(TBD)', 'LOGO PROVISIONAL']) expect(marca).not.toContain(texto);
    await expect(page.title()).resolves.not.toContain('(TBD)');
    const login = await a.pagina();
    await login.page.goto(`${a.url}/recepcion/login`);
    const marcaLogin = await login.page.locator('.brand').innerText();
    expect(marcaLogin).toContain('Turnos Odonto');
    expect(marcaLogin).not.toContain('(TBD)');
    const logo = await login.page.request.get(`${a.url}/public/design-system/assets/logo.svg`);
    await expect(logo.text()).resolves.not.toContain('PROVISIONAL');
  });
});

describe('Diseño adaptable de la recepción', () => {
  test('Sin desplazamiento horizontal en 375 px', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24', CELULAR);
    await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).resolves.toBe(true);
    for (const nombre of ['Salir', 'Dar turno', 'Bloquear horario']) {
      const caja = await page.getByRole('button', { name: nombre, exact: true }).boundingBox();
      expect(caja, nombre).not.toBeNull();
      expect(caja?.x, nombre).toBeGreaterThanOrEqual(0);
      expect((caja?.x ?? 0) + (caja?.width ?? 0), nombre).toBeLessThanOrEqual(375);
      expect(caja?.height, nombre).toBeGreaterThanOrEqual(44);
    }
  });

  test('La grilla no queda tapada por el panel', async () => {
    const a = await iniciar();
    await a.sistema.nucleo.recordatorios.programar('t-base');
    const { page } = await a.conSesion('u-rec', '2026-11-24', CELULAR);
    const titulo = page.getByText('Recordatorios por WhatsApp');
    await titulo.waitFor();
    const grilla = await page.locator('.agenda-wrap').boundingBox();
    const panel = await titulo.boundingBox();
    expect((grilla?.y ?? 0) + (grilla?.height ?? 0)).toBeLessThanOrEqual(panel?.y ?? 0);
    const desborda = await page.locator('.agenda-wrap').evaluate((w) => w.scrollWidth > w.clientWidth);
    expect(desborda).toBe(true);
    const ultima = await page.locator('.agenda-wrap').evaluate((w) => {
      w.scrollLeft = w.scrollWidth;
      const cabeceras = [...w.querySelectorAll('.ag-head')];
      const fin = cabeceras[cabeceras.length - 1]?.getBoundingClientRect().right ?? 0;
      return fin <= w.getBoundingClientRect().right + 1;
    });
    expect(ultima).toBe(true);
  });

  test('Acciones fijas al pie en el celular', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24', CELULAR);
    for (const nombre of ['Bloquear horario', 'Dar turno']) {
      const caja = await page.getByRole('button', { name: nombre, exact: true }).boundingBox();
      expect((caja?.y ?? 0) + (caja?.height ?? 0), nombre).toBeGreaterThanOrEqual(812 - 24);
    }
    await expect(page.locator('.rc-actions').evaluate((el) => getComputedStyle(el).position)).resolves.toBe('fixed');
    await page.getByRole('button', { name: /09:00, Carla Prueba/ }).click({ timeout: 5000 });
    await page.locator('#panel').getByRole('heading', { name: 'Turno' }).waitFor();
  });

  test('El detalle se muestra al elegir un turno en el celular', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24', CELULAR);
    await page.getByRole('button', { name: /09:00, Carla Prueba/ }).click();
    const encabezado = page.locator('#panel').getByRole('heading', { name: 'Turno' });
    await encabezado.waitFor();
    await page.waitForFunction(() => {
      const r = document.querySelector('#panel h2')?.getBoundingClientRect();
      return r !== undefined && r.top >= 0 && r.bottom <= window.innerHeight;
    });
    const caja = await encabezado.boundingBox();
    expect(caja?.y).toBeGreaterThanOrEqual(0);
    expect((caja?.y ?? 0) + (caja?.height ?? 0)).toBeLessThanOrEqual(812);
  });
});
