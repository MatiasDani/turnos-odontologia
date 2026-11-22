import { describe, expect, test } from 'vitest';
import { puedeTransicionar } from '../../../src/domain/reglas/transiciones.js';
import type { EstadoTurno } from '../../../src/domain/turno.js';

const ESTADOS: readonly EstadoTurno[] = ['reservado', 'confirmado', 'cancelado', 'ausente', 'atendido'];

const PERMITIDAS: readonly (readonly [EstadoTurno, EstadoTurno])[] = [
  ['reservado', 'confirmado'],
  ['reservado', 'cancelado'],
  ['confirmado', 'atendido'],
  ['confirmado', 'ausente'],
  ['confirmado', 'cancelado'],
];

const esPermitida = (desde: EstadoTurno, hacia: EstadoTurno): boolean =>
  PERMITIDAS.some(([d, h]) => d === desde && h === hacia);

describe('puedeTransicionar: transiciones permitidas (KB 04, DD-20)', () => {
  test.each(PERMITIDAS)('%s -> %s está permitida', (desde, hacia) => {
    expect(puedeTransicionar(desde, hacia)).toBe(true);
  });
});

describe('puedeTransicionar: transiciones no permitidas (RN-10)', () => {
  test.each(ESTADOS)('repetir el estado %s no es una transición', (estado) => {
    expect(puedeTransicionar(estado, estado)).toBe(false);
  });

  test.each<EstadoTurno>(['atendido', 'ausente'])('reservado -> %s no está permitida', (hacia) => {
    expect(puedeTransicionar('reservado', hacia)).toBe(false);
  });

  test.each<EstadoTurno>(['cancelado', 'atendido', 'ausente'])('el estado terminal %s no sale hacia ningún estado', (desde) => {
    for (const hacia of ESTADOS) expect(puedeTransicionar(desde, hacia)).toBe(false);
  });

  test('ningún par fuera de la tabla está permitido', () => {
    for (const desde of ESTADOS) {
      for (const hacia of ESTADOS) expect(puedeTransicionar(desde, hacia)).toBe(esPermitida(desde, hacia));
    }
  });
});
