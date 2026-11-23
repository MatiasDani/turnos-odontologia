import { afterAll, afterEach, beforeEach, describe, expect, test } from 'vitest';
import { local } from '../fixtures/seed.js';
import { ID_TURNO_BASE } from '../fixtures/sistema-publico.js';
import { cerrarNavegador, iniciarArnes, type Arnes } from './arnes.js';
import { textoDeLaPagina, verTexto } from './flujos.js';

let arnes: Arnes;
async function abrir(opciones: Parameters<typeof iniciarArnes>[0] = {}, ruta = '') {
  arnes = await iniciarArnes(opciones);
  const pagina = await arnes.nuevaPagina();
  await pagina.page.goto(`${arnes.url}/public/turnos/${ruta === '' ? arnes.token : ruta}`);
  return pagina;
}

beforeEach(() => undefined);
afterEach(async () => {
  await arnes.cerrar();
});
afterAll(cerrarNavegador);

describe('Página de gestión del turno', () => {
  test('Paciente confirma asistencia desde el enlace', async () => {
    arnes = await iniciarArnes();
    const { page } = await arnes.nuevaPagina();
    await page.goto(`${arnes.url}/public/turnos/${arnes.token}/confirmar`);
    const boton = page.getByRole('button', { name: 'Confirmar asistencia' });
    await boton.waitFor();
    // Abrir el enlace no confirma: el foco queda en el botón y el turno sigue reservado.
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('confirmar');
    await expect(arnes.sistema.turnos.obtenerPorId(ID_TURNO_BASE)).resolves.toMatchObject({ estado: 'reservado' });
    await boton.click();
    await page.locator('.badge.b-confirmado').waitFor();
    expect(await page.locator('.badge.b-confirmado').innerText()).toContain('Asistencia confirmada');
    expect(await page.getByRole('button', { name: 'Confirmar asistencia' }).count()).toBe(0);
    await expect(arnes.sistema.turnos.obtenerPorId(ID_TURNO_BASE)).resolves.toMatchObject({ estado: 'confirmado' });
  });

  test('Paciente cancela desde el enlace', async () => {
    const { page } = await abrir();
    await page.getByRole('button', { name: 'Cancelar turno' }).click();
    const dialogo = page.getByRole('dialog', { name: '¿Cancelar tu turno?' });
    await dialogo.waitFor();
    expect(await dialogo.innerText()).toContain('Lunes 23 de noviembre a las 10:00 con Ana Ejemplo');
    // Escape cierra sin cancelar y devuelve el foco al botón.
    await page.keyboard.press('Escape');
    await dialogo.waitFor({ state: 'detached' });
    expect(await page.evaluate(() => document.activeElement?.textContent)).toBe('Cancelar turno');
    await expect(arnes.sistema.turnos.obtenerPorId(ID_TURNO_BASE)).resolves.toMatchObject({ estado: 'reservado' });
    await page.getByRole('button', { name: 'Cancelar turno' }).click();
    await page.getByRole('button', { name: 'Sí, cancelar turno' }).click();
    await verTexto(page, 'Cancelaste tu turno.');
    await verTexto(page, 'El horario quedó libre.');
    for (const accion of ['Cancelar turno', 'Reprogramar', 'Confirmar asistencia']) {
      expect(await page.getByRole('button', { name: accion }).count()).toBe(0);
    }
    await expect(arnes.sistema.turnos.obtenerPorId(ID_TURNO_BASE)).resolves.toMatchObject({
      estado: 'cancelado',
      canceladoPor: 'paciente',
    });
  });

  test('Paciente reprograma desde el enlace', async () => {
    const { page } = await abrir();
    await page.getByRole('button', { name: 'Reprogramar' }).click();
    await page.getByRole('heading', { name: 'Elegí el nuevo horario' }).waitFor();
    await page.getByRole('radio', { name: 'martes 24 de noviembre', exact: true }).click();
    await page.getByRole('button', { name: '09:00', exact: true }).click();
    await page.getByRole('button', { name: /Cambiar a mar 24, 09:00/ }).click();
    await page.getByRole('heading', { name: /Martes 24 de noviembre/ }).waitFor();
    const texto = await textoDeLaPagina(page);
    expect(texto).toContain('09:00 a 09:30');
    expect(texto).toContain('Ana Ejemplo');
    expect(texto).toContain('El mismo enlace sigue sirviendo');
    await expect(arnes.sistema.turnos.obtenerPorId(ID_TURNO_BASE)).resolves.toMatchObject({
      inicio: local('2026-11-24', '09:00'),
      profesionalId: 'p1',
      sillonId: 's1',
    });
  });

  test('si el horario elegido se ocupa antes de confirmar el cambio, se avisa y se ofrece otro', async () => {
    const { page } = await abrir();
    await page.getByRole('button', { name: 'Reprogramar' }).click();
    await page.getByRole('radio', { name: 'martes 24 de noviembre', exact: true }).click();
    await page.getByRole('button', { name: '09:00', exact: true }).click();
    arnes.sistema.turnos.insertar({
      ...arnes.sistema.datos.turnos[0]!,
      id: 't-otro',
      pacienteId: 'pa2',
      sillonId: 's2',
      inicio: local('2026-11-24', '09:00'),
      fin: local('2026-11-24', '09:30'),
    });
    await page.getByRole('button', { name: /Cambiar a/ }).click();
    await verTexto(page, 'Ese horario se acaba de ocupar');
    await page.getByRole('button', { name: '09:30', exact: true }).waitFor();
    expect(await page.getByRole('button', { name: '09:00', exact: true }).count()).toBe(0);
  });
});

