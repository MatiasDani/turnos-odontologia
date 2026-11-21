import { describe, expect, test } from 'vitest';
import { TokenGestionRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/token-gestion-repositorio.js';
import type { TokenGestion } from '../../src/domain/token-gestion.js';
import { local, LUNES } from '../fixtures/seed.js';

const creadoEn = local(LUNES, '08:00');

function token(overrides: Partial<TokenGestion> = {}): TokenGestion {
  return { turnoId: 't-1', hash: 'a'.repeat(64), creadoEn, ...overrides };
}

describe('TokenGestionRepositorioEnMemoria', () => {
  test('un token guardado se obtiene por su hash', async () => {
    const repo = new TokenGestionRepositorioEnMemoria();
    await repo.guardar(token());
    await expect(repo.obtenerPorHash('a'.repeat(64))).resolves.toEqual(token());
  });

  test('un hash desconocido devuelve undefined', async () => {
    const repo = new TokenGestionRepositorioEnMemoria();
    await repo.guardar(token());
    await expect(repo.obtenerPorHash('b'.repeat(64))).resolves.toBeUndefined();
  });

  test('guardar un hash repetido se rechaza y no pisa el registro original', async () => {
    const repo = new TokenGestionRepositorioEnMemoria();
    await repo.guardar(token({ turnoId: 't-1' }));
    await expect(repo.guardar(token({ turnoId: 't-2' }))).rejects.toThrow();
    await expect(repo.obtenerPorHash('a'.repeat(64))).resolves.toMatchObject({ turnoId: 't-1' });
  });

  test('obtenerPorTurno devuelve el token vigente del turno', async () => {
    const repo = new TokenGestionRepositorioEnMemoria();
    await repo.guardar(token());
    await repo.guardar(token({ turnoId: 't-2', hash: 'c'.repeat(64) }));
    await expect(repo.obtenerPorTurno('t-2')).resolves.toMatchObject({ hash: 'c'.repeat(64) });
    await expect(repo.obtenerPorTurno('t-9')).resolves.toBeUndefined();
  });

  test('invalidar marca el token vigente: deja de ser vigente pero se sigue obteniendo por hash', async () => {
    const repo = new TokenGestionRepositorioEnMemoria();
    await repo.guardar(token());
    const en = local(LUNES, '08:30');
    await repo.invalidar('t-1', en);
    await expect(repo.obtenerPorTurno('t-1')).resolves.toBeUndefined();
    await expect(repo.obtenerPorHash('a'.repeat(64))).resolves.toMatchObject({ invalidadoEn: en });
  });

  test('tras invalidar, el siguiente token del turno es el vigente', async () => {
    const repo = new TokenGestionRepositorioEnMemoria();
    await repo.guardar(token());
    await repo.invalidar('t-1', local(LUNES, '08:30'));
    await repo.guardar(token({ hash: 'd'.repeat(64), creadoEn: local(LUNES, '08:30') }));
    await expect(repo.obtenerPorTurno('t-1')).resolves.toMatchObject({ hash: 'd'.repeat(64) });
  });

  test('invalidar un turno sin token no falla ni toca otros turnos', async () => {
    const repo = new TokenGestionRepositorioEnMemoria();
    await repo.guardar(token());
    await expect(repo.invalidar('t-9', creadoEn)).resolves.toBeUndefined();
    await expect(repo.obtenerPorTurno('t-1')).resolves.toBeDefined();
  });

  test('todos() expone los registros para inspección (solo hashes)', async () => {
    const repo = new TokenGestionRepositorioEnMemoria();
    await repo.guardar(token());
    expect(repo.todos()).toEqual([token()]);
  });
});
