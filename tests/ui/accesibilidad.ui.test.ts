import type { Page } from 'playwright';
import { afterAll, afterEach, beforeEach, describe, expect, test } from 'vitest';
import { local } from '../fixtures/seed.js';
import { cerrarNavegador, iniciarArnes, MOVIL, type Arnes } from './arnes.js';
import { abrirReserva, completarDatos, continuarADatos, elegirDia, elegirHorario, elegirPrestacion } from './flujos.js';

let arnes: Arnes;
beforeEach(async () => {
  arnes = await iniciarArnes();
});
afterEach(async () => {
  await arnes.cerrar();
});
afterAll(cerrarNavegador);

interface Foco {
  readonly id: string;
  readonly nombre: string;
  readonly tag: string;
  readonly anillo: boolean;
}

/** Elemento enfocado, su nombre accesible aproximado y si muestra el anillo de foco del design system. */
async function focoActual(page: Page): Promise<Foco> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return { id: '', nombre: '', tag: '', anillo: false };
    const contenedor = el.closest('.choice, .check') ?? el;
    const lleva = (nodo: Element) => {
      const estilo = getComputedStyle(nodo);
      return estilo.boxShadow.includes('rgb(47, 63, 143)') || (estilo.outlineStyle !== 'none' && parseFloat(estilo.outlineWidth) > 0);
    };
    const etiqueta = el.getAttribute('aria-label') ?? (el.textContent ?? '').trim();
    return { id: el.id, nombre: etiqueta, tag: el.tagName.toLowerCase(), anillo: lleva(el) || lleva(contenedor) };
  });
}

/** Tab hasta que el foco cumpla el predicado; devuelve todos los focos recorridos. */
async function tabHasta(page: Page, cumple: (f: Foco) => boolean, maximo = 80): Promise<Foco[]> {
  const recorridos: Foco[] = [];
  for (let i = 0; i < maximo; i++) {
    await page.keyboard.press('Tab');
    const foco = await focoActual(page);
    recorridos.push(foco);
    if (cumple(foco)) return recorridos;
  }
  throw new Error(`No se llegó al control buscado tras ${maximo} Tab`);
}

