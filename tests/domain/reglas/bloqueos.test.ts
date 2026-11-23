import { describe, expect, test } from 'vitest';
import type { BloqueoHorario } from '../../../src/domain/bloqueo-horario.js';
import { crearIntervalo } from '../../../src/domain/intervalo.js';
import {
  evaluarConflictosBloqueo,
  validarBloqueos,
  validarDatosBloqueo,
} from '../../../src/domain/reglas/bloqueos.js';
import type { Turno } from '../../../src/domain/turno.js';
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

describe('validarDatosBloqueo', () => {
  test('falla si no tiene profesionalId ni sillonId', () => {
    expect(() =>
      validarDatosBloqueo({
        inicio: local(LUNES, '10:00'),
        fin: local(LUNES, '11:00'),
      }),
    ).toThrow('El bloqueo debe especificar profesionalId o sillonId');
  });

  test('falla si inicio >= fin', () => {
    expect(() =>
      validarDatosBloqueo({
        profesionalId: 'p1',
        inicio: local(LUNES, '11:00'),
        fin: local(LUNES, '10:00'),
      }),
    ).toThrow('El inicio del bloqueo debe ser anterior al fin');
  });

  test('pasa con profesionalId o sillonId válido', () => {
    expect(() =>
      validarDatosBloqueo({
        profesionalId: 'p1',
        inicio: local(LUNES, '10:00'),
        fin: local(LUNES, '11:00'),
      }),
    ).not.toThrow();
  });
});

describe('evaluarConflictosBloqueo (DD-06 / RN-31)', () => {
  const turnoBase: Turno = {
    id: 't-1',
    pacienteId: 'pa1',
    profesionalId: 'p1',
    sillonId: 's1',
    prestacionId: 'pr1',
    inicio: local(LUNES, '10:00'),
    fin: local(LUNES, '10:45'),
    duracionMinutos: 45,
    estado: 'confirmado',
    origen: 'recepcion',
  };

  test('detecta solapamiento con turno activo del profesional', () => {
    const res = evaluarConflictosBloqueo(
      { profesionalId: 'p1', inicio: local(LUNES, '10:30'), fin: local(LUNES, '12:00') },
      [turnoBase],
    );
    expect(res).toEqual({
      codigo: 'RN-31',
      turnosEnConflicto: [turnoBase],
    });
  });

  test('detecta solapamiento con turno activo en el sillón', () => {
    const res = evaluarConflictosBloqueo(
      { sillonId: 's1', inicio: local(LUNES, '09:00'), fin: local(LUNES, '10:30') },
      [turnoBase],
    );
    expect(res?.codigo).toBe('RN-31');
    expect(res?.turnosEnConflicto).toEqual([turnoBase]);
  });

  test('no genera conflicto si el turno está cancelado o ausente', () => {
    const cancelado: Turno = { ...turnoBase, id: 't-canc', estado: 'cancelado' };
    const ausente: Turno = { ...turnoBase, id: 't-aus', estado: 'ausente' };
    const res = evaluarConflictosBloqueo(
      { profesionalId: 'p1', inicio: local(LUNES, '10:00'), fin: local(LUNES, '11:00') },
      [cancelado, ausente],
    );
    expect(res).toBeNull();
  });

  test('permite bloqueo contiguo que empieza justo cuando termina el turno (RN-05)', () => {
    const res = evaluarConflictosBloqueo(
      { profesionalId: 'p1', inicio: local(LUNES, '10:45'), fin: local(LUNES, '12:00') },
      [turnoBase],
    );
    expect(res).toBeNull();
  });

  test('permite bloqueo contiguo que termina justo cuando empieza el turno (RN-05)', () => {
    const res = evaluarConflictosBloqueo(
      { profesionalId: 'p1', inicio: local(LUNES, '09:00'), fin: local(LUNES, '10:00') },
      [turnoBase],
    );
    expect(res).toBeNull();
  });
});
