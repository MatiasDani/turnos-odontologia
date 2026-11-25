import { describe, expectTypeOf, test } from 'vitest';
import type { AgendarTurnoInput } from '../../src/application/agendar-turno-input.js';
import type { GeneradorId } from '../../src/application/puertos/generador-id.js';
import type { ReprogramarDesdeTokenInput } from '../../src/application/reprogramar-desde-token-input.js';
import type { ReprogramarTurnoInput } from '../../src/application/reprogramar-turno-input.js';
import type { TurnoPublico } from '../../src/application/turno-publico.js';
import type {
  BloqueoRepositorio,
  HorarioAtencionRepositorio,
  PrestacionRepositorio,
  ProfesionalRepositorio,
  RecursoDeTurno,
  SillonRepositorio,
  TurnoRepositorio,
} from '../../src/application/puertos/repositorios.js';
import type { HorarioAtencion } from '../../src/domain/horario-atencion.js';
import type { Prestacion } from '../../src/domain/prestacion.js';
import type { Profesional } from '../../src/domain/profesional.js';
import type { Sillon } from '../../src/domain/sillon.js';
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

  test('TurnoPublico tiene exactamente los campos públicos (DD-18, DD-23)', () => {
    expectTypeOf<keyof TurnoPublico>().toEqualTypeOf<
      'turnoId' | 'inicio' | 'fin' | 'prestacion' | 'profesional'
    >();
    expectTypeOf<TurnoPublico['prestacion']>().toEqualTypeOf<{ readonly nombre: string }>();
    expectTypeOf<TurnoPublico['profesional']>().toEqualTypeOf<{
      readonly nombre: string;
      readonly apellido: string;
    }>();
  });

  test('ReprogramarDesdeTokenInput no expone turnoId, actor, sillón ni forzar (RN-04, DD-23)', () => {
    expectTypeOf<keyof ReprogramarDesdeTokenInput>().toEqualTypeOf<
      'token' | 'inicio' | 'profesionalId' | 'prestacionId'
    >();
    expectTypeOf<ReprogramarDesdeTokenInput['inicio']>().toEqualTypeOf<Date>();
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

  test('los puertos de catálogo suman escrituras (C-05, DD-28)', () => {
    expectTypeOf<ProfesionalRepositorio['guardar']>().toEqualTypeOf<(p: Profesional) => Promise<void>>();
    expectTypeOf<SillonRepositorio['guardar']>().toEqualTypeOf<(s: Sillon) => Promise<void>>();
    expectTypeOf<PrestacionRepositorio['guardar']>().toEqualTypeOf<(p: Prestacion) => Promise<void>>();
    expectTypeOf<PrestacionRepositorio['listarPorConsultorio']>().toEqualTypeOf<
      (consultorioId: string) => Promise<readonly Prestacion[]>
    >();
  });

  test('HorarioAtencionRepositorio suma obtenerPorId, guardar y eliminar', () => {
    expectTypeOf<HorarioAtencionRepositorio['obtenerPorId']>().toEqualTypeOf<
      (id: string) => Promise<HorarioAtencion | undefined>
    >();
    expectTypeOf<HorarioAtencionRepositorio['guardar']>().toEqualTypeOf<
      (h: HorarioAtencion) => Promise<void>
    >();
    expectTypeOf<HorarioAtencionRepositorio['eliminar']>().toEqualTypeOf<(id: string) => Promise<void>>();
  });

  test('BloqueoRepositorio suma guardar, obtenerPorId, eliminar y listarTodos (C-06)', () => {
    expectTypeOf<BloqueoRepositorio['guardar']>().toEqualTypeOf<
      (b: import('../../src/domain/bloqueo-horario.js').BloqueoHorario) => Promise<void>
    >();
    expectTypeOf<BloqueoRepositorio['obtenerPorId']>().toEqualTypeOf<
      (id: string) => Promise<import('../../src/domain/bloqueo-horario.js').BloqueoHorario | undefined>
    >();
    expectTypeOf<BloqueoRepositorio['eliminar']>().toEqualTypeOf<(id: string) => Promise<void>>();
    expectTypeOf<BloqueoRepositorio['listarTodos']>().toEqualTypeOf<
      () => Promise<readonly import('../../src/domain/bloqueo-horario.js').BloqueoHorario[]>
    >();
  });

  test('TurnoRepositorio.listarPorRecurso recibe un RecursoDeTurno y devuelve todos sus turnos', () => {
    expectTypeOf<RecursoDeTurno>().toEqualTypeOf<{
      readonly tipo: 'profesional' | 'sillon' | 'prestacion';
      readonly id: string;
    }>();
    expectTypeOf<TurnoRepositorio['listarPorRecurso']>().toEqualTypeOf<
      (recurso: RecursoDeTurno) => Promise<readonly Turno[]>
    >();
  });
});
