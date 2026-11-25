import type { RolInterno } from './actor.js';

/**
 * Usuario interno del consultorio (C-09, DD-35). El paciente no tiene usuario. `hashClave` tiene
 * formato `scrypt$N$r$p$sal$hash` (DD-36) y nunca sale de la capa de aplicación.
 */
export interface Usuario {
  readonly id: string;
  readonly consultorioId: string;
  readonly email: string;
  readonly hashClave: string;
  readonly rol: RolInterno;
  /** Solo el odontólogo, y siempre (DD-35). */
  readonly profesionalId?: string;
  readonly activo: boolean;
}

/** Lo que se puede mostrar de un usuario: todo menos el hash de la clave. */
export type UsuarioPublico = Omit<Usuario, 'hashClave'>;

export function aUsuarioPublico(usuario: Usuario): UsuarioPublico {
  const { hashClave: _hash, ...publico } = usuario;
  return publico;
}
