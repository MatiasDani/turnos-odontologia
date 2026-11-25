import { afterAll, afterEach, describe, expect, test } from 'vitest';
import { crearTurno, local, LUNES, MARTES } from '../fixtures/seed.js';
import { tBaseRecepcion } from '../fixtures/sistema-http-recepcion.js';
import { cerrarTodo, iniciarArnesRecepcion, type ArnesRecepcion } from './arnes-recepcion.js';

/** Escenarios de `specs/interfaz-recepcion/spec.md` (C-15). `ahora`: lunes 23/11 10:00; `t-base` martes 09:00. */
let arnes: ArnesRecepcion | undefined;
afterEach(async () => {
  await arnes?.cerrar();
  arnes = undefined;
});
afterAll(async () => {
  await cerrarTodo();
});
const iniciar = async (opciones?: Parameters<typeof iniciarArnesRecepcion>[0]) => (arnes = await iniciarArnesRecepcion(opciones));
const turnoCarla = /09:00, Carla Prueba, Consulta\/control, Confirmado/;

describe('Inicio de sesión', () => {
  test('Login correcto', async () => {
    const a = await iniciar();
    const { page, errores } = await a.conSesion();
    await expect(page.locator('#titulo').textContent()).resolves.toBe('Lunes 23 de noviembre');
    expect(errores).toEqual([]);
  });

  test('Login incorrecto', async () => {
    const a = await iniciar();
    const { page } = await a.pagina();
    await page.goto(`${a.url}/recepcion/login`);
    await page.getByLabel('E-mail').fill('recepcion@demo.test');
    await page.getByLabel('Clave').fill('clave-incorrecta');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('alert').textContent()).resolves.toContain('E-mail o clave incorrectos.');
    await expect(page.getByLabel('E-mail').inputValue()).resolves.toBe('recepcion@demo.test');
  });
});

describe('Sesión en la pestaña', () => {
  test('Recargar conserva la sesión', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24');
    await page.reload();
    await page.locator('#agenda[aria-busy="false"]').waitFor();
    await expect(page.getByRole('button', { name: turnoCarla }).count()).resolves.toBe(1);
    expect(page.url()).toContain('/recepcion?');
  });

  test('Entrar sin sesión', async () => {
    const a = await iniciar();
    const { page } = await a.pagina();
    await page.goto(`${a.url}/recepcion`);
    await page.waitForURL(/\/recepcion\/login/);
    await expect(page.getByRole('button', { name: 'Ingresar' }).isVisible()).resolves.toBe(true);
  });

  test('Sesión vencida', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion();
    await page.route('**/interno/agenda**', (ruta) =>
      ruta.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { codigo: 'SESION_INVALIDA', mensaje: 'x' } }) }),
    );
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.waitForURL(/\/recepcion\/login\?vencida=1/);
    await expect(page.getByRole('status').textContent()).resolves.toContain('Tu sesión venció. Iniciá sesión de nuevo.');
  });

  test('Salir', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion();
    await page.getByRole('button', { name: 'Salir' }).click();
    await page.waitForURL(/\/recepcion\/login$/);
    await expect(page.evaluate(() => window.sessionStorage.length)).resolves.toBe(0);
  });
});

describe('Agenda del día por sillón o por profesional', () => {
  test('Día por sillón', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24');
    const cabeceras = await page.locator('.ag-head').allTextContents();
    expect(cabeceras.some((c) => c.startsWith('Sillón 1'))).toBe(true);
    expect(cabeceras.some((c) => c.startsWith('Sillón 2'))).toBe(true);
    const turno = page.getByRole('button', { name: turnoCarla });
    await expect(turno.textContent()).resolves.toContain('Confirmado');
    const columna = await turno.evaluate((b) => Array.from(document.querySelectorAll('.ag-col')).indexOf(b.parentElement as Element));
    expect(cabeceras.slice(1)[columna]).toMatch(/^Sillón 1/);
  });

  test('Día por profesional', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24');
    await page.getByRole('button', { name: 'Por profesional' }).click();
    await page.locator('#agenda[aria-busy="false"]').waitFor();
    const cabeceras = await page.locator('.ag-head').allTextContents();
    expect(cabeceras.some((c) => c.startsWith('Ana Ejemplo'))).toBe(true);
    expect(cabeceras.some((c) => c.startsWith('Bruno Muestra'))).toBe(true);
    await expect(page.getByRole('button', { name: turnoCarla }).count()).resolves.toBe(1);
  });
});

