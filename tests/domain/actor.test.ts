import { describe, expectTypeOf, it } from 'vitest';
import type { Actor, ActorInterno } from '../../src/domain/actor.js';

describe('Actor discriminado por rol (C-09, DD-33)', () => {
  it('el odontólogo exige usuarioId y profesionalId', () => {
    expectTypeOf({ rol: 'odontologo', usuarioId: 'u-odo1', profesionalId: 'p1' } as const).toExtend<Actor>();
    expectTypeOf({ rol: 'odontologo', usuarioId: 'u-odo1' } as const).not.toExtend<Actor>();
  });

  it('administrador y recepción exigen usuarioId y no llevan profesional', () => {
    expectTypeOf({ rol: 'recepcion', usuarioId: 'u-rec' } as const).toExtend<Actor>();
    expectTypeOf({ rol: 'administrador', usuarioId: 'u-admin' } as const).toExtend<Actor>();
    expectTypeOf({ rol: 'recepcion' } as const).not.toExtend<Actor>();
    expectTypeOf<Extract<Actor, { rol: 'recepcion' }>>().not.toHaveProperty('profesionalId');
  });

  it('el paciente no tiene usuario y puede traer el turno de su token', () => {
    expectTypeOf({ rol: 'paciente' } as const).toExtend<Actor>();
    expectTypeOf({ rol: 'paciente', turnoId: 't-base' } as const).toExtend<Actor>();
    expectTypeOf<Extract<Actor, { rol: 'paciente' }>>().not.toHaveProperty('usuarioId');
  });

  it('un actor interno nunca es paciente', () => {
    expectTypeOf<ActorInterno['rol']>().toEqualTypeOf<'administrador' | 'recepcion' | 'odontologo'>();
  });
});
