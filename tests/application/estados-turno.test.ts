// Escenarios de openspec/changes/gestionar-estados-turno/specs/estados-turno/spec.md.
// Cada test lleva el nombre exacto de su `#### Scenario:` (regla dura 8); un `describe` por requisito.
import { describe, expect, test } from 'vitest';
import { AccesoDenegadoError, RecursoNoEncontradoError, ReglaNegocioError } from '../../src/domain/errores.js';
import type { EstadoTurno, Turno } from '../../src/domain/turno.js';
import {
  cancelar,
  confirmar,
  crearSistemaCancelacion,
  marcarAtendido,
  marcarAusente,
  rechazo,
  type SistemaCancelacion,
  turnoBaseCancelacion,
} from '../fixtures/sistema.js';
import { local, LUNES, MIERCOLES } from '../fixtures/seed.js';
import { actores } from '../fixtures/actores.js';

const DOMINGO = '2026-11-22';
const MARTES = '2026-11-24';
/** `ahora` por defecto del spec: lunes 2026-11-23 10:00 (después del turno base). */
const AHORA = local(LUNES, '10:00');

function sistemaCon(turnos: readonly Turno[], ahora: Date = AHORA): SistemaCancelacion {
  return crearSistemaCancelacion({ turnos: [...turnos], ahora });
}

/** Turno base del spec (confirmado, lunes 09:00-09:30) en el estado indicado. */
function base(estado: EstadoTurno = 'confirmado'): Turno {
  return turnoBaseCancelacion({ estado });
}

/** Turno `reservado` online de `pa1` con `p1`, `s1`, `pr1`, de 09:00 a 09:30 del día indicado. */
function reservadoOnline(fecha: string): Turno {
  return turnoBaseCancelacion({
    id: 't-online',
    estado: 'reservado',
    origen: 'online',
    inicio: local(fecha, '09:00'),
    fin: local(fecha, '09:30'),
  });
}

async function esperarRN(promesa: Promise<unknown>, codigo: string, estadoActual?: EstadoTurno): Promise<void> {
  const error = await rechazo(promesa);
  expect(error).toBeInstanceOf(ReglaNegocioError);
  expect(error).toMatchObject(estadoActual === undefined ? { codigo } : { codigo, estadoActual });
  if (estadoActual === undefined) expect((error as ReglaNegocioError).estadoActual).toBeUndefined();
}

async function esperarNoEncontrado(promesa: Promise<unknown>): Promise<void> {
  const error = await rechazo(promesa);
  expect(error).toBeInstanceOf(RecursoNoEncontradoError);
  expect(error).not.toBeInstanceOf(ReglaNegocioError);
  expect(error).toMatchObject({ tipo: 'turno', id: 't-inexistente' });
}

async function estadoGuardado(sistema: SistemaCancelacion, id: string): Promise<EstadoTurno | undefined> {
  return (await sistema.turnos.obtenerPorId(id))?.estado;
}

const DATOS_DEL_TURNO_BASE = {
  id: 't-base',
  pacienteId: 'pa1',
  profesionalId: 'p1',
  sillonId: 's1',
  prestacionId: 'pr1',
  inicio: local(LUNES, '09:00'),
  fin: local(LUNES, '09:30'),
};

describe('Confirmación de un turno reservado', () => {
  test('Recepción confirma un turno reservado', async () => {
    const sistema = sistemaCon([reservadoOnline(MARTES)]);
    const confirmado = await confirmar(sistema, { turnoId: 't-online', rol: 'recepcion' });
    expect(confirmado).toMatchObject({
      estado: 'confirmado',
      id: 't-online',
      pacienteId: 'pa1',
      profesionalId: 'p1',
      sillonId: 's1',
      prestacionId: 'pr1',
      inicio: local(MARTES, '09:00'),
      fin: local(MARTES, '09:30'),
      origen: 'online',
    });
    await expect(sistema.turnos.obtenerPorId('t-online')).resolves.toEqual(confirmado);
  });

  test('Paciente confirma su turno reservado', async () => {
    const sistema = sistemaCon([reservadoOnline(MARTES)]);
    const confirmado = await confirmar(sistema, { turnoId: 't-online', rol: 'paciente' });
    expect(confirmado.estado).toBe('confirmado');
    await expect(estadoGuardado(sistema, 't-online')).resolves.toBe('confirmado');
  });

  test('Confirmar un turno reservado cuyo inicio ya pasó', async () => {
    const sistema = sistemaCon([reservadoOnline(LUNES)], local(LUNES, '10:00'));
    const confirmado = await confirmar(sistema, { turnoId: 't-online' });
    expect(confirmado.estado).toBe('confirmado');
  });
});

