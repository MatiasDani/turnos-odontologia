// Escenarios de openspec/changes/c03-reprogramar-turno-atomico/specs/reprogramacion-turnos/spec.md.
// Cada test lleva el nombre exacto de su `#### Scenario:` (regla dura 8); un `describe` por requisito.
import { describe, expect, test } from 'vitest';
import { AccesoDenegadoError, RecursoNoEncontradoError, ReglaNegocioError } from '../../src/domain/errores.js';
import {
  crearSistemaReprogramacion,
  rechazo,
  reprogramar,
  turnoBaseCancelacion,
} from '../fixtures/sistema.js';
import { crearEntorno, crearTurno, local, LUNES, MARTES, MIERCOLES } from '../fixtures/seed.js';
import { actores } from '../fixtures/actores.js';

const DOMINGO = '2026-11-22';
const martes = (hhmm: string) => local(MARTES, hhmm);
const base = () => turnoBaseCancelacion();

describe('Conservación de la identidad del turno', () => {
  test('El turno mantiene su identidad', async () => {
    const sistema = crearSistemaReprogramacion({ turnos: [base()] });
    const movido = await reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:00') });
    expect(movido).toMatchObject({
      id: 't-base',
      pacienteId: 'pa1',
      estado: 'confirmado',
      origen: 'recepcion',
      inicio: martes('10:00'),
      fin: martes('10:30'),
    });
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toEqual(movido);
  });

  test('Reprogramación con cambio de recursos', async () => {
    const sistema = crearSistemaReprogramacion({ turnos: [base()] });
    const movido = await reprogramar(sistema, {
      turnoId: 't-base',
      inicio: martes('11:00'),
      profesionalId: 'p2',
      sillonId: 's2',
      prestacionId: 'pr2',
    });
    expect(movido).toMatchObject({
      profesionalId: 'p2',
      sillonId: 's2',
      prestacionId: 'pr2',
      fin: martes('11:45'),
      id: 't-base',
      pacienteId: 'pa1',
      estado: 'confirmado',
      origen: 'recepcion',
    });
  });
});

