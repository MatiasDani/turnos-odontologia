/** Canal del recordatorio (RN-25, RN-26, DD-24). */
export type CanalRecordatorio = 'email' | 'wa_me';

/** Estados del recordatorio (RN-25, DD-21). */
export type EstadoRecordatorio = 'pendiente' | 'enviado' | 'fallido' | 'cancelado';

/**
 * Recordatorio de un turno (C-12, C-13). Nunca guarda el token de gestión, ni en claro ni su hash
 * (RN-21, RN-25), tampoco en el `enlaceWaMe` (RN-26).
 */
export interface Recordatorio {
  readonly id: string;
  readonly turnoId: string;
  readonly canal: CanalRecordatorio;
  /** `inicio` del turno menos la anticipación configurada. */
  readonly programadoPara: Date;
  readonly estado: EstadoRecordatorio;
  /** URL `https://wa.me/<telefono>?text=<mensaje>` del canal `wa_me` (RN-26). */
  readonly enlaceWaMe?: string;
  /** Instante del envío (solo en `enviado`). */
  readonly enviadoEn?: Date;
  /** Motivo del fallo sin datos personales ni token (solo en `fallido`). */
  readonly motivoFallo?: string;
}
