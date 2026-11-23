import type { RecordatorioRepositorio } from './puertos/repositorios.js';

/** Vista mínima que ve la recepción: sin datos del paciente, del turno ni tokens (DD-18, DD-24). */
export interface RecordatorioWaMePendiente {
  readonly id: string;
  readonly turnoId: string;
  readonly enlaceWaMe: string;
  readonly programadoPara: Date;
}

export interface ListarRecordatoriosPendientesWaMeDependencias {
  readonly recordatorios: Pick<RecordatorioRepositorio, 'listarPorEstado'>;
}

/** Todos los `wa_me` pendientes, ordenados por `programadoPara` (RN-26). */
export class ListarRecordatoriosPendientesWaMe {
  constructor(private readonly deps: ListarRecordatoriosPendientesWaMeDependencias) {}

  async ejecutar(): Promise<readonly RecordatorioWaMePendiente[]> {
    const pendientes = (await this.deps.recordatorios.listarPorEstado('pendiente'))
      .filter((recordatorio) => recordatorio.canal === 'wa_me')
      .sort((a, b) => a.programadoPara.getTime() - b.programadoPara.getTime());
    return pendientes.map((recordatorio) => ({
      id: recordatorio.id,
      turnoId: recordatorio.turnoId,
      enlaceWaMe: recordatorio.enlaceWaMe ?? '',
      programadoPara: recordatorio.programadoPara,
    }));
  }
}
