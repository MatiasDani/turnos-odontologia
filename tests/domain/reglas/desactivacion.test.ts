import { describe, expect, test } from 'vitest';
import { evaluarDesactivacion } from '../../../src/domain/reglas/desactivacion.js';
import type { EstadoTurno } from '../../../src/domain/turno.js';
import { crearTurno, LUNES, local, MARTES } from '../../fixtures/seed.js';

const ahora = local(LUNES, '10:00');
const turnoEn = (id: string, dia: string, hora: string, estado: EstadoTurno = 'confirmado') =>
  crearTurno({ id, inicio: local(dia, hora), fin: local(dia, hora), estado });

describe('evaluarDesactivacion (RN-27)', () => {
  test.each<EstadoTurno>(['reservado', 'confirmado'])('un turno %s futuro está en conflicto', (estado) => {
    const t = turnoEn('t1', MARTES, '09:00', estado);
    expect(evaluarDesactivacion([t], ahora)).toEqual({ codigo: 'RN-27', turnosEnConflicto: [t] });
  });

  test('el umbral es inclusivo: inicio == ahora está en conflicto', () => {
    const t = turnoEn('t1', LUNES, '10:00');
    expect(evaluarDesactivacion([t], ahora)).toEqual({ codigo: 'RN-27', turnosEnConflicto: [t] });
  });

  test('un turno que empezó un minuto antes de ahora no cuenta', () => {
    expect(evaluarDesactivacion([turnoEn('t1', LUNES, '09:59')], ahora)).toBeNull();
  });

  test.each<EstadoTurno>(['cancelado', 'ausente', 'atendido'])('un turno %s futuro no cuenta', (estado) => {
    expect(evaluarDesactivacion([turnoEn('t1', MARTES, '09:00', estado)], ahora)).toBeNull();
  });

  test('sin turnos devuelve null', () => {
    expect(evaluarDesactivacion([], ahora)).toBeNull();
  });

  test('lista todos los conflictos ordenados por inicio y luego por id', () => {
    const tardeB = turnoEn('b', MARTES, '11:00');
    const tardeA = turnoEn('a', MARTES, '11:00', 'reservado');
    const lunes = turnoEn('z', LUNES, '15:00', 'reservado');
    const ignorado = turnoEn('i', MARTES, '08:00', 'cancelado');
    expect(evaluarDesactivacion([tardeB, ignorado, tardeA, lunes], ahora)).toEqual({
      codigo: 'RN-27',
      turnosEnConflicto: [lunes, tardeA, tardeB],
    });
  });

  test('no modifica el arreglo recibido', () => {
    const turnos = [turnoEn('b', MARTES, '11:00'), turnoEn('a', LUNES, '15:00')];
    evaluarDesactivacion(turnos, ahora);
    expect(turnos.map((t) => t.id)).toEqual(['b', 'a']);
  });
});
