import { describe, expect, test } from 'vitest';
import { barrido, crearSistemaWaMe, agendarRecepcion, DOMINGO, waMeDe } from '../fixtures/sistema-wa-me.js';
import { actores } from '../fixtures/actores.js';

describe('Independencia de canales', () => {
  test('Programar el e-mail no sobrescribe el `wa.me`', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema);
    const [original] = await waMeDe(sistema, turno.id);
    if (original === undefined) throw new Error('falta el wa.me');
    await sistema.recordatorios.programar(turno.id);
    const actual = (await waMeDe(sistema, turno.id))[0];
    expect(actual?.id).toBe(original.id);
    expect(actual?.enlaceWaMe).toBe(original.enlaceWaMe);
    expect(actual?.programadoPara).toEqual(original.programadoPara);
  });

  test('Programar el e-mail conserva el `wa.me` pendiente', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema);
    const [original] = await waMeDe(sistema, turno.id);
    if (original === undefined) throw new Error('falta el wa.me');
    await sistema.recordatorios.programar(turno.id);
    const recordatorios = await sistema.repoRecordatorios.listarPorTurno(turno.id);
    expect(recordatorios.filter((r) => r.canal === 'email' && r.estado === 'pendiente')).toHaveLength(1);
    expect(recordatorios.find((r) => r.canal === 'wa_me')).toEqual(original);
  });

  test('El barrido de e-mail ignora los `wa.me`', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema);
    await barrido(sistema, DOMINGO, '09:00');
    expect(sistema.notificador.enviados).toHaveLength(1);
    const waMe = (await waMeDe(sistema, turno.id))[0];
    expect(waMe?.estado).toBe('pendiente');
    expect(waMe?.enlaceWaMe).toMatch(/^https:\/\/wa\.me\//);
  });

  test('El barrido no envía los `wa.me`', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema);
    const [original] = await waMeDe(sistema, turno.id);
    await barrido(sistema, DOMINGO, '09:00');
    expect(sistema.notificador.enviados).toHaveLength(1);
    expect((await waMeDe(sistema, turno.id))[0]).toEqual(original);
  });

  test('Cancelar el turno anula ambos canales', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema);
    await sistema.cancelarTurno.ejecutar({ turnoId: turno.id, actor: actores.recepcion });
    const estados = (await sistema.repoRecordatorios.listarPorTurno(turno.id)).map((r) => r.estado);
    expect(estados).toEqual(['cancelado', 'cancelado']);
  });

  test('Marcar enviado el `wa.me` no reenvía el e-mail', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema);
    const [waMe] = await waMeDe(sistema, turno.id);
    if (waMe === undefined) throw new Error('falta el wa.me');
    await sistema.marcarEnviado.ejecutar({ actor: actores.recepcion, recordatorioId: waMe.id });
    expect(sistema.notificador.enviados).toHaveLength(0);
  });
});