describe('Gestión con menos de 24 horas', () => {
  test('Turno con menos de 24 horas muestra el contacto', async () => {
    const { page } = await abrir({ ahora: local('2026-11-22', '10:01') });
    await verTexto(page, 'Faltan menos de 24 h para tu turno');
    const telefono = page.locator('a[href^="tel:"]').first();
    const correo = page.locator('a[href^="mailto:"]').first();
    expect(await telefono.getAttribute('href')).toBe('tel:+5491100000000');
    expect(await telefono.innerText()).toContain('+54 9 11 0000-0000');
    expect(await correo.getAttribute('href')).toBe('mailto:contacto@demo.test');
    for (const accion of ['Reprogramar', 'Cancelar turno']) {
      expect(await page.getByRole('button', { name: accion }).count()).toBe(0);
    }
    // Confirmar asistencia sigue disponible (RN-14: no depende de la anticipación).
    expect(await page.getByRole('button', { name: 'Confirmar asistencia' }).count()).toBe(1);
  });
});

describe('Enlace inválido o vencido', () => {
  test('Enlace inválido muestra el mensaje genérico', async () => {
    const { page } = await abrir({}, 'N'.repeat(43));
    await page.getByRole('heading', { name: 'El enlace no es válido o ya no está vigente.' }).waitFor();
    const texto = await textoDeLaPagina(page);
    expect(texto).toContain('abrí el enlace de ese último e-mail');
    expect(texto).toContain('comunicate con el consultorio');
    for (const dato of ['Ana', 'Ejemplo', 'Consulta/control', 'Carla', 'lunes', '10:00', 'Consultorio Odontológico']) {
      expect(texto).not.toContain(dato);
    }
    expect(await page.getByRole('button').count()).toBe(0);
  });

  test('un enlace que deja de valer al ejecutar una acción muestra el mismo mensaje', async () => {
    const { page } = await abrir();
    await page.getByRole('button', { name: 'Confirmar asistencia' }).waitFor();
    await arnes.sistema.servicioTokens.rotar(ID_TURNO_BASE);
    await page.getByRole('button', { name: 'Confirmar asistencia' }).click();
    await page.getByRole('heading', { name: 'El enlace no es válido o ya no está vigente.' }).waitFor();
    expect(await textoDeLaPagina(page)).not.toContain('Ana Ejemplo');
  });

  test('un error del servidor al cargar el turno ofrece Reintentar sin mostrar códigos', async () => {
    arnes = await iniciarArnes();
    const { page } = await arnes.nuevaPagina();
    await page.route(`**/public/turnos/${arnes.token}`, (ruta) => {
      if (ruta.request().headers()['accept'] === 'application/json') return ruta.abort('failed');
      return ruta.continue();
    });
    await page.goto(`${arnes.url}/public/turnos/${arnes.token}`);
    await verTexto(page, 'No pudimos cargar tu turno');
    await page.unroute(`**/public/turnos/${arnes.token}`);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await page.getByRole('button', { name: 'Reprogramar' }).waitFor();
  });
});
