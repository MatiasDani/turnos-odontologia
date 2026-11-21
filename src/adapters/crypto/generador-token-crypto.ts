import { randomBytes } from 'node:crypto';
import type { GeneradorToken } from '../../application/puertos/generador-token.js';

/** 32 bytes aleatorios criptográficos en base64url (43 caracteres, 256 bits de entropía). */
export class GeneradorTokenCrypto implements GeneradorToken {
  generar(): string {
    return randomBytes(32).toString('base64url');
  }
}
