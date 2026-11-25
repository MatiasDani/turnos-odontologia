import type { Actor } from '../domain/actor.js';
import { AccesoDenegadoError } from '../domain/errores.js';
import { permite, permiteSobre } from '../domain/permisos/autorizar.js';

/**
 * Control de acceso de la configuración (DD-28): solo el administrador puede cambiar recursos y
 * horarios. Delega en la matriz de C-09 (DD-33) y conserva el texto de la operación.
 */
export function exigirAdministrador(actor: Actor, operacion: string): void {
  if (!permite(actor, 'configuracion.modificar')) throw new AccesoDenegadoError(actor.rol, operacion);
}

/** Control de acceso para crear bloqueos de horario (C-06, KB 03), según la matriz de C-09. */
export function exigirPermisoBloqueo(actor: Actor, profesionalId?: string): void {
  if (!permite(actor, 'bloqueo.crear')) throw new AccesoDenegadoError(actor.rol, 'bloquear horarios');
  if (!permiteSobre(actor, 'bloqueo.crear', { profesionalId })) {
    throw new AccesoDenegadoError(actor.rol, 'bloquear recursos ajenos');
  }
}

/** Control de acceso para liberar bloqueos de horario (C-06, KB 03), según la matriz de C-09. */
export function exigirPermisoLiberarBloqueo(actor: Actor, profesionalIdDelBloqueo?: string): void {
  if (!permite(actor, 'bloqueo.liberar')) throw new AccesoDenegadoError(actor.rol, 'liberar bloqueos');
  if (!permiteSobre(actor, 'bloqueo.liberar', { profesionalId: profesionalIdDelBloqueo })) {
    throw new AccesoDenegadoError(actor.rol, 'liberar bloqueos ajenos');
  }
}
