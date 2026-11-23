import type { Actor } from '../domain/actor.js';
import { AccesoDenegadoError } from '../domain/errores.js';

/**
 * Control de acceso de la configuración (DD-28): solo el administrador puede cambiar recursos y
 * horarios. No es una regla de agenda ni lee nada; se evalúa antes de cualquier I/O. C-09 puede
 * ampliarlo con la matriz RBAC completa.
 */
export function exigirAdministrador(actor: Actor, operacion: string): void {
  if (actor.rol !== 'administrador') throw new AccesoDenegadoError(actor.rol, operacion);
}