describe('Accesibilidad y diseño adaptable', () => {
  test('Reserva completa con teclado', async () => {
    const { page } = await arnes.nuevaPagina();
    await abrirReserva(page, arnes.url);
    const todos: Foco[] = [];

    // Paso 1: Tab hasta la primera prestación, Espacio la elige y Tab llega a Continuar.
    todos.push(...(await tabHasta(page, (f) => f.tag === 'input')));
    await page.keyboard.press('Space');
    todos.push(...(await tabHasta(page, (f) => f.nombre === 'Continuar')));
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'Elegí día y horario' }).waitFor();

    // Paso 2: de "Cualquiera" al selector de días, flechas hasta el lunes y Tab a las 11:00.
    todos.push(...(await tabHasta(page, (f) => f.nombre === 'domingo 22 de noviembre')));
    await page.keyboard.press('ArrowRight');
    expect(await page.getByRole('radio', { name: 'lunes 23 de noviembre', exact: true }).getAttribute('aria-checked')).toBe('true');
    await page.getByRole('button', { name: '11:00', exact: true }).waitFor();
    todos.push(...(await tabHasta(page, (f) => f.nombre === '11:00')));
    await page.keyboard.press('Space');
    todos.push(...(await tabHasta(page, (f) => f.nombre === 'Continuar')));
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'Completá tus datos' }).waitFor();

    // Paso 3: cada campo por Tab, escritura y Espacio en el consentimiento.
    for (const [id, texto] of [['dni', '30000001'], ['nom', 'Paciente'], ['ape', 'Ficticio 1'], ['tel', '1100000000'], ['mail', 'paciente1@ejemplo.test']] as const) {
      todos.push(...(await tabHasta(page, (f) => f.id === id)));
      await page.keyboard.type(texto);
    }
    todos.push(...(await tabHasta(page, (f) => f.id === 'cons')));
    await page.keyboard.press('Space');
    todos.push(...(await tabHasta(page, (f) => f.nombre === 'Confirmar turno')));
    await page.keyboard.press('Enter');
    await page.getByRole('heading', { name: 'Turno reservado' }).waitFor();

    expect(await page.locator('.facts').innerText()).toContain('11:00 a 11:30');
    const sinAnillo = todos.filter((f) => !f.anillo).map((f) => `${f.tag}#${f.id} ${f.nombre}`);
    expect(sinAnillo).toEqual([]);
  });

  test('Sin desplazamiento horizontal en el celular', async () => {
    const { page } = await arnes.nuevaPagina(MOVIL);
    const medir = async (pantalla: string) => {
      // La entrada del diálogo escala de 0.96 a 1: se mide con las animaciones terminadas.
      await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
      const m = await page.evaluate(() => {
        const visible = (el: Element) => {
          const r = el.getBoundingClientRect();
          const e = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && e.visibility !== 'hidden' && !el.closest('.skip, .visually-hidden, [hidden]');
        };
        const objetivos = [...document.querySelectorAll('button, a.btn, .slot, .day, .chip, input:not([type=checkbox]):not([type=radio]), label.choice')].filter(visible);
        return {
          scrollWidth: document.documentElement.scrollWidth,
          ancho: document.documentElement.clientWidth,
          chicos: objetivos.filter((el) => el.getBoundingClientRect().height < 43.5).map((el) => `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().height)}px`),
          cantidad: objetivos.length,
        };
      });
      expect(m.scrollWidth, `${pantalla}: ancho de documento`).toBeLessThanOrEqual(m.ancho);
      expect(m.chicos, `${pantalla}: objetivos de menos de 44 px`).toEqual([]);
      expect(m.cantidad, pantalla).toBeGreaterThan(0);
    };
    await abrirReserva(page, arnes.url);
    await medir('reserva paso 1');
    await elegirPrestacion(page, 'Consulta/control');
    await elegirDia(page, 'lunes 23 de noviembre');
    await elegirHorario(page, '11:00');
    await medir('reserva paso 2');
    await continuarADatos(page);
    await medir('reserva paso 3');
    await page.getByRole('button', { name: 'Confirmar turno' }).click();
    await page.locator('#dni-e').waitFor();
    await medir('reserva paso 3 con errores');
    await completarDatos(page);
    await page.getByRole('button', { name: 'Confirmar turno' }).click();
    await page.getByRole('heading', { name: 'Turno reservado' }).waitFor();
    await medir('reserva paso 4');

    await page.goto(`${arnes.url}/public/turnos/${arnes.token}`);
    await page.getByRole('button', { name: 'Reprogramar' }).waitFor();
    await medir('gestión normal');
    await page.getByRole('button', { name: 'Reprogramar' }).click();
    await page.getByRole('radio', { name: 'martes 24 de noviembre', exact: true }).click();
    await page.getByRole('button', { name: '09:00', exact: true }).waitFor();
    await medir('gestión reprogramar');
    await page.getByRole('button', { name: 'Volver' }).click();
    await page.getByRole('button', { name: 'Cancelar turno' }).click();
    await page.getByRole('button', { name: 'Sí, cancelar turno' }).waitFor();
    await medir('gestión diálogo de cancelar');
    await page.getByRole('button', { name: 'Sí, cancelar turno' }).click();
    await page.getByRole('link', { name: 'Reservar un turno nuevo' }).waitFor();
    await medir('gestión cancelado');
    await page.goto(`${arnes.url}/public/turnos/${'N'.repeat(43)}`);
    await page.getByRole('heading', { name: /El enlace no es válido/ }).waitFor();
    await medir('enlace inválido');
  });

  test('menos de 24 horas a 390 px no desborda', async () => {
    arnes.sistema.reloj.fijar(local('2026-11-22', '10:01'));
    const { page } = await arnes.nuevaPagina(MOVIL);
    await page.goto(`${arnes.url}/public/turnos/${arnes.token}`);
    await page.getByText('Faltan menos de 24 h para tu turno').waitFor();
    const { scrollWidth, ancho } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, ancho: document.documentElement.clientWidth }));
    expect(scrollWidth).toBeLessThanOrEqual(ancho);
  });

  test('con movimiento reducido no hay transiciones ni animaciones activas', async () => {
    const { page } = await arnes.nuevaPagina({ reducedMotion: 'reduce' });
    let liberar!: () => void;
    const puerta = new Promise<void>((resolver) => {
      liberar = resolver;
    });
    await page.route('**/public/disponibilidad?**', async (ruta) => {
      await puerta;
      await ruta.continue();
    });
    const animacionesActivas = () =>
      page.evaluate(() =>
        document
          .getAnimations()
          .filter((a) => a.playState === 'running' && (a.effect?.getComputedTiming().activeDuration as number) > 1)
          .map((a) => (a instanceof CSSTransition ? `transition ${a.transitionProperty}` : `animation ${(a as CSSAnimation).animationName}`)),
      );
    await abrirReserva(page, arnes.url);
    await elegirPrestacion(page, 'Consulta/control');
    await page.getByRole('status').filter({ hasText: 'Buscando horarios libres' }).waitFor();
    expect(await page.locator('.spinner').count()).toBe(1);
    expect(await animacionesActivas()).toEqual([]);
    liberar();
    await page.getByRole('radio', { name: 'lunes 23 de noviembre', exact: true }).click();
    await page.getByRole('button', { name: '11:00', exact: true }).click();
    expect(await animacionesActivas()).toEqual([]);
    // El diálogo de cancelar tampoco anima.
    await page.goto(`${arnes.url}/public/turnos/${arnes.token}`);
    await page.getByRole('button', { name: 'Cancelar turno' }).click();
    await page.getByRole('dialog').waitFor();
    expect(await animacionesActivas()).toEqual([]);
  });
});
