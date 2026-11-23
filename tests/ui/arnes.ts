// Arnés de la suite de UI (D12): la app real en un puerto efímero, con reloj fijo y datos ficticios,
// y Chromium con Playwright. Los estados de carga y error se fuerzan con `page.route`.
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { FastifyInstance } from 'fastify';
import { crearApp } from '../../src/adapters/http/app.js';
import { crearSistemaPublico, type OpcionesSistemaPublico, type SistemaPublico } from '../fixtures/sistema-publico.js';

export interface Arnes {
  readonly sistema: SistemaPublico;
  readonly app: FastifyInstance;
  readonly url: string;
  /** Token vigente del turno base. */
  readonly token: string;
  nuevaPagina(opciones?: OpcionesPagina): Promise<PaginaDePrueba>;
  cerrar(): Promise<void>;
}

export interface OpcionesPagina {
  readonly ancho?: number;
  readonly alto?: number;
  readonly reducedMotion?: 'reduce' | 'no-preference';
}

export interface PaginaDePrueba {
  readonly page: Page;
  readonly contexto: BrowserContext;
  /** Errores de consola y de página (incluye violaciones de CSP). */
  readonly errores: string[];
}

export const MOVIL = { ancho: 390, alto: 844 } as const;
export const ESCRITORIO = { ancho: 1440, alto: 900 } as const;

let navegador: Browser | undefined;

async function obtenerNavegador(): Promise<Browser> {
  navegador ??= await chromium.launch();
  return navegador;
}

/** Cierra el Chromium compartido (se llama en el `afterAll` de cada archivo). */
export async function cerrarNavegador(): Promise<void> {
  const actual = navegador;
  navegador = undefined;
  await actual?.close();
}

export async function iniciarArnes(opciones: OpcionesSistemaPublico = {}): Promise<Arnes> {
  const sistema = await crearSistemaPublico(opciones);
  const app = crearApp(sistema.casos);
  await app.listen({ port: 0, host: '127.0.0.1' });
  const direccion = app.server.address();
  if (direccion === null || typeof direccion === 'string') throw new Error('El servidor no abrió un puerto');
  const url = `http://127.0.0.1:${direccion.port}`;
  const contextos: BrowserContext[] = [];
  return {
    sistema,
    app,
    url,
    token: sistema.token ?? '',
    async nuevaPagina({ ancho = 390, alto = 844, reducedMotion = 'no-preference' } = {}) {
      const contexto = await (await obtenerNavegador()).newContext({
        viewport: { width: ancho, height: alto },
        reducedMotion,
        locale: 'es-AR',
        timezoneId: 'America/Argentina/Buenos_Aires',
        deviceScaleFactor: 1,
      });
      contextos.push(contexto);
      await contexto.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: url }).catch(() => undefined);
      const page = await contexto.newPage();
      const errores: string[] = [];
      page.on('console', (mensaje) => {
        if (mensaje.type() === 'error') errores.push(mensaje.text());
      });
      page.on('pageerror', (error) => errores.push(error.message));
      return { page, contexto, errores };
    },
    async cerrar() {
      await Promise.all(contextos.map((c) => c.close()));
      await app.close();
    },
  };
}
