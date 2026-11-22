import { describe, expect, test } from 'vitest';
import { cancelar, evaluarCancelacion } from '../../../src/domain/reglas/cancelacion.js';
import type { EstadoTurno, Turno } from '../../../src/domain/turno.js';
import { LUNES, local } from '../../fixtures/seed.js';

const DOMINGO = '2026-11-22';

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

const AHORA = local(DOMINGO, '08:00');

describe('evaluarCancelacion: estado (RN-10)', () => {
  test.each<EstadoTurno>(['reservado', 'confirmado'])('un turno %s se puede cancelar', (estado) => {
    expect(evaluarCancelacion(turnoBase(estado), 'recepcion', AHORA)).toBeNull();
  });

  test.each<EstadoTurno>(['cancelado', 'atendido', 'ausente'])(
    'un turno %s se rechaza con RN-10 y su estado actual',
    (estado) => {
      expect(evaluarCancelacion(turnoBase(estado), 'recepcion', AHORA)).toEqual({
        codigo: 'RN-10',
        estadoActual: estado,
      });
    },
  );
});

describe('evaluarCancelacion: anticipación del paciente (RN-08)', () => {
  test('con 24 h exactas el paciente puede cancelar', () => {
    expect(evaluarCancelacion(turnoBase(), 'paciente', local(DOMINGO, '09:00'))).toBeNull();
  });

  test('con 25 h el paciente puede cancelar', () => {
    expect(evaluarCancelacion(turnoBase(), 'paciente', local(DOMINGO, '08:00'))).toBeNull();
  });

  test('con 23 h 59 min el paciente se rechaza con RN-08', () => {
    expect(evaluarCancelacion(turnoBase(), 'paciente', local(DOMINGO, '09:01'))).toEqual({ codigo: 'RN-08' });
  });

  test('con el inicio ya pasado el paciente se rechaza con RN-08', () => {
    expect(evaluarCancelacion(turnoBase(), 'paciente', local(LUNES, '10:00'))).toEqual({ codigo: 'RN-08' });
  });

  test('un turno reservado con menos de 24 h también se rechaza para el paciente', () => {
    expect(evaluarCancelacion(turnoBase('reservado'), 'paciente', local(LUNES, '08:00'))).toEqual({
      codigo: 'RN-08',
    });
  });
});

describe('evaluarCancelacion: personal sin restricción de anticipación', () => {
  test.each(['recepcion', 'odontologo', 'administrador'] as const)('%s cancela con 1 h de anticipación', (rol) => {
    expect(evaluarCancelacion(turnoBase(), rol, local(LUNES, '08:00'))).toBeNull();
  });

  test.each(['recepcion', 'odontologo', 'administrador'] as const)('%s cancela con el inicio ya pasado', (rol) => {
    expect(evaluarCancelacion(turnoBase(), rol, local(LUNES, '10:00'))).toBeNull();
  });
});

describe('evaluarCancelacion: orden RN-10 antes que RN-08', () => {
  test('paciente con un turno cancelado y menos de 24 h recibe RN-10', () => {
    expect(evaluarCancelacion(turnoBase('cancelado'), 'paciente', local(LUNES, '08:00'))).toEqual({
      codigo: 'RN-10',
      estadoActual: 'cancelado',
    });
  });

  test('paciente con un turno atendido y el inicio pasado recibe RN-10', () => {
    expect(evaluarCancelacion(turnoBase('atendido'), 'paciente', local(LUNES, '10:00'))).toEqual({
      codigo: 'RN-10',
      estadoActual: 'atendido',
    });
  });
});

describe('cancelar', () => {
  test('deja el turno cancelado con canceladoPor y canceladoEn', () => {
    const cancelado = cancelar(turnoBase(), 'recepcion', AHORA);
    expect(cancelado.estado).toBe('cancelado');
    expect(cancelado.canceladoPor).toBe('recepcion');
    expect(cancelado.canceladoEn).toEqual(AHORA);
  });

  test('registra el rol del paciente y otro instante', () => {
    const instante = local(DOMINGO, '09:00');
    const cancelado = cancelar(turnoBase('reservado'), 'paciente', instante);
    expect(cancelado.canceladoPor).toBe('paciente');
    expect(cancelado.canceladoEn).toEqual(instante);
  });

  test('conserva el resto de los campos', () => {
    const original = turnoBase();
    const { estado: _e, canceladoPor: _p, canceladoEn: _c, ...resto } = cancelar(original, 'administrador', AHORA);
    const { estado: _eo, ...restoOriginal } = original;
    expect(resto).toEqual(restoOriginal);
  });

  test('no modifica el turno original', () => {
    const original = turnoBase();
    const copia = { ...original };
    cancelar(original, 'recepcion', AHORA);
    expect(original).toEqual(copia);
    expect(original.canceladoPor).toBeUndefined();
  });

  test('canceladoEn es una copia del instante recibido', () => {
    const instante = local(DOMINGO, '08:00');
    const cancelado = cancelar(turnoBase(), 'recepcion', instante);
    expect(cancelado.canceladoEn).not.toBe(instante);
  });
});
