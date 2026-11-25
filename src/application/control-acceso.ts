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

/** Control de acceso para crear bloqueos de horario (C-06, KB 03). */
export function exigirPermisoBloqueo(actor: Actor, profesionalId?: string): void {
  if (actor.rol === 'paciente') {
    throw new AccesoDenegadoError(actor.rol, 'bloquear horarios');
  }
  if (actor.rol === 'odontologo') {
    if (profesionalId === undefined || actor.profesionalId !== profesionalId) {
      throw new AccesoDenegadoError(actor.rol, 'bloquear recursos ajenos');
    }
  }
}

/** Control de acceso para liberar bloqueos de horario (C-06, KB 03). */
export function exigirPermisoLiberarBloqueo(actor: Actor, profesionalIdDelBloqueo?: string): void {
  if (actor.rol === 'paciente') {
    throw new AccesoDenegadoError(actor.rol, 'liberar bloqueos');
  }
  if (actor.rol === 'odontologo') {
    if (profesionalIdDelBloqueo === undefined || actor.profesionalId !== profesionalIdDelBloqueo) {
      throw new AccesoDenegadoError(actor.rol, 'liberar bloqueos ajenos');
    }
  }
}
