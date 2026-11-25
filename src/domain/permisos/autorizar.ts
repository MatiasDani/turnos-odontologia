import type { Actor } from '../actor.js';
import { AccesoDenegadoError } from '../errores.js';
import type { Accion } from './acciones.js';
import { MATRIZ } from './matriz.js';

/** Lo que identifica a un recurso para el alcance "propio". */
export interface RecursoAutorizable {
  readonly profesionalId?: string | undefined;
  readonly turnoId?: string | undefined;
}

/**
 * Control por rol, antes de leer datos (C-09, DD-33): rechaza si el rol nunca puede hacer la
 * acción. Una celda `propio` pasa; su alcance se verifica con `autorizarSobre`.
 */
export function autorizar(actor: Actor, accion: Accion): void {
  if (!permite(actor, accion)) throw new AccesoDenegadoError(actor.rol, accion);
}

/** `true` si el rol puede hacer la acción sobre algún recurso (celda `si` o `propio`). */
export function permite(actor: Actor, accion: Accion): boolean {
  return MATRIZ[accion][actor.rol] !== 'no';
}

/** `true` si el actor puede hacer la acción sobre este recurso. */
export function permiteSobre(actor: Actor, accion: Accion, recurso: RecursoAutorizable): boolean {
  const permiso = MATRIZ[accion][actor.rol];
  return permiso === 'si' || (permiso === 'propio' && esPropio(actor, recurso));
}

/**
 * Control sobre un recurso ya leído y antes de las reglas RN (C-09, DD-33). El mensaje del
 * rechazo nunca incluye datos del recurso (RN-D-02).
 */
export function autorizarSobre(actor: Actor, accion: Accion, recurso: RecursoAutorizable): void {
  if (!permiteSobre(actor, accion, recurso)) throw new AccesoDenegadoError(actor.rol, accion);
}

function esPropio(actor: Actor, recurso: RecursoAutorizable): boolean {
  switch (actor.rol) {
    case 'odontologo':
      return recurso.profesionalId !== undefined && recurso.profesionalId === actor.profesionalId;
    case 'paciente':
      return actor.turnoId !== undefined && recurso.turnoId === actor.turnoId;
    default:
      return false;
  }
}
