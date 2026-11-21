/** Puerto para generar ids sin introducir aleatoriedad en el dominio. */
export interface GeneradorId {
  siguiente(): string;
}
