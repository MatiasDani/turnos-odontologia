import { describe, expect, test } from 'vitest';
import type { Rol } from '../../src/domain/actor.js';
import { esActivo, estadoInicial, type EstadoTurno } from '../../src/domain/turno.js';

describe('esActivo (DD-05)', () => {
  test.each<[EstadoTurno, boolean]>([
    ['reservado', true],
    ['confirmado', true],
    ['atendido', true],
    ['cancelado', false],
    ['ausente', false],
  ])('estado %s → activo=%s', (estado, activo) => {
    expect(esActivo(estado)).toBe(activo);
  });
});

describe('estadoInicial(rol) (DD-11)', () => {
  test('paciente nace reservado con origen online', () => {
    expect(estadoInicial('paciente')).toEqual({ estado: 'reservado', origen: 'online' });
  });

  test.each<Rol>(['recepcion', 'odontologo', 'administrador'])(
    '%s nace confirmado con origen recepcion',
    (rol) => {
      expect(estadoInicial(rol)).toEqual({ estado: 'confirmado', origen: 'recepcion' });
    },
  );
});
