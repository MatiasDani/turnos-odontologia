import { afterAll, afterEach, beforeEach, describe, expect, test } from 'vitest';
import { local } from '../fixtures/seed.js';
import { cerrarNavegador, iniciarArnes, type Arnes } from './arnes.js';
import {
  abrirReserva,
  completarDatos,
  continuarADatos,
  elegirDia,
  elegirHorario,
  elegirPrestacion,
  llegarADatos,
  reservarLunesOnce,
  textoDeLaPagina,
  verTexto,
} from './flujos.js';
import { turnoBasePublico } from '../fixtures/sistema-publico.js';

let arnes: Arnes;
beforeEach(async () => {
  arnes = await iniciarArnes();
});
afterEach(async () => {
  await arnes.cerrar();
});
afterAll(cerrarNavegador);

describe('Reserva guiada en pasos', () => {
  test('Paciente reserva un turno con Cualquiera', async () => {
    const { page, errores } = await arnes.nuevaPagina();
    const textos: string[] = [];
    await abrirReserva(page, arnes.url);
    textos.push(await textoDeLaPagina(page));
    await elegirPrestacion(page, 'Consulta/control');
    textos.push(await textoDeLaPagina(page));
    expect(await page.getByRole('radio', { name: 'Cualquiera' }).getAttribute('aria-checked')).toBe('true');
    await elegirDia(page, 'lunes 23 de noviembre');
    await elegirHorario(page, '11:00');
    textos.push(await textoDeLaPagina(page));
    await continuarADatos(page);
    await completarDatos(page);
    textos.push(await textoDeLaPagina(page));
    await page.getByRole('button', { name: 'Confirmar turno' }).click();
    await page.getByRole('heading', { name: 'Turno reservado' }).waitFor();
    textos.push(await textoDeLaPagina(page));

    const hechos = await page.locator('.facts').innerText();
    expect(hechos).toMatch(/lunes 23 de noviembre/i);
    expect(hechos).toContain('11:00 a 11:30');
    expect(hechos).toContain('Consulta/control');
    expect(hechos).toMatch(/Ana Ejemplo|Bruno Muestra/);
    for (const texto of textos) {
      expect(texto).not.toMatch(/Sill[oó]n/i);
      expect(texto).not.toMatch(/Carla|Prueba|00000001/);
    }
    expect(errores).toEqual([]);
  });

  test('Paciente elige un profesional', async () => {
    const { page } = await arnes.nuevaPagina();
    await abrirReserva(page, arnes.url);
    await elegirPrestacion(page, 'Consulta/control');
    await page.getByRole('radio', { name: 'Bruno Muestra' }).click();
    await elegirDia(page, 'lunes 23 de noviembre');
    await page.getByRole('button', { name: '11:00', exact: true }).waitFor();
    const mostrados = await page.locator('.slot').allInnerTexts();
    const respuesta = await fetch(`${arnes.url}/public/disponibilidad?prestacionId=pr1&fecha=2026-11-23&profesionalId=p2`);
    const { horarios } = (await respuesta.json()) as { horarios: { inicio: string }[] };
    const esperados = horarios.map((h) =>
      new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(h.inicio)),
    );
    expect(mostrados).toEqual(esperados);
    // Bruno no tiene el turno de las 10:00 que ocupa a Ana: ese horario existe para él.
    expect(mostrados).toContain('10:00');
    await elegirHorario(page, '11:00');
    await continuarADatos(page);
    await completarDatos(page);
    await page.getByRole('button', { name: 'Confirmar turno' }).click();
    await page.getByRole('heading', { name: 'Turno reservado' }).waitFor();
    expect(await page.locator('.facts').innerText()).toContain('Bruno Muestra');
  });

  test('Selector de días limitado a 30 días', async () => {
    const { page } = await arnes.nuevaPagina();
    await abrirReserva(page, arnes.url);
    await elegirPrestacion(page, 'Consulta/control');
    const dias = page.locator('.day');
    await dias.first().waitFor();
    expect(await dias.count()).toBe(31);
    expect(await dias.first().getAttribute('aria-label')).toBe('domingo 22 de noviembre');
    expect(await dias.last().getAttribute('aria-label')).toBe('martes 22 de diciembre');
    expect(await page.getByRole('radio', { name: 'miércoles 23 de diciembre' }).count()).toBe(0);
  });
});

