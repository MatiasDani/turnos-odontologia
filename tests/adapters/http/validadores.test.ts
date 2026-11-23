import { describe, expect, test } from 'vitest';
import {
  esTokenConForma,
  validarConsultaDisponibilidad,
  validarFechaConsulta,
  validarPedidoReprogramacion,
} from '../../../src/adapters/http/validadores.js';

describe('validarConsultaDisponibilidad', () => {
  test('consulta válida con y sin profesional', () => {
    expect(validarConsultaDisponibilidad({ prestacionId: 'pr1', fecha: '2026-11-23' })).toEqual({
      ok: true,
      valor: { prestacionId: 'pr1', fecha: '2026-11-23' },
    });
    expect(validarConsultaDisponibilidad({ prestacionId: 'pr1', fecha: '2026-11-23', profesionalId: 'p1' })).toEqual({
      ok: true,
      valor: { prestacionId: 'pr1', fecha: '2026-11-23', profesionalId: 'p1' },
    });
  });

  test('informa prestacionId y fecha inválidos en ese orden', () => {
    expect(validarConsultaDisponibilidad({ fecha: '2026-02-30' })).toEqual({ ok: false, campos: ['prestacionId', 'fecha'] });
  });

  test('triangulación: tipos raros, vacíos y profesionalId vacío', () => {
    expect(validarConsultaDisponibilidad({ prestacionId: ['a', 'b'], fecha: '' })).toEqual({
      ok: false,
      campos: ['prestacionId', 'fecha'],
    });
    expect(validarConsultaDisponibilidad({ prestacionId: 'pr1', fecha: '2026-11-23', profesionalId: '' })).toEqual({
      ok: false,
      campos: ['profesionalId'],
    });
    expect(validarConsultaDisponibilidad(undefined)).toEqual({ ok: false, campos: ['prestacionId', 'fecha'] });
  });
});

describe('query de Fastify', () => {
  test('la query con prototipo propio (no objeto plano) se lee por clave', () => {
    const query = Object.assign(Object.create(Object.create(null)) as object, { prestacionId: 'pr1', fecha: '2026-11-23' });
    expect(validarConsultaDisponibilidad(query)).toEqual({ ok: true, valor: { prestacionId: 'pr1', fecha: '2026-11-23' } });
  });
});

describe('validarFechaConsulta', () => {
  test('acepta una fecha real y rechaza el resto', () => {
    expect(validarFechaConsulta({ fecha: '2026-11-24' })).toEqual({ ok: true, valor: { fecha: '2026-11-24' } });
    expect(validarFechaConsulta({ fecha: '2026-13-01' })).toEqual({ ok: false, campos: ['fecha'] });
    expect(validarFechaConsulta({})).toEqual({ ok: false, campos: ['fecha'] });
  });
});

describe('validarPedidoReprogramacion', () => {
  test('acepta solo inicio con zona', () => {
    const r = validarPedidoReprogramacion({ inicio: '2026-11-24T09:00:00-03:00' });
    expect(r).toEqual({ ok: true, valor: { inicio: new Date('2026-11-24T09:00:00-03:00') } });
  });

  test('rechaza claves no admitidas, ordenadas, junto con las inválidas conocidas', () => {
    expect(
      validarPedidoReprogramacion({ inicio: '2026-11-24T09:00:00-03:00', sillonId: 's2', profesionalId: 'p2' }),
    ).toEqual({ ok: false, campos: ['profesionalId', 'sillonId'] });
    expect(validarPedidoReprogramacion({ inicio: 'mañana', prestacionId: 'pr1' })).toEqual({
      ok: false,
      campos: ['inicio', 'prestacionId'],
    });
  });

  test('no es un objeto: pedido', () => {
    for (const malo of [undefined, null, [], 'x', 3]) {
      expect(validarPedidoReprogramacion(malo)).toEqual({ ok: false, campos: ['pedido'] });
    }
  });

  test('inicio sin zona o inexistente es inválido', () => {
    expect(validarPedidoReprogramacion({ inicio: '2026-11-24T09:00:00' })).toEqual({ ok: false, campos: ['inicio'] });
    expect(validarPedidoReprogramacion({ inicio: '2026-02-30T09:00:00-03:00' })).toEqual({ ok: false, campos: ['inicio'] });
  });
});

describe('esTokenConForma', () => {
  test('solo base64url de 43 caracteres', () => {
    expect(esTokenConForma('A'.repeat(43))).toBe(true);
    expect(esTokenConForma('a-_9'.repeat(10) + 'abc')).toBe(true);
    for (const malo of ['', 'corto', 'A'.repeat(44), 'A'.repeat(42) + '+', 'A'.repeat(42) + '/', 'A'.repeat(42) + ' ']) {
      expect(esTokenConForma(malo)).toBe(false);
    }
  });
});
