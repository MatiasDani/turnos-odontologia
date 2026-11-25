import { describe, expect, test } from 'vitest';
import { normalizarEmail, validarClave, validarDatosUsuario } from '../../../src/domain/reglas/usuario.js';

describe('normalizarEmail', () => {
  test('recorta los extremos y pasa a minúsculas', () => {
    expect(normalizarEmail('  Recepcion2@Demo.TEST ')).toBe('recepcion2@demo.test');
  });

  test.each(['recepcion2', 'recepcion2@demo', '@demo.test', 'a b@demo.test', 'a@@demo.test', 'a@demo.', ''])(
    'rechaza %j',
    (valor) => {
      expect(normalizarEmail(valor)).toBeNull();
    },
  );

  test('acepta un e-mail con subdominio', () => {
    expect(normalizarEmail('odontologo.1@mail.demo.test')).toBe('odontologo.1@mail.demo.test');
  });
});

describe('validarClave (RN-32)', () => {
  test.each([10, 11, 127, 128])('%i caracteres es válida', (largo) => {
    expect(validarClave('a'.repeat(largo))).toEqual({ ok: true, valor: 'a'.repeat(largo) });
  });

  test.each([0, 9, 129])('%i caracteres es inválida en el campo clave', (largo) => {
    expect(validarClave('a'.repeat(largo))).toMatchObject({ ok: false, campo: 'clave' });
  });

  test('el motivo nunca contiene la clave', () => {
    const resultado = validarClave('abcdefghi');
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).not.toContain('abcdefghi');
  });

  test('no recorta espacios: los cuenta como caracteres', () => {
    expect(validarClave(' abcdefgh ')).toEqual({ ok: true, valor: ' abcdefgh ' });
  });
});

describe('validarDatosUsuario', () => {
  const recepcion = { email: 'recepcion2@demo.test', rol: 'recepcion', clave: 'clave-ficticia-02' } as const;

  test('recepción válida, con e-mail normalizado', () => {
    expect(validarDatosUsuario({ ...recepcion, email: ' Recepcion2@Demo.TEST ' })).toEqual({
      ok: true,
      valor: { email: 'recepcion2@demo.test', rol: 'recepcion', clave: 'clave-ficticia-02' },
    });
  });

  test('odontólogo válido con su profesional', () => {
    expect(validarDatosUsuario({ ...recepcion, rol: 'odontologo', profesionalId: 'p2' })).toEqual({
      ok: true,
      valor: { email: 'recepcion2@demo.test', rol: 'odontologo', profesionalId: 'p2', clave: 'clave-ficticia-02' },
    });
  });

  test('rol paciente inválido en el campo rol', () => {
    expect(validarDatosUsuario({ ...recepcion, rol: 'paciente' })).toMatchObject({ ok: false, campo: 'rol' });
  });

  test('odontólogo sin profesional inválido en profesionalId', () => {
    expect(validarDatosUsuario({ ...recepcion, rol: 'odontologo' })).toMatchObject({ ok: false, campo: 'profesionalId' });
  });

  test('recepción con profesional inválida en profesionalId', () => {
    expect(validarDatosUsuario({ ...recepcion, profesionalId: 'p1' })).toMatchObject({ ok: false, campo: 'profesionalId' });
  });

  test('administrador con profesional inválido en profesionalId', () => {
    expect(validarDatosUsuario({ ...recepcion, rol: 'administrador', profesionalId: 'p1' })).toMatchObject({
      ok: false,
      campo: 'profesionalId',
    });
  });

  test('e-mail inválido en el campo email', () => {
    expect(validarDatosUsuario({ ...recepcion, email: 'recepcion2' })).toMatchObject({ ok: false, campo: 'email' });
  });

  test('clave corta en el campo clave', () => {
    expect(validarDatosUsuario({ ...recepcion, clave: 'abcdefghi' })).toMatchObject({ ok: false, campo: 'clave' });
  });

  test('informa el primer campo inválido en el orden rol, profesionalId, email, clave', () => {
    expect(validarDatosUsuario({ email: 'x', rol: 'paciente', clave: 'abc' })).toMatchObject({ campo: 'rol' });
    expect(validarDatosUsuario({ email: 'x', rol: 'odontologo', clave: 'abc' })).toMatchObject({ campo: 'profesionalId' });
    expect(validarDatosUsuario({ email: 'x', rol: 'recepcion', clave: 'abc' })).toMatchObject({ campo: 'email' });
  });
});
