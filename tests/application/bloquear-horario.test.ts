import { describe, expect, test } from 'vitest';
import { BloquearHorario } from '../../src/application/bloquear-horario.js';
import { LiberarBloqueo } from '../../src/application/liberar-bloqueo.js';
import { AccesoDenegadoError, RecursoNoEncontradoError, ReglaNegocioError } from '../../src/domain/errores.js';
import { agendar, crearSistemaBloqueo } from '../fixtures/sistema.js';
import { crearTurno, LUNES, local, MARTES } from '../fixtures/seed.js';

describe('Alta de bloqueos válidos', () => {
  test('Bloqueo de profesional sin turnos', async () => {
    const sistema = crearSistemaBloqueo();
    const useCase = new BloquearHorario({
      bloqueos: sistema.bloqueos,
      turnos: sistema.turnos,
      generadorId: sistema.generadorId,
    });

    const bloqueo = await useCase.ejecutar({
      actor: { rol: 'recepcion' },
      profesionalId: 'p1',
      inicio: local(LUNES, '15:00'),
      fin: local(LUNES, '17:00'),
      motivo: 'Capacitación',
    });

    expect(bloqueo).toMatchObject({
      profesionalId: 'p1',
      inicio: local(LUNES, '15:00'),
      fin: local(LUNES, '17:00'),
      motivo: 'Capacitación',
    });
    expect(bloqueo.sillonId).toBeUndefined();
    expect(await sistema.bloqueos.obtenerPorId(bloqueo.id)).toEqual(bloqueo);
  });

  test('Bloqueo de sillón sin turnos', async () => {
    const sistema = crearSistemaBloqueo();
    const useCase = new BloquearHorario({
      bloqueos: sistema.bloqueos,
      turnos: sistema.turnos,
      generadorId: sistema.generadorId,
    });

    const bloqueo = await useCase.ejecutar({
      actor: { rol: 'administrador' },
      sillonId: 's1',
      inicio: local(MARTES, '09:00'),
      fin: local(MARTES, '12:00'),
      motivo: 'Mantenimiento de turbina',
    });

    expect(bloqueo).toMatchObject({
      sillonId: 's1',
      inicio: local(MARTES, '09:00'),
      fin: local(MARTES, '12:00'),
      motivo: 'Mantenimiento de turbina',
    });
    expect(bloqueo.profesionalId).toBeUndefined();
    expect(await sistema.bloqueos.obtenerPorId(bloqueo.id)).toEqual(bloqueo);
  });

  test('Bloqueo conjunto de profesional y sillón', async () => {
    const sistema = crearSistemaBloqueo();
    const useCase = new BloquearHorario({
      bloqueos: sistema.bloqueos,
      turnos: sistema.turnos,
      generadorId: sistema.generadorId,
    });

    const bloqueo = await useCase.ejecutar({
      actor: { rol: 'recepcion' },
      profesionalId: 'p2',
      sillonId: 's2',
      inicio: local(LUNES, '10:00'),
      fin: local(LUNES, '11:00'),
    });

    expect(bloqueo.profesionalId).toBe('p2');
    expect(bloqueo.sillonId).toBe('s2');
  });
});

