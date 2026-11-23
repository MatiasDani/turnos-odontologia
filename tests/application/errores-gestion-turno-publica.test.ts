import { describe, expect, test } from 'vitest';
import {
  CODIGOS_GESTION_TURNO_PUBLICA,
  ErrorGestionTurnoPublica,
} from '../../src/application/errores-gestion-turno-publica.js';
import { ErrorEnlacePublico } from '../../src/application/errores-enlace-publico.js';
import { traducirErrorGestion } from '../../src/application/traducir-error-gestion.js';
import { RecursoNoEncontradoError, ReglaNegocioError } from '../../src/domain/errores.js';
import { crearTurno } from '../fixtures/seed.js';

const MENSAJES: Record<(typeof CODIGOS_GESTION_TURNO_PUBLICA)[number], string> = {
  CONTACTAR_CONSULTORIO: 'Para cancelar o reprogramar con menos de 24 h, contactá al consultorio.',
  HORARIO_NO_DISPONIBLE: 'El horario elegido ya no está disponible.',
  DATOS_INVALIDOS: 'Los datos enviados no son válidos.',
};

describe('Errores públicos de la gestión por token', () => {
  test('el conjunto de códigos es cerrado y cada mensaje es fijo', () => {
    expect(CODIGOS_GESTION_TURNO_PUBLICA).toEqual([
      'CONTACTAR_CONSULTORIO',
      'HORARIO_NO_DISPONIBLE',
      'DATOS_INVALIDOS',
    ]);
    for (const codigo of CODIGOS_GESTION_TURNO_PUBLICA) {
      const error = new ErrorGestionTurnoPublica(codigo);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ErrorGestionTurnoPublica');
      expect(error.codigo).toBe(codigo);
      expect(error.message).toBe(MENSAJES[codigo]);
    }
  });

  test('la serialización no contiene datos internos', () => {
    const error = new ErrorGestionTurnoPublica('HORARIO_NO_DISPONIBLE');
    const serializado = JSON.stringify(error);
    expect(serializado).toContain('HORARIO_NO_DISPONIBLE');
    expect(serializado).not.toMatch(/RN-\d+|turnoEnConflicto|pacienteId|sillonId|token/);
  });

  test('el error de enlace inválido sigue siendo el de C-12', () => {
    const error = new ErrorEnlacePublico();
    expect(error.codigo).toBe('ENLACE_INVALIDO');
    expect(error.message).toBe('El enlace no es válido o ya no está vigente.');
  });
});

describe('Traducción de errores de dominio a errores públicos', () => {
  function traducir(error: unknown): never {
    return traducirErrorGestion(error);
  }

  test('RN-08 se traduce a CONTACTAR_CONSULTORIO', () => {
    expect(() => traducir(new ReglaNegocioError({ codigo: 'RN-08' }))).toThrowError(ErrorGestionTurnoPublica);
    try {
      traducir(new ReglaNegocioError({ codigo: 'RN-08' }));
    } catch (error) {
      expect(error).toMatchObject({ codigo: 'CONTACTAR_CONSULTORIO' });
    }
  });

  test('RN-10 y un turno inexistente se traducen a ENLACE_INVALIDO', () => {
    expect(() => traducir(new ReglaNegocioError({ codigo: 'RN-10', estadoActual: 'cancelado' }))).toThrowError(
      ErrorEnlacePublico,
    );
    expect(() => traducir(new RecursoNoEncontradoError('turno', 't-base'))).toThrowError(ErrorEnlacePublico);
  });

  test('las reglas de horario se traducen a HORARIO_NO_DISPONIBLE sin datos ajenos', () => {
    const conflicto = crearTurno({ id: 't-ajeno', pacienteId: 'pa-ajeno' });
    const original = new ReglaNegocioError({ codigo: 'RN-02', turnoEnConflicto: conflicto });
    try {
      traducir(original);
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorGestionTurnoPublica);
      expect(error).toMatchObject({ codigo: 'HORARIO_NO_DISPONIBLE' });
      expect(JSON.stringify(error)).not.toContain('t-ajeno');
      expect(JSON.stringify(error)).not.toContain('pa-ajeno');
    }
  });

  test('un recurso de catálogo inexistente se traduce a HORARIO_NO_DISPONIBLE', () => {
    try {
      traducir(new RecursoNoEncontradoError('profesional', 'p-x'));
    } catch (error) {
      expect(error).toMatchObject({ codigo: 'HORARIO_NO_DISPONIBLE' });
    }
  });

  test('un error inesperado se propaga sin enmascarar', () => {
    const inesperado = new Error('falló el repositorio');
    expect(() => traducir(inesperado)).toThrowError(inesperado);
  });
});
