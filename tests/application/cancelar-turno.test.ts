// Escenarios de openspec/changes/cancelar-turno-liberando-horario/specs/cancelacion-turnos/spec.md.
// Cada test lleva el nombre exacto de su `#### Scenario:` (regla dura 8); un `describe` por requisito.
import { describe, expect, test } from 'vitest';
import { RecursoNoEncontradoError, ReglaNegocioError } from '../../src/domain/errores.js';
import { cancelar, crearSistemaCancelacion, rechazo, turnoBaseCancelacion } from '../fixtures/sistema.js';
import { local, LUNES } from '../fixtures/seed.js';

const DOMINGO = '2026-11-22';

describe('Cancelación de un turno', () => {
  test('Recepción cancela un turno confirmado', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion()] });
    const cancelado = await cancelar(sistema, { turnoId: 't-base', rol: 'recepcion' });
    expect(cancelado).toMatchObject({
      estado: 'cancelado',
      canceladoPor: 'recepcion',
      canceladoEn: local(DOMINGO, '08:00'),
    });
    expect(cancelado).toMatchObject({
      id: 't-base',
      pacienteId: 'pa1',
      profesionalId: 'p1',
      sillonId: 's1',
      prestacionId: 'pr1',
      inicio: local(LUNES, '09:00'),
      fin: local(LUNES, '09:30'),
    });
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toEqual(cancelado);
  });

  test('Paciente cancela un turno reservado', async () => {
    const reservado = turnoBaseCancelacion({ estado: 'reservado', origen: 'online' });
    const sistema = crearSistemaCancelacion({ turnos: [reservado] });
    const cancelado = await cancelar(sistema, { turnoId: 't-base', rol: 'paciente' });
    expect(cancelado).toMatchObject({ estado: 'cancelado', canceladoPor: 'paciente' });
  });

  test('Turno inexistente', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion()] });
    const error = await rechazo(cancelar(sistema, { turnoId: 't-inexistente', rol: 'recepcion' }));
    expect(error).toBeInstanceOf(RecursoNoEncontradoError);
    expect(error).not.toBeInstanceOf(ReglaNegocioError);
    expect(error).toMatchObject({ tipo: 'turno', id: 't-inexistente' });
  });
});

describe('Solo se cancelan turnos reservados o confirmados', () => {
  test('Doble cancelación rechazada', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion()] });
    await cancelar(sistema, { turnoId: 't-base', rol: 'recepcion' });
    sistema.reloj.fijar(local(DOMINGO, '10:00'));
    const error = await rechazo(cancelar(sistema, { turnoId: 't-base', rol: 'administrador' }));
    expect(error).toBeInstanceOf(ReglaNegocioError);
    expect(error).toMatchObject({ codigo: 'RN-10', estadoActual: 'cancelado' });
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toMatchObject({
      estado: 'cancelado',
      canceladoPor: 'recepcion',
      canceladoEn: local(DOMINGO, '08:00'),
    });
  });

  test('Turno atendido no se cancela', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion({ estado: 'atendido' })] });
    const error = await rechazo(cancelar(sistema, { turnoId: 't-base', rol: 'recepcion' }));
    expect(error).toMatchObject({ codigo: 'RN-10', estadoActual: 'atendido' });
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toMatchObject({ estado: 'atendido' });
  });

  test('Turno ausente no se cancela', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion({ estado: 'ausente' })] });
    const error = await rechazo(cancelar(sistema, { turnoId: 't-base', rol: 'recepcion' }));
    expect(error).toMatchObject({ codigo: 'RN-10', estadoActual: 'ausente' });
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toMatchObject({ estado: 'ausente' });
  });
});

describe('Cancelación de turnos cuyo inicio ya pasó', () => {
  test('Recepción cancela un turno pasado', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion()], ahora: local(LUNES, '10:00') });
    const cancelado = await cancelar(sistema, { turnoId: 't-base', rol: 'recepcion' });
    expect(cancelado).toMatchObject({ estado: 'cancelado', canceladoEn: local(LUNES, '10:00') });
  });
});

describe('Orden de evaluación de los rechazos', () => {
  test('Paciente cancela un turno ya cancelado con menos de 24 h', async () => {
    const sistema = crearSistemaCancelacion({
      turnos: [turnoBaseCancelacion({ estado: 'cancelado' })],
      ahora: local(LUNES, '08:00'),
    });
    const error = await rechazo(cancelar(sistema, { turnoId: 't-base', rol: 'paciente' }));
    expect(error).toMatchObject({ codigo: 'RN-10', estadoActual: 'cancelado' });
  });
});

describe('Anticipación mínima del paciente', () => {
  test('Paciente con 24 h exactas puede cancelar', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion()], ahora: local(DOMINGO, '09:00') });
    await expect(cancelar(sistema, { turnoId: 't-base', rol: 'paciente' })).resolves.toMatchObject({
      estado: 'cancelado',
      canceladoPor: 'paciente',
    });
  });

  test('Paciente con 23 h 59 min rechazado', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion()], ahora: local(DOMINGO, '09:01') });
    const error = await rechazo(cancelar(sistema, { turnoId: 't-base', rol: 'paciente' }));
    expect(error).toBeInstanceOf(ReglaNegocioError);
    expect(error).toMatchObject({ codigo: 'RN-08' });
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toMatchObject({ estado: 'confirmado' });
  });

  test('Paciente con menos de 24 h rechazado', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion()], ahora: local(LUNES, '08:00') });
    const error = await rechazo(cancelar(sistema, { turnoId: 't-base', rol: 'paciente' }));
    expect(error).toMatchObject({ codigo: 'RN-08' });
  });
});

