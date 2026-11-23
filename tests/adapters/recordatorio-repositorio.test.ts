import { describe, expect, test } from 'vitest';
import { RecordatorioRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/recordatorio-repositorio.js';
import type { Recordatorio } from '../../src/domain/recordatorio.js';
import { LUNES, local } from '../fixtures/seed.js';

const DOMINGO = '2026-11-22';

function recordatorio(overrides: Partial<Recordatorio> = {}): Recordatorio {
  return {
    id: 'r-1',
    turnoId: 't-1',
    canal: 'email',
    programadoPara: local(DOMINGO, '09:00'),
    estado: 'pendiente',
    ...overrides,
  };
}

describe('RecordatorioRepositorioEnMemoria', () => {
  test('guardar con el mismo id reemplaza el registro, no lo duplica', async () => {
    const repo = new RecordatorioRepositorioEnMemoria();
    await repo.guardar(recordatorio());
    await repo.guardar(recordatorio({ estado: 'cancelado' }));
    await expect(repo.listarPorTurno('t-1')).resolves.toEqual([recordatorio({ estado: 'cancelado' })]);
  });

  test('obtenerPorId devuelve el registro o undefined', async () => {
    const repo = new RecordatorioRepositorioEnMemoria([recordatorio({ id: 'r-1' })]);
    await expect(repo.obtenerPorId('r-1')).resolves.toEqual(recordatorio({ id: 'r-1' }));
    await expect(repo.obtenerPorId('r-9')).resolves.toBeUndefined();
  });

  test('listarPorTurno devuelve solo los del turno', async () => {
    const repo = new RecordatorioRepositorioEnMemoria([
      recordatorio({ id: 'r-1', turnoId: 't-1' }),
      recordatorio({ id: 'r-2', turnoId: 't-2' }),
      recordatorio({ id: 'r-3', turnoId: 't-1', estado: 'enviado' }),
    ]);
    const ids = (await repo.listarPorTurno('t-1')).map((r) => r.id);
    expect(ids).toEqual(['r-1', 'r-3']);
    await expect(repo.listarPorTurno('t-9')).resolves.toEqual([]);
  });

  test('listarPendientesHasta filtra por estado y por programadoPara (inclusive) y ordena ascendente', async () => {
    const repo = new RecordatorioRepositorioEnMemoria([
      recordatorio({ id: 'tarde', programadoPara: local(DOMINGO, '10:00') }),
      recordatorio({ id: 'justo', programadoPara: local(DOMINGO, '09:00') }),
      recordatorio({ id: 'temprano', programadoPara: local(DOMINGO, '08:00') }),
      recordatorio({ id: 'futuro', programadoPara: local(LUNES, '08:00') }),
      recordatorio({ id: 'enviado', programadoPara: local(DOMINGO, '07:00'), estado: 'enviado' }),
    ]);
    const ids = (await repo.listarPendientesHasta(local(DOMINGO, '10:00'))).map((r) => r.id);
    expect(ids).toEqual(['temprano', 'justo', 'tarde']);
  });

  test('listarPorEstado devuelve solo los de ese estado', async () => {
    const repo = new RecordatorioRepositorioEnMemoria([
      recordatorio({ id: 'r-1', estado: 'fallido', motivoFallo: 'x' }),
      recordatorio({ id: 'r-2', estado: 'enviado' }),
      recordatorio({ id: 'r-3', estado: 'fallido', motivoFallo: 'y' }),
    ]);
    expect((await repo.listarPorEstado('fallido')).map((r) => r.id)).toEqual(['r-1', 'r-3']);
    await expect(repo.listarPorEstado('cancelado')).resolves.toEqual([]);
  });

  test('los registros iniciales no se comparten con el arreglo recibido', async () => {
    const iniciales = [recordatorio()];
    const repo = new RecordatorioRepositorioEnMemoria(iniciales);
    iniciales.pop();
    await expect(repo.listarPorTurno('t-1')).resolves.toHaveLength(1);
  });
});
