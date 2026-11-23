import { describe, expectTypeOf, test } from 'vitest';
import type { AgendarTurnoInput } from '../../src/application/agendar-turno-input.js';
import type { GeneradorId } from '../../src/application/puertos/generador-id.js';
import type { ReprogramarTurnoInput } from '../../src/application/reprogramar-turno-input.js';
import type {
  BloqueoRepositorio,
  ProfesionalRepositorio,
  TurnoRepositorio,
} from '../../src/application/puertos/repositorios.js';
import type { Turno } from '../../src/domain/turno.js';

describe('contratos de los puertos (5.1)', () => {
  test('AgendarTurnoInput tiene exactamente los campos del diseño D3', () => {
    expectTypeOf<keyof AgendarTurnoInput>().toEqualTypeOf<
      | 'actor'
      | 'pacienteId'
      | 'profesionalId'
      | 'sillonId'
      | 'prestacionId'
      | 'inicio'
      | 'duracionMinutos'
    >();
    expectTypeOf<AgendarTurnoInput['duracionMinutos']>().toEqualTypeOf<number | undefined>();
  });

  test('ReprogramarTurnoInput no expone campos para forzar solapamientos (RN-04)', () => {
    expectTypeOf<keyof ReprogramarTurnoInput>().toEqualTypeOf<
      | 'turnoId'
      | 'actor'
      | 'inicio'
      | 'profesionalId'
      | 'sillonId'
      | 'prestacionId'
      | 'duracionMinutos'
    >();
    expectTypeOf<ReprogramarTurnoInput['profesionalId']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ReprogramarTurnoInput['duracionMinutos']>().toEqualTypeOf<number | undefined>();
  });

  test('agregarSiDisponible recibe un candidato y un validador y devuelve una promesa del turno', () => {
    expectTypeOf<TurnoRepositorio['agregarSiDisponible']>().parameter(0).toEqualTypeOf<Turno>();
    expectTypeOf<TurnoRepositorio['agregarSiDisponible']>().returns.toEqualTypeOf<Promise<Turno>>();
  });

  test('los repositorios de lectura devuelven promesas y el generador de ids es síncrono', () => {
    expectTypeOf<ReturnType<ProfesionalRepositorio['obtenerPorId']>>().toMatchTypeOf<Promise<unknown>>();
    expectTypeOf<ReturnType<BloqueoRepositorio['listarPorRecursos']>>().toMatchTypeOf<Promise<unknown>>();
    expectTypeOf<ReturnType<GeneradorId['siguiente']>>().toEqualTypeOf<string>();
  });
});