describe('Estados de carga, vacío y error en la reserva', () => {
  test('Carga de horarios con indicador', async () => {
    const { page } = await arnes.nuevaPagina();
    let liberar!: () => void;
    const puerta = new Promise<void>((resolver) => {
      liberar = resolver;
    });
    await page.route('**/public/disponibilidad?**', async (ruta) => {
      await puerta;
      await ruta.continue();
    });
    await abrirReserva(page, arnes.url);
    await elegirPrestacion(page, 'Consulta/control');
    await elegirDia(page, 'lunes 23 de noviembre');
    const estado = page.getByRole('status').filter({ hasText: 'Buscando horarios libres' });
    await estado.waitFor();
    expect(await page.locator('[aria-busy="true"]').count()).toBeGreaterThan(0);
    expect(await page.getByRole('button', { name: 'Continuar' }).isDisabled()).toBe(true);
    expect(await page.locator('.slot').count()).toBe(0);
    liberar();
    await page.getByRole('button', { name: '11:00', exact: true }).waitFor();
    expect(await estado.count()).toBe(0);
  });

  test('Día sin horarios libres', async () => {
    const { page } = await arnes.nuevaPagina();
    await abrirReserva(page, arnes.url);
    await elegirPrestacion(page, 'Consulta/control');
    await elegirDia(page, 'sábado 28 de noviembre');
    await verTexto(page, 'No hay horarios libres este día');
    expect(await page.getByRole('button', { name: 'Continuar' }).isDisabled()).toBe(true);
    const otroDia = page.getByRole('button', { name: /Ver el lunes 30/ });
    await otroDia.waitFor();
    await otroDia.click();
    await page.getByRole('button', { name: '09:00', exact: true }).waitFor();
    expect(await page.getByRole('radio', { name: 'lunes 30 de noviembre' }).getAttribute('aria-checked')).toBe('true');
  });

  test('Error de red al cargar prestaciones', async () => {
    const { page } = await arnes.nuevaPagina();
    await page.route('**/public/prestaciones', (ruta) => ruta.abort('failed'));
    await page.goto(`${arnes.url}/public/reservar`);
    const alerta = page.getByRole('alert');
    await alerta.waitFor();
    const texto = await alerta.innerText();
    expect(texto).toContain('No pudimos cargar las prestaciones');
    expect(texto).not.toMatch(/ERROR|HTTP|500|\{|\}|undefined|TypeError|fetch/);
    await page.unroute('**/public/prestaciones');
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await page.locator('label.choice', { hasText: 'Limpieza' }).waitFor();
    expect(await page.locator('label.choice').count()).toBe(4);
  });
});

describe('Validación del formulario de datos', () => {
  test('Datos inválidos marcados por campo', async () => {
    const { page } = await arnes.nuevaPagina();
    await llegarADatos(page, arnes.url);
    const turnosAntes = arnes.sistema.turnos.todos().length;
    let pedidos = 0;
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().endsWith('/public/reservas')) pedidos += 1;
    });
    await completarDatos(page, { dni: '123', telefono: '' }, false);
    await page.getByRole('button', { name: 'Confirmar turno' }).click();
    await page.locator('#dni-e').waitFor();
    expect(await page.locator('#dni-e').innerText()).toContain('El DNI tiene que tener 7 u 8 números.');
    expect(await page.locator('#tel-e').innerText()).toContain('Ingresá un teléfono');
    expect(await page.locator('#cons-e').innerText()).toContain('Necesitamos tu consentimiento');
    expect(await page.locator('#nom-e, #ape-e, #mail-e').count()).toBe(0);
    expect(await page.getByLabel('DNI', { exact: true }).getAttribute('aria-invalid')).toBe('true');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('dni');
    expect(await page.getByRole('alert').first().innerText()).toContain('Revisá 3 datos');
    expect(pedidos).toBe(0);
    expect(arnes.sistema.turnos.todos().length).toBe(turnosAntes);
  });

  test('un error del servidor en un campo se marca junto a ese campo', async () => {
    const { page } = await arnes.nuevaPagina();
    await llegarADatos(page, arnes.url);
    await completarDatos(page, { telefono: '12345678' });
    await page.route('**/public/reservas', (ruta) =>
      ruta.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: { codigo: 'DATOS_INVALIDOS', mensaje: 'x', campos: ['paciente.telefono'] } }),
      }),
    );
    await page.getByRole('button', { name: 'Confirmar turno' }).click();
    await page.locator('#tel-e').waitFor();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('tel');
    expect(await textoDeLaPagina(page)).not.toMatch(/DATOS_INVALIDOS|paciente\./);
  });
});

