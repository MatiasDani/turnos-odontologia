import { describe, expect, test } from 'vitest';
import { evaluarAnticipacionPaciente } from '../../../src/domain/reglas/anticipacion.js';
import { crearTurno, local, LUNES } from '../../fixtures/seed.js';

const DOMINGO = '2026-11-22';
const turno = () => crearTurno({ id: 't-base', prestacionId: 'pr1', fin: local(LUNES, '09:30'), duracionMinutos: 30 });

describe('evaluarAnticipacionPaciente (RN-08)', () => {
  test('con 24 h exactas el paciente puede reprogramar', () => {
    expect(evaluarAnticipacionPaciente(turno(), 'paciente', local(DOMINGO, '09:00'))).toBeNull();
  });

  test('con 25 h el paciente puede reprogramar', () => {
    expect(evaluarAnticipacionPaciente(turno(), 'paciente', local(DOMINGO, '08:00'))).toBeNull();
  });

  test('con 23 h 59 min el paciente se rechaza con RN-08', () => {
    expect(evaluarAnticipacionPaciente(turno(), 'paciente', local(DOMINGO, '09:01'))).toEqual({ codigo: 'RN-08' });
  });

  test('con el inicio ya pasado el paciente se rechaza con RN-08', () => {
    expect(evaluarAnticipacionPaciente(turno(), 'paciente', local(LUNES, '10:00'))).toEqual({ codigo: 'RN-08' });
  });

  test.each(['recepcion', 'odontologo', 'administrador'] as const)('%s no tiene restricción de anticipación', (rol) => {
    expect(evaluarAnticipacionPaciente(turno(), rol, local(LUNES, '08:00'))).toBeNull();
  });
});
