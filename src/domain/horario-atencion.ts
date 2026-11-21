export interface HorarioAtencion {
  readonly id: string;
  readonly consultorioId: string;
  /** C-01 solo evalúa el horario del consultorio (sin profesionalId). */
  readonly profesionalId?: string;
  /** 0 = domingo .. 6 = sábado */
  readonly diaSemana: number;
  /** 'HH:mm' en hora local del consultorio. */
  readonly desde: string;
  readonly hasta: string;
}
