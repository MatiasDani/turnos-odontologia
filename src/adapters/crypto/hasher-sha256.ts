import { createHash } from 'node:crypto';
import type { Hasher } from '../../application/puertos/hasher.js';

export class HasherSha256 implements Hasher {
  sha256(texto: string): string {
    return createHash('sha256').update(texto, 'utf8').digest('hex');
  }
}
