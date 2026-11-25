import { describe, expect, test } from 'vitest';
import type { Actor, Rol } from '../../../src/domain/actor.js';
import { duracionEfectiva, validarDuracion } from '../../../src/domain/reglas/duracion.js';
import { crearEntorno } from '../../fixtures/seed.js';
import { actorDeRol } from '../../fixtures/actores.js';

const pr1 = crearEntorno().prestaciones[0]!; // 30 min
const actor = (rol: Rol): Actor => actorDeRol(rol);

describe('duración efectiva (RN-06, RN-16)', () => {
  test('Duración por defecto de la prestación', () => {
    expect(duracionEfectiva(pr1, undefined)).toBe(30);
    expect(validarDuracion(actor('recepcion'), pr1, undefined)).toBeNull();
  });

  test.each<Rol>(['recepcion', 'odontologo', 'administrador'])(
    'Duración ajustada por %s',
    (rol) => {
      expect(validarDuracion(actor(rol), pr1, 45)).toBeNull();
      expect(duracionEfectiva(pr1, 45)).toBe(45);
    },
  );

  test.each([
    ['Duración cero rechazada', 0],
    ['Duración no múltiplo de 5 rechazada', 37],
    ['Duración negativa rechazada', -5],
    ['Duración no entera rechazada', 12.5],
  ])('%s', (_n, valor) => {
    expect(validarDuracion(actor('recepcion'), pr1, valor)).toEqual({ codigo: 'RN-06' });
  });

  test('Paciente informa duración distinta', () => {
    expect(validarDuracion(actor('paciente'), pr1, 45)).toEqual({ codigo: 'RN-16' });
  });

  test('paciente con duración igual a la de la prestación es válida', () => {
    expect(validarDuracion(actor('paciente'), pr1, 30)).toBeNull();
  });

  test('RN-16 prevalece sobre RN-06 para el paciente', () => {
    expect(validarDuracion(actor('paciente'), pr1, 37)).toEqual({ codigo: 'RN-16' });
  });
});
