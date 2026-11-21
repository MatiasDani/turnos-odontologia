import { describe, expect, test } from 'vitest';
import { crearEntorno, local } from './seed.js';

describe('seed ficticio y helper local()', () => {
  test('local() interpreta la hora en -03:00', () => {
    expect(local('2026-11-23', '09:00').toISOString()).toBe('2026-11-23T12:00:00.000Z');
    expect(local('2026-11-23', '18:30').toISOString()).toBe('2026-11-23T21:30:00.000Z');
  });

  test('crearEntorno() arma el seed de 04_modelo_de_datos', () => {
    const e = crearEntorno();
    expect(e.consultorio.zonaHoraria).toBe('America/Argentina/Buenos_Aires');
    expect(e.profesionales.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(e.sillones.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(e.prestaciones.map((p) => p.duracionMinutos)).toEqual([30, 45, 60, 90]);
    expect(e.pacientes.map((p) => p.id)).toEqual(['pa1', 'pa2', 'pa3']);
    expect(e.horarios).toHaveLength(10);
    expect(e.bloqueos).toHaveLength(1);
    expect(e.turnos).toEqual([]);
  });

  test('crearEntorno(overrides) reemplaza solo lo indicado', () => {
    const e = crearEntorno({ turnos: [] , sillones: [] });
    expect(e.sillones).toEqual([]);
    expect(e.profesionales).toHaveLength(2);
  });

  test('los datos del seed son ficticios (DNI y teléfono con prefijo no real)', () => {
    for (const p of crearEntorno().pacientes) {
      expect(p.dni).toMatch(/^0000000\d$/);
      expect(p.telefono).toMatch(/^\+54 9 11 0000-000\d$/);
    }
  });
});
