import { describe, expect, test } from 'vitest';
import { crearIntervalo } from '../../../src/domain/intervalo.js';
import { validarSolapamiento } from '../../../src/domain/reglas/solapamiento.js';
import type { EstadoTurno } from '../../../src/domain/turno.js';
import { crearTurno, LUNES, local } from '../../fixtures/seed.js';

const iv = (a: string, b: string) => crearIntervalo(local(LUNES, a), local(LUNES, b));
const A = crearTurno({
  id: 'A',
  inicio: local(LUNES, '09:00'),
  fin: local(LUNES, '09:45'),
  duracionMinutos: 45,
});

describe('solapamiento (RN-02, RN-03)', () => {
  test('Contiguos del mismo profesional son válidos', () => {
    expect(validarSolapamiento(iv('09:45', '10:15'), 'p1', 's1', [A])).toBeNull();
  });

  test('Solapamiento parcial por profesional', () => {
    expect(validarSolapamiento(iv('09:44', '10:14'), 'p1', 's2', [A])).toEqual({
      codigo: 'RN-02',
      turnoEnConflicto: A,
    });
  });

  test('Contención total por profesional', () => {
    const grande = crearTurno({ id: 'G', fin: local(LUNES, '10:30'), duracionMinutos: 90 });
    expect(validarSolapamiento(iv('09:30', '10:00'), 'p1', 's2', [grande])?.codigo).toBe('RN-02');
  });

  test('Mismo profesional en otro sillón', () => {
    expect(validarSolapamiento(iv('09:00', '10:00'), 'p1', 's2', [crearTurno()])?.codigo).toBe('RN-02');
  });

  test('Mismo sillón con otro profesional', () => {
    expect(validarSolapamiento(iv('09:30', '10:00'), 'p2', 's1', [A])).toEqual({
      codigo: 'RN-03',
      turnoEnConflicto: A,
    });
  });

  test('Contiguos en el mismo sillón son válidos', () => {
    expect(validarSolapamiento(iv('10:00', '10:30'), 'p2', 's1', [crearTurno()])).toBeNull();
  });

  test('Distinto profesional y sillón en el mismo horario', () => {
    expect(validarSolapamiento(iv('09:00', '10:00'), 'p2', 's2', [crearTurno()])).toBeNull();
  });

  test.each<EstadoTurno>(['cancelado', 'ausente'])('Turno %s no ocupa', (estado) => {
    expect(validarSolapamiento(iv('09:00', '10:00'), 'p1', 's1', [crearTurno({ estado })])).toBeNull();
  });

  test.each<EstadoTurno>(['reservado', 'confirmado', 'atendido'])(
    'Turno %s sigue ocupando',
    (estado) => {
      const r = validarSolapamiento(iv('09:30', '10:00'), 'p1', 's2', [crearTurno({ estado })]);
      expect(r?.codigo).toBe('RN-02');
    },
  );

  test('Profesional prevalece sobre sillón', () => {
    expect(validarSolapamiento(iv('09:15', '09:45'), 'p1', 's1', [crearTurno()])?.codigo).toBe('RN-02');
  });

  test('RN-02 se informa antes que RN-03 aunque el turno de sillón aparezca primero', () => {
    const sillon = crearTurno({ id: 'S', profesionalId: 'p2', sillonId: 's1' });
    const prof = crearTurno({ id: 'P', profesionalId: 'p1', sillonId: 's2' });
    expect(validarSolapamiento(iv('09:00', '10:00'), 'p1', 's1', [sillon, prof])).toEqual({
      codigo: 'RN-02',
      turnoEnConflicto: prof,
    });
  });
});