describe('Cierre de un turno confirmado', () => {
  test('Odontólogo marca atendido un turno confirmado', async () => {
    const sistema = sistemaCon([base()]);
    const atendido = await marcarAtendido(sistema, { turnoId: 't-base', rol: 'odontologo' });
    expect(atendido).toMatchObject({ estado: 'atendido', ...DATOS_DEL_TURNO_BASE });
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toEqual(atendido);
  });

  test('Recepción marca ausente un turno confirmado', async () => {
    const sistema = sistemaCon([base()]);
    const ausente = await marcarAusente(sistema, { turnoId: 't-base', rol: 'recepcion' });
    expect(ausente).toMatchObject({ estado: 'ausente', ...DATOS_DEL_TURNO_BASE });
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toEqual(ausente);
  });

  test('Odontólogo de otro profesional no cierra el turno', async () => {
    const sistema = sistemaCon([base()]);
    const error = await sistema.marcarAtendido
      .ejecutar({ turnoId: 't-base', actor: actores.odontologo('p2') })
      .then(() => undefined, (e: unknown) => e);
    expect(error).toBeInstanceOf(AccesoDenegadoError);
    expect(error).toMatchObject({ rol: 'odontologo' });
    await expect(sistema.turnos.obtenerPorId('t-base')).resolves.toMatchObject({ estado: 'confirmado' });
  });
});

describe('Solo transiciones de estado permitidas', () => {
  test('Confirmar un turno ya confirmado', async () => {
    const sistema = sistemaCon([base()]);
    await esperarRN(confirmar(sistema, { turnoId: 't-base' }), 'RN-10', 'confirmado');
    await expect(estadoGuardado(sistema, 't-base')).resolves.toBe('confirmado');
  });

  test('Confirmar un turno cancelado', async () => {
    const sistema = sistemaCon([base('cancelado')]);
    await esperarRN(confirmar(sistema, { turnoId: 't-base' }), 'RN-10', 'cancelado');
    await expect(estadoGuardado(sistema, 't-base')).resolves.toBe('cancelado');
  });

  test('Marcar atendido un turno reservado', async () => {
    const sistema = sistemaCon([base('reservado')]);
    await esperarRN(marcarAtendido(sistema, { turnoId: 't-base' }), 'RN-10', 'reservado');
    await expect(estadoGuardado(sistema, 't-base')).resolves.toBe('reservado');
  });

  test('Marcar ausente un turno reservado', async () => {
    const sistema = sistemaCon([base('reservado')]);
    await esperarRN(marcarAusente(sistema, { turnoId: 't-base' }), 'RN-10', 'reservado');
    await expect(estadoGuardado(sistema, 't-base')).resolves.toBe('reservado');
  });

  test('Marcar ausente un turno atendido', async () => {
    const sistema = sistemaCon([base()]);
    await marcarAtendido(sistema, { turnoId: 't-base' });
    await esperarRN(marcarAusente(sistema, { turnoId: 't-base' }), 'RN-10', 'atendido');
    await expect(estadoGuardado(sistema, 't-base')).resolves.toBe('atendido');
  });

  test('Marcar atendido un turno ausente', async () => {
    const sistema = sistemaCon([base()]);
    await marcarAusente(sistema, { turnoId: 't-base' });
    await esperarRN(marcarAtendido(sistema, { turnoId: 't-base' }), 'RN-10', 'ausente');
    await expect(estadoGuardado(sistema, 't-base')).resolves.toBe('ausente');
  });

  test('Marcar atendido dos veces', async () => {
    const sistema = sistemaCon([base()]);
    await marcarAtendido(sistema, { turnoId: 't-base' });
    await esperarRN(marcarAtendido(sistema, { turnoId: 't-base' }), 'RN-10', 'atendido');
  });

  test('Marcar ausente un turno cancelado', async () => {
    const sistema = sistemaCon([base('cancelado')]);
    await esperarRN(marcarAusente(sistema, { turnoId: 't-base' }), 'RN-10', 'cancelado');
    await expect(estadoGuardado(sistema, 't-base')).resolves.toBe('cancelado');
  });
});

