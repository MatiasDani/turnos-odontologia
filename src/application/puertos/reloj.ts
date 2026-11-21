/** Puerto del reloj (DD-16): el dominio y los casos de uso nunca leen la hora del sistema. */
export interface Reloj {
  ahora(): Date;
}
