import { describe, expect, expectTypeOf, test } from 'vitest';
import {
  CODIGOS_RESERVA_PUBLICA,
  ErrorReservaPublica,
  type CodigoReservaPublica,
} from '../../src/application/errores-reserva-publica.js';
import type { ReservarOnlineInput } from '../../src/application/reservar-online-input.js';
import { local, LUNES } from '../fixtures/seed.js';

describe('ErrorReservaPublica', () => {
  test('expone codigo, name y es una instancia de Error', () => {
    const error = new ErrorReservaPublica('RESERVA_EN_PASADO');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ErrorReservaPublica);
    expect(error.name).toBe('ErrorReservaPublica');
    expect(error.codigo).toBe('RESERVA_EN_PASADO');
  });

  test('DATOS_INVALIDOS lleva la lista de campos', () => {
    const error = new ErrorReservaPublica('DATOS_INVALIDOS', { campos: ['paciente.dni', 'inicio'] });
    expect(error.campos).toEqual(['paciente.dni', 'inicio']);
    expect(error.nuevaOferta).toBeUndefined();
  });

  test('HORARIO_NO_DISPONIBLE lleva la nueva oferta', () => {
    const oferta = [{ inicio: local(LUNES, '09:00'), fin: local(LUNES, '09:45') }];
    const error = new ErrorReservaPublica('HORARIO_NO_DISPONIBLE', { nuevaOferta: oferta });
    expect(error.nuevaOferta).toEqual(oferta);
    expect(error.campos).toBeUndefined();
  });

  test('los otros códigos no tienen campos ni nueva oferta', () => {
    const error = new ErrorReservaPublica('LIMITE_DE_TURNOS');
    expect('campos' in error).toBe(false);
    expect('nuevaOferta' in error).toBe(false);
  });

  test.each(CODIGOS_RESERVA_PUBLICA)('el código %s tiene un mensaje genérico fijo y no vacío', (codigo) => {
    const a = new ErrorReservaPublica(codigo);
    const b = new ErrorReservaPublica(codigo);
    expect(a.message.length).toBeGreaterThan(0);
    expect(a.message).toBe(b.message);
  });

  test('cada código tiene un mensaje distinto', () => {
    const mensajes = CODIGOS_RESERVA_PUBLICA.map((c) => new ErrorReservaPublica(c).message);
    expect(new Set(mensajes).size).toBe(CODIGOS_RESERVA_PUBLICA.length);
  });

  test('los mensajes no repiten DNI ni horarios', () => {
    for (const codigo of CODIGOS_RESERVA_PUBLICA) {
      expect(new ErrorReservaPublica(codigo).message).not.toMatch(/\d{2}[:/-]\d{2}|\d{7,8}/);
    }
  });

  test('no tiene cause', () => {
    const error = new ErrorReservaPublica('PRESTACION_NO_DISPONIBLE');
    expect(error.cause).toBeUndefined();
    expect('cause' in error).toBe(false);
  });

  test('el conjunto de códigos es cerrado', () => {
    expectTypeOf<CodigoReservaPublica>().toEqualTypeOf<
      | 'DATOS_INVALIDOS'
      | 'RESERVA_EN_PASADO'
      | 'PRESTACION_NO_DISPONIBLE'
      | 'PROFESIONAL_NO_DISPONIBLE'
      | 'RESERVA_DUPLICADA'
      | 'LIMITE_DE_TURNOS'
      | 'HORARIO_NO_DISPONIBLE'
    >();
    expect(CODIGOS_RESERVA_PUBLICA).toHaveLength(7);
  });
});

describe('ReservarOnlineInput (contrato tipado, D4)', () => {
  test('no tiene actor, duracionMinutos, sillonId ni forzar', () => {
    expectTypeOf<keyof ReservarOnlineInput>().toEqualTypeOf<
      'prestacionId' | 'inicio' | 'profesionalId' | 'paciente'
    >();
    expectTypeOf<ReservarOnlineInput>().not.toHaveProperty('actor');
    expectTypeOf<ReservarOnlineInput>().not.toHaveProperty('duracionMinutos');
    expectTypeOf<ReservarOnlineInput>().not.toHaveProperty('sillonId');
    expectTypeOf<ReservarOnlineInput>().not.toHaveProperty('forzar');
  });
});
