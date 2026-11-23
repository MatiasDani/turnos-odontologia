import { describe, expect, test } from 'vitest';
import { local } from '../fixtures/seed.js';
import { agendarRecepcion, crearSistemaWaMe, DOMINGO, waMeDe } from '../fixtures/sistema-wa-me.js';

describe('Lista de `wa.me` pendientes para recepción', () => {
  test('Lista ordenada por `programadoPara`', async () => {
    const sistema = crearSistemaWaMe();
    const temprano = await agendarRecepcion(sistema, { hora: '09:00' });
    const tarde = await agendarRecepcion(sistema, { hora: '10:00' });
    const [waTemprano] = await waMeDe(sistema, temprano.id);
    const [waTarde] = await waMeDe(sistema, tarde.id);
    if (waTemprano === undefined || waTarde === undefined) throw new Error('faltan los wa.me');
    await sistema.repoRecordatorios.guardar({ ...waTemprano, programadoPara: local(DOMINGO, '10:00') });
    await sistema.repoRecordatorios.guardar({ ...waTarde, programadoPara: local(DOMINGO, '09:00') });
    const lista = await sistema.listarPendientesWaMe.ejecutar();
    expect(lista.map((r) => r.turnoId)).toEqual([tarde.id, temprano.id]);
  });

  test('Solo aparecen los `wa.me` pendientes', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema, { hora: '09:00' });
    const otro = await agendarRecepcion(sistema, { hora: '10:00' });
    const [yaEnviado] = await waMeDe(sistema, otro.id);
    if (yaEnviado === undefined) throw new Error('falta el wa.me');
    await sistema.repoRecordatorios.guardar({ ...yaEnviado, estado: 'enviado', enviadoEn: local(DOMINGO, '09:00') });
    const lista = await sistema.listarPendientesWaMe.ejecutar();
    expect(lista).toHaveLength(1);
    expect(lista[0]?.turnoId).toBe(turno.id);
    expect(lista[0]?.id).not.toBe(yaEnviado.id);
  });

  test('La lista no expone datos ajenos', async () => {
    const sistema = crearSistemaWaMe();
    await agendarRecepcion(sistema);
    const lista = await sistema.listarPendientesWaMe.ejecutar();
    expect(Object.keys(lista[0] ?? {}).sort()).toEqual(['enlaceWaMe', 'id', 'programadoPara', 'turnoId']);
  });

  test('Sin pendientes devuelve lista vacía', async () => {
    const sistema = crearSistemaWaMe();
    expect(await sistema.listarPendientesWaMe.ejecutar()).toEqual([]);
  });
});
