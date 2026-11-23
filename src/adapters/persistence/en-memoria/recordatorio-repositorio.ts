import type { RecordatorioRepositorio } from '../../../application/puertos/repositorios.js';
import type { EstadoRecordatorio, Recordatorio } from '../../../domain/recordatorio.js';

export class RecordatorioRepositorioEnMemoria implements RecordatorioRepositorio {
  private readonly recordatorios: Recordatorio[];

  constructor(iniciales: readonly Recordatorio[] = []) {
    this.recordatorios = [...iniciales];
  }

  guardar(recordatorio: Recordatorio): Promise<void> {
    const indice = this.recordatorios.findIndex((r) => r.id === recordatorio.id);
    if (indice >= 0) this.recordatorios[indice] = recordatorio;
    else this.recordatorios.push(recordatorio);
    return Promise.resolve();
  }

  obtenerPorId(id: string): Promise<Recordatorio | undefined> {
    return Promise.resolve(this.recordatorios.find((r) => r.id === id));
  }

  listarPorTurno(turnoId: string): Promise<readonly Recordatorio[]> {
    return Promise.resolve(this.recordatorios.filter((r) => r.turnoId === turnoId));
  }

  listarPendientesHasta(hasta: Date): Promise<readonly Recordatorio[]> {
    const pendientes = this.recordatorios
      .filter((r) => r.estado === 'pendiente' && r.programadoPara.getTime() <= hasta.getTime())
      .sort((a, b) => a.programadoPara.getTime() - b.programadoPara.getTime());
    return Promise.resolve(pendientes);
  }

  listarPorEstado(estado: EstadoRecordatorio): Promise<readonly Recordatorio[]> {
    return Promise.resolve(this.recordatorios.filter((r) => r.estado === estado));
  }

  /** Solo para inspección en pruebas (no forma parte del puerto). */
  todos(): readonly Recordatorio[] {
    return [...this.recordatorios];
  }
}
