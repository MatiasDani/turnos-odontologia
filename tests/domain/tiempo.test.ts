import { describe, expect, test } from 'vitest';
import { aHoraLocal } from '../../src/domain/tiempo.js';

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
