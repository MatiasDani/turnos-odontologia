import { describe, expect, test } from 'vitest';
import { generarInicios } from '../../../src/domain/disponibilidad/generar-candidatos.js';
import { aHoraLocal } from '../../../src/domain/tiempo.js';
import { crearEntorno, LUNES, local } from '../../fixtures/seed.js';

const BA = 'America/Argentina/Buenos_Aires';
const horarios = crearEntorno().horarios;

/** Instantes → 'HH:mm' locales, para comparar legible. */
function hhmm(inicios: readonly Date[]): string[] {
  return inicios.map((d) => {
    const { minutosDelDia } = aHoraLocal(d, BA);
    return `${String(Math.floor(minutosDelDia / 60)).padStart(2, '0')}:${String(minutosDelDia % 60).padStart(2, '0')}`;
  });
}

function rangoDelDia(fecha: string): { desde: Date; hasta: Date } {
  return { desde: local(fecha, '00:00'), hasta: local('2026-11-24', '00:00') };
}

function grilla(desdeMin: number, hastaMin: number, paso: number): string[] {
  const salida: string[] = [];
  for (let m = desdeMin; m < hastaMin; m += paso) {
    salida.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return salida;
}

describe('generarInicios: paso', () => {
  test('lunes con paso 15: 09:00..12:45 y 15:00..18:45', () => {
    const inicios = generarInicios({
      rango: rangoDelDia(LUNES),
      ahora: local('2026-11-22', '08:00'),
      zona: BA,
      horarios,
      pasoMinutos: 15,
    });
    expect(hhmm(inicios)).toEqual([...grilla(540, 780, 15), ...grilla(900, 1140, 15)]);
    expect(inicios).toHaveLength(32);
  });

  test('paso 30: no genera 09:15 y sí 09:30', () => {
    const inicios = hhmm(
      generarInicios({
        rango: rangoDelDia(LUNES),
        ahora: local('2026-11-22', '08:00'),
        zona: BA,
        horarios,
        pasoMinutos: 30,
      }),
    );
    expect(inicios).toEqual([...grilla(540, 780, 30), ...grilla(900, 1140, 30)]);
    expect(inicios).not.toContain('09:15');
    expect(inicios).toContain('09:30');
  });
});

describe('generarInicios: alineación al inicio de cada tramo', () => {
  test('paso 25: la mañana arranca 09:00, 09:25, … y la tarde reinicia en 15:00, 15:25', () => {
    const inicios = hhmm(
      generarInicios({
        rango: rangoDelDia(LUNES),
        ahora: local('2026-11-22', '08:00'),
        zona: BA,
        horarios,
        pasoMinutos: 25,
      }),
    );
    expect(inicios.slice(0, 4)).toEqual(['09:00', '09:25', '09:50', '10:15']);
    expect(inicios).toContain('15:00');
    expect(inicios).toContain('15:25');
    // Último de la mañana: 09:00 + 9·25 min = 12:45 (el siguiente, 13:10, cae fuera del tramo).
    expect(inicios.filter((h) => h < '13:00').at(-1)).toBe('12:45');
    // Sin continuidad entre tramos: la tarde no hereda la fase de la mañana (12:45 + 25 = 13:10).
    expect(inicios.filter((h) => h >= '13:00')[0]).toBe('15:00');
  });

  test('paso 20 con tramos que no empiezan en múltiplo del paso', () => {
    const horariosRaros = [
      { id: 'x1', consultorioId: 'c1', diaSemana: 1, desde: '09:10', hasta: '10:00' },
    ];
    const inicios = hhmm(
      generarInicios({
        rango: rangoDelDia(LUNES),
        ahora: local('2026-11-22', '08:00'),
        zona: BA,
        horarios: horariosRaros,
        pasoMinutos: 20,
      }),
    );
    expect(inicios).toEqual(['09:10', '09:30', '09:50']);
  });
});

describe('generarInicios: rango semiabierto y ahora', () => {
  const base = { zona: BA, horarios, pasoMinutos: 15 } as const;

  test('rango lunes 09:00-10:00: el último inicio es 09:45 (hasta excluido)', () => {
    const inicios = hhmm(
      generarInicios({
        ...base,
        rango: { desde: local(LUNES, '09:00'), hasta: local(LUNES, '10:00') },
        ahora: local('2026-11-22', '08:00'),
      }),
    );
    expect(inicios).toEqual(['09:00', '09:15', '09:30', '09:45']);
  });

  test('desde incluido y descarta lo anterior: rango 10:00-10:30 → 10:00 y 10:15', () => {
    const inicios = hhmm(
      generarInicios({
        ...base,
        rango: { desde: local(LUNES, '10:00'), hasta: local(LUNES, '10:30') },
        ahora: local('2026-11-22', '08:00'),
      }),
    );
    expect(inicios).toEqual(['10:00', '10:15']);
  });

  test('ahora 10:07: el primer inicio es 10:15', () => {
    const inicios = hhmm(
      generarInicios({
        ...base,
        rango: rangoDelDia(LUNES),
        ahora: local(LUNES, '10:07'),
      }),
    );
    expect(inicios[0]).toBe('10:15');
    expect(inicios).not.toContain('10:00');
  });

  test('ahora 10:15 exacto: incluye 10:15', () => {
    const inicios = hhmm(
      generarInicios({
        ...base,
        rango: rangoDelDia(LUNES),
        ahora: local(LUNES, '10:15'),
      }),
    );
    expect(inicios[0]).toBe('10:15');
  });
});

describe('generarInicios: varios días y fin de semana', () => {
  const base = { zona: BA, horarios, pasoMinutos: 15, ahora: local('2026-11-20', '08:00') } as const;

  test('rango sábado a lunes 00:00 → vacío', () => {
    const inicios = generarInicios({
      ...base,
      rango: { desde: local('2026-11-28', '00:00'), hasta: local('2026-11-30', '00:00') },
    });
    expect(inicios).toEqual([]);
  });

  test('rango lunes a miércoles 00:00: lunes antes que martes, 64 inicios', () => {
    const inicios = generarInicios({
      ...base,
      rango: { desde: local('2026-11-23', '00:00'), hasta: local('2026-11-25', '00:00') },
    });
    expect(inicios).toHaveLength(64);
    expect(inicios[0]).toEqual(local('2026-11-23', '09:00'));
    expect(inicios[31]).toEqual(local('2026-11-23', '18:45'));
    expect(inicios[32]).toEqual(local('2026-11-24', '09:00'));
    expect(inicios.at(-1)).toEqual(local('2026-11-24', '18:45'));
    const ms = inicios.map((d) => d.getTime());
    expect(ms).toEqual([...ms].sort((a, b) => a - b));
  });

  test('viernes tarde a lunes mañana: salta el fin de semana', () => {
    const inicios = generarInicios({
      ...base,
      rango: { desde: local('2026-11-27', '18:00'), hasta: local('2026-11-30', '09:30') },
    });
    expect(inicios.map((d) => d.toISOString())).toEqual(
      [
        local('2026-11-27', '18:00'),
        local('2026-11-27', '18:15'),
        local('2026-11-27', '18:30'),
        local('2026-11-27', '18:45'),
        local('2026-11-30', '09:00'),
        local('2026-11-30', '09:15'),
      ].map((d) => d.toISOString()),
    );
  });
});

describe('generarInicios: horario propio del profesional (RN-28)', () => {
  const propio = (desde: string, hasta: string) => ({
    id: 'hp1',
    consultorioId: 'c1',
    profesionalId: 'p2',
    diaSemana: 1,
    desde,
    hasta,
  });
  const generar = (extra: ReturnType<typeof propio>, pasoMinutos: number, profesionalId?: string) =>
    hhmm(
      generarInicios({
        rango: rangoDelDia(LUNES),
        ahora: local('2026-11-22', '08:00'),
        zona: BA,
        horarios: [...horarios, extra],
        pasoMinutos,
        ...(profesionalId === undefined ? {} : { profesionalId }),
      }),
    );

  test('grilla del tramo propio: 14:00..17:45 con paso 15', () => {
    expect(generar(propio('14:00', '18:00'), 15, 'p2')).toEqual(grilla(840, 1080, 15));
  });

  test('alineación a 14:10 y 14:25 con paso 15', () => {
    expect(generar(propio('14:10', '15:00'), 15, 'p2')).toEqual(['14:10', '14:25', '14:40', '14:55']);
  });

  test('sin profesionalId usa la grilla del consultorio, igual que antes', () => {
    expect(generar(propio('14:00', '18:00'), 15)).toEqual([...grilla(540, 780, 15), ...grilla(900, 1140, 15)]);
  });

  test('un profesional sin tramos propios usa la grilla del consultorio', () => {
    expect(generar(propio('14:00', '18:00'), 15, 'p1')).toEqual([
      ...grilla(540, 780, 15),
      ...grilla(900, 1140, 15),
    ]);
  });
});
