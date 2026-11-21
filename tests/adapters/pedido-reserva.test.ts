import { describe, expect, test } from 'vitest';
import { validarPedidoReserva } from '../../src/adapters/http/pedido-reserva.js';
import { local, LUNES } from '../fixtures/seed.js';

function pedidoBase(cambios: Record<string, unknown> = {}, paciente: Record<string, unknown> = {}): unknown {
  return {
    prestacionId: 'pr2',
    inicio: '2026-11-23T09:00:00-03:00',
    paciente: {
      dni: '00000004',
      nombre: 'Paciente',
      apellido: 'Ficticio 4',
      telefono: '+54 9 11 0000-0004',
      email: 'paciente4@ejemplo.test',
      consentimientoContacto: true,
      ...paciente,
    },
    ...cambios,
  };
}

function campos(cuerpo: unknown): readonly string[] | 'ok' {
  const r = validarPedidoReserva(cuerpo);
  return r.ok ? 'ok' : r.campos;
}

describe('validarPedidoReserva: pedido válido', () => {
  test('devuelve el input tipado con inicio como Date y el paciente normalizado', () => {
    const r = validarPedidoReserva(pedidoBase({}, { dni: '00.000.004' }));
    expect(r).toEqual({
      ok: true,
      valor: {
        prestacionId: 'pr2',
        inicio: local(LUNES, '09:00'),
        paciente: {
          dni: '00000004',
          nombre: 'Paciente',
          apellido: 'Ficticio 4',
          telefono: '5491100000004',
          email: 'paciente4@ejemplo.test',
          consentimientoContacto: true,
        },
      },
    });
  });

  test('profesionalId opcional: si viene se conserva y si no, la clave no existe', () => {
    const con = validarPedidoReserva(pedidoBase({ profesionalId: 'p2' }));
    const sin = validarPedidoReserva(pedidoBase());
    expect(con.ok && con.valor.profesionalId).toBe('p2');
    expect(sin.ok && 'profesionalId' in sin.valor).toBe(false);
  });

  test('el e-mail ausente es válido y no aparece en el paciente', () => {
    const cuerpo = pedidoBase();
    delete (cuerpo as { paciente: Record<string, unknown> }).paciente['email'];
    const r = validarPedidoReserva(cuerpo);
    expect(r.ok && 'email' in r.valor.paciente).toBe(false);
  });
});

describe('validarPedidoReserva: forma del pedido', () => {
  test.each([[null], [undefined], ['texto'], [42], [[]], [true]])(
    'el pedido %j no es un objeto: campos [pedido]',
    (cuerpo) => {
      expect(campos(cuerpo)).toEqual(['pedido']);
    },
  );

  test('los campos obligatorios ausentes se informan', () => {
    expect(campos({})).toEqual(['prestacionId', 'inicio', 'paciente']);
  });

  test('paciente que no es un objeto se informa como paciente', () => {
    expect(campos(pedidoBase({ paciente: 'Carla' }))).toEqual(['paciente']);
    expect(campos(pedidoBase({ paciente: null }))).toEqual(['paciente']);
  });

  test('prestacionId vacío o no string es inválido', () => {
    expect(campos(pedidoBase({ prestacionId: '' }))).toEqual(['prestacionId']);
    expect(campos(pedidoBase({ prestacionId: 7 }))).toEqual(['prestacionId']);
  });

  test('profesionalId vacío, null o no string es inválido', () => {
    expect(campos(pedidoBase({ profesionalId: '' }))).toEqual(['profesionalId']);
    expect(campos(pedidoBase({ profesionalId: null }))).toEqual(['profesionalId']);
    expect(campos(pedidoBase({ profesionalId: 3 }))).toEqual(['profesionalId']);
  });

  test('los campos del paciente con tipo equivocado se informan con su ruta', () => {
    expect(campos(pedidoBase({}, { dni: 4, nombre: null, consentimientoContacto: 'true' }))).toEqual([
      'paciente.dni',
      'paciente.nombre',
      'paciente.consentimientoContacto',
    ]);
    expect(campos(pedidoBase({}, { email: 5 }))).toEqual(['paciente.email']);
  });

  test('un campo obligatorio del paciente ausente se informa', () => {
    const cuerpo = pedidoBase();
    delete (cuerpo as { paciente: Record<string, unknown> }).paciente['consentimientoContacto'];
    delete (cuerpo as { paciente: Record<string, unknown> }).paciente['telefono'];
    expect(campos(cuerpo)).toEqual(['paciente.telefono', 'paciente.consentimientoContacto']);
  });

  test('las reglas de formato del paciente (D3) se aplican en la frontera', () => {
    expect(campos(pedidoBase({}, { dni: '123456', telefono: '12345' }))).toEqual([
      'paciente.dni',
      'paciente.telefono',
    ]);
  });
});

describe('validarPedidoReserva: inicio', () => {
  test.each([
    '2026-11-23T09:00:00-03:00',
    '2026-11-23T12:00:00Z',
    '2026-11-23T09:00-03:00',
    '2026-11-23T09:00:00.500+00:00',
  ])('%j con zona es válido', (inicio) => {
    expect(campos(pedidoBase({ inicio }))).toBe('ok');
  });

  test.each([
    '2026-11-23T09:00:00',
    'lunes 9 hs',
    '',
    '2026-11-23',
    '2026-02-30T09:00:00-03:00',
    '2026-13-01T09:00:00-03:00',
    '2026-11-23T24:00:00-03:00',
    '2026-11-23T09:60:00-03:00',
    '2026-11-23T09:00:00+24:00',
  ])('%j es inválido', (inicio) => {
    expect(campos(pedidoBase({ inicio }))).toEqual(['inicio']);
  });

  test('un inicio que no es string es inválido', () => {
    expect(campos(pedidoBase({ inicio: 1795000000000 }))).toEqual(['inicio']);
    expect(campos(pedidoBase({ inicio: local(LUNES, '09:00') }))).toEqual(['inicio']);
  });
});

describe('validarPedidoReserva: claves desconocidas', () => {
  test('duracionMinutos, sillonId, forzar y rol se rechazan en orden alfabético', () => {
    expect(
      campos(pedidoBase({ duracionMinutos: 60, sillonId: 's2', forzar: true, rol: 'administrador' })),
    ).toEqual(['duracionMinutos', 'forzar', 'rol', 'sillonId']);
  });

  test('una clave desconocida del paciente se informa con su ruta', () => {
    expect(campos(pedidoBase({}, { id: 'pa1' }))).toEqual(['paciente.id']);
  });

  test('los conocidos van primero y luego los desconocidos de ambos niveles, alfabéticos', () => {
    expect(
      campos(pedidoBase({ actor: 'x', prestacionId: '' }, { id: 'pa1', dni: '1' })),
    ).toEqual(['prestacionId', 'paciente.dni', 'actor', 'paciente.id']);
  });

  test('forzar: false también se rechaza (la sola clave es inválida)', () => {
    expect(campos(pedidoBase({ forzar: false }))).toEqual(['forzar']);
  });

  test('un pedido con clave desconocida no devuelve valor', () => {
    expect(validarPedidoReserva(pedidoBase({ sillonId: 's2' })).ok).toBe(false);
  });
});
