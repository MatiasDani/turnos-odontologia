/** Intervalo semiabierto [inicio, fin) (RN-05). Los instantes son `Date` UTC. */
export interface Intervalo {
  readonly inicio: Date;
  readonly fin: Date;
}

export function crearIntervalo(inicio: Date, fin: Date): Intervalo {
  if (!(fin.getTime() > inicio.getTime())) {
    throw new RangeError('Intervalo inválido: fin debe ser posterior a inicio');
  }
  return { inicio, fin };
}

/** a1 < b2 y b1 < a2: los contiguos no se solapan. */
export function seSolapa(a: Intervalo, b: Intervalo): boolean {
  return a.inicio.getTime() < b.fin.getTime() && b.inicio.getTime() < a.fin.getTime();
}
