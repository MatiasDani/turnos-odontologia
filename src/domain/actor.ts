export type Rol = 'administrador' | 'odontologo' | 'recepcion' | 'paciente';

export interface Actor {
  readonly rol: Rol;
}
