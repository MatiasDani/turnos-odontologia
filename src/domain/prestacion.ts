export interface Prestacion {
  readonly id: string;
  readonly consultorioId: string;
  readonly nombre: string;
  /** Duración por defecto del turno (RN-06): entero > 0. */
  readonly duracionMinutos: number;
  readonly activa: boolean;
}
