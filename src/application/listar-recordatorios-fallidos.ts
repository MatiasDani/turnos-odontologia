import type { Actor } from '../domain/actor.js';
import { autorizar } from '../domain/permisos/autorizar.js';
import type { Recordatorio } from '../domain/recordatorio.js';
import type { RecordatorioRepositorio } from './puertos/repositorios.js';

export interface ListarRecordatoriosFallidosDependencias {
  readonly recordatorios: Pick<RecordatorioRepositorio, 'listarPorEstado'>;
}

/**
 * Aviso a recepción (Flujo 6, DD-21): recordatorios cuyo envío falló, con su turno, su
 * `programadoPara` y su motivo, para contactar al paciente por otro medio. Lo listan recepción y
 * administrador (C-09, DD-33).
 */
export interface ListarRecordatoriosFallidosInput {
  readonly actor: Actor;
}

export class ListarRecordatoriosFallidos {
  constructor(private readonly deps: ListarRecordatoriosFallidosDependencias) {}

  async ejecutar(input: ListarRecordatoriosFallidosInput): Promise<readonly Recordatorio[]> {
    autorizar(input.actor, 'recordatorio.listar');
    return this.deps.recordatorios.listarPorEstado('fallido');
  }
}
