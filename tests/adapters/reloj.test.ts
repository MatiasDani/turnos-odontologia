import { afterEach, describe, expect, test, vi } from 'vitest';
import { RelojSistema } from '../../src/adapters/reloj/reloj-sistema.js';
import { RelojFijo } from '../fixtures/reloj-fijo.js';
import { local, LUNES } from '../fixtures/seed.js';

describe('RelojSistema', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('ahora() devuelve el instante del sistema', () => {
    vi.useFakeTimers();
    vi.setSystemTime(local(LUNES, '09:00'));
    expect(new RelojSistema().ahora()).toEqual(local(LUNES, '09:00'));
  });

  test('dos llamadas consecutivas no decrecen y reflejan el avance del sistema', () => {
    vi.useFakeTimers();
    vi.setSystemTime(local(LUNES, '09:00'));
    const reloj = new RelojSistema();
    const a = reloj.ahora().getTime();
    vi.advanceTimersByTime(250);
    const b = reloj.ahora().getTime();
    expect(b).toBeGreaterThanOrEqual(a);
    expect(b - a).toBe(250);
  });

  test('cada llamada devuelve un Date nuevo', () => {
    const reloj = new RelojSistema();
    expect(reloj.ahora()).not.toBe(reloj.ahora());
  });
});

describe('RelojFijo (fixture)', () => {
  test('devuelve siempre el instante fijado', () => {
    const reloj = new RelojFijo(local(LUNES, '09:00'));
    expect(reloj.ahora()).toEqual(local(LUNES, '09:00'));
    expect(reloj.ahora()).toEqual(local(LUNES, '09:00'));
  });

  test('fijar cambia el instante devuelto', () => {
    const reloj = new RelojFijo(local(LUNES, '09:00'));
    reloj.fijar(local(LUNES, '09:45'));
    expect(reloj.ahora()).toEqual(local(LUNES, '09:45'));
  });

  test('el valor devuelto no permite mutar el reloj', () => {
    const reloj = new RelojFijo(local(LUNES, '09:00'));
    reloj.ahora().setTime(0);
    expect(reloj.ahora()).toEqual(local(LUNES, '09:00'));
  });
});
