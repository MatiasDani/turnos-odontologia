import type { Reloj } from '../../src/application/puertos/reloj.js';

/** Reloj de pruebas: devuelve el instante fijado y cambia solo con `fijar`. */
export class RelojFijo implements Reloj {
  private instante: Date;

  constructor(instante: Date) {
    this.instante = new Date(instante.getTime());
  }

  ahora(): Date {
    return new Date(this.instante.getTime());
  }

  fijar(instante: Date): void {
    this.instante = new Date(instante.getTime());
  }
}
