// Capturas de verificación visual (tarea 5.1): se generan solo con CAPTURAS_DIR=<carpeta> y se comparan
// a mano contra `mockups/previews/`. Sin esa variable la suite las omite.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from 'playwright';
import { afterAll, describe, test } from 'vitest';
import { local } from '../fixtures/seed.js';
import { turnoBasePublico } from '../fixtures/sistema-publico.js';
import { cerrarNavegador, ESCRITORIO, iniciarArnes, MOVIL, type Arnes } from './arnes.js';
import { abrirReserva, completarDatos, continuarADatos, elegirDia, elegirHorario, elegirPrestacion, llegarADatos } from './flujos.js';

const carpeta = process.env['CAPTURAS_DIR'];
afterAll(cerrarNavegador);

type Escena = (page: Page, arnes: Arnes) => Promise<void>;

const escenas: Record<string, { preparar?: Parameters<typeof iniciarArnes>[0]; ir: Escena }> = {
  'reserva-1-prestacion': {
    ir: async (page, a) => {
      await abrirReserva(page, a.url);
      await page.locator('label.choice', { hasText: 'Consulta/control' }).click();
    },
  },
  'reserva-1-error': {
    ir: async (page, a) => {
      await page.route('**/public/prestaciones', (r) => r.abort('failed'));
      await page.goto(`${a.url}/public/reservar`);
      await page.getByRole('alert').waitFor();
    },
  },
  'reserva-2-horario': {
    ir: async (page, a) => {
      await abrirReserva(page, a.url);
      await elegirPrestacion(page, 'Consulta/control');
      await elegirDia(page, 'lunes 23 de noviembre');
      await elegirHorario(page, '11:00');
    },
  },
  'reserva-2-cargando': {
    ir: async (page, a) => {
      await page.route('**/public/disponibilidad?**', () => undefined);
      await abrirReserva(page, a.url);
      await elegirPrestacion(page, 'Consulta/control');
      await elegirDia(page, 'lunes 23 de noviembre');
      await page.getByRole('status').filter({ hasText: 'Buscando horarios libres' }).waitFor();
    },
  },
  'reserva-2-vacio': {
    ir: async (page, a) => {
      await abrirReserva(page, a.url);
      await elegirPrestacion(page, 'Consulta/control');
      await elegirDia(page, 'sábado 28 de noviembre');
      await page.getByRole('button', { name: /Ver el lunes 30/ }).waitFor();
    },
  },
  'reserva-3-datos': {
    ir: async (page, a) => {
      await llegarADatos(page, a.url);
      await completarDatos(page, { dni: '123', telefono: '', email: '' }, false);
      await page.getByRole('button', { name: 'Confirmar turno' }).click();
      await page.locator('#dni-e').waitFor();
    },
  },
  'reserva-3-horario-ocupado': {
    ir: async (page, a) => {
      await llegarADatos(page, a.url);
      await completarDatos(page);
      for (const [id, p, s] of [['t-x1', 'p1', 's1'], ['t-x2', 'p2', 's2']] as const) {
        a.sistema.turnos.insertar({ ...turnoBasePublico({ id, profesionalId: p, sillonId: s }), inicio: local('2026-11-23', '11:00'), fin: local('2026-11-23', '11:30') });
      }
      await page.getByRole('button', { name: 'Confirmar turno' }).click();
      await page.getByText('Ese horario se acaba de ocupar').waitFor();
    },
  },
  'reserva-4-confirmacion': {
    ir: async (page, a) => {
      await llegarADatos(page, a.url);
      await completarDatos(page);
      await page.getByRole('button', { name: 'Confirmar turno' }).click();
      await page.getByRole('heading', { name: 'Turno reservado' }).waitFor();
    },
  },
  'gestion-normal': {
    ir: async (page, a) => {
      await page.goto(`${a.url}/public/turnos/${a.token}`);
      await page.getByRole('button', { name: 'Reprogramar' }).waitFor();
    },
  },
  'gestion-cancelar': {
    ir: async (page, a) => {
      await page.goto(`${a.url}/public/turnos/${a.token}`);
      await page.getByRole('button', { name: 'Cancelar turno' }).click();
      await page.getByRole('dialog').waitFor();
      await page.waitForTimeout(400);
    },
  },
  'gestion-cancelado': {
    ir: async (page, a) => {
      await page.goto(`${a.url}/public/turnos/${a.token}`);
      await page.getByRole('button', { name: 'Cancelar turno' }).click();
      await page.getByRole('button', { name: 'Sí, cancelar turno' }).click();
      await page.getByRole('link', { name: 'Reservar un turno nuevo' }).waitFor();
    },
  },
  'gestion-reprogramar': {
    ir: async (page, a) => {
      await page.goto(`${a.url}/public/turnos/${a.token}`);
      await page.getByRole('button', { name: 'Reprogramar' }).click();
      await page.getByRole('radio', { name: 'martes 24 de noviembre', exact: true }).click();
      await page.getByRole('button', { name: '09:00', exact: true }).click();
    },
  },
  'gestion-menos-24h': {
    preparar: { ahora: local('2026-11-22', '10:01') },
    ir: async (page, a) => {
      await page.goto(`${a.url}/public/turnos/${a.token}`);
      await page.getByText('Faltan menos de 24 h para tu turno').waitFor();
    },
  },
  'gestion-enlace-invalido': {
    ir: async (page, a) => {
      await page.goto(`${a.url}/public/turnos/${'N'.repeat(43)}`);
      await page.getByRole('heading', { name: /El enlace no es válido/ }).waitFor();
    },
  },
};

describe.skipIf(carpeta === undefined)('Capturas de la implementación', () => {
  for (const [nombre, escena] of Object.entries(escenas)) {
    for (const [sufijo, tamano] of [['mobile', MOVIL], ['desktop', ESCRITORIO]] as const) {
      test(`${nombre} ${sufijo}`, async () => {
        const arnes = await iniciarArnes(escena.preparar);
        try {
          mkdirSync(carpeta as string, { recursive: true });
          const { page } = await arnes.nuevaPagina(tamano);
          await escena.ir(page, arnes);
          await page.waitForTimeout(350);
          if (sufijo === 'mobile') {
            const alto = await page.evaluate(() => document.documentElement.scrollHeight);
            await page.setViewportSize({ width: tamano.ancho, height: Math.max(alto, tamano.alto) });
            await page.waitForTimeout(100);
          }
          await page.screenshot({ path: join(carpeta as string, `${nombre}-${sufijo}.png`), fullPage: true });
        } finally {
          await arnes.cerrar();
        }
      });
    }
  }
});