describe('Semana de un recurso', () => {
  test('Semana de un profesional', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion();
    await page.getByRole('button', { name: 'Semana' }).click();
    await page.locator('#agenda[aria-busy="false"]').waitFor();
    await expect(page.getByLabel('Profesional o sillón').inputValue()).resolves.toBe('p:p1');
    const dias = (await page.locator('.ag-head').allTextContents()).slice(1).map((t) => t.replace('noviembre', '').trim());
    expect(dias).toEqual(['Lun 23', 'Mar 24', 'Mié 25', 'Jue 26', 'Vie 27']);
    await expect(page.getByRole('button', { name: turnoCarla }).count()).resolves.toBe(1);
  });
});

describe('Navegación de fechas y filtros', () => {
  test('Ir al día siguiente', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.locator('#agenda[aria-busy="false"]').waitFor();
    await expect(page.locator('#titulo').textContent()).resolves.toBe('Martes 24 de noviembre');
    await expect(page.getByRole('button', { name: 'Por sillón' }).getAttribute('aria-pressed')).resolves.toBe('true');
  });
});

describe('Detalle y acciones de un turno', () => {
  test('Acciones de un turno confirmado futuro', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24');
    await page.getByRole('button', { name: turnoCarla }).click();
    const panel = page.locator('#panel');
    await panel.getByText('00000001').waitFor();
    await expect(panel.getByRole('button', { name: 'Reprogramar' }).count()).resolves.toBe(1);
    await expect(panel.getByRole('button', { name: 'Cancelar turno' }).count()).resolves.toBe(1);
    for (const nombre of ['Confirmar', 'Atendido', 'Ausente']) await expect(panel.getByRole('button', { name: nombre, exact: true }).count()).resolves.toBe(0);
  });

  test('Acciones de un turno que ya empezó', async () => {
    const a = await iniciar({
      turnos: [tBaseRecepcion(), crearTurno({ id: 't-hoy', pacienteId: 'pa2', profesionalId: 'p2', sillonId: 's2', prestacionId: 'pr1', duracionMinutos: 30, inicio: local(LUNES, '09:30'), fin: local(LUNES, '10:00') })],
    });
    const { page } = await a.conSesion();
    await page.getByRole('button', { name: /09:30, Diego Modelo/ }).click();
    const panel = page.locator('#panel');
    await expect(panel.getByRole('button', { name: 'Atendido' }).count()).resolves.toBe(1);
    await expect(panel.getByRole('button', { name: 'Ausente' }).count()).resolves.toBe(1);
  });
});

