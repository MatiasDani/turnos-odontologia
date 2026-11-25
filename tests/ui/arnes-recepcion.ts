// Arnés de la UI de recepción (C-15, design D7): la app real en un puerto efímero con reloj fijo
// (lunes 2026-11-23 10:00), usuarios y datos ficticios, y Chromium con el reloj del navegador fijado.
import type { BrowserContext, Page } from 'playwright';
import { local, LUNES } from '../fixtures/seed.js';
import { CLAVE_FICTICIA } from '../fixtures/sistema-autenticacion.js';
import { crearSistemaHttpRecepcion, type OpcionesSistemaHttpRecepcion, type SistemaHttpRecepcion } from '../fixtures/sistema-http-recepcion.js';
import { cerrarNavegador } from './arnes.js';
import { chromium, type Browser } from 'playwright';

export { cerrarNavegador };

export const EMAILS = { 'u-rec': 'recepcion@demo.test', 'u-admin': 'admin@demo.test', 'u-odo1': 'odontologo1@demo.test' } as const;

export interface ArnesRecepcion {
  readonly sistema: SistemaHttpRecepcion;
  readonly url: string;
  /** Página nueva, con el reloj del navegador fijado en `ahora` del sistema. */
  pagina(): Promise<{ page: Page; contexto: BrowserContext; errores: string[] }>;
  /** Página con la sesión ya iniciada por el formulario y la agenda abierta en `fecha`. */
  conSesion(usuario?: keyof typeof EMAILS, fecha?: string): Promise<{ page: Page; contexto: BrowserContext; errores: string[] }>;
  cerrar(): Promise<void>;
}

let navegador: Browser | undefined;

export async function iniciarArnesRecepcion(opciones: OpcionesSistemaHttpRecepcion = {}): Promise<ArnesRecepcion> {
  const sistema = await crearSistemaHttpRecepcion(opciones);
  await sistema.app.listen({ port: 0, host: '127.0.0.1' });
  const direccion = sistema.app.server.address();
  if (direccion === null || typeof direccion === 'string') throw new Error('El servidor no abrió un puerto');
  const url = `http://127.0.0.1:${direccion.port}`;
  const contextos: BrowserContext[] = [];
  const ahora = opciones.ahora ?? local(LUNES, '10:00');

  const pagina = async () => {
    navegador ??= await chromium.launch();
    const contexto = await navegador.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'es-AR',
      timezoneId: 'America/Argentina/Buenos_Aires',
      deviceScaleFactor: 1,
    });
    contextos.push(contexto);
    const page = await contexto.newPage();
    await page.clock.setFixedTime(ahora);
    const errores: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errores.push(m.text());
    });
    page.on('pageerror', (e) => errores.push(e.message));
    return { page, contexto, errores };
  };

  return {
    sistema,
    url,
    pagina,
    async conSesion(usuario = 'u-rec', fecha) {
      const p = await pagina();
      await p.page.goto(`${url}/recepcion/login`);
      await p.page.getByLabel('E-mail').fill(EMAILS[usuario]);
      await p.page.getByLabel('Clave').fill(CLAVE_FICTICIA);
      await p.page.getByRole('button', { name: 'Ingresar' }).click();
      await p.page.waitForURL(/\/recepcion\?/);
      if (fecha !== undefined) await p.page.goto(`${url}/recepcion?fecha=${fecha}&vista=dia&modo=sillon`);
      await p.page.locator('#agenda[aria-busy="false"]').waitFor();
      return p;
    },
    async cerrar() {
      await Promise.all(contextos.map((c) => c.close()));
      await sistema.cerrar();
    },
  };
}

export async function cerrarTodo(): Promise<void> {
  const actual = navegador;
  navegador = undefined;
  await actual?.close();
  await cerrarNavegador();
}
