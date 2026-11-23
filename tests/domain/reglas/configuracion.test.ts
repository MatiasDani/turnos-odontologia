import { describe, expect, test } from 'vitest';
import type { HorarioAtencion } from '../../../src/domain/horario-atencion.js';
import {
  normalizarNombre,
  tramoEnConflicto,
  validarPrestacion,
  validarProfesional,
  validarSillon,
  validarTramo,
} from '../../../src/domain/reglas/configuracion.js';
import { crearEntorno } from '../../fixtures/seed.js';

const invalido = (campo: string) => expect.objectContaining({ ok: false, campo });

describe('normalizarNombre (RN-29)', () => {
  test.each([
    ['  Franco  ', 'Franco'],
    ['Ana', 'Ana'],
    ['a'.repeat(80), 'a'.repeat(80)],
    ['  ' + 'a'.repeat(80) + '  ', 'a'.repeat(80)],
  ])('%j → %j', (entrada, esperado) => {
    expect(normalizarNombre(entrada)).toBe(esperado);
  });

  test.each(['', '   ', 'a'.repeat(81)])('%j → null', (entrada) => {
    expect(normalizarNombre(entrada)).toBeNull();
  });
});

describe('validarProfesional', () => {
  const base = { nombre: 'Franco', apellido: 'Ficticio', prestacionIds: ['pr1', 'pr2'] };

  test('normaliza nombre y apellido y conserva matrícula y prestaciones', () => {
    expect(
      validarProfesional({ ...base, nombre: '  Franco  ', apellido: ' Ficticio ', matricula: ' 0003 ' }),
    ).toEqual({
      ok: true,
      valor: { nombre: 'Franco', apellido: 'Ficticio', matricula: '0003', prestacionIds: ['pr1', 'pr2'] },
    });
  });

  test('matrícula y prestaciones son opcionales', () => {
    expect(validarProfesional({ nombre: 'Franco', apellido: 'Ficticio', prestacionIds: [] })).toEqual({
      ok: true,
      valor: { nombre: 'Franco', apellido: 'Ficticio', prestacionIds: [] },
    });
  });

  test.each([
    ['nombre vacío', { ...base, nombre: '' }, 'nombre'],
    ['nombre de 81 caracteres', { ...base, nombre: 'a'.repeat(81) }, 'nombre'],
    ['apellido solo espacios', { ...base, apellido: '   ' }, 'apellido'],
    ['matrícula informada pero vacía', { ...base, matricula: '  ' }, 'matricula'],
    ['matrícula de 81 caracteres', { ...base, matricula: 'm'.repeat(81) }, 'matricula'],
    ['prestaciones repetidas', { ...base, prestacionIds: ['pr1', 'pr1'] }, 'prestacionIds'],
  ])('rechaza %s por el campo %s', (_caso, datos, campo) => {
    expect(validarProfesional(datos)).toEqual(invalido(campo));
  });

  test('informa el primer campo inválido en el orden nombre, apellido, matrícula, prestacionIds', () => {
    expect(validarProfesional({ nombre: '', apellido: '', matricula: '', prestacionIds: ['a', 'a'] })).toEqual(
      invalido('nombre'),
    );
    expect(validarProfesional({ nombre: 'A', apellido: '', matricula: '', prestacionIds: ['a', 'a'] })).toEqual(
      invalido('apellido'),
    );
    expect(validarProfesional({ nombre: 'A', apellido: 'B', matricula: '', prestacionIds: ['a', 'a'] })).toEqual(
      invalido('matricula'),
    );
  });
});

describe('validarSillon', () => {
  test('recorta el nombre; 80 caracteres es válido y 81 no', () => {
    expect(validarSillon({ nombre: ' Sillón 3 ' })).toEqual({ ok: true, valor: { nombre: 'Sillón 3' } });
    expect(validarSillon({ nombre: 'n'.repeat(80) }).ok).toBe(true);
    expect(validarSillon({ nombre: 'n'.repeat(81) })).toEqual(invalido('nombre'));
    expect(validarSillon({ nombre: '' })).toEqual(invalido('nombre'));
  });
});

describe('validarPrestacion', () => {
  test.each([5, 30, 90])('duración %i es válida', (duracionMinutos) => {
    expect(validarPrestacion({ nombre: 'Control rápido', duracionMinutos })).toEqual({
      ok: true,
      valor: { nombre: 'Control rápido', duracionMinutos },
    });
  });

  test.each([0, -15, 32, 12.5, Number.NaN, Infinity])('duración %s es inválida', (duracionMinutos) => {
    expect(validarPrestacion({ nombre: 'Control', duracionMinutos })).toEqual(invalido('duracionMinutos'));
  });

  test('el nombre se valida antes que la duración', () => {
    expect(validarPrestacion({ nombre: ' ', duracionMinutos: 0 })).toEqual(invalido('nombre'));
  });
});

