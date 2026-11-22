import type { Recordatorios } from '../../application/puertos/recordatorios.js';

/** Adaptador sin efecto hasta que C-12 implemente los recordatorios reales (DD-19). */
export class RecordatoriosNoOp implements Recordatorios {
  cancelarPendientes(_turnoId: string): Promise<void> {
    return Promise.resolve();
  }
}
