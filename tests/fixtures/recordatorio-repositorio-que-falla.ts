import { RecordatorioRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/recordatorio-repositorio.js';
import type { Recordatorio } from '../../src/domain/recordatorio.js';

/** Repositorio en memoria cuyo `guardar` puede configurarse para rechazar (falla de infraestructura). */
export class RecordatorioRepositorioQueFalla extends RecordatorioRepositorioEnMemoria {
  private error: Error | undefined;

  fallarAlGuardar(error: Error): void {
    this.error = error;
  }

  override guardar(recordatorio: Recordatorio): Promise<void> {
    return this.error === undefined ? super.guardar(recordatorio) : Promise.reject(this.error);
  }
}
