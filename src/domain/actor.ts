export type Rol = 'administrador' | 'odontologo' | 'recepcion' | 'paciente';

export interface Actor {
  readonly rol: Rol;
  /** Identificador del profesional cuando el actor es un odontólogo (C-06, C-08, C-09). */
  readonly profesionalId?: string;
}
