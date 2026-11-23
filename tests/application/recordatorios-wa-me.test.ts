import { describe, expect, test } from 'vitest';
import { ReglaNegocioError } from '../../src/domain/errores.js';
import { LUNES, MARTES } from '../fixtures/seed.js';
import {
  agendarRecepcion,
  crearSistemaWaMe,
  DOMINGO,
  EMAIL_PA1,
  pacientesRecordatorios,
  recordatoriosDe,
  reservarOnlinePa1,
  waMeDe,
} from '../fixtures/sistema-wa-me.js';

const SABADO_ANTERIOR = '2026-11-21';

describe('Generación del `wa.me` al programar el turno', () => {
  test('Alta de recepción programa el `wa.me`', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema);
    const waMe = await waMeDe(sistema, turno.id);
    expect(waMe).toHaveLength(1);
    expect(waMe[0]).toMatchObject({
      turnoId: turno.id,
      canal: 'wa_me',
      estado: 'pendiente',
      programadoPara: new Date(`${DOMINGO}T09:00:00-03:00`),
    });
    expect(waMe[0]?.enlaceWaMe).toMatch(/^https:\/\/wa\.me\/5491100000001\?text=/);
  });

  test('Reserva online programa el `wa.me`', async () => {
    const sistema = crearSistemaWaMe();
    const reserva = await reservarOnlinePa1(sistema, '10:00');
    const waMe = await waMeDe(sistema, reserva.turnoId);
    expect(waMe).toHaveLength(1);
    expect(waMe[0]?.programadoPara).toEqual(new Date(`${DOMINGO}T10:00:00-03:00`));
  });

  test('Anticipación configurada', async () => {
    const sistema = crearSistemaWaMe({ horasAntes: 48 });
    const turno = await agendarRecepcion(sistema);
    const waMe = await waMeDe(sistema, turno.id);
    expect(waMe[0]?.programadoPara).toEqual(new Date(`${SABADO_ANTERIOR}T09:00:00-03:00`));
  });

  test('Programar dos veces no duplica el `wa.me`', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema);
    const [original] = await waMeDe(sistema, turno.id);
    await sistema.recordatoriosConWaMe.programar(turno.id);
    const waMe = await waMeDe(sistema, turno.id);
    expect(waMe).toHaveLength(1);
    expect(waMe[0]?.id).toBe(original?.id);
  });

  test('Turno movido reprograma el `wa.me`', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema);
    sistema.turnos.moverTurno(turno.id, new Date(`${MARTES}T10:00:00-03:00`));
    await sistema.recordatoriosConWaMe.programar(turno.id);
    const waMe = await waMeDe(sistema, turno.id);
    expect(waMe).toHaveLength(1);
    expect(waMe[0]?.programadoPara).toEqual(new Date(`${LUNES}T10:00:00-03:00`));
    expect(decodeURIComponent(waMe[0]?.enlaceWaMe ?? '')).toContain('martes 24/11/2026 10:00');
  });

  test('Sin consentimiento no se genera el `wa.me`', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema, { pacienteId: 'pa3', hora: '10:00' });
    expect(turno.estado).toBe('confirmado');
    expect(await waMeDe(sistema, turno.id)).toHaveLength(0);
  });

  test('Teléfono inválido no se genera el `wa.me`', async () => {
    const pacientes = pacientesRecordatorios().map((p) =>
      p.id === 'pa1' ? { ...p, telefono: '+54 9 11 000' } : p,
    );
    const sistema = crearSistemaWaMe({ pacientes });
    const turno = await agendarRecepcion(sistema);
    expect(await waMeDe(sistema, turno.id)).toHaveLength(0);
  });

  test('Sin e-mail sí se genera el `wa.me`', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema, { pacienteId: 'pa2' });
    expect(await waMeDe(sistema, turno.id)).toHaveLength(1);
    const recordatorios = await recordatoriosDe(sistema, turno.id);
    expect(recordatorios.filter((r) => r.canal === 'email')).toHaveLength(0);
  });

  test('Alta rechazada no programa recordatorios', async () => {
    const sistema = crearSistemaWaMe();
    await agendarRecepcion(sistema);
    const rechazo = agendarRecepcion(sistema, { hora: '09:15' });
    await expect(rechazo).rejects.toBeInstanceOf(ReglaNegocioError);
    await expect(rechazo).rejects.toMatchObject({ codigo: 'RN-02' });
    expect(sistema.repoRecordatorios.todos()).toHaveLength(2);
  });
});

describe('Datos del mensaje `wa.me`', () => {
  test('El mensaje del turno base no expone el e-mail del paciente', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema);
    const waMe = await waMeDe(sistema, turno.id);
    const mensaje = decodeURIComponent(waMe[0]?.enlaceWaMe ?? '');
    expect(mensaje).not.toContain(EMAIL_PA1);
  });
});
