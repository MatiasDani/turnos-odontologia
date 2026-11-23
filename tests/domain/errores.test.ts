import { describe, expect, test } from 'vitest';
import {
  AccesoDenegadoError,
  ConfiguracionInvalidaError,
  ConsultaInvalidaError,
  RecursoNoEncontradoError,
  ReglaNegocioError,
} from '../../src/domain/errores.js';
import type { Turno } from '../../src/domain/turno.js';

const turno: Turno = {
  id: 't1',
  pacienteId: 'pa1',
  profesionalId: 'p1',
  sillonId: 's1',
  prestacionId: 'pr1',
  inicio: new Date('2026-11-23T12:00:00Z'),
  fin: new Date('2026-11-23T12:30:00Z'),
  duracionMinutos: 30,
  estado: 'confirmado',
  origen: 'recepcion',
};

describe('ReglaNegocioError', () => {
  test('preserva instanceof y el código', () => {
    const e = new ReglaNegocioError({ codigo: 'RN-18' });
    expect(e).toBeInstanceOf(ReglaNegocioError);
    expect(e).toBeInstanceOf(Error);
    expect(e.codigo).toBe('RN-18');
    expect(e.turnoEnConflicto).toBeUndefined();
  });

  test('preserva turno en conflicto', () => {
    const e = new ReglaNegocioError({ codigo: 'RN-02', turnoEnConflicto: turno });
    expect(e.codigo).toBe('RN-02');
    expect(e.turnoEnConflicto).toBe(turno);
  });

  test('preserva bloqueo en conflicto y recurso bloqueado', () => {
    const bloqueo = { id: 'b1', sillonId: 's1', inicio: turno.inicio, fin: turno.fin };
    const e = new ReglaNegocioError({
      codigo: 'RN-07',
      bloqueoEnConflicto: bloqueo,
      recursoBloqueado: 'sillon',
    });
    expect(e.bloqueoEnConflicto).toBe(bloqueo);
    expect(e.recursoBloqueado).toBe('sillon');
  });

  test('RN-10 preserva el estado actual del turno', () => {
    const e = new ReglaNegocioError({ codigo: 'RN-10', estadoActual: 'atendido' });
    expect(e.codigo).toBe('RN-10');
    expect(e.estadoActual).toBe('atendido');
  });

  test('RN-10 con otro estado actual', () => {
    const e = new ReglaNegocioError({ codigo: 'RN-10', estadoActual: 'cancelado' });
    expect(e.estadoActual).toBe('cancelado');
  });

  test('RN-08 sin estado actual', () => {
    const e = new ReglaNegocioError({ codigo: 'RN-08' });
    expect(e.codigo).toBe('RN-08');
    expect(e.estadoActual).toBeUndefined();
  });

  test('RN-24 (cierre antes del inicio) sin estado actual', () => {
    const e = new ReglaNegocioError({ codigo: 'RN-24' });
    expect(e.codigo).toBe('RN-24');
    expect(e.message).toBe('Regla de negocio violada: RN-24');
    expect(e.estadoActual).toBeUndefined();
  });
});

describe('RecursoNoEncontradoError', () => {
  test('preserva instanceof, tipo e id, y no es ReglaNegocioError', () => {
    const e = new RecursoNoEncontradoError('profesional', 'p9');
    expect(e).toBeInstanceOf(RecursoNoEncontradoError);
    expect(e).not.toBeInstanceOf(ReglaNegocioError);
    expect(e.tipo).toBe('profesional');
    expect(e.id).toBe('p9');
    expect(e.message).toContain('p9');
  });
});

describe('ConsultaInvalidaError', () => {
  test('preserva instanceof, name, campo y motivo (rango)', () => {
    const e = new ConsultaInvalidaError('rango', 'hasta debe ser posterior a desde');
    expect(e).toBeInstanceOf(ConsultaInvalidaError);
    expect(e).toBeInstanceOf(Error);
    expect(e).not.toBeInstanceOf(ReglaNegocioError);
    expect(e.name).toBe('ConsultaInvalidaError');
    expect(e.campo).toBe('rango');
    expect(e.motivo).toBe('hasta debe ser posterior a desde');
  });

  test('campo paso con otro motivo', () => {
    const e = new ConsultaInvalidaError('paso', 'debe ser entero positivo');
    expect(e.campo).toBe('paso');
    expect(e.motivo).toBe('debe ser entero positivo');
    expect(e.message).toContain('paso');
  });
});

describe('RN-27 (desactivación con turnos activos futuros)', () => {
  const otro: Turno = { ...turno, id: 't2', inicio: new Date('2026-11-24T12:00:00Z') };

  test('conserva la lista completa y no tiene turnoEnConflicto', () => {
    const e = new ReglaNegocioError({ codigo: 'RN-27', turnosEnConflicto: [turno, otro] });
    expect(e.codigo).toBe('RN-27');
    expect(e.message).toBe('Regla de negocio violada: RN-27');
    expect(e.turnosEnConflicto).toEqual([turno, otro]);
    expect(e.turnoEnConflicto).toBeUndefined();
  });

  test('un código sin lista no define turnosEnConflicto', () => {
    const e = new ReglaNegocioError({ codigo: 'RN-18' });
    expect(e.turnosEnConflicto).toBeUndefined();
  });
});

describe('AccesoDenegadoError', () => {
  test('preserva instanceof, name, rol y operación, y no es ReglaNegocioError', () => {
    const e = new AccesoDenegadoError('recepcion', 'configurar-sillon');
    expect(e).toBeInstanceOf(AccesoDenegadoError);
    expect(e).toBeInstanceOf(Error);
    expect(e).not.toBeInstanceOf(ReglaNegocioError);
    expect(e.name).toBe('AccesoDenegadoError');
    expect(e.rol).toBe('recepcion');
    expect(e.operacion).toBe('configurar-sillon');
    expect(e.message).toContain('recepcion');
  });

  test('con otro rol y operación', () => {
    const e = new AccesoDenegadoError('paciente', 'configurar-prestacion');
    expect(e.rol).toBe('paciente');
    expect(e.operacion).toBe('configurar-prestacion');
  });
});

describe('ConfiguracionInvalidaError', () => {
  test('preserva instanceof, name, campo y motivo, y no es ReglaNegocioError', () => {
    const e = new ConfiguracionInvalidaError('duracionMinutos', 'debe ser múltiplo de 5');
    expect(e).toBeInstanceOf(ConfiguracionInvalidaError);
    expect(e).toBeInstanceOf(Error);
    expect(e).not.toBeInstanceOf(ReglaNegocioError);
    expect(e.name).toBe('ConfiguracionInvalidaError');
    expect(e.campo).toBe('duracionMinutos');
    expect(e.motivo).toBe('debe ser múltiplo de 5');
    expect(e.tramoEnConflicto).toBeUndefined();
    expect(e.message).toContain('duracionMinutos');
  });

  test('preserva el tramo en conflicto', () => {
    const tramo = { id: 'h1m', consultorioId: 'c1', diaSemana: 1, desde: '09:00', hasta: '13:00' };
    const e = new ConfiguracionInvalidaError('tramo', 'se solapa con otro tramo', tramo);
    expect(e.campo).toBe('tramo');
    expect(e.tramoEnConflicto).toBe(tramo);
  });
});
