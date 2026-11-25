import { describe, expect, test } from 'vitest';
import { HasherClavesScrypt } from '../../src/adapters/crypto/hasher-claves-scrypt.js';

/** Costo bajo para que la suite sea rápida (design D6); el costo real se prueba una vez. */
const hasher = new HasherClavesScrypt({ costo: 2 ** 10 });
const CLAVE = 'clave-ficticia-01';

describe('HasherClavesScrypt (DD-36)', () => {
  test('verifica la clave correcta', async () => {
    const hash = await hasher.hashear(CLAVE);
    await expect(hasher.verificar(CLAVE, hash)).resolves.toBe(true);
  });

  test('rechaza una clave incorrecta', async () => {
    const hash = await hasher.hashear(CLAVE);
    await expect(hasher.verificar('clave-ficticia-02', hash)).resolves.toBe(false);
    await expect(hasher.verificar('', hash)).resolves.toBe(false);
  });

  test('la misma clave da hashes distintos (sal aleatoria)', async () => {
    const [a, b] = await Promise.all([hasher.hashear(CLAVE), hasher.hashear(CLAVE)]);
    expect(a).not.toBe(b);
  });

  test('el hash no contiene la clave y tiene formato autodescriptivo', async () => {
    const hash = await hasher.hashear(CLAVE);
    expect(hash).not.toContain(CLAVE);
    expect(hash).toMatch(/^scrypt\$1024\$8\$1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{86}$/);
  });

  test.each(['', 'texto', 'scrypt$1024$8$1$sal', 'bcrypt$1024$8$1$c2Fs$aGFzaA', 'scrypt$abc$8$1$c2Fs$aGFzaA', 'scrypt$1024$8$1$c2Fs$'])(
    'un hash mal formado (%j) devuelve false sin lanzar',
    async (hash) => {
      await expect(hasher.verificar(CLAVE, hash)).resolves.toBe(false);
    },
  );

  test('verifica con los parámetros guardados en el hash, no con los del hasher', async () => {
    const hash = await new HasherClavesScrypt({ costo: 2 ** 11 }).hashear(CLAVE);
    await expect(hasher.verificar(CLAVE, hash)).resolves.toBe(true);
  });

  test('con el costo por defecto usa N = 2^15', async () => {
    const hash = await new HasherClavesScrypt().hashear(CLAVE);
    expect(hash.startsWith('scrypt$32768$8$1$')).toBe(true);
    await expect(new HasherClavesScrypt().verificar(CLAVE, hash)).resolves.toBe(true);
  });
});