describe('Conflicto con turnos activos preexistentes', () => {
  test('Rechazo de bloqueo por turno activo del profesional', async () => {
    const turno = crearTurno({
      id: 't-activo-p1',
      profesionalId: 'p1',
      inicio: local(LUNES, '10:00'),
      fin: local(LUNES, '10:45'),
      estado: 'confirmado',
    });
    const sistema = crearSistemaBloqueo({ turnos: [turno] });
    const useCase = new BloquearHorario({
      bloqueos: sistema.bloqueos,
      turnos: sistema.turnos,
      generadorId: sistema.generadorId,
    });

    await expect(
      useCase.ejecutar({
        actor: { rol: 'recepcion' },
        profesionalId: 'p1',
        inicio: local(LUNES, '10:30'),
        fin: local(LUNES, '12:00'),
      }),
    ).rejects.toSatisfy((err) => {
      expect(err).toBeInstanceOf(ReglaNegocioError);
      const e = err as ReglaNegocioError;
      expect(e.codigo).toBe('RN-31');
      expect(e.turnosEnConflicto?.map((t) => t.id)).toEqual(['t-activo-p1']);
      return true;
    });
  });

  test('Rechazo de bloqueo por turno activo en el sillón', async () => {
    const turno = crearTurno({
      id: 't-activo-s1',
      profesionalId: 'p2',
      sillonId: 's1',
      inicio: local(LUNES, '11:00'),
      fin: local(LUNES, '11:30'),
      estado: 'reservado',
    });
    const sistema = crearSistemaBloqueo({ turnos: [turno] });
    const useCase = new BloquearHorario({
      bloqueos: sistema.bloqueos,
      turnos: sistema.turnos,
      generadorId: sistema.generadorId,
    });

    await expect(
      useCase.ejecutar({
        actor: { rol: 'administrador' },
        sillonId: 's1',
        inicio: local(LUNES, '10:00'),
        fin: local(LUNES, '12:00'),
      }),
    ).rejects.toSatisfy((err) => {
      expect(err).toBeInstanceOf(ReglaNegocioError);
      const e = err as ReglaNegocioError;
      expect(e.codigo).toBe('RN-31');
      expect(e.turnosEnConflicto?.map((t) => t.id)).toEqual(['t-activo-s1']);
      return true;
    });
  });

  test('Turnos inactivos no impiden la creación del bloqueo', async () => {
    const cancelado = crearTurno({
      id: 't-canc',
      profesionalId: 'p1',
      inicio: local(LUNES, '09:00'),
      fin: local(LUNES, '09:30'),
      estado: 'cancelado',
    });
    const ausente = crearTurno({
      id: 't-aus',
      profesionalId: 'p1',
      inicio: local(LUNES, '09:30'),
      fin: local(LUNES, '10:00'),
      estado: 'ausente',
    });
    const sistema = crearSistemaBloqueo({ turnos: [cancelado, ausente] });
    const useCase = new BloquearHorario({
      bloqueos: sistema.bloqueos,
      turnos: sistema.turnos,
      generadorId: sistema.generadorId,
    });

    const bloqueo = await useCase.ejecutar({
      actor: { rol: 'recepcion' },
      profesionalId: 'p1',
      inicio: local(LUNES, '09:00'),
      fin: local(LUNES, '10:00'),
    });
    expect(bloqueo).toBeDefined();
  });
});

describe('Intervalos contiguos válidos', () => {
  test('Bloqueo que inicia justo al finalizar un turno activo', async () => {
    const turno = crearTurno({
      id: 't-prev',
      profesionalId: 'p1',
      inicio: local(LUNES, '09:00'),
      fin: local(LUNES, '10:00'),
      estado: 'confirmado',
    });
    const sistema = crearSistemaBloqueo({ turnos: [turno] });
    const useCase = new BloquearHorario({
      bloqueos: sistema.bloqueos,
      turnos: sistema.turnos,
      generadorId: sistema.generadorId,
    });

    const bloqueo = await useCase.ejecutar({
      actor: { rol: 'recepcion' },
      profesionalId: 'p1',
      inicio: local(LUNES, '10:00'),
      fin: local(LUNES, '11:00'),
    });
    expect(bloqueo).toBeDefined();
  });

  test('Bloqueo que finaliza justo al iniciar un turno activo', async () => {
    const turno = crearTurno({
      id: 't-post',
      profesionalId: 'p1',
      inicio: local(LUNES, '11:00'),
      fin: local(LUNES, '12:00'),
      estado: 'confirmado',
    });
    const sistema = crearSistemaBloqueo({ turnos: [turno] });
    const useCase = new BloquearHorario({
      bloqueos: sistema.bloqueos,
      turnos: sistema.turnos,
      generadorId: sistema.generadorId,
    });

    const bloqueo = await useCase.ejecutar({
      actor: { rol: 'recepcion' },
      profesionalId: 'p1',
      inicio: local(LUNES, '10:00'),
      fin: local(LUNES, '11:00'),
    });
    expect(bloqueo).toBeDefined();
  });
});