describe('Personal del consultorio sin restricción de anticipación', () => {
  test('Recepción con menos de 24 h puede cancelar', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion()], ahora: local(LUNES, '08:00') });
    await expect(cancelar(sistema, { turnoId: 't-base', rol: 'recepcion' })).resolves.toMatchObject({
      estado: 'cancelado',
      canceladoPor: 'recepcion',
    });
  });

  test('Administrador con menos de 24 h puede cancelar', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion()], ahora: local(LUNES, '08:00') });
    await expect(cancelar(sistema, { turnoId: 't-base', rol: 'administrador' })).resolves.toMatchObject({
      estado: 'cancelado',
      canceladoPor: 'administrador',
    });
  });

  test('Odontólogo con menos de 24 h puede cancelar', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion()], ahora: local(LUNES, '08:00') });
    await expect(cancelar(sistema, { turnoId: 't-base', rol: 'odontologo' })).resolves.toMatchObject({
      estado: 'cancelado',
      canceladoPor: 'odontologo',
    });
  });
});

describe('Cancelar libera el horario', () => {
  const turnoNuevo = (sistema: ReturnType<typeof crearSistemaCancelacion>) =>
    sistema.agendarTurno.ejecutar({
      actor: { rol: 'recepcion' },
      pacienteId: 'pa2',
      profesionalId: 'p1',
      sillonId: 's1',
      prestacionId: 'pr1',
      inicio: local(LUNES, '09:00'),
    });

  test('Cancelación libera y permite agendar en el mismo horario', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion()] });
    await cancelar(sistema, { turnoId: 't-base', rol: 'recepcion' });
    await expect(turnoNuevo(sistema)).resolves.toMatchObject({
      estado: 'confirmado',
      pacienteId: 'pa2',
      inicio: local(LUNES, '09:00'),
    });
  });

  test('Sin cancelar, el mismo horario sigue ocupado', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion()] });
    const error = await rechazo(turnoNuevo(sistema));
    expect(error).toMatchObject({ codigo: 'RN-02' });
  });

  test('Disponibilidad vuelve a ofrecer el horario cancelado', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion()] });
    const consultaDelLunes = () =>
      sistema.consultarDisponibilidad.ejecutar({
        actor: { rol: 'recepcion' },
        prestacionId: 'pr1',
        rango: { desde: local(LUNES, '00:00'), hasta: local('2026-11-24', '00:00') },
        ahora: local(DOMINGO, '08:00'),
        pasoMinutos: 15,
      });
    const combo = { inicio: local(LUNES, '09:00'), profesionalId: 'p1', sillonId: 's1' };
    expect(await consultaDelLunes()).not.toContainEqual(expect.objectContaining(combo));
    await cancelar(sistema, { turnoId: 't-base', rol: 'recepcion' });
    expect(await consultaDelLunes()).toContainEqual(expect.objectContaining(combo));
  });
});

describe('Cancelación atómica', () => {
  test('Dos cancelaciones concurrentes', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion()] });
    const resultados = await Promise.allSettled([
      cancelar(sistema, { turnoId: 't-base', rol: 'recepcion' }),
      cancelar(sistema, { turnoId: 't-base', rol: 'administrador' }),
    ]);
    const concretadas = resultados.filter((r) => r.status === 'fulfilled');
    const rechazadas = resultados.filter((r) => r.status === 'rejected');
    expect(concretadas).toHaveLength(1);
    expect(rechazadas).toHaveLength(1);
    expect(rechazadas[0]?.status === 'rejected' && rechazadas[0].reason).toMatchObject({
      codigo: 'RN-10',
      estadoActual: 'cancelado',
    });
    const ganador = concretadas[0]?.status === 'fulfilled' ? concretadas[0].value.canceladoPor : undefined;
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toMatchObject({
      estado: 'cancelado',
      canceladoPor: ganador,
    });
    expect(sistema.recordatorios.cancelados).toEqual(['t-base']);
  });
});

describe('Cancelación de recordatorios pendientes', () => {
  test('Cancelación concretada pide cancelar recordatorios', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion()] });
    await cancelar(sistema, { turnoId: 't-base', rol: 'recepcion' });
    expect(sistema.recordatorios.cancelados).toEqual(['t-base']);
  });

  test('Cancelación rechazada no toca los recordatorios', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion()], ahora: local(LUNES, '08:00') });
    const error = await rechazo(cancelar(sistema, { turnoId: 't-base', rol: 'paciente' }));
    expect(error).toMatchObject({ codigo: 'RN-08' });
    expect(sistema.recordatorios.cancelados).toEqual([]);
  });

  test('Falla al cancelar recordatorios no deshace la cancelación', async () => {
    const sistema = crearSistemaCancelacion({ turnos: [turnoBaseCancelacion()] });
    sistema.recordatorios.fallarCon(new Error('servicio de recordatorios caído'));
    const error = await rechazo(cancelar(sistema, { turnoId: 't-base', rol: 'recepcion' }));
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('servicio de recordatorios caído');
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toMatchObject({ estado: 'cancelado' });
  });
});
