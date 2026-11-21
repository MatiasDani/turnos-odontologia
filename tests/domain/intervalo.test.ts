import { describe, expect, test } from 'vitest';
import { crearIntervalo, seSolapa } from '../../src/domain/intervalo.js';

const t = (hhmm: string): Date => new Date(`2026-11-23T${hhmm}:00-03:00`);
const iv = (a: string, b: string) => crearIntervalo(t(a), t(b));

describe('Intervalo semiabierto [inicio, fin) (RN-05)', () => {
  test('contiguos no se solapan, en ambos sentidos', () => {
    expect(seSolapa(iv('09:00', '09:45'), iv('09:45', '10:15'))).toBe(false);
    expect(seSolapa(iv('09:45', '10:15'), iv('09:00', '09:45'))).toBe(false);
  });

  test('solapamiento parcial, en ambos sentidos', () => {
    expect(seSolapa(iv('09:00', '09:45'), iv('09:44', '10:14'))).toBe(true);
    expect(seSolapa(iv('09:44', '10:14'), iv('09:00', '09:45'))).toBe(true);
  });

  test('contención total, en ambos sentidos', () => {
    expect(seSolapa(iv('09:00', '10:30'), iv('09:30', '10:00'))).toBe(true);
    expect(seSolapa(iv('09:30', '10:00'), iv('09:00', '10:30'))).toBe(true);
  });

  test('intervalos idénticos se solapan', () => {
    expect(seSolapa(iv('09:00', '10:00'), iv('09:00', '10:00'))).toBe(true);
  });

  test('disjuntos con hueco no se solapan', () => {
    expect(seSolapa(iv('09:00', '10:00'), iv('11:00', '12:00'))).toBe(false);
  });

  test.each([
    ['fin igual a inicio', '09:00', '09:00'],
    ['fin anterior a inicio', '10:00', '09:00'],
  ])('rechaza intervalo inválido: %s', (_nombre, a, b) => {
    expect(() => crearIntervalo(t(a), t(b))).toThrow(RangeError);
  });
});
