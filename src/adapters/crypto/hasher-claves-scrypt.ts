import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import type { HasherClaves } from '../../application/puertos/usuarios.js';

const PREFIJO = 'scrypt';
const BYTES_SAL = 16;
const BYTES_CLAVE = 64;
const COSTO_POR_DEFECTO = 2 ** 15;
const BLOQUE = 8;
const PARALELISMO = 1;
/** Límites al verificar: evitan que un hash manipulado pida un costo desmedido. */
const COSTO_MINIMO = 2 ** 10;
const COSTO_MAXIMO = 2 ** 20;
const ENTERO = /^[1-9]\d*$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

export interface OpcionesHasherScrypt {
  /** N de scrypt (potencia de 2). Por defecto 2^15; los tests usan uno menor. */
  readonly costo?: number;
}

function derivar(clave: string, sal: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  // 128 * N * r bytes de memoria, con margen.
  const opciones: ScryptOptions = { N: n, r, p, maxmem: 256 * n * r };
  return new Promise((resolver, rechazar) => {
    scrypt(clave, sal, BYTES_CLAVE, opciones, (error, derivada) => {
      if (error) rechazar(error);
      else resolver(derivada);
    });
  });
}

function esPotenciaDeDos(n: number): boolean {
  return Number.isInteger(n) && n > 1 && (n & (n - 1)) === 0;
}

/**
 * Hash de claves con scrypt de `node:crypto` (DD-36): sal aleatoria de 16 bytes, clave derivada de
 * 64 bytes, formato `scrypt$N$r$p$sal$hash` (base64url) y comparación en tiempo constante.
 */
export class HasherClavesScrypt implements HasherClaves {
  private readonly costo: number;

  constructor(opciones: OpcionesHasherScrypt = {}) {
    const costo = opciones.costo ?? COSTO_POR_DEFECTO;
    if (!esPotenciaDeDos(costo) || costo < COSTO_MINIMO || costo > COSTO_MAXIMO) {
      throw new RangeError('El costo de scrypt debe ser una potencia de 2 entre 2^10 y 2^20');
    }
    this.costo = costo;
  }

  async hashear(clave: string): Promise<string> {
    const sal = randomBytes(BYTES_SAL);
    const derivada = await derivar(clave, sal, this.costo, BLOQUE, PARALELISMO);
    return [PREFIJO, this.costo, BLOQUE, PARALELISMO, sal.toString('base64url'), derivada.toString('base64url')].join('$');
  }

  async verificar(clave: string, hash: string): Promise<boolean> {
    const partes = hash.split('$');
    if (partes.length !== 6) return false;
    const [prefijo, nTexto, rTexto, pTexto, salTexto, hashTexto] = partes as [string, string, string, string, string, string];
    if (prefijo !== PREFIJO || ![nTexto, rTexto, pTexto].every((t) => ENTERO.test(t))) return false;
    if (!BASE64URL.test(salTexto) || !BASE64URL.test(hashTexto)) return false;
    const n = Number(nTexto);
    const r = Number(rTexto);
    const p = Number(pTexto);
    if (!esPotenciaDeDos(n) || n < COSTO_MINIMO || n > COSTO_MAXIMO || r > 16 || p > 4) return false;
    const esperado = Buffer.from(hashTexto, 'base64url');
    if (esperado.length !== BYTES_CLAVE) return false;
    try {
      const derivada = await derivar(clave, Buffer.from(salTexto, 'base64url'), n, r, p);
      return timingSafeEqual(derivada, esperado);
    } catch {
      return false;
    }
  }
}
