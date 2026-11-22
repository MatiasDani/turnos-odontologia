import type { MensajeEmail } from '../../domain/reglas/recordatorios.js';

export type { MensajeEmail } from '../../domain/reglas/recordatorios.js';

/** Envío de e-mails (DD-21). Rechaza si el envío falla. */
export interface Notificador {
  enviar(mensaje: MensajeEmail): Promise<void>;
}
