import type { Recordatorio } from '../domain/recordatorio.js';
import type { RecordatorioRepositorio } from './puertos/repositorios.js';

export interface ListarRecordatoriosFallidosDependencias {
  readonly recordatorios: Pick<RecordatorioRepositorio, 'listarPorEstado'>;
}

/**
 * Aviso a recepción (Flujo 6, DD-21): recordatorios cuyo envío falló, con su turno, su
 * `programadoPara` y su motivo, para contactar al paciente por otro medio. Sin control de rol (C-09).
 */
export class ListarRecordatoriosFallidos {
  constructor(private readonly deps: ListarRecordatoriosFallidosDependencias) {}

  ejecutar(): Promise<readonly Recordatorio[]> {
    return this.deps.recordatorios.listarPorEstado('fallido');
  }
}
