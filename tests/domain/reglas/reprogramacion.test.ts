import { describe, expect, test } from 'vitest';
import { evaluarReprogramacion, moverTurno } from '../../../src/domain/reglas/reprogramacion.js';
import type { EstadoTurno, Turno } from '../../../src/domain/turno.js';
import { local, LUNES } from '../../fixtures/seed.js';

const DOMINGO = '2026-11-22';
const AHORA = local(DOMINGO, '08:00');
const MARTES = '2026-11-24';

/** Turno base del spec: confirmado, pa1, p1, s1, pr1, lunes 09:00-09:30. */
function turnoBase(estado: EstadoTurno = 'confirmado'): Turno {
  return {
    id: 't-base',
    pacienteId: 'pa1',
    profesionalId: 'p1',
    sillonId: 's1',
    prestacionId: 'pr1',
    inicio: local(LUNES, '09:00'),
    fin: local(LUNES, '09:30'),
    duracionMinutos: 30,
    estado,
    origen: 'recepcion',
  };
}

describe('evaluarReprogramacion: estados (RN-10)', () => {
  test.each<EstadoTurno>(['reservado', 'confirmado'])('un turno %s se puede reprogramar', (estado) => {
    expect(evaluarReprogramacion(turnoBase(estado), 'recepcion', AHORA)).toBeNull();
  });

  test.each<EstadoTurno>(['cancelado', 'atendido', 'ausente'])(
    'un turno %s se rechaza con RN-10 y su estado actual',
    (estado) => {
      expect(evaluarReprogramacion(turnoBase(estado), 'recepcion', AHORA)).toEqual({
        codigo: 'RN-10',
        estadoActual: estado,
      });
    },
  );
});

describe('evaluarReprogramacion: anticipación del paciente (RN-08)', () => {
  test('con 24 h exactas el paciente puede reprogramar', () => {
    expect(evaluarReprogramacion(turnoBase(), 'paciente', local(DOMINGO, '09:00'))).toBeNull();
  });

  test('con 23 h 59 min el paciente se rechaza con RN-08', () => {
    expect(evaluarReprogramacion(turnoBase(), 'paciente', local(DOMINGO, '09:01'))).toEqual({ codigo: 'RN-08' });
  });

  test.each(['recepcion', 'odontologo', 'administrador'] as const)('%s reprograma con menos de 24 h', (rol) => {
    expect(evaluarReprogramacion(turnoBase(), rol, local(LUNES, '08:00'))).toBeNull();
  });
});

describe('evaluarReprogramacion: orden de rechazos (DD-22)', () => {
  test('el estado prevalece sobre la anticipación', () => {
    expect(evaluarReprogramacion(turnoBase('cancelado'), 'paciente', local(LUNES, '08:00'))).toEqual({
      codigo: 'RN-10',
      estadoActual: 'cancelado',
    });
  });
});

describe('moverTurno', () => {
  test('actualiza horario, duración y recursos informados', () => {
    const movido = moverTurno(turnoBase(), {
      inicio: local(MARTES, '11:00'),
      fin: local(MARTES, '11:45'),
      duracionMinutos: 45,
      profesionalId: 'p2',
      sillonId: 's2',
      prestacionId: 'pr2',
    });
    expect(movido).toMatchObject({
      inicio: local(MARTES, '11:00'),
      fin: local(MARTES, '11:45'),
      duracionMinutos: 45,
      profesionalId: 'p2',
      sillonId: 's2',
      prestacionId: 'pr2',
    });
  });

  test('conserva identidad, paciente, estado, origen y registro de cancelación', () => {
    const original: Turno = {
      ...turnoBase('reservado'),
      origen: 'online',
      canceladoPor: 'recepcion',
      canceladoEn: local(DOMINGO, '08:00'),
    };
    const movido = moverTurno(original, {
      inicio: local(MARTES, '10:00'),
      fin: local(MARTES, '10:30'),
      duracionMinutos: 30,
    });
    expect(movido).toMatchObject({
      id: 't-base',
      pacienteId: 'pa1',
      estado: 'reservado',
      origen: 'online',
      canceladoPor: 'recepcion',
      canceladoEn: local(DOMINGO, '08:00'),
    });
    expect(movido).toMatchObject({ profesionalId: 'p1', sillonId: 's1', prestacionId: 'pr1' });
  });

  test('no modifica el turno original', () => {
    const original = turnoBase();
    const copia = { ...original };
    moverTurno(original, { inicio: local(MARTES, '10:00'), fin: local(MARTES, '10:30'), duracionMinutos: 30 });
    expect(original).toEqual(copia);
  });

  test('copia las fechas recibidas', () => {
    const inicio = local(MARTES, '10:00');
    const fin = local(MARTES, '10:30');
    const movido = moverTurno(turnoBase(), { inicio, fin, duracionMinutos: 30 });
    expect(movido.inicio).not.toBe(inicio);
    expect(movido.fin).not.toBe(fin);
  });
});
