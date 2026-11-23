export interface HorarioAtencion {
  readonly id: string;
  readonly consultorioId: string;
  /**
   * Sin `profesionalId`: tramo del consultorio. Con `profesionalId`: tramo propio del profesional, que
   * prevalece por día de la semana sobre el del consultorio (RN-28, C-05).
   */
  readonly profesionalId?: string;
  /** 0 = domingo .. 6 = sábado */
  readonly diaSemana: number;
  /** 'HH:mm' en hora local del consultorio. */
  readonly desde: string;
  readonly hasta: string;
}
