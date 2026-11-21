import { describe, expect, test } from 'vitest';
import { crearIntervalo } from '../../../src/domain/intervalo.js';
import { validarHorario } from '../../../src/domain/reglas/horario.js';
import { crearEntorno, LUNES, local, SABADO } from '../../fixtures/seed.js';

const { consultorio, horarios } = crearEntorno();
const zona = consultorio.zonaHoraria;
const check = (dia: string, desde: string, minutos: number) => {
  const inicio = local(dia, desde);
  return validarHorario(
    crearIntervalo(inicio, new Date(inicio.getTime() + minutos * 60_000)),
    zona,
    horarios,
  );
};

describe('horario de atención (RN-07, RN-17)', () => {
  test('Turno de 60 min que excede el cierre', () => {
    expect(check(LUNES, '18:30', 60)).toEqual({ codigo: 'RN-07' });
  });

  test('Turno antes de la apertura', () => {
    expect(check(LUNES, '08:30', 30)).toEqual({ codigo: 'RN-07' });
  });

  test('Turno que empieza en el corte del mediodía', () => {
    expect(check(LUNES, '13:30', 30)).toEqual({ codigo: 'RN-07' });
  });

  test('Turno en fin de semana', () => {
    expect(check(SABADO, '10:00', 30)).toEqual({ codigo: 'RN-07' });
  });

  test('Instante UTC convertido a hora local', () => {
    const inicio = new Date('2026-11-23T12:00:00Z');
    const fin = new Date('2026-11-23T12:30:00Z');
    expect(validarHorario(crearIntervalo(inicio, fin), zona, horarios)).toBeNull();
  });

  test('Instante UTC fuera de horario local', () => {
    const inicio = new Date('2026-11-23T11:30:00Z');
    const fin = new Date('2026-11-23T12:00:00Z');
    expect(validarHorario(crearIntervalo(inicio, fin), zona, horarios)).toEqual({ codigo: 'RN-07' });
  });

  test('Termina justo al cierre del tramo', () => {
    expect(check(LUNES, '12:30', 30)).toBeNull();
  });

  test('Cruza el corte entre tramos', () => {
    expect(check(LUNES, '12:45', 30)).toEqual({ codigo: 'RN-17' });
  });

  test('termina justo al cierre del último tramo es válido', () => {
    expect(check(LUNES, '18:30', 30)).toBeNull();
  });

  test('turno que cruza la medianoche local es RN-07', () => {
    expect(check(LUNES, '18:30', 600)).toEqual({ codigo: 'RN-07' });
  });

  test('ignora horarios de profesional (C-01 solo evalúa el del consultorio)', () => {
    const soloProfesional = horarios.map((h) => ({ ...h, profesionalId: 'p1' }));
    const inicio = local(LUNES, '09:00');
    const iv = crearIntervalo(inicio, new Date(inicio.getTime() + 30 * 60_000));
    expect(validarHorario(iv, zona, soloProfesional)).toEqual({ codigo: 'RN-07' });
  });
});
