import { describe, expect, test } from 'vitest';
import { MENSAJES_RN, traducirError } from '../../../src/adapters/http/errores-http.js';
import { ConfiguracionInvalidaError, ConsultaInvalidaError, RecursoNoEncontradoError, ReglaNegocioError } from '../../../src/domain/errores.js';
import { crearTurno, local, MARTES } from '../../fixtures/seed.js';

const turno = crearTurno({ id: 't-base', inicio: local(MARTES, '09:00'), fin: local(MARTES, '09:30') });

describe('Errores de dominio en las rutas internas (design D4)', () => {
  test('ReglaNegocioError responde 409 con el código, un mensaje fijo y el conflicto', () => {
    expect(traducirError(new ReglaNegocioError({ codigo: 'RN-02', turnoEnConflicto: turno }))).toEqual({
      estado: 409,
      inesperado: false,
      cuerpo: {
        error: {
          codigo: 'RN-02',
          mensaje: 'El profesional ya tiene un turno en ese horario.',
          conflicto: { inicio: '2026-11-24T12:00:00.000Z', fin: '2026-11-24T12:30:00.000Z' },
        },
      },
    });
  });

  test('el conflicto por bloqueo también informa su horario', () => {
    const r = traducirError(
      new ReglaNegocioError({ codigo: 'RN-07', bloqueoEnConflicto: { id: 'b', profesionalId: 'p1', inicio: local(MARTES, '15:00'), fin: local(MARTES, '16:00') } }),
    );
    expect(r.cuerpo.error).toMatchObject({ codigo: 'RN-07', conflicto: { inicio: '2026-11-24T18:00:00.000Z' } });
  });

  test('RN-35 informa el paciente existente', () => {
    const pacienteExistente = { id: 'pa1', nombre: 'Carla', apellido: 'Prueba', dni: '00000001', telefono: '+54 9 11 0000-0001' };
    expect(traducirError(new ReglaNegocioError({ codigo: 'RN-35', pacienteExistente })).cuerpo.error).toMatchObject({
      codigo: 'RN-35',
      mensaje: 'Ya existe un paciente con ese DNI.',
      paciente: pacienteExistente,
    });
  });

  test('todo código RN tiene mensaje en español', () => {
    for (const mensaje of Object.values(MENSAJES_RN)) expect(mensaje).toMatch(/\.$/);
    expect(Object.keys(MENSAJES_RN).sort()).toEqual(['RN-02', 'RN-03', 'RN-06', 'RN-07', 'RN-08', 'RN-10', 'RN-16', 'RN-17', 'RN-18', 'RN-24', 'RN-27', 'RN-31', 'RN-35']);
  });

  test('recurso inexistente responde 404 NO_ENCONTRADO', () => {
    expect(traducirError(new RecursoNoEncontradoError('turno', 't-x'))).toMatchObject({ estado: 404, cuerpo: { error: { codigo: 'NO_ENCONTRADO' } } });
  });

  test('configuración y consulta inválidas responden 400 DATOS_INVALIDOS con campos', () => {
    expect(traducirError(new ConfiguracionInvalidaError('dni', 'x', undefined, ['dni', 'nombre']))).toMatchObject({
      estado: 400,
      cuerpo: { error: { codigo: 'DATOS_INVALIDOS', campos: ['dni', 'nombre'] } },
    });
    expect(traducirError(new ConsultaInvalidaError('recurso', 'x'))).toMatchObject({ estado: 400, cuerpo: { error: { campos: ['recurso'] } } });
  });
});
