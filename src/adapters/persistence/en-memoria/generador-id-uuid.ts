import { randomUUID } from 'node:crypto';
import type { GeneradorId } from '../../../application/puertos/generador-id.js';

export class GeneradorIdUuid implements GeneradorId {
  siguiente(): string {
    return randomUUID();
  }
}
