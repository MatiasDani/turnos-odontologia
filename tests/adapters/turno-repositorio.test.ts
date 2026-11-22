import { describe, expect, test, vi } from 'vitest';
import { RecursoNoEncontradoError, ReglaNegocioError } from '../../src/domain/errores.js';
import { TurnoRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/turno-repositorio.js';
import type { ResultadoCambio } from '../../src/application/puertos/repositorios.js';
import type { Turno } from '../../src/domain/turno.js';
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

describe('TurnoRepositorioEnMemoria.obtenerPorId (C-10)', () => {
  test('devuelve el turno con ese id', async () => {
    const t1 = crearTurno({ id: 't1' });
    const repo = new TurnoRepositorioEnMemoria([t1, crearTurno({ id: 't2', profesionalId: 'p2', sillonId: 's2' })]);
    await expect(repo.obtenerPorId('t1')).resolves.toEqual(t1);
  });

  test('un id inexistente devuelve undefined', async () => {
    const repo = new TurnoRepositorioEnMemoria([crearTurno({ id: 't1' })]);
    await expect(repo.obtenerPorId('inexistente')).resolves.toBeUndefined();
  });

  test('encuentra turnos de cualquier estado, incluso cancelados', async () => {
    const cancelado = crearTurno({ id: 'tc', estado: 'cancelado' });
    const repo = new TurnoRepositorioEnMemoria([cancelado]);
    await expect(repo.obtenerPorId('tc')).resolves.toEqual(cancelado);
  });
});

describe('TurnoRepositorioEnMemoria.listarPorPaciente (C-10)', () => {
  test('devuelve solo los turnos del paciente, de cualquier estado', async () => {
    const activo = crearTurno({ id: 'a', pacienteId: 'pa1' });
    const cancelado = crearTurno({ id: 'b', pacienteId: 'pa1', estado: 'cancelado', profesionalId: 'p2', sillonId: 's2' });
    const ajeno = crearTurno({ id: 'c', pacienteId: 'pa2', profesionalId: 'p2', sillonId: 's1' });
    const repo = new TurnoRepositorioEnMemoria([activo, cancelado, ajeno]);
    expect(await repo.listarPorPaciente('pa1')).toEqual([activo, cancelado]);
  });

  test('un paciente sin turnos devuelve una lista vacía', async () => {
    const repo = new TurnoRepositorioEnMemoria([crearTurno({ id: 'a', pacienteId: 'pa1' })]);
    expect(await repo.listarPorPaciente('pa3')).toEqual([]);
  });

  test('un turno agregado después se ve en la lectura', async () => {
    const repo = new TurnoRepositorioEnMemoria();
    const nuevo = crearTurno({ id: 'n', pacienteId: 'pa2' });
    await repo.agregarSiDisponible(nuevo, () => null);
    expect(await repo.listarPorPaciente('pa2')).toEqual([nuevo]);
    await expect(repo.obtenerPorId('n')).resolves.toEqual(nuevo);
  });
});

describe('TurnoRepositorioEnMemoria.actualizarSi (C-02, RN-12)', () => {
  test('con ok reemplaza el turno y devuelve el turno nuevo', async () => {
    const repo = new TurnoRepositorioEnMemoria([crearTurno({ id: 't1' })]);
    const resultado = await repo.actualizarSi('t1', (actual) => ({ ok: true, turno: { ...actual, estado: 'cancelado' } }));
    expect(resultado.estado).toBe('cancelado');
    await expect(repo.obtenerPorId('t1')).resolves.toEqual(resultado);
  });

  test('reemplaza solo el turno pedido', async () => {
    const otro = crearTurno({ id: 't2', profesionalId: 'p2', sillonId: 's2' });
    const repo = new TurnoRepositorioEnMemoria([crearTurno({ id: 't1' }), otro]);
    await repo.actualizarSi('t1', (actual) => ({ ok: true, turno: { ...actual, estado: 'atendido' } }));
    await expect(repo.obtenerPorId('t2')).resolves.toEqual(otro);
    expect(await repo.listarPorRecursos('p2', 's2')).toHaveLength(1);
  });

  test('cambio recibe el turno actual', async () => {
    const t1 = crearTurno({ id: 't1' });
    const repo = new TurnoRepositorioEnMemoria([t1]);
    const cambio = vi.fn((actual: typeof t1) => ({ ok: true as const, turno: actual }));
    await repo.actualizarSi('t1', cambio);
    expect(cambio).toHaveBeenCalledWith(t1);
  });

  test('con violación rechaza con ReglaNegocioError y no modifica el turno', async () => {
    const t1 = crearTurno({ id: 't1' });
    const repo = new TurnoRepositorioEnMemoria([t1]);
    const promesa = repo.actualizarSi('t1', () => ({ ok: false, violacion: { codigo: 'RN-10', estadoActual: 'confirmado' } }));
    await expect(promesa).rejects.toBeInstanceOf(ReglaNegocioError);
    await expect(promesa).rejects.toMatchObject({ codigo: 'RN-10', estadoActual: 'confirmado' });
    await expect(repo.obtenerPorId('t1')).resolves.toEqual(t1);
  });

  test('con otra violación tampoco modifica', async () => {
    const t1 = crearTurno({ id: 't1' });
    const repo = new TurnoRepositorioEnMemoria([t1]);
    await expect(repo.actualizarSi('t1', () => ({ ok: false, violacion: { codigo: 'RN-08' } }))).rejects.toMatchObject({
      codigo: 'RN-08',
    });
    await expect(repo.obtenerPorId('t1')).resolves.toEqual(t1);
  });

  test('un id inexistente rechaza con RecursoNoEncontradoError sin llamar a cambio', async () => {
    const repo = new TurnoRepositorioEnMemoria([crearTurno({ id: 't1' })]);
    const cambio = vi.fn();
    const promesa = repo.actualizarSi('inexistente', cambio);
    await expect(promesa).rejects.toBeInstanceOf(RecursoNoEncontradoError);
    await expect(promesa).rejects.toMatchObject({ tipo: 'turno', id: 'inexistente' });
    expect(cambio).not.toHaveBeenCalled();
  });

  test('un cambio que altera el id rechaza con un error de programación y no modifica', async () => {
    const t1 = crearTurno({ id: 't1' });
    const repo = new TurnoRepositorioEnMemoria([t1]);
    const promesa = repo.actualizarSi('t1', (actual) => ({ ok: true, turno: { ...actual, id: 't9' } }));
    await expect(promesa).rejects.toThrow(/id/);
    await expect(promesa).rejects.not.toBeInstanceOf(ReglaNegocioError);
    await expect(repo.obtenerPorId('t1')).resolves.toEqual(t1);
    await expect(repo.obtenerPorId('t9')).resolves.toBeUndefined();
  });
});

describe('TurnoRepositorioEnMemoria.actualizarSi: atomicidad (RN-12)', () => {
  /** Cambio que solo acepta turnos confirmados y los cancela con el rol indicado. */
  const cancelarSiConfirmado = (rol: 'recepcion' | 'administrador') => (actual: Turno): ResultadoCambio =>
    actual.estado === 'confirmado'
      ? { ok: true, turno: { ...actual, estado: 'cancelado', canceladoPor: rol } }
      : { ok: false, violacion: { codigo: 'RN-10', estadoActual: actual.estado } };

  test('dos modificaciones concurrentes: una se concreta y la otra ve el estado nuevo', async () => {
    const repo = new TurnoRepositorioEnMemoria([crearTurno({ id: 't1' })]);
    const [a, b] = await Promise.allSettled([
      repo.actualizarSi('t1', cancelarSiConfirmado('recepcion')),
      repo.actualizarSi('t1', cancelarSiConfirmado('administrador')),
    ]);
    expect(a.status).toBe('fulfilled');
    expect(b.status).toBe('rejected');
    expect(b.status === 'rejected' && b.reason).toMatchObject({ codigo: 'RN-10', estadoActual: 'cancelado' });
    await expect(repo.obtenerPorId('t1')).resolves.toMatchObject({ estado: 'cancelado', canceladoPor: 'recepcion' });
  });

  test('cambio corre de forma síncrona (sin await intermedio)', () => {
    const repo = new TurnoRepositorioEnMemoria([crearTurno({ id: 't1' })]);
    void repo.actualizarSi('t1', cancelarSiConfirmado('recepcion'));
    // Sin ceder el control al event loop: el turno ya quedó reemplazado.
    return expect(repo.obtenerPorId('t1')).resolves.toMatchObject({ estado: 'cancelado' });
  });
});
