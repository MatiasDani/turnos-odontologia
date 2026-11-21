import { describe, expect, test } from 'vitest';

describe('toolchain (humo)', () => {
  test('Intl resuelve la zona horaria del consultorio (-03:00, sin DST)', () => {
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date('2026-11-23T12:00:00Z'));
    expect(partes).toBe('09');
  });

  test('el instante UTC de las 09:00 locales es 12:00Z', () => {
    expect(new Date('2026-11-23T09:00:00-03:00').toISOString()).toBe('2026-11-23T12:00:00.000Z');
  });
});
