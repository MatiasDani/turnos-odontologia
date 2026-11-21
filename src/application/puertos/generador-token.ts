/** Puerto para generar tokens de gestión impredecibles (RN-21) sin aleatoriedad en el dominio. */
export interface GeneradorToken {
  generar(): string;
}
