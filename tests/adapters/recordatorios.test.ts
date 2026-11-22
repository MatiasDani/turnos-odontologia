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
});
