import { describe, expect, test } from 'vitest';
import type { BloqueoHorario } from '../../../src/domain/bloqueo-horario.js';
import { crearIntervalo } from '../../../src/domain/intervalo.js';
import { validarBloqueos } from '../../../src/domain/reglas/bloqueos.js';
import { crearEntorno, LUNES, local, MIERCOLES } from '../../fixtures/seed.js';

const { bloqueos } = crearEntorno();
const bloqueoSillon: BloqueoHorario = {
  id: 'b-s1',
  sillonId: 's1',
  inicio: local(LUNES, '10:00'),
  fin: local(LUNES, '11:00'),
};
const iv = (dia: string, a: string, b: string) => crearIntervalo(local(dia, a), local(dia, b));

describe('bloqueos (RN-07)', () => {
  test('Turno sobre bloqueo del profesional', () => {
    expect(validarBloqueos(iv(MIERCOLES, '15:30', '16:00'), 'p1', 's1', bloqueos)).toEqual({
      codigo: 'RN-07',
      bloqueoEnConflicto: bloqueos[0],
      recursoBloqueado: 'profesional',
    });
  });

  test('Turno sobre bloqueo de sillón', () => {
    expect(validarBloqueos(iv(LUNES, '10:00', '10:30'), 'p2', 's1', [bloqueoSillon])).toEqual({
      codigo: 'RN-07',
      bloqueoEnConflicto: bloqueoSillon,
      recursoBloqueado: 'sillon',
    });
  });

  test('Turno contiguo al fin del bloqueo', () => {
    expect(validarBloqueos(iv(MIERCOLES, '17:00', '17:30'), 'p1', 's1', bloqueos)).toBeNull();
  });

  test('Turno contiguo al inicio del bloqueo de sillón', () => {
    expect(validarBloqueos(iv(LUNES, '09:30', '10:00'), 'p2', 's1', [bloqueoSillon])).toBeNull();
  });

  test('Bloqueo de un profesional no afecta a otro', () => {
    expect(validarBloqueos(iv(MIERCOLES, '15:30', '16:00'), 'p2', 's1', bloqueos)).toBeNull();
  });

  test('bloqueo de sillón no afecta a otro sillón', () => {
    expect(validarBloqueos(iv(LUNES, '10:00', '10:30'), 'p2', 's2', [bloqueoSillon])).toBeNull();
  });

  test('el bloqueo de profesional se informa antes que el de sillón', () => {
    const r = validarBloqueos(iv(LUNES, '10:00', '10:30'), 'p1', 's1', [
      bloqueoSillon,
      { id: 'b-p1', profesionalId: 'p1', inicio: local(LUNES, '10:00'), fin: local(LUNES, '11:00') },
    ]);
    expect(r?.recursoBloqueado).toBe('profesional');
  });
});
