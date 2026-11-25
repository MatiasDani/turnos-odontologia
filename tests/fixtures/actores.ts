import type { Actor, Rol } from '../../src/domain/actor.js';

/**
 * Actores ficticios de los tests (C-09, DD-33). Los ids de usuario coinciden con los del fixture
 * de autenticación: `u-admin`, `u-rec` y `u-odo1` (odontólogo de `p1`).
 */
export const actores = {
  administrador: { rol: 'administrador', usuarioId: 'u-admin' },
  recepcion: { rol: 'recepcion', usuarioId: 'u-rec' },
  odontologo: (profesionalId = 'p1'): Actor => ({
    rol: 'odontologo',
    usuarioId: `u-odo-${profesionalId}`,
    profesionalId,
  }),
  paciente: (turnoId?: string): Actor => (turnoId === undefined ? { rol: 'paciente' } : { rol: 'paciente', turnoId }),
} as const satisfies Record<string, Actor | ((...args: never[]) => Actor)>;

/**
 * Actor de un rol para los tests que recorren roles. El odontólogo es el de `profesionalId`
 * (por defecto `p1`) y el paciente, sin turno salvo que se indique.
 */
export function actorDeRol(rol: Rol, opciones: { profesionalId?: string; turnoId?: string } = {}): Actor {
  switch (rol) {
    case 'administrador':
      return actores.administrador;
    case 'recepcion':
      return actores.recepcion;
    case 'odontologo':
      return actores.odontologo(opciones.profesionalId);
    case 'paciente':
      return actores.paciente(opciones.turnoId);
  }
}
