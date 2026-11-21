import { describe, expectTypeOf, test } from 'vitest';
import type { ConsultarDisponibilidadInput } from '../../src/application/consultar-disponibilidad-input.js';
import type { Hueco } from '../../src/domain/disponibilidad/hueco.js';

describe('contratos de disponibilidad', () => {
  test('ConsultarDisponibilidadInput no tiene campo de forzado (RN-04)', () => {
    expectTypeOf<ConsultarDisponibilidadInput>().not.toHaveProperty('forzar');
  });

  test('ConsultarDisponibilidadInput: opcionales y obligatorios', () => {
    expectTypeOf<ConsultarDisponibilidadInput>().toHaveProperty('actor');
    expectTypeOf<ConsultarDisponibilidadInput>().toHaveProperty('prestacionId').toEqualTypeOf<string>();
    expectTypeOf<ConsultarDisponibilidadInput>().toHaveProperty('ahora').toEqualTypeOf<Date>();
    expectTypeOf<ConsultarDisponibilidadInput['rango']>().toEqualTypeOf<{
      readonly desde: Date;
      readonly hasta: Date;
    }>();
    expectTypeOf<ConsultarDisponibilidadInput['pasoMinutos']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<ConsultarDisponibilidadInput['profesionalId']>().toEqualTypeOf<string | undefined>();
  });

  test('Hueco: inicio, fin, profesionalId y sillonId', () => {
    expectTypeOf<Hueco>().toEqualTypeOf<{
      readonly inicio: Date;
      readonly fin: Date;
      readonly profesionalId: string;
      readonly sillonId: string;
    }>();
  });
});
