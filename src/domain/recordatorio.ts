/** Canal del recordatorio. `wa_me` lo agrega C-13. */
export type CanalRecordatorio = 'email';

/** Estados del recordatorio (RN-25, DD-21). */
export type EstadoRecordatorio = 'pendiente' | 'enviado' | 'fallido' | 'cancelado';

/**
 * Recordatorio de un turno (C-12). Nunca guarda el token de gestión, ni en claro ni su hash
 * (RN-21, RN-25).
 */
export interface Recordatorio {
  readonly id: string;
  readonly turnoId: string;
  readonly canal: CanalRecordatorio;
  /** `inicio` del turno menos la anticipación configurada. */
  readonly programadoPara: Date;
  readonly estado: EstadoRecordatorio;
  /** Instante del envío (solo en `enviado`). */
  readonly enviadoEn?: Date;
  /** Motivo del fallo sin datos personales ni token (solo en `fallido`). */
  readonly motivoFallo?: string;
}
