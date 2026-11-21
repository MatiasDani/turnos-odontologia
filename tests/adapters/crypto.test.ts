import { describe, expect, test } from 'vitest';
import { GeneradorTokenCrypto } from '../../src/adapters/crypto/generador-token-crypto.js';
import { HasherSha256 } from '../../src/adapters/crypto/hasher-sha256.js';

describe('GeneradorTokenCrypto', () => {
  test('genera 43 caracteres del alfabeto base64url (32 bytes)', () => {
    const token = new GeneradorTokenCrypto().generar();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  test('dos llamadas devuelven tokens distintos', () => {
    const generador = new GeneradorTokenCrypto();
    expect(generador.generar()).not.toBe(generador.generar());
  });

  test('cien tokens son todos distintos y todos de 43 caracteres', () => {
    const generador = new GeneradorTokenCrypto();
    const tokens = Array.from({ length: 100 }, () => generador.generar());
    expect(new Set(tokens).size).toBe(100);
    expect(tokens.every((t) => t.length === 43)).toBe(true);
  });
});

describe('HasherSha256', () => {
  test('vector conocido: SHA-256 hex de "abc"', () => {
    expect(new HasherSha256().sha256('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  test('vector conocido: SHA-256 hex de la cadena vacía', () => {
    expect(new HasherSha256().sha256('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  test('la misma entrada da el mismo hash y entradas distintas dan hashes distintos', () => {
    const hasher = new HasherSha256();
    expect(hasher.sha256('token-ficticio')).toBe(hasher.sha256('token-ficticio'));
    expect(hasher.sha256('token-ficticio')).not.toBe(hasher.sha256('token-ficticiO'));
  });

  test('el hash es hexadecimal en minúsculas de 64 caracteres', () => {
    expect(new HasherSha256().sha256('cualquier texto')).toMatch(/^[0-9a-f]{64}$/);
  });
});
