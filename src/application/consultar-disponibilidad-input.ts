import type { Actor } from '../domain/actor.js';

/**
 * Contrato de entrada de la consulta de disponibilidad (D4). Sin campo de forzado (RN-04).
 * `ahora` es explícito: el caso de uso no lee el reloj.
 */
export interface ConsultarDisponibilidadInput {
  readonly actor: Actor;
  readonly prestacionId: string;
  /** Rango semiabierto por el inicio del hueco: `desde <= inicio < hasta`. */
  readonly rango: { readonly desde: Date; readonly hasta: Date };
  readonly ahora: Date;
  readonly duracionMinutos?: number | undefined;
  /** Paso entre inicios candidatos; por defecto 15. */
  readonly pasoMinutos?: number | undefined;
  readonly profesionalId?: string | undefined;
}
