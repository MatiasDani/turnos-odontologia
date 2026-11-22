import { describe, expect, test } from 'vitest';
import { cambiarEstado, evaluarCambioDeEstado, type EstadoDestino } from '../../../src/domain/reglas/estados.js';
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

const DESPUES_DEL_INICIO = local(LUNES, '10:00');
const CIERRES: readonly EstadoDestino[] = ['atendido', 'ausente'];

describe('evaluarCambioDeEstado: transición de estado (RN-10)', () => {
  test.each<EstadoTurno>(['confirmado', 'cancelado', 'atendido', 'ausente'])(
    'confirmar un turno %s se rechaza con RN-10 y su estado actual',
    (estado) => {
      expect(evaluarCambioDeEstado(turnoBase(estado), 'confirmado', DESPUES_DEL_INICIO)).toEqual({
        codigo: 'RN-10',
        estadoActual: estado,
      });
    },
  );

  test.each(CIERRES.flatMap((hacia) => (['reservado', 'cancelado', 'atendido', 'ausente'] as const).map((d) => [d, hacia] as const)))(
    'pasar un turno %s a %s se rechaza con RN-10 y su estado actual',
    (estado, hacia) => {
      expect(evaluarCambioDeEstado(turnoBase(estado), hacia, DESPUES_DEL_INICIO)).toEqual({
        codigo: 'RN-10',
        estadoActual: estado,
      });
    },
  );

  test.each(CIERRES)('un turno confirmado pasa a %s después del inicio', (hacia) => {
    expect(evaluarCambioDeEstado(turnoBase(), hacia, DESPUES_DEL_INICIO)).toBeNull();
  });
});

describe('evaluarCambioDeEstado: confirmar sin restricción horaria', () => {
  test.each([
    ['antes del inicio', local(DOMINGO, '08:00')],
    ['después del fin', DESPUES_DEL_INICIO],
  ] as const)('un turno reservado se confirma %s', (_, ahora) => {
    expect(evaluarCambioDeEstado(turnoBase('reservado'), 'confirmado', ahora)).toBeNull();
  });
});

describe('evaluarCambioDeEstado: cierre solo desde el inicio (RN-24)', () => {
  test.each(CIERRES)('pasar a %s un minuto antes del inicio se rechaza con RN-24', (hacia) => {
    expect(evaluarCambioDeEstado(turnoBase(), hacia, local(LUNES, '08:59'))).toEqual({ codigo: 'RN-24' });
  });

  test.each(CIERRES)('pasar a %s justo en el inicio está permitido', (hacia) => {
    expect(evaluarCambioDeEstado(turnoBase(), hacia, local(LUNES, '09:00'))).toBeNull();
  });

  test('un milisegundo antes del inicio se rechaza con RN-24', () => {
    const ahora = new Date(local(LUNES, '09:00').getTime() - 1);
    expect(evaluarCambioDeEstado(turnoBase(), 'ausente', ahora)).toEqual({ codigo: 'RN-24' });
  });

  test.each(CIERRES)('una transición inválida a %s antes del inicio informa RN-10, no RN-24', (hacia) => {
    expect(evaluarCambioDeEstado(turnoBase('reservado'), hacia, local(DOMINGO, '08:00'))).toEqual({
      codigo: 'RN-10',
      estadoActual: 'reservado',
    });
  });
});

describe('cambiarEstado', () => {
  test.each([
    ['reservado', 'confirmado'],
    ['confirmado', 'atendido'],
    ['confirmado', 'ausente'],
  ] as const)('un turno %s pasa a %s y conserva el resto de los campos', (desde, hacia) => {
    const original = turnoBase(desde);
    expect(cambiarEstado(original, hacia)).toEqual({ ...original, estado: hacia });
  });

  test('no modifica el turno original', () => {
    const original = turnoBase();
    const copia = { ...original };
    const nuevo = cambiarEstado(original, 'atendido');
    expect(nuevo).not.toBe(original);
    expect(original).toEqual(copia);
  });
});
