import { describe, expect, test } from 'vitest';
import { RecordatoriosNoOp } from '../../src/adapters/recordatorios/recordatorios-no-op.js';
import { RecordatoriosEspia } from '../fixtures/recordatorios-espia.js';

describe('RecordatoriosNoOp', () => {
  test('cancelarPendientes resuelve sin error', async () => {
    await expect(new RecordatoriosNoOp().cancelarPendientes('t1')).resolves.toBeUndefined();
  });

  test('cancelarPendientes resuelve con cualquier turno', async () => {
    const recordatorios = new RecordatoriosNoOp();
    await expect(recordatorios.cancelarPendientes('t2')).resolves.toBeUndefined();
    await expect(recordatorios.cancelarPendientes('inexistente')).resolves.toBeUndefined();
  });

  test('programar resuelve sin error con cualquier turno (C-12)', async () => {
    const recordatorios = new RecordatoriosNoOp();
    await expect(recordatorios.programar('t1')).resolves.toBeUndefined();
    await expect(recordatorios.programar('inexistente')).resolves.toBeUndefined();
  });
});

describe('RecordatoriosEspia', () => {
  test('registra los turnos recibidos en orden', async () => {
    const espia = new RecordatoriosEspia();
    await espia.cancelarPendientes('t1');
    await espia.cancelarPendientes('t2');
    expect(espia.cancelados).toEqual(['t1', 't2']);
  });

  test('sin llamadas no registra nada', () => {
    expect(new RecordatoriosEspia().cancelados).toEqual([]);
  });

  test('configurado para fallar rechaza y registra igual el pedido', async () => {
    const espia = new RecordatoriosEspia();
    espia.fallarCon(new Error('servicio de recordatorios caído'));
    await expect(espia.cancelarPendientes('t1')).rejects.toThrow('servicio de recordatorios caído');
    expect(espia.cancelados).toEqual(['t1']);
  });

  test('registra los pedidos de programar aparte de las cancelaciones (C-12)', async () => {
    const espia = new RecordatoriosEspia();
    await espia.programar('t1');
    await espia.cancelarPendientes('t2');
    await espia.programar('t3');
    expect(espia.programados).toEqual(['t1', 't3']);
    expect(espia.cancelados).toEqual(['t2']);
  });
});