describe('Confirmación con enlace de gestión', () => {
  test('Confirmación muestra el enlace de gestión una sola vez', async () => {
    const { page } = await arnes.nuevaPagina();
    await reservarLunesOnce(page, arnes.url);
    const enlace = await page.locator('#enlace').inputValue();
    expect(enlace).toMatch(new RegExp(`^${arnes.url}/public/turnos/[A-Za-z0-9_-]{43}$`));
    await page.getByRole('button', { name: 'Copiar enlace' }).waitFor();
    expect(await page.locator('.alert.a-info').innerText()).toMatch(/recordatorio por e-mail/);
    expect(await page.locator('.alert.a-info').innerText()).toMatch(/anterior deja de funcionar/);
    expect(new URL(page.url()).pathname).toBe('/public/reservar');
    expect(new URL(page.url()).search).toBe('');
    const token = enlace.split('/').pop() ?? '';
    const almacenamiento = await page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }, document.cookie]));
    expect(almacenamiento).not.toContain(token);
    await page.getByRole('button', { name: 'Copiar enlace' }).click();
    await verTexto(page, 'Enlace copiado.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(enlace);
    // Una sola vez: al recargar vuelve el paso 1 y el enlace ya no se muestra.
    await page.reload();
    await page.getByRole('heading', { name: '¿Qué necesitás?' }).waitFor();
    expect(await page.locator('#enlace').count()).toBe(0);
  });

  test('Horario tomado al confirmar', async () => {
    const { page } = await arnes.nuevaPagina();
    await llegarADatos(page, arnes.url);
    await completarDatos(page);
    // Otros pacientes ocupan a Ana y a Bruno a las 11:00 antes de que se confirme.
    for (const [id, profesionalId, sillonId] of [['t-x1', 'p1', 's1'], ['t-x2', 'p2', 's2']] as const) {
      arnes.sistema.turnos.insertar({
        ...turnoBasePublico({ id, profesionalId, sillonId }),
        inicio: local('2026-11-23', '11:00'),
        fin: local('2026-11-23', '11:30'),
      });
    }
    await page.getByRole('button', { name: 'Confirmar turno' }).click();
    await verTexto(page, 'Ese horario se acaba de ocupar');
    const oferta = page.getByRole('group', { name: 'Otros horarios libres' });
    await oferta.getByRole('button', { name: '11:30', exact: true }).waitFor();
    expect(await oferta.getByRole('button', { name: '11:00', exact: true }).count()).toBe(0);
    expect(await page.getByLabel('DNI', { exact: true }).inputValue()).toBe('30000001');
    expect(await page.getByLabel('Apellido', { exact: true }).inputValue()).toBe('Ficticio 1');
    expect(await page.getByLabel(/Acepto que el consultorio/).isChecked()).toBe(true);
    await oferta.getByRole('button', { name: '11:30', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar turno' }).click();
    await page.getByRole('heading', { name: 'Turno reservado' }).waitFor();
    expect(await page.locator('.facts').innerText()).toContain('11:30 a 12:00');
  });

  test('un error de red al confirmar conserva los datos y permite reintentar', async () => {
    const { page } = await arnes.nuevaPagina();
    await llegarADatos(page, arnes.url);
    await completarDatos(page);
    await page.route('**/public/reservas', (ruta) => ruta.abort('failed'));
    await page.getByRole('button', { name: 'Confirmar turno' }).click();
    await verTexto(page, 'No pudimos confirmar tu turno');
    expect(await page.getByLabel('DNI', { exact: true }).inputValue()).toBe('30000001');
    await page.unroute('**/public/reservas');
    await page.getByRole('button', { name: 'Confirmar turno' }).click();
    await page.getByRole('heading', { name: 'Turno reservado' }).waitFor();
  });
});
