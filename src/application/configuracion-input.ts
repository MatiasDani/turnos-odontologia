import type { Actor } from '../domain/actor.js';

/**
 * Contratos de entrada de la configuración de recursos (C-05, DD-28). Los cambios no admiten `id`,
 * `consultorioId`, `activo`/`activa` ni el `profesionalId` de un tramo: se cambian solo con
 * desactivar, reactivar o dando de alta de nuevo.
 */

export interface AltaProfesionalInput {
  readonly actor: Actor;
  readonly consultorioId: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly matricula?: string | undefined;
  readonly prestacionIds: readonly string[];
}

export interface CambiosProfesional {
  readonly nombre?: string | undefined;
  readonly apellido?: string | undefined;
  readonly matricula?: string | undefined;
  readonly prestacionIds?: readonly string[] | undefined;
}

export interface ModificarProfesionalInput {
  readonly actor: Actor;
  readonly id: string;
  readonly cambios: CambiosProfesional;
}

export interface AltaSillonInput {
  readonly actor: Actor;
  readonly consultorioId: string;
  readonly nombre: string;
}

export interface CambiosSillon {
  readonly nombre?: string | undefined;
}

export interface ModificarSillonInput {
  readonly actor: Actor;
  readonly id: string;
  readonly cambios: CambiosSillon;
}

export interface AltaPrestacionInput {
  readonly actor: Actor;
  readonly consultorioId: string;
  readonly nombre: string;
  readonly duracionMinutos: number;
}

export interface CambiosPrestacion {
  readonly nombre?: string | undefined;
  readonly duracionMinutos?: number | undefined;
}

export interface ModificarPrestacionInput {
  readonly actor: Actor;
  readonly id: string;
  readonly cambios: CambiosPrestacion;
}

export interface AgregarTramoInput {
  readonly actor: Actor;
  readonly consultorioId: string;
  /** Si se informa, el tramo es propio de ese profesional (RN-28); si no, del consultorio. */
  readonly profesionalId?: string | undefined;
  readonly diaSemana: number;
  readonly desde: string;
  readonly hasta: string;
}

export interface CambiosTramo {
  readonly diaSemana?: number | undefined;
  readonly desde?: string | undefined;
  readonly hasta?: string | undefined;
}

export interface ModificarTramoInput {
  readonly actor: Actor;
  readonly id: string;
  readonly cambios: CambiosTramo;
}

/** Desactivar, reactivar o eliminar un recurso por id. */
export interface PorIdInput {
  readonly actor: Actor;
  readonly id: string;
}