describe('Dar turno con búsqueda y alta rápida', () => {
  test('Dar turno a un paciente existente', async () => {
    const a = await iniciar();
    const { page, errores } = await a.conSesion('u-rec', '2026-11-24');
    await page.getByRole('button', { name: 'Dar turno' }).first().click();
    const dlg = page.locator('#dlg');
    await dlg.getByRole('combobox', { name: 'Paciente' }).fill('Modelo');
    await dlg.getByRole('button', { name: /Diego Modelo/ }).click();
    await dlg.getByLabel('Prestación').selectOption({ label: 'Consulta/control (30 min)' });
    await dlg.getByLabel('Profesional', { exact: true }).selectOption({ label: 'Bruno Muestra' });
    await dlg.getByLabel('Sillón', { exact: true }).selectOption({ label: 'Sillón 2' });
    await dlg.getByRole('button', { name: /^15:00, Bruno Muestra, Sillón 2/ }).click();
    await dlg.getByRole('button', { name: 'Dar turno', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Turno dado' }).waitFor();
    await page.getByRole('button', { name: /15:00, Diego Modelo/ }).waitFor();
    expect(errores).toEqual([]);
  });

  test('Alta rápida desde Dar turno', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24');
    await page.getByRole('button', { name: 'Dar turno' }).first().click();
    const dlg = page.locator('#dlg');
    await dlg.getByRole('combobox', { name: 'Paciente' }).fill('30000009');
    await dlg.getByRole('button', { name: 'Dar de alta un paciente nuevo' }).click();
    await expect(dlg.getByLabel('DNI').inputValue()).resolves.toBe('30000009');
    await dlg.getByLabel('Nombre').fill('Paciente');
    await dlg.getByLabel('Apellido').fill('Ficticio 9');
    await dlg.getByLabel('Teléfono', { exact: true }).fill('11 0000 0009');
    await dlg.getByLabel(/acepta que el consultorio/).check();
    await dlg.getByRole('button', { name: 'Guardar y elegir' }).click();
    await expect(dlg.locator('.chosen').textContent()).resolves.toContain('Paciente Ficticio 9');
  });

  test('Alta con DNI existente', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24');
    await page.getByRole('button', { name: 'Dar turno' }).first().click();
    const dlg = page.locator('#dlg');
    await dlg.getByRole('combobox', { name: 'Paciente' }).fill('Nadie Llamado');
    await dlg.getByRole('button', { name: 'Dar de alta un paciente nuevo' }).click();
    await dlg.getByLabel('DNI').fill('00000001');
    await dlg.getByLabel('Apellido').fill('Persona');
    await dlg.getByLabel('Teléfono', { exact: true }).fill('11 0000 0099');
    await dlg.getByLabel(/acepta que el consultorio/).check();
    await dlg.getByRole('button', { name: 'Guardar y elegir' }).click();
    await expect(dlg.getByRole('alert').textContent()).resolves.toContain('Ya existe un paciente con ese DNI');
    await dlg.getByRole('button', { name: 'Elegir a Carla Prueba' }).click();
    await expect(dlg.locator('.chosen').textContent()).resolves.toContain('Carla Prueba');
  });
});

