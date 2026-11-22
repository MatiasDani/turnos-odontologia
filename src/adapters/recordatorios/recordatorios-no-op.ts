import type { Recordatorios } from '../../application/puertos/recordatorios.js';

/** Adaptador sin efecto, para cableados que no envían recordatorios (DD-19, DD-21). */
export class RecordatoriosNoOp implements Recordatorios {
  cancelarPendientes(_turnoId: string): Promise<void> {
    return Promise.resolve();
  }

  programar(_turnoId: string): Promise<void> {
    return Promise.resolve();
  }
}
