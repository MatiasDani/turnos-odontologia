import { describe, expect, test } from 'vitest';
import { ErrorMarcarRecordatorio } from '../../src/domain/errores-recordatorio.js';
import { local } from '../fixtures/seed.js';
import { agendarRecepcion, crearSistemaWaMe, DOMINGO, recordatoriosDe, waMeDe } from '../fixtures/sistema-wa-me.js';
import { actores } from '../fixtures/actores.js';

describe('Marcar el `wa.me` como enviado', () => {
  test('Marca el pendiente como enviado', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema);
    const [waMe] = await waMeDe(sistema, turno.id);
    if (waMe === undefined) throw new Error('falta el wa.me');
    sistema.reloj.fijar(local(DOMINGO, '12:00'));
    const marcado = await sistema.marcarEnviado.ejecutar({ actor: actores.recepcion, recordatorioId: waMe.id });
    expect(marcado).toMatchObject({
      id: waMe.id,
      turnoId: turno.id,
      enlaceWaMe: waMe.enlaceWaMe,
      estado: 'enviado',
      enviadoEn: local(DOMINGO, '12:00'),
    });
  });

  test('Segunda llamada no cambia el recordatorio', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema);
    const [waMe] = await waMeDe(sistema, turno.id);
    if (waMe === undefined) throw new Error('falta el wa.me');
    sistema.reloj.fijar(local(DOMINGO, '12:00'));
    await sistema.marcarEnviado.ejecutar({ actor: actores.recepcion, recordatorioId: waMe.id });
    sistema.reloj.fijar(local(DOMINGO, '13:00'));
    await sistema.marcarEnviado.ejecutar({ actor: actores.recepcion, recordatorioId: waMe.id });
    const actualizado = (await waMeDe(sistema, turno.id))[0];
    expect(actualizado?.enviadoEn).toEqual(local(DOMINGO, '12:00'));
  });

  test('Id inexistente se rechaza', async () => {
    const sistema = crearSistemaWaMe();
    const rechazo = sistema.marcarEnviado.ejecutar({ actor: actores.recepcion, recordatorioId: 'rec-wa-inexistente' });
    await expect(rechazo).rejects.toBeInstanceOf(ErrorMarcarRecordatorio);
    await expect(rechazo).rejects.toMatchObject({ codigo: 'RECORDATORIO_NO_ENCONTRADO' });
    expect(sistema.repoRecordatorios.todos()).toHaveLength(0);
  });

  test('Recordatorio cancelado se rechaza', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema);
    const [waMe] = await waMeDe(sistema, turno.id);
    if (waMe === undefined) throw new Error('falta el wa.me');
    await sistema.repoRecordatorios.guardar({ ...waMe, estado: 'cancelado' });
    const rechazo = sistema.marcarEnviado.ejecutar({ actor: actores.recepcion, recordatorioId: waMe.id });
    await expect(rechazo).rejects.toMatchObject({ codigo: 'ESTADO_NO_ENVIABLE' });
    expect((await waMeDe(sistema, turno.id))[0]?.estado).toBe('cancelado');
  });

  test('Recordatorio fallido se rechaza', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema);
    const [waMe] = await waMeDe(sistema, turno.id);
    if (waMe === undefined) throw new Error('falta el wa.me');
    await sistema.repoRecordatorios.guardar({ ...waMe, estado: 'fallido', motivoFallo: 'sin señal' });
    const rechazo = sistema.marcarEnviado.ejecutar({ actor: actores.recepcion, recordatorioId: waMe.id });
    await expect(rechazo).rejects.toMatchObject({ codigo: 'ESTADO_NO_ENVIABLE' });
    expect((await waMeDe(sistema, turno.id))[0]?.motivoFallo).toBe('sin señal');
  });

  test('Marcar el `wa.me` no toca el e-mail', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema);
    const [waMe] = await waMeDe(sistema, turno.id);
    if (waMe === undefined) throw new Error('falta el wa.me');
    await sistema.marcarEnviado.ejecutar({ actor: actores.recepcion, recordatorioId: waMe.id });
    const email = (await recordatoriosDe(sistema, turno.id)).find((r) => r.canal === 'email');
    expect(email?.estado).toBe('pendiente');
    expect(sistema.notificador.enviados).toHaveLength(0);
  });
});