describe('validarTramo', () => {
  const ok = { diaSemana: 6, desde: '09:00', hasta: '13:00' };

  test('un tramo válido se devuelve igual', () => {
    expect(validarTramo(ok)).toEqual({ ok: true, valor: ok });
  });

  test('00:00-23:59 del domingo es válido', () => {
    expect(validarTramo({ diaSemana: 0, desde: '00:00', hasta: '23:59' }).ok).toBe(true);
  });

  test.each([7, -1, 1.5, Number.NaN])('diaSemana %s es inválido', (diaSemana) => {
    expect(validarTramo({ ...ok, diaSemana })).toEqual(invalido('diaSemana'));
  });

  test.each(['9:00', '24:00', '12:60', '0900', '', '09:0'])('desde %j es inválido', (desde) => {
    expect(validarTramo({ ...ok, desde })).toEqual(invalido('desde'));
  });

  test('hasta con formato inválido se informa en hasta', () => {
    expect(validarTramo({ ...ok, hasta: '25:00' })).toEqual(invalido('hasta'));
  });

  test.each([
    ['10:00', '10:00'],
    ['13:00', '09:00'],
  ])('desde %s y hasta %s se informan en el campo hasta', (desde, hasta) => {
    expect(validarTramo({ ...ok, desde, hasta })).toEqual(invalido('hasta'));
  });

  test('informa el primer campo inválido: diaSemana antes que desde', () => {
    expect(validarTramo({ diaSemana: 9, desde: 'x', hasta: 'y' })).toEqual(invalido('diaSemana'));
    expect(validarTramo({ diaSemana: 1, desde: 'x', hasta: 'y' })).toEqual(invalido('desde'));
  });
});

describe('tramoEnConflicto (RN-29, RN-05)', () => {
  const { horarios } = crearEntorno();
  const nuevo = (diaSemana: number, desde: string, hasta: string, profesionalId?: string) => ({
    diaSemana,
    desde,
    hasta,
    ...(profesionalId === undefined ? {} : { profesionalId }),
  });

  test('solapa con un tramo del mismo día y ámbito: devuelve ese tramo', () => {
    expect(tramoEnConflicto(nuevo(1, '12:00', '14:00'), horarios)?.id).toBe('h1m');
    expect(tramoEnConflicto(nuevo(1, '14:00', '16:00'), horarios)?.id).toBe('h1t');
  });

  test('con varios en conflicto devuelve el primero por desde', () => {
    expect(tramoEnConflicto(nuevo(1, '08:00', '20:00'), [...horarios].reverse())?.id).toBe('h1m');
  });

  test('contiguo es válido', () => {
    expect(tramoEnConflicto(nuevo(1, '13:00', '15:00'), horarios)).toBeUndefined();
    expect(tramoEnConflicto(nuevo(1, '08:00', '09:00'), horarios)).toBeUndefined();
  });

  test('otro día de la semana es válido', () => {
    expect(tramoEnConflicto(nuevo(6, '09:00', '13:00'), horarios)).toBeUndefined();
  });

  test('un tramo propio no choca con el del consultorio y viceversa', () => {
    expect(tramoEnConflicto(nuevo(1, '09:00', '13:00', 'p2'), horarios)).toBeUndefined();
    const conPropio: HorarioAtencion[] = [
      ...horarios,
      { id: 'hp1', consultorioId: 'c1', profesionalId: 'p2', diaSemana: 1, desde: '14:00', hasta: '18:00' },
    ];
    expect(tramoEnConflicto(nuevo(1, '14:00', '18:00'), conPropio)?.id).toBe('h1t');
    expect(tramoEnConflicto(nuevo(1, '17:00', '19:00', 'p2'), conPropio)?.id).toBe('hp1');
  });

  test('tramos propios de distintos profesionales no chocan', () => {
    const conPropio: HorarioAtencion[] = [
      { id: 'hp1', consultorioId: 'c1', profesionalId: 'p1', diaSemana: 1, desde: '14:00', hasta: '18:00' },
    ];
    expect(tramoEnConflicto(nuevo(1, '14:00', '18:00', 'p2'), conPropio)).toBeUndefined();
  });

  test('excluirId evita el choque consigo mismo al modificar', () => {
    expect(tramoEnConflicto(nuevo(1, '09:00', '12:00'), horarios, 'h1m')).toBeUndefined();
    expect(tramoEnConflicto(nuevo(1, '12:00', '19:00'), horarios, 'h1t')?.id).toBe('h1m');
  });
});
