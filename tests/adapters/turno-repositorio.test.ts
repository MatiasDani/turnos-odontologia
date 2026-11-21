import { describe, expect, test, vi } from 'vitest';
import { ReglaNegocioError } from '../../src/domain/errores.js';
import { TurnoRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/turno-repositorio.js';
import { crearTurno, LUNES, local } from '../fixtures/seed.js';

describe('TurnoRepositorioEnMemoria.agregarSiDisponible (RN-12)', () => {
  test('inserta el candidato cuando el validador no informa violación', async () => {
    const repo = new TurnoRepositorioEnMemoria();
    const candidato = crearTurno({ id: 't1' });
    await expect(repo.agregarSiDisponible(candidato, () => null)).resolves.toEqual(candidato);
    expect(await repo.listarPorRecursos('p1', 's1')).toEqual([candidato]);
  });

  test('con violación rechaza con ReglaNegocioError y no persiste nada', async () => {
    const repo = new TurnoRepositorioEnMemoria();
    const promesa = repo.agregarSiDisponible(crearTurno({ id: 't1' }), () => ({ codigo: 'RN-02' }));
    await expect(promesa).rejects.toBeInstanceOf(ReglaNegocioError);
    await expect(promesa).rejects.toMatchObject({ codigo: 'RN-02' });
    expect(await repo.listarPorRecursos('p1', 's1')).toEqual([]);
  });

  test('el validador recibe solo los turnos del profesional o del sillón del candidato', async () => {
    const mismoProfesional = crearTurno({ id: 'a', profesionalId: 'p1', sillonId: 's2' });
    const mismoSillon = crearTurno({ id: 'b', profesionalId: 'p2', sillonId: 's1' });
    const ajeno = crearTurno({ id: 'c', profesionalId: 'p2', sillonId: 's2' });
    const repo = new TurnoRepositorioEnMemoria([mismoProfesional, mismoSillon, ajeno]);
    const validar = vi.fn(() => null);
    await repo.agregarSiDisponible(crearTurno({ id: 'n' }), validar);
    expect(validar).toHaveBeenCalledWith([mismoProfesional, mismoSillon]);
  });

  test('la lectura, la validación y la inserción ocurren de forma síncrona (sin await intermedio)', () => {
    const repo = new TurnoRepositorioEnMemoria();
    const validar = vi.fn(() => null);
    void repo.agregarSiDisponible(crearTurno({ id: 't1' }), validar);
    // Sin ceder el control al event loop: el validador ya corrió y el turno ya está insertado.
    expect(validar).toHaveBeenCalledTimes(1);
    return expect(repo.listarPorRecursos('p1', 's1')).resolves.toHaveLength(1);
  });

  test('dos inserciones consecutivas: la segunda ve la primera', async () => {
    const repo = new TurnoRepositorioEnMemoria();
    const primero = crearTurno({ id: 't1' });
    await repo.agregarSiDisponible(primero, () => null);
    const validar = vi.fn(() => null);
    await repo.agregarSiDisponible(
      crearTurno({ id: 't2', inicio: local(LUNES, '11:00'), fin: local(LUNES, '12:00') }),
      validar,
    );
    expect(validar).toHaveBeenCalledWith([primero]);
  });
});
