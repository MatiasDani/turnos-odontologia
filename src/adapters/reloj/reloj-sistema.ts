import type { Reloj } from '../../application/puertos/reloj.js';

/** Único lugar del código donde se lee la hora del sistema (`new Date()` sin argumentos). */
export class RelojSistema implements Reloj {
  ahora(): Date {
    return new Date();
  }
}
