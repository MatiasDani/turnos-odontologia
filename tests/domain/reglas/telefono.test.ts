import { describe, expect, test } from 'vitest';
import { normalizarTelefonoArgentino } from '../../../src/domain/reglas/telefono.js';

describe('Normalización de teléfono argentino', () => {
  test('Normaliza un número con prefijo y separadores', () => {
    expect(normalizarTelefonoArgentino('+54 9 11 0000-0001')).toBe('5491100000001');
  });

  test('Acepta un número de 10 dígitos sin prefijo', () => {
    expect(normalizarTelefonoArgentino('11 0000-0002')).toBe('1100000002');
  });

  test('Prefijo de otro país se rechaza', () => {
    expect(normalizarTelefonoArgentino('+34 600 000 000')).toBeUndefined();
  });

  test('Teléfono de 9 dígitos se rechaza', () => {
    expect(normalizarTelefonoArgentino('+54 9 11 000')).toBeUndefined();
  });

  test('Teléfono con longitud fuera de rango se rechaza', () => {
    expect(normalizarTelefonoArgentino('5491100000000000')).toBeUndefined();
  });
});
