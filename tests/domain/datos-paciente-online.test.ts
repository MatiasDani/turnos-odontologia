import { describe, expect, test } from 'vitest';
import {
  validarDatosPacienteOnline,
  type DatosPacienteOnline,
} from '../../src/domain/datos-paciente-online.js';

const base: DatosPacienteOnline = {
  dni: '00000004',
  nombre: 'Paciente',
  apellido: 'Ficticio 4',
  telefono: '+54 9 11 0000-0004',
  email: 'paciente4@ejemplo.test',
  consentimientoContacto: true,
};

function con(cambios: Partial<DatosPacienteOnline>): DatosPacienteOnline {
  return { ...base, ...cambios };
}

function camposInvalidos(datos: DatosPacienteOnline): readonly string[] | 'ok' {
  const r = validarDatosPacienteOnline(datos);
  return r.ok ? 'ok' : r.campos;
}

describe('validarDatosPacienteOnline: DNI', () => {
  test('un DNI de 8 dígitos es válido', () => {
    const r = validarDatosPacienteOnline(con({ dni: '12345678' }));
    expect(r.ok && r.datos.dni).toBe('12345678');
  });

  test('un DNI de 7 dígitos es válido', () => {
    const r = validarDatosPacienteOnline(con({ dni: '1234567' }));
    expect(r.ok && r.datos.dni).toBe('1234567');
  });

  test('los puntos se quitan: 00.000.004 queda como 00000004', () => {
    const r = validarDatosPacienteOnline(con({ dni: '00.000.004' }));
    expect(r.ok && r.datos.dni).toBe('00000004');
  });

  test.each(['123456', '123456789', '00A00004', '', '1234 567', '-1234567'])(
    'el DNI %j es inválido',
    (dni) => {
      expect(camposInvalidos(con({ dni }))).toEqual(['paciente.dni']);
    },
  );
});

describe('validarDatosPacienteOnline: nombre y apellido', () => {
  test('se recorta el nombre y el apellido', () => {
    const r = validarDatosPacienteOnline(con({ nombre: '  Paciente ', apellido: ' Ficticio 4  ' }));
    expect(r.ok && [r.datos.nombre, r.datos.apellido]).toEqual(['Paciente', 'Ficticio 4']);
  });

  test.each(['', '   '])('el nombre %j (vacío tras trim) es inválido', (nombre) => {
    expect(camposInvalidos(con({ nombre }))).toEqual(['paciente.nombre']);
  });

  test('el apellido vacío tras trim es inválido', () => {
    expect(camposInvalidos(con({ apellido: '  ' }))).toEqual(['paciente.apellido']);
  });

  test('80 caracteres es válido y 81 es inválido (nombre y apellido)', () => {
    expect(camposInvalidos(con({ nombre: 'a'.repeat(80), apellido: 'b'.repeat(80) }))).toBe('ok');
    expect(camposInvalidos(con({ nombre: 'a'.repeat(81) }))).toEqual(['paciente.nombre']);
    expect(camposInvalidos(con({ apellido: 'b'.repeat(81) }))).toEqual(['paciente.apellido']);
  });

  test('la longitud se mide tras el trim', () => {
    expect(camposInvalidos(con({ apellido: ` ${'b'.repeat(80)} ` }))).toBe('ok');
  });
});

describe('validarDatosPacienteOnline: teléfono', () => {
  test.each([
    ['+54 9 11 0000-0004', '5491100000004'],
    ['011 0000-0004', '01100000004'],
    ['(011) 0000.0004', '01100000004'],
    ['1100000004', '1100000004'],
    ['+5491100000004', '5491100000004'],
  ])('%j se normaliza a %j', (entrada, esperado) => {
    const r = validarDatosPacienteOnline(con({ telefono: entrada }));
    expect(r.ok && r.datos.telefono).toBe(esperado);
  });

  test('10 dígitos es válido y 13 es válido', () => {
    expect(camposInvalidos(con({ telefono: '1'.repeat(10) }))).toBe('ok');
    expect(camposInvalidos(con({ telefono: '1'.repeat(13) }))).toBe('ok');
  });

  test.each([
    '12345',
    '1'.repeat(9),
    '1'.repeat(14),
    '+1 555 000 0000',
    '11-ABCD-0004',
    '11+00000004',
    '',
    '+',
  ])('el teléfono %j es inválido', (telefono) => {
    expect(camposInvalidos(con({ telefono }))).toEqual(['paciente.telefono']);
  });
});

describe('validarDatosPacienteOnline: e-mail', () => {
  test('ausente es válido y el resultado no incluye e-mail', () => {
    const { email: _omitido, ...sinEmail } = base;
    const r = validarDatosPacienteOnline(sinEmail);
    expect(r.ok).toBe(true);
    expect(r.ok && 'email' in r.datos).toBe(false);
  });

  test('un e-mail válido se recorta', () => {
    const r = validarDatosPacienteOnline(con({ email: ' paciente4@ejemplo.test ' }));
    expect(r.ok && r.datos.email).toBe('paciente4@ejemplo.test');
  });

  test.each(['paciente4@ejemplo', '', '   ', 'paciente4', '@ejemplo.test', 'a b@ejemplo.test'])(
    'el e-mail %j es inválido',
    (email) => {
      expect(camposInvalidos(con({ email }))).toEqual(['paciente.email']);
    },
  );

  test('254 caracteres es válido y 255 es inválido', () => {
    const local = (n: number) => `${'a'.repeat(n - '@e.test'.length)}@e.test`;
    expect(camposInvalidos(con({ email: local(254) }))).toBe('ok');
    expect(camposInvalidos(con({ email: local(255) }))).toEqual(['paciente.email']);
  });
});

describe('validarDatosPacienteOnline: consentimiento', () => {
  test('true es válido', () => {
    expect(camposInvalidos(con({ consentimientoContacto: true }))).toBe('ok');
  });

  test('false es inválido', () => {
    expect(camposInvalidos(con({ consentimientoContacto: false }))).toEqual([
      'paciente.consentimientoContacto',
    ]);
  });

  test('ausente (undefined en tiempo de ejecución) es inválido', () => {
    const sinConsentimiento = { ...base, consentimientoContacto: undefined } as unknown as DatosPacienteOnline;
    expect(camposInvalidos(sinConsentimiento)).toEqual(['paciente.consentimientoContacto']);
  });
});

describe('validarDatosPacienteOnline: varios campos', () => {
  test('todos los inválidos se informan, en el orden dni, nombre, apellido, telefono, email, consentimiento', () => {
    const r = validarDatosPacienteOnline({
      dni: '1',
      nombre: ' ',
      apellido: ' ',
      telefono: '2',
      email: 'x',
      consentimientoContacto: false,
    });
    expect(r.ok ? [] : r.campos).toEqual([
      'paciente.dni',
      'paciente.nombre',
      'paciente.apellido',
      'paciente.telefono',
      'paciente.email',
      'paciente.consentimientoContacto',
    ]);
  });

  test('dni y teléfono inválidos juntos se informan en ese orden', () => {
    expect(camposInvalidos(con({ dni: '1', telefono: '2' }))).toEqual([
      'paciente.dni',
      'paciente.telefono',
    ]);
  });
});