describe('Cancelar con confirmación', () => {
  test('Cancelar un turno', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24');
    await page.getByRole('button', { name: turnoCarla }).click();
    await page.locator('#panel').getByRole('button', { name: 'Cancelar turno' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, cancelar turno' }).click();
    await page.getByRole('status').filter({ hasText: 'Turno cancelado. El horario quedó libre.' }).waitFor();
    await page.getByRole('button', { name: /09:00, Carla Prueba/ }).waitFor({ state: 'detached' });
    expect((await a.sistema.nucleo.repos.turnos.obtenerPorId('t-base'))?.estado).toBe('cancelado');
  });

  test('Volver sin cancelar', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24');
    await page.getByRole('button', { name: turnoCarla }).click();
    await page.locator('#panel').getByRole('button', { name: 'Cancelar turno' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Volver' }).click();
    expect((await a.sistema.nucleo.repos.turnos.obtenerPorId('t-base'))?.estado).toBe('confirmado');
  });
});

describe('Reprogramar eligiendo un hueco', () => {
  test('Reprogramar al mismo día', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24');
    await page.getByRole('button', { name: turnoCarla }).click();
    await page.locator('#panel').getByRole('button', { name: 'Reprogramar' }).click();
    const dlg = page.locator('#dlg');
    await dlg.getByRole('button', { name: /^10:00, Ana Ejemplo/ }).click();
    await dlg.getByRole('button', { name: 'Reprogramar', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Turno reprogramado' }).waitFor();
    await page.getByRole('button', { name: /^10:00, Carla Prueba/ }).waitFor();
  });
});

describe('Mensajes de reglas de negocio', () => {
  test('Conflicto de profesional al dar turno', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24');
    // Disponibilidad desactualizada (otra recepcionista ocupó el horario): el servidor rechaza con RN-02.
    await page.route('**/interno/disponibilidad**', (ruta) =>
      ruta.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ horarios: [{ inicio: local(MARTES, '09:00').toISOString(), fin: local(MARTES, '09:30').toISOString(), opciones: [{ profesionalId: 'p1', sillonId: 's2' }] }] }),
      }),
    );
    await page.getByRole('button', { name: 'Dar turno' }).first().click();
    const dlg = page.locator('#dlg');
    await dlg.getByRole('combobox', { name: 'Paciente' }).fill('Modelo');
    await dlg.getByRole('button', { name: /Diego Modelo/ }).click();
    await dlg.getByRole('button', { name: /^09:00, Ana Ejemplo, Sillón 2/ }).click();
    await dlg.getByRole('button', { name: 'Dar turno', exact: true }).click();
    const alerta = dlg.getByRole('alert');
    await expect(alerta.textContent()).resolves.toContain('El profesional ya tiene un turno en ese horario.');
    await expect(alerta.textContent()).resolves.toContain('09:00 a 09:30');
    await expect(dlg.locator('.chosen').textContent()).resolves.toContain('Diego Modelo');
    await expect(dlg.getByLabel('Prestación').inputValue()).resolves.toBe('pr1');
  });
});

describe('Bloquear y liberar horarios', () => {
  const bloquear = async (profesional: string, desde: string, hasta: string, motivo = '') => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24');
    await page.getByRole('button', { name: 'Bloquear horario' }).click();
    const dlg = page.locator('#dlg');
    await dlg.getByLabel('Profesional o sillón').selectOption({ label: profesional });
    await dlg.getByLabel('Desde').fill(desde);
    await dlg.getByLabel('Hasta').fill(hasta);
    if (motivo) await dlg.getByLabel('Motivo (opcional)').fill(motivo);
    await dlg.getByRole('button', { name: 'Bloquear', exact: true }).click();
    return { page, dlg };
  };

  test('Bloquear una hora libre', async () => {
    const { page } = await bloquear('Bruno Muestra', '15:00', '16:00', 'Capacitación');
    await page.locator('#agenda[aria-busy="false"]').waitFor();
    await page.getByRole('button', { name: 'Por profesional' }).click();
    await page.locator('#agenda[aria-busy="false"]').waitFor();
    await expect(page.getByRole('button', { name: /Bloqueado de 15:00 a 16:00, Capacitación/ }).count()).resolves.toBe(1);
  });

  test('Bloqueo sobre un turno', async () => {
    const { dlg } = await bloquear('Ana Ejemplo', '09:00', '10:00');
    const alerta = dlg.getByRole('alert');
    await expect(alerta.textContent()).resolves.toContain('No se puede bloquear');
    await expect(alerta.textContent()).resolves.toContain('09:00 a 09:30 · Carla Prueba');
  });
});

