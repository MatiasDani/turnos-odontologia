import { describe, expect, test } from 'vitest';
import { validarRecursosActivos } from '../../../src/domain/reglas/recursos-activos.js';
import { crearEntorno } from '../../fixtures/seed.js';

const e = crearEntorno();
const p1 = e.profesionales[0]!;
const p2 = e.profesionales[1]!;
const s1 = e.sillones[0]!;
const s2 = e.sillones[1]!;
const pr1 = e.prestaciones[0]!;
const pr4 = e.prestaciones[3]!;

describe('recursos activos (RN-18)', () => {
  test('todos activos → sin violación', () => {
    expect(validarRecursosActivos({ profesional: p1, sillon: s1, prestacion: pr1 })).toBeNull();
  });

  test('Profesional inactivo', () => {
    expect(
      validarRecursosActivos({ profesional: { ...p2, activo: false }, sillon: s1, prestacion: pr1 }),
    ).toEqual({ codigo: 'RN-18' });
  });

  test('Sillón inactivo', () => {
    expect(
      validarRecursosActivos({ profesional: p1, sillon: { ...s2, activo: false }, prestacion: pr1 }),
    ).toEqual({ codigo: 'RN-18' });
  });

  test('Prestación inactiva', () => {
    expect(
      validarRecursosActivos({ profesional: p1, sillon: s1, prestacion: { ...pr4, activa: false } }),
    ).toEqual({ codigo: 'RN-18' });
  });
});
