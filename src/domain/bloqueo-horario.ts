/** Al menos uno de `profesionalId` / `sillonId`; cada campo bloquea su recurso por separado. */
export interface BloqueoHorario {
  readonly id: string;
  readonly profesionalId?: string;
  readonly sillonId?: string;
  readonly inicio: Date;
  readonly fin: Date;
  readonly motivo?: string;
}