describe('Control de acceso por rol', () => {
  test('Odontólogo bloquea su propia agenda', async () => {
    const sistema = crearSistemaBloqueo();
    const useCase = new BloquearHorario({
      bloqueos: sistema.bloqueos,
      turnos: sistema.turnos,
      generadorId: sistema.generadorId,
    });

    const bloqueo = await useCase.ejecutar({
      actor: { rol: 'odontologo', profesionalId: 'p1' },
      profesionalId: 'p1',
      inicio: local(LUNES, '15:00'),
      fin: local(LUNES, '16:00'),
    });
    expect(bloqueo.profesionalId).toBe('p1');
  });

  test('Odontólogo no puede bloquear la agenda de otro profesional', async () => {
    const sistema = crearSistemaBloqueo();
    const useCase = new BloquearHorario({
      bloqueos: sistema.bloqueos,
      turnos: sistema.turnos,
      generadorId: sistema.generadorId,
    });

    await expect(
      useCase.ejecutar({
        actor: { rol: 'odontologo', profesionalId: 'p1' },
        profesionalId: 'p2',
        inicio: local(LUNES, '15:00'),
        fin: local(LUNES, '16:00'),
      }),
    ).rejects.toThrow(AccesoDenegadoError);
  });

  test('Paciente no puede bloquear horarios', async () => {
    const sistema = crearSistemaBloqueo();
    const useCase = new BloquearHorario({
      bloqueos: sistema.bloqueos,
      turnos: sistema.turnos,
      generadorId: sistema.generadorId,
    });

    await expect(
      useCase.ejecutar({
        actor: { rol: 'paciente' },
        profesionalId: 'p1',
        inicio: local(LUNES, '15:00'),
        fin: local(LUNES, '16:00'),
      }),
    ).rejects.toThrow(AccesoDenegadoError);
  });
});

describe('Liberación de bloqueos', () => {
  test('Liberación exitosa de bloqueo existente', async () => {
    const sistema = crearSistemaBloqueo();
    await sistema.bloqueos.guardar({
      id: 'b-1',
      profesionalId: 'p1',
      inicio: local(LUNES, '10:00'),
      fin: local(LUNES, '12:00'),
    });

    const useCase = new LiberarBloqueo({ bloqueos: sistema.bloqueos });
    await useCase.ejecutar({
      actor: { rol: 'recepcion' },
      bloqueoId: 'b-1',
    });

    expect(await sistema.bloqueos.obtenerPorId('b-1')).toBeUndefined();
  });

  test('Liberar bloqueo inexistente lanza error', async () => {
    const sistema = crearSistemaBloqueo();
    const useCase = new LiberarBloqueo({ bloqueos: sistema.bloqueos });

    await expect(
      useCase.ejecutar({
        actor: { rol: 'administrador' },
        bloqueoId: 'inexistente',
      }),
    ).rejects.toThrow(RecursoNoEncontradoError);
  });

  test('Odontólogo no puede liberar bloqueo ajeno', async () => {
    const sistema = crearSistemaBloqueo();
    await sistema.bloqueos.guardar({
      id: 'b-2',
      profesionalId: 'p2',
      inicio: local(LUNES, '10:00'),
      fin: local(LUNES, '12:00'),
    });

    const useCase = new LiberarBloqueo({ bloqueos: sistema.bloqueos });

    await expect(
      useCase.ejecutar({
        actor: { rol: 'odontologo', profesionalId: 'p1' },
        bloqueoId: 'b-2',
      }),
    ).rejects.toThrow(AccesoDenegadoError);
  });
});

describe('Integración: un bloqueo recién creado impide agendar turnos (RN-07)', () => {
  test('Turno nuevo sobre bloqueo recién creado es rechazado con RN-07', async () => {
    const sistema = crearSistemaBloqueo();
    const useCaseBloquear = new BloquearHorario({
      bloqueos: sistema.bloqueos,
      turnos: sistema.turnos,
      generadorId: sistema.generadorId,
    });

    await useCaseBloquear.ejecutar({
      actor: { rol: 'administrador' },
      profesionalId: 'p1',
      inicio: local(LUNES, '11:00'),
      fin: local(LUNES, '12:00'),
    });

    // Intentar agendar un turno que solape con el bloqueo
    await expect(
      agendar(sistema, {
        profesionalId: 'p1',
        sillonId: 's1',
        prestacionId: 'pr1',
        hora: '11:00',
      }),
    ).rejects.toSatisfy((err) => {
      expect(err).toBeInstanceOf(ReglaNegocioError);
      expect((err as ReglaNegocioError).codigo).toBe('RN-07');
      return true;
    });
  });
});
