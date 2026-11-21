import type { Hueco } from './hueco.js';

export interface OpcionDeHueco {
  readonly profesionalId: string;
  readonly sillonId: string;
}

/** Un horario único con todas las combinaciones profesional+sillón libres para él. */
export interface HuecoAgrupado {
  readonly inicio: Date;
  readonly fin: Date;
  readonly opciones: readonly OpcionDeHueco[];
}

/**
 * Agrupa por `inicio`+`fin` preservando el orden de entrada (de los grupos y de sus opciones).
 * C-10 toma `opciones[0]` para la reserva online.
 */
export function agruparPorHorario(huecos: readonly Hueco[]): HuecoAgrupado[] {
  const grupos = new Map<string, { inicio: Date; fin: Date; opciones: OpcionDeHueco[] }>();
  for (const { inicio, fin, profesionalId, sillonId } of huecos) {
    const clave = `${inicio.getTime()}|${fin.getTime()}`;
    const grupo = grupos.get(clave) ?? { inicio, fin, opciones: [] };
    grupo.opciones.push({ profesionalId, sillonId });
    grupos.set(clave, grupo);
  }
  return [...grupos.values()];
}
