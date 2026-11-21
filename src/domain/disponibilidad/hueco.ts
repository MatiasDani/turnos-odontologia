/** Combo ofrecido por la consulta de disponibilidad: un inicio con su profesional y sillón libres. */
export interface Hueco {
  readonly inicio: Date;
  readonly fin: Date;
  readonly profesionalId: string;
  readonly sillonId: string;
}