describe('Estados reprogramables', () => {
  test('Un turno reservado se puede reprogramar', async () => {
    const reservado = base();
    const sistema = crearSistemaReprogramacion({
      turnos: [{ ...reservado, estado: 'reservado', origen: 'online' }],
    });
    const movido = await reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:00') });
    expect(movido).toMatchObject({ estado: 'reservado', origen: 'online' });
  });

  test('Un turno cancelado no se reprograma', async () => {
    const sistema = crearSistemaReprogramacion({ turnos: [{ ...base(), estado: 'cancelado' }] });
    const error = await rechazo(reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:00') }));
    expect(error).toBeInstanceOf(ReglaNegocioError);
    expect(error).toMatchObject({ codigo: 'RN-10', estadoActual: 'cancelado' });
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toMatchObject({
      inicio: local(LUNES, '09:00'),
      profesionalId: 'p1',
      sillonId: 's1',
      estado: 'cancelado',
    });
  });

  test('Un turno atendido no se reprograma', async () => {
    const sistema = crearSistemaReprogramacion({ turnos: [{ ...base(), estado: 'atendido' }] });
    const error = await rechazo(reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:00') }));
    expect(error).toMatchObject({ codigo: 'RN-10', estadoActual: 'atendido' });
  });
});

describe('Anticipación mínima del paciente', () => {
  test('Paciente con 24 h exactas puede reprogramar', async () => {
    const sistema = crearSistemaReprogramacion({
      turnos: [base()],
      ahora: local(DOMINGO, '09:00'),
    });
    await expect(
      reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:00'), rol: 'paciente' }),
    ).resolves.toMatchObject({ inicio: martes('10:00') });
  });

  test('Paciente con 23 h 59 min no puede reprogramar', async () => {
    const sistema = crearSistemaReprogramacion({
      turnos: [base()],
      ahora: local(DOMINGO, '09:01'),
    });
    const error = await rechazo(reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:00'), rol: 'paciente' }));
    expect(error).toBeInstanceOf(ReglaNegocioError);
    expect(error).toMatchObject({ codigo: 'RN-08' });
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toMatchObject({
      inicio: local(LUNES, '09:00'),
      profesionalId: 'p1',
      sillonId: 's1',
    });
  });

  test('Recepción reprograma con menos de 24 h', async () => {
    const sistema = crearSistemaReprogramacion({ turnos: [base()], ahora: local(LUNES, '08:00') });
    await expect(reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:00') })).resolves.toMatchObject({
      inicio: martes('10:00'),
    });
  });

  test('Odontólogo no puede reprogramar', async () => {
    const sistema = crearSistemaReprogramacion({ turnos: [base()], ahora: local(LUNES, '08:00') });
    const error = await reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:00'), rol: 'odontologo' }).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(AccesoDenegadoError);
    expect(error).toMatchObject({ rol: 'odontologo' });
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toMatchObject({
      inicio: local(LUNES, '09:00'),
      profesionalId: 'p1',
      sillonId: 's1',
    });
  });
});

describe('Validación del nuevo horario', () => {
  test('Mover a un hueco libre', async () => {
    const sistema = crearSistemaReprogramacion({ turnos: [base()] });
    await expect(reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:00') })).resolves.toMatchObject({
      inicio: martes('10:00'),
      fin: martes('10:30'),
    });
  });

  test('Solape parcial con el propio turno', async () => {
    const sistema = crearSistemaReprogramacion({ turnos: [base()] });
    await expect(reprogramar(sistema, { turnoId: 't-base', inicio: local(LUNES, '09:15') })).resolves.toMatchObject({
      inicio: local(LUNES, '09:15'),
      fin: local(LUNES, '09:45'),
    });
  });

  test('Mover sobre otro turno activo', async () => {
    const otro = crearTurno({
      id: 't-otro',
      profesionalId: 'p1',
      sillonId: 's2',
      prestacionId: 'pr1',
      inicio: martes('10:00'),
      fin: martes('10:30'),
      duracionMinutos: 30,
    });
    const sistema = crearSistemaReprogramacion({ turnos: [base(), otro] });
    const error = await rechazo(reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:15') }));
    expect(error).toBeInstanceOf(ReglaNegocioError);
    expect(error).toMatchObject({ codigo: 'RN-02', turnoEnConflicto: { id: 't-otro' } });
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toMatchObject({ inicio: local(LUNES, '09:00') });
  });

  test('Mover a un horario contiguo a otro turno', async () => {
    const otro = crearTurno({
      id: 't-otro',
      prestacionId: 'pr1',
      inicio: martes('10:30'),
      fin: martes('11:00'),
      duracionMinutos: 30,
    });
    const sistema = crearSistemaReprogramacion({ turnos: [base(), otro] });
    await expect(reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:00') })).resolves.toMatchObject({
      inicio: martes('10:00'),
      fin: martes('10:30'),
    });
  });

  test('Mover sobre un bloqueo del profesional', async () => {
    const sistema = crearSistemaReprogramacion({ turnos: [base()] });
    const error = await rechazo(reprogramar(sistema, { turnoId: 't-base', inicio: local(MIERCOLES, '15:30') }));
    expect(error).toBeInstanceOf(ReglaNegocioError);
    expect(error).toMatchObject({ codigo: 'RN-07', recursoBloqueado: 'profesional' });
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toMatchObject({ inicio: local(LUNES, '09:00') });
  });

  test('Mover a un recurso inactivo', async () => {
    const sillones = [
      { id: 's1', consultorioId: 'c1', nombre: 'Sillón 1', activo: true },
      { id: 's2', consultorioId: 'c1', nombre: 'Sillón 2', activo: false },
    ];
    const sistema = crearSistemaReprogramacion({ turnos: [base()], sillones });
    const error = await rechazo(
      reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:00'), profesionalId: 'p2', sillonId: 's2' }),
    );
    expect(error).toMatchObject({ codigo: 'RN-18' });
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toMatchObject({
      profesionalId: 'p1',
      sillonId: 's1',
      inicio: local(LUNES, '09:00'),
    });
  });
});

describe('Atomicidad y liberación del horario original', () => {
  test('Un rechazo no modifica ni libera el turno', async () => {
    const otro = crearTurno({
      id: 't-otro',
      profesionalId: 'p1',
      sillonId: 's2',
      prestacionId: 'pr1',
      inicio: martes('10:00'),
      fin: martes('10:30'),
      duracionMinutos: 30,
    });
    const sistema = crearSistemaReprogramacion({ turnos: [base(), otro] });
    await rechazo(reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:15') }));
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toMatchObject({
      inicio: local(LUNES, '09:00'),
      profesionalId: 'p1',
      sillonId: 's1',
    });
    const error = await rechazo(
      sistema.agendarTurno.ejecutar({
        actor: actores.recepcion,
        pacienteId: 'pa2',
        profesionalId: 'p1',
        sillonId: 's1',
        prestacionId: 'pr1',
        inicio: local(LUNES, '09:00'),
      }),
    );
    expect(error).toMatchObject({ codigo: 'RN-02' });
  });

  test('El horario original se libera al concretarse', async () => {
    const sistema = crearSistemaReprogramacion({ turnos: [base()] });
    await reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:00') });
    const nuevo = await sistema.agendarTurno.ejecutar({
      actor: actores.recepcion,
      pacienteId: 'pa2',
      profesionalId: 'p1',
      sillonId: 's1',
      prestacionId: 'pr1',
      inicio: local(LUNES, '09:00'),
    });
    expect(nuevo).toMatchObject({ estado: 'confirmado', inicio: local(LUNES, '09:00') });
  });

  test('Dos reprogramaciones concurrentes', async () => {
    const sistema = crearSistemaReprogramacion({ turnos: [base()] });
    const [a, b] = await Promise.allSettled([
      reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:00') }),
      reprogramar(sistema, { turnoId: 't-base', inicio: martes('11:00') }),
    ]);
    const concreciones = [a, b].filter((r) => r.status === 'fulfilled');
    const rechazos = [a, b].filter((r) => r.status === 'rejected');
    expect(concreciones).toHaveLength(1);
    expect(rechazos).toHaveLength(1);
    const concrecion = concreciones[0];
    expect(concrecion?.status).toBe('fulfilled');
    expect(rechazos[0]).toMatchObject({ reason: { codigo: 'RN-10' } });
    const final = await sistema.turnos.obtenerPorId('t-base');
    expect(final?.inicio).toEqual(concrecion?.status === 'fulfilled' ? concrecion.value.inicio : undefined);
    expect(await sistema.turnos.listarPorRecursos('p1', 's1')).toHaveLength(1);
  });
});

describe('Orden de evaluación de los rechazos', () => {
  test('El estado prevalece sobre la anticipación', async () => {
    const sistema = crearSistemaReprogramacion({
      turnos: [{ ...base(), estado: 'cancelado' }],
      ahora: local(LUNES, '08:00'),
    });
    const error = await rechazo(
      reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:00'), rol: 'paciente' }),
    );
    expect(error).toMatchObject({ codigo: 'RN-10', estadoActual: 'cancelado' });
  });

  test('La anticipación prevalece sobre el solapamiento', async () => {
    const otro = crearTurno({
      id: 't-otro',
      prestacionId: 'pr1',
      inicio: martes('10:00'),
      fin: martes('10:30'),
      duracionMinutos: 30,
    });
    const sistema = crearSistemaReprogramacion({
      turnos: [base(), otro],
      ahora: local(LUNES, '08:00'),
    });
    const error = await rechazo(
      reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:00'), rol: 'paciente' }),
    );
    expect(error).toMatchObject({ codigo: 'RN-08' });
  });

  test('Turno inexistente', async () => {
    const sistema = crearSistemaReprogramacion({ turnos: [base()] });
    const error = await rechazo(reprogramar(sistema, { turnoId: 't-inexistente', inicio: martes('10:00') }));
    expect(error).toBeInstanceOf(RecursoNoEncontradoError);
    expect(error).not.toBeInstanceOf(ReglaNegocioError);
    expect(error).toMatchObject({ tipo: 'turno', id: 't-inexistente' });
  });
});

describe('Reprogramación del recordatorio', () => {
  test('El recordatorio se mueve con el turno', async () => {
    const sistema = crearSistemaReprogramacion({ turnos: [base()] });
    await reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:00') });
    expect(sistema.recordatorios.programados).toEqual(['t-base']);
  });

  test('Un rechazo no toca el recordatorio', async () => {
    const sistema = crearSistemaReprogramacion({
      turnos: [base()],
      ahora: local(DOMINGO, '09:01'),
    });
    await rechazo(reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:00'), rol: 'paciente' }));
    expect(sistema.recordatorios.programados).toEqual([]);
  });

  test('Falla al programar no deshace el movimiento', async () => {
    const sistema = crearSistemaReprogramacion({ turnos: [base()] });
    const errorFallo = new Error('El servicio de recordatorios falló');
    sistema.recordatorios.fallarProgramarCon(errorFallo);
    const error = await rechazo(reprogramar(sistema, { turnoId: 't-base', inicio: martes('10:00') }));
    expect(error).toBe(errorFallo);
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toMatchObject({ inicio: martes('10:00') });
  });
});

describe('Horario propio del profesional al reprogramar', () => {
  const tramoPropio = {
    id: 'hp1',
    consultorioId: 'c1',
    profesionalId: 'p2',
    diaSemana: 1,
    desde: '14:00',
    hasta: '18:00',
  };
  const sistemaConPropio = () =>
    crearSistemaReprogramacion({
      turnos: [base()],
      horarios: [...crearEntorno().horarios, tramoPropio],
    });

  test('Reprogramar al horario propio del profesional de destino', async () => {
    const movido = await reprogramar(sistemaConPropio(), {
      turnoId: 't-base',
      inicio: local(LUNES, '14:00'),
      profesionalId: 'p2',
    });
    expect(movido).toMatchObject({
      id: 't-base',
      inicio: local(LUNES, '14:00'),
      fin: local(LUNES, '14:30'),
      profesionalId: 'p2',
      sillonId: 's1',
    });
  });

  test('Reprogramar fuera del horario propio del profesional de destino', async () => {
    const sistema = sistemaConPropio();
    const error = await rechazo(
      reprogramar(sistema, { turnoId: 't-base', inicio: local(LUNES, '10:00'), profesionalId: 'p2' }),
    );
    expect(error).toBeInstanceOf(ReglaNegocioError);
    expect(error).toMatchObject({ codigo: 'RN-07' });
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toMatchObject({
      inicio: local(LUNES, '09:00'),
      profesionalId: 'p1',
      sillonId: 's1',
    });
  });

  test('Reprogramar sin horario propio usa el horario del consultorio', async () => {
    const error = await rechazo(
      reprogramar(sistemaConPropio(), { turnoId: 't-base', inicio: local(LUNES, '14:00') }),
    );
    expect(error).toMatchObject({ codigo: 'RN-07' });
  });
});