describe('Cierre solo desde el inicio del turno', () => {
  test('Marcar atendido un minuto antes del inicio', async () => {
    const sistema = sistemaCon([base()], local(LUNES, '08:59'));
    await esperarRN(marcarAtendido(sistema, { turnoId: 't-base' }), 'RN-24');
    await expect(estadoGuardado(sistema, 't-base')).resolves.toBe('confirmado');
  });

  test('Marcar atendido justo en el inicio', async () => {
    const sistema = sistemaCon([base()], local(LUNES, '09:00'));
    const atendido = await marcarAtendido(sistema, { turnoId: 't-base' });
    expect(atendido.estado).toBe('atendido');
  });

  test('Marcar ausente antes del inicio', async () => {
    const sistema = sistemaCon([base()], local(DOMINGO, '08:00'));
    await esperarRN(marcarAusente(sistema, { turnoId: 't-base' }), 'RN-24');
    await expect(estadoGuardado(sistema, 't-base')).resolves.toBe('confirmado');
  });

  test('Marcar ausente días después del turno', async () => {
    const sistema = sistemaCon([base()], local(MIERCOLES, '12:00'));
    const ausente = await marcarAusente(sistema, { turnoId: 't-base' });
    expect(ausente.estado).toBe('ausente');
  });
});

describe('Orden de evaluación de los rechazos', () => {
  test('Confirmar un turno inexistente', async () => {
    await esperarNoEncontrado(confirmar(sistemaCon([base()]), { turnoId: 't-inexistente' }));
  });

  test('Marcar atendido un turno inexistente', async () => {
    await esperarNoEncontrado(marcarAtendido(sistemaCon([base()]), { turnoId: 't-inexistente' }));
  });

  test('Marcar ausente un turno inexistente', async () => {
    await esperarNoEncontrado(marcarAusente(sistemaCon([base()]), { turnoId: 't-inexistente' }));
  });

  test('Transición inválida antes del inicio informa RN-10', async () => {
    const sistema = sistemaCon([base('reservado')], local(DOMINGO, '08:00'));
    await esperarRN(marcarAtendido(sistema, { turnoId: 't-base' }), 'RN-10', 'reservado');
  });
});

describe('La ausencia libera el horario', () => {
  function agendarPa2(sistema: SistemaCancelacion, sillonId: string): Promise<Turno> {
    return sistema.agendarTurno.ejecutar({
      actor: actores.recepcion,
      pacienteId: 'pa2',
      profesionalId: 'p1',
      sillonId,
      prestacionId: 'pr1',
      inicio: local(LUNES, '09:00'),
    });
  }

  test('Marcar ausente permite agendar en el mismo horario', async () => {
    const sistema = sistemaCon([base()]);
    await marcarAusente(sistema, { turnoId: 't-base' });
    const nuevo = await agendarPa2(sistema, 's1');
    expect(nuevo).toMatchObject({
      estado: 'confirmado',
      pacienteId: 'pa2',
      profesionalId: 'p1',
      sillonId: 's1',
      inicio: local(LUNES, '09:00'),
    });
  });

  test('Un turno atendido sigue ocupando el horario', async () => {
    const sistema = sistemaCon([base()]);
    await marcarAtendido(sistema, { turnoId: 't-base' });
    const error = await rechazo(agendarPa2(sistema, 's2'));
    expect(error).toBeInstanceOf(ReglaNegocioError);
    expect(error).toMatchObject({ codigo: 'RN-02', turnoEnConflicto: { id: 't-base', estado: 'atendido' } });
  });
});

describe('Cambio de estado atómico', () => {
  async function exactamenteUnaSeConcreta(sistema: SistemaCancelacion, operaciones: Promise<Turno>[]): Promise<void> {
    const resultados = await Promise.allSettled(operaciones);
    const concretadas = resultados.filter((r): r is PromiseFulfilledResult<Turno> => r.status === 'fulfilled');
    const rechazadas = resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(concretadas).toHaveLength(1);
    expect(rechazadas).toHaveLength(1);
    const ganador = concretadas[0]?.value;
    expect(rechazadas[0]?.reason).toBeInstanceOf(ReglaNegocioError);
    expect(rechazadas[0]?.reason).toMatchObject({ codigo: 'RN-10', estadoActual: ganador?.estado });
    await expect(estadoGuardado(sistema, 't-base')).resolves.toBe(ganador?.estado);
  }

  test('Marcar atendido y ausente a la vez', async () => {
    const sistema = sistemaCon([base()]);
    await exactamenteUnaSeConcreta(sistema, [
      marcarAtendido(sistema, { turnoId: 't-base' }),
      marcarAusente(sistema, { turnoId: 't-base' }),
    ]);
  });

  test('Cancelar y marcar ausente a la vez', async () => {
    const sistema = sistemaCon([base()]);
    await exactamenteUnaSeConcreta(sistema, [
      cancelar(sistema, { turnoId: 't-base' }),
      marcarAusente(sistema, { turnoId: 't-base' }),
    ]);
  });
});
