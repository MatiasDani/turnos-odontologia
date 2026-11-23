import { ErrorMarcarRecordatorio } from '../domain/errores-recordatorio.js';
import type { Recordatorio } from '../domain/recordatorio.js';
import { marcarEnviado } from '../domain/reglas/recordatorio-wa-me.js';
import type { Reloj } from './puertos/reloj.js';
import type { RecordatorioRepositorio } from './puertos/repositorios.js';

/** Entrada mínima: el id del recordatorio; el reloj se inyecta en el constructor (RN-08). */
export interface MarcarRecordatorioEnviadoInput {
  readonly recordatorioId: string;
}

export interface MarcarRecordatorioEnviadoDependencias {
  readonly recordatorios: Pick<RecordatorioRepositorio, 'obtenerPorId' | 'guardar'>;
  readonly reloj: Reloj;
}

/**
 * La recepción registra que ya envió el mensaje manualmente. No revalida el turno: el envío ocurrió
 * fuera del sistema. Idempotente sobre `enviado`, con error tipado para los demás estados (RN-26).
 */
export class MarcarRecordatorioEnviado {
  constructor(private readonly deps: MarcarRecordatorioEnviadoDependencias) {}

  async ejecutar(input: MarcarRecordatorioEnviadoInput): Promise<Recordatorio> {
    const recordatorio = await this.deps.recordatorios.obtenerPorId(input.recordatorioId);
    if (recordatorio === undefined) throw new ErrorMarcarRecordatorio('RECORDATORIO_NO_ENCONTRADO');
    if (recordatorio.canal !== 'wa_me') throw new ErrorMarcarRecordatorio('ESTADO_NO_ENVIABLE');
    const marcado = marcarEnviado(recordatorio, this.deps.reloj.ahora());
    if (marcado !== recordatorio) await this.deps.recordatorios.guardar(marcado);
    return marcado;
  }
}
