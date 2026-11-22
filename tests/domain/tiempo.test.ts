import { describe, expect, test } from 'vitest';
import { aHoraLocal, deHoraLocal, formatearFechaHoraLocal } from '../../src/domain/tiempo.js';

const BA = 'America/Argentina/Buenos_Aires';

describe('aHoraLocal(instante, zona)', () => {
  test.each([
    ['12:00Z del lunes → lunes 09:00 local', '2026-11-23T12:00:00Z', 1, 540],
    ['02:00Z del martes → lunes 23:00 local', '2026-11-24T02:00:00Z', 1, 1380],
    ['11:30Z del lunes → lunes 08:30 local', '2026-11-23T11:30:00Z', 1, 510],
    ['medianoche local del sábado', '2026-11-28T03:00:00Z', 6, 0],
    ['domingo 15:00 local', '2026-11-29T18:00:00Z', 0, 900],
  ])('%s', (_n, iso, diaSemana, minutosDelDia) => {
    expect(aHoraLocal(new Date(iso), BA)).toEqual({ diaSemana, minutosDelDia });
  });

  test('respeta la zona informada (UTC)', () => {
    expect(aHoraLocal(new Date('2026-11-24T02:00:00Z'), 'UTC')).toEqual({
      diaSemana: 2,
      minutosDelDia: 120,
    });
  });
});

describe('deHoraLocal(fecha, minutos, zona)', () => {
  test.each([
    ['lunes 09:00 local → 12:00Z', '2026-11-23', 540, '2026-11-23T12:00:00.000Z'],
    ['lunes 23:00 local → 02:00Z del día siguiente', '2026-11-23', 1380, '2026-11-24T02:00:00.000Z'],
    ['medianoche local', '2026-11-28', 0, '2026-11-28T03:00:00.000Z'],
    ['15:45 local', '2026-11-23', 945, '2026-11-23T18:45:00.000Z'],
  ])('%s', (_n, fecha, minutos, esperado) => {
    expect(deHoraLocal(fecha, minutos, BA).toISOString()).toBe(esperado);
  });

  test('respeta la zona informada (UTC)', () => {
    expect(deHoraLocal('2026-11-23', 540, 'UTC').toISOString()).toBe('2026-11-23T09:00:00.000Z');
  });

  test('ida y vuelta con aHoraLocal', () => {
    for (const minutos of [0, 15, 540, 765, 900, 1425]) {
      const instante = deHoraLocal('2026-11-25', minutos, BA);
      expect(aHoraLocal(instante, BA)).toEqual({ diaSemana: 3, minutosDelDia: minutos });
    }
  });

  test('zona con horario de verano: corrige el desfase (America/New_York)', () => {
    expect(deHoraLocal('2026-07-15', 540, 'America/New_York').toISOString()).toBe('2026-07-15T13:00:00.000Z');
    expect(deHoraLocal('2026-01-15', 540, 'America/New_York').toISOString()).toBe('2026-01-15T14:00:00.000Z');
  });
});

describe('formatearFechaHoraLocal(instante, zona) (DD-09, RN-25)', () => {
  test.each([
    ['12:00Z del lunes → lunes 23/11/2026 09:00', '2026-11-23T12:00:00Z', 'lunes 23/11/2026 09:00'],
    ['02:30Z del martes → lunes 23/11/2026 23:30 (otro día local)', '2026-11-24T02:30:00Z', 'lunes 23/11/2026 23:30'],
    ['03:05Z del sábado → sábado 28/11/2026 00:05', '2026-11-28T03:05:00Z', 'sábado 28/11/2026 00:05'],
  ])('%s', (_n, iso, esperado) => {
    expect(formatearFechaHoraLocal(new Date(iso), BA)).toBe(esperado);
  });

  test('respeta la zona informada (UTC)', () => {
    expect(formatearFechaHoraLocal(new Date('2026-11-24T02:30:00Z'), 'UTC')).toBe('martes 24/11/2026 02:30');
  });
});
