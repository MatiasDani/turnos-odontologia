import { describe, expect, test } from 'vitest';
import {
  HORIZONTE_DIAS,
  dentroDelHorizonte,
  diasReservables,
  esFechaLocalValida,
  fechaEnHorizonte,
  fechaLocal,
  sumarDias,
} from '../../../src/domain/reglas/horizonte-reserva.js';
import { local } from '../../fixtures/seed.js';

const ZONA = 'America/Argentina/Buenos_Aires';

describe('RN-30: horizonte de la reserva online', () => {
  test('el horizonte es de 30 días', () => {
    expect(HORIZONTE_DIAS).toBe(30);
  });

  test('los días reservables van de hoy a hoy + 30 inclusive', () => {
    expect(diasReservables(local('2026-11-22', '08:00'), ZONA)).toEqual({
      desde: '2026-11-22',
      hasta: '2026-12-22',
    });
  });

  test('cambio de mes y de año', () => {
    expect(diasReservables(local('2026-12-15', '10:00'), ZONA)).toEqual({
      desde: '2026-12-15',
      hasta: '2027-01-14',
    });
    expect(diasReservables(local('2028-02-01', '10:00'), ZONA).hasta).toBe('2028-03-02');
  });

  test('cerca de la medianoche local manda el día de la zona, no el UTC', () => {
    // 23:30 del 22/11 en Buenos Aires ya es 02:30 UTC del 23/11.
    expect(diasReservables(local('2026-11-22', '23:30'), ZONA).desde).toBe('2026-11-22');
    // 00:10 del 23/11 local es 03:10 UTC del mismo día.
    expect(diasReservables(local('2026-11-23', '00:10'), ZONA).desde).toBe('2026-11-23');
  });

  test('último día del horizonte: cualquier hora de ese día entra', () => {
    const ahora = local('2026-11-22', '08:00');
    expect(dentroDelHorizonte(local('2026-12-22', '00:00'), ahora, ZONA)).toBe(true);
    expect(dentroDelHorizonte(local('2026-12-22', '23:59'), ahora, ZONA)).toBe(true);
  });

  test('día 31: queda fuera', () => {
    const ahora = local('2026-11-22', '08:00');
    expect(dentroDelHorizonte(local('2026-12-23', '00:00'), ahora, ZONA)).toBe(false);
    expect(dentroDelHorizonte(local('2026-12-23', '09:00'), ahora, ZONA)).toBe(false);
  });

  test('hoy entra y un día anterior a hoy queda fuera', () => {
    const ahora = local('2026-11-22', '08:00');
    expect(dentroDelHorizonte(local('2026-11-22', '09:00'), ahora, ZONA)).toBe(true);
    expect(dentroDelHorizonte(local('2026-11-21', '23:59'), ahora, ZONA)).toBe(false);
  });

  test('con ahora a las 23:59 local el último día avanza con el día local', () => {
    const ahora = local('2026-11-22', '23:59');
    expect(dentroDelHorizonte(local('2026-12-22', '10:00'), ahora, ZONA)).toBe(true);
    expect(dentroDelHorizonte(local('2026-12-23', '10:00'), ahora, ZONA)).toBe(false);
  });

  test('fechaEnHorizonte compara fechas AAAA-MM-DD', () => {
    const ahora = local('2026-11-22', '08:00');
    expect(fechaEnHorizonte('2026-12-22', ahora, ZONA)).toBe(true);
    expect(fechaEnHorizonte('2026-12-23', ahora, ZONA)).toBe(false);
    expect(fechaEnHorizonte('2026-11-21', ahora, ZONA)).toBe(false);
  });

  test('fechaLocal y sumarDias', () => {
    expect(fechaLocal(new Date('2026-11-23T02:30:00Z'), ZONA)).toBe('2026-11-22');
    expect(sumarDias('2026-02-28', 1)).toBe('2026-03-01');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
  });

  test('esFechaLocalValida rechaza formatos y fechas inexistentes', () => {
    expect(esFechaLocalValida('2026-11-23')).toBe(true);
    for (const malo of ['2026-02-30', '2026-13-01', '2026-1-1', '23/11/2026', '', '2026-11-23T10:00']) {
      expect(esFechaLocalValida(malo)).toBe(false);
    }
  });
});
