import { describe, expect, test } from 'vitest';
import { crearIntervalo } from '../../../src/domain/intervalo.js';
import { tramosDelDia, validarHorario } from '../../../src/domain/reglas/horario.js';
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

describe('horario efectivo por día (RN-28)', () => {
  const propio = (id: string, profesionalId: string, dia: number, desde: string, hasta: string) => ({
    id,
    consultorioId: 'c1',
    profesionalId,
    diaSemana: dia,
    desde,
    hasta,
  });
  const conPropio = [...horarios, propio('hp1', 'p2', 1, '14:00', '18:00')];
  const checkDe = (profesionalId: string, dia: string, desde: string, minutos: number) => {
    const inicio = local(dia, desde);
    return validarHorario(
      crearIntervalo(inicio, new Date(inicio.getTime() + minutos * 60_000)),
      zona,
      conPropio,
      profesionalId,
    );
  };

  describe('tramosDelDia', () => {
    test('con tramos propios del día devuelve solo esos', () => {
      expect(tramosDelDia(conPropio, 1, 'p2')).toEqual([{ desde: 840, hasta: 1080 }]);
    });

    test('sin tramos propios ese día devuelve los del consultorio', () => {
      expect(tramosDelDia(conPropio, 2, 'p2')).toEqual([
        { desde: 540, hasta: 780 },
        { desde: 900, hasta: 1140 },
      ]);
    });

    test('los tramos de otro profesional nunca aplican', () => {
      expect(tramosDelDia(conPropio, 1, 'p1')).toEqual([
        { desde: 540, hasta: 780 },
        { desde: 900, hasta: 1140 },
      ]);
    });

    test('sin profesionalId devuelve los del consultorio', () => {
      expect(tramosDelDia(conPropio, 1)).toEqual([
        { desde: 540, hasta: 780 },
        { desde: 900, hasta: 1140 },
      ]);
    });

    test('los devuelve ordenados por desde', () => {
      const desordenados = [
        propio('hp2', 'p2', 3, '16:00', '18:00'),
        propio('hp3', 'p2', 3, '08:00', '10:00'),
      ];
      expect(tramosDelDia(desordenados, 3, 'p2')).toEqual([
        { desde: 480, hasta: 600 },
        { desde: 960, hasta: 1080 },
      ]);
    });

    test('día sin ningún tramo devuelve una lista vacía', () => {
      expect(tramosDelDia(conPropio, 6, 'p2')).toEqual([]);
    });
  });

  describe('validarHorario con profesionalId', () => {
    test('turno dentro del tramo propio', () => {
      expect(checkDe('p2', LUNES, '14:00', 30)).toBeNull();
    });

    test('RN-07 con el tramo del consultorio el día con horario propio', () => {
      expect(checkDe('p2', LUNES, '09:00', 30)).toEqual({ codigo: 'RN-07' });
    });

    test('sin horario propio ese día vale el del consultorio', () => {
      expect(checkDe('p2', '2026-11-24', '09:00', 30)).toBeNull();
    });

    test('RN-07 al exceder el último tramo propio', () => {
      expect(checkDe('p2', LUNES, '17:30', 60)).toEqual({ codigo: 'RN-07' });
    });

    test('RN-17 al cruzar el corte entre tramos propios', () => {
      const dosTramos = [
        propio('hp4', 'p2', 1, '08:00', '10:00'),
        propio('hp5', 'p2', 1, '16:00', '18:00'),
      ];
      const inicio = local(LUNES, '09:45');
      const iv = crearIntervalo(inicio, new Date(inicio.getTime() + 30 * 60_000));
      expect(validarHorario(iv, zona, [...horarios, ...dosTramos], 'p2')).toEqual({ codigo: 'RN-17' });
    });

    test('el horario propio de otro profesional no cambia a p1', () => {
      expect(checkDe('p1', LUNES, '09:00', 30)).toBeNull();
      expect(checkDe('p1', LUNES, '14:00', 30)).toEqual({ codigo: 'RN-07' });
    });
  });
});
