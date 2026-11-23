// Cableado del canal wa.me (C-13) sobre el fixture de recordatorios (solo datos ficticios).
import { ListarRecordatoriosPendientesWaMe } from '../../src/application/listar-recordatorios-wa-me-pendientes.js';
import { MarcarRecordatorioEnviado } from '../../src/application/marcar-recordatorio-enviado.js';
import type { Recordatorio } from '../../src/domain/recordatorio.js';
import {
  crearSistemaRecordatorios,
  recordatoriosDe,
  type OpcionesSistemaRecordatorios,
  type SistemaRecordatorios,
} from './sistema-recordatorios.js';

export {
  agendarRecepcion,
  barrido,
  DOMINGO,
  EMAIL_PA1,
  pacientesRecordatorios,
  recordatoriosDe,
  reservarOnlinePa1,
} from './sistema-recordatorios.js';

export type OpcionesSistemaWaMe = OpcionesSistemaRecordatorios;

export interface SistemaWaMe extends SistemaRecordatorios {
  readonly recordatoriosConWaMe: NonNullable<SistemaRecordatorios['recordatoriosConWaMe']>;
  readonly listarPendientesWaMe: NonNullable<SistemaRecordatorios['listarPendientesWaMe']>;
  readonly marcarEnviado: NonNullable<SistemaRecordatorios['marcarEnviado']>;
}

/** Sistema con el decorador `wa.me` inyectado en alta, reserva y cancelación. */
export function crearSistemaWaMe(opciones: OpcionesSistemaWaMe = {}): SistemaWaMe {
  const sistema = crearSistemaRecordatorios({ ...opciones, conWaMe: true });
  if (
    sistema.recordatoriosConWaMe === undefined ||
    sistema.listarPendientesWaMe === undefined ||
    sistema.marcarEnviado === undefined
  ) {
    throw new Error('El fixture no cableó el canal wa.me');
  }
  return {
    ...sistema,
    recordatoriosConWaMe: sistema.recordatoriosConWaMe,
    listarPendientesWaMe: sistema.listarPendientesWaMe,
    marcarEnviado: sistema.marcarEnviado,
  };
}

/** Recordatorios `wa_me` de un turno, en el orden del repositorio. */
export async function waMeDe(sistema: SistemaWaMe, turnoId: string): Promise<readonly Recordatorio[]> {
  return (await recordatoriosDe(sistema, turnoId)).filter((r) => r.canal === 'wa_me');
}