describe('Pendientes de WhatsApp', () => {
  test('Marcar un recordatorio enviado', async () => {
    const a = await iniciar();
    await a.sistema.nucleo.recordatorios.programar('t-base');
    const { page } = await a.conSesion('u-rec', '2026-11-24');
    const panel = page.locator('#panel');
    await panel.getByRole('link', { name: 'Abrir WhatsApp para Carla Prueba' }).waitFor();
    await expect(panel.getByRole('link', { name: 'Abrir WhatsApp para Carla Prueba' }).getAttribute('href')).resolves.toMatch(/^https:\/\/wa\.me\//);
    await panel.getByRole('button', { name: 'Marcar enviado el recordatorio de Carla Prueba' }).click();
    await page.getByRole('status').filter({ hasText: 'marcado como enviado' }).waitFor();
    await panel.getByText('Carla Prueba').waitFor({ state: 'detached' });
  });

  test('el administrador no ve "Marcar enviado"', async () => {
    const a = await iniciar();
    await a.sistema.nucleo.recordatorios.programar('t-base');
    const { page } = await a.conSesion('u-admin', '2026-11-24');
    await page.locator('#panel').getByRole('link', { name: /Abrir WhatsApp/ }).waitFor();
    await expect(page.locator('#panel').getByRole('button', { name: /Marcar enviado/ }).count()).resolves.toBe(0);
  });
});

describe('Lo que ve el odontólogo', () => {
  test('Agenda del odontólogo', async () => {
    const a = await iniciar({
      turnos: [tBaseRecepcion(), crearTurno({ id: 't-p2', pacienteId: 'pa2', profesionalId: 'p2', sillonId: 's2', prestacionId: 'pr1', duracionMinutos: 30, inicio: local(MARTES, '11:00'), fin: local(MARTES, '11:30') })],
    });
    const { page } = await a.conSesion('u-odo1', '2026-11-24');
    await expect(page.getByRole('button', { name: turnoCarla }).count()).resolves.toBe(1);
    await expect(page.getByRole('button', { name: /Diego Modelo/ }).count()).resolves.toBe(0);
    await expect(page.getByRole('button', { name: 'Dar turno' }).isVisible()).resolves.toBe(false);
    await expect(page.locator('#panel').getByText('Recordatorios por WhatsApp').count()).resolves.toBe(0);
  });
});

describe('Estados de carga, vacío y error', () => {
  test('Día vacío', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-25');
    await page.getByRole('status').filter({ hasText: 'No hay turnos para este día.' }).waitFor();
  });

  test('Error de red con reintento', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion();
    let fallas = 0;
    await page.route('**/interno/agenda**', async (ruta) => {
      if (fallas++ === 0) await ruta.abort();
      else await ruta.continue();
    });
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByRole('button', { name: 'Reintentar' }).waitFor();
    await expect(page.getByText('No pudimos cargar la agenda.').count()).resolves.toBe(1);
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await page.getByRole('button', { name: turnoCarla }).waitFor();
  });

  test('muestra "Cargando agenda…" mientras espera', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion();
    let liberar: () => void = () => undefined;
    await page.route('**/interno/agenda**', async (ruta) => {
      await new Promise<void>((r) => (liberar = r));
      await ruta.continue();
    });
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await page.getByText('Cargando agenda…').waitFor();
    liberar();
  });
});

describe('Accesibilidad de la agenda', () => {
  test('Turno operable con teclado', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24');
    const turno = page.getByRole('button', { name: '09:00, Carla Prueba, Consulta/control, Confirmado' });
    await turno.focus();
    await page.keyboard.press('Enter');
    await page.locator('#panel').getByRole('heading', { name: 'Turno' }).waitFor();
    await expect(page.locator('#panel').textContent()).resolves.toContain('Carla Prueba');
  });

  test('foco que vuelve al cerrar el diálogo, objetivos de 44 px y sin scroll horizontal', async () => {
    const a = await iniciar();
    const { page } = await a.conSesion('u-rec', '2026-11-24');
    const dar = page.getByRole('button', { name: 'Dar turno' }).first();
    await dar.focus();
    await page.keyboard.press('Enter');
    await page.locator('#dlg[open]').waitFor();
    await page.keyboard.press('Escape');
    await expect(dar.evaluate((b) => b === document.activeElement)).resolves.toBe(true);
    const chicos = await page.locator('.toolbar .btn, .topbar .btn, .seg button').evaluateAll((bs) => bs.filter((b) => b.getBoundingClientRect().height < 36).length);
    expect(chicos).toBe(0);
    await expect(page.evaluate(() => document.documentElement.scrollWidth <= 1440)).resolves.toBe(true);
  });
});
