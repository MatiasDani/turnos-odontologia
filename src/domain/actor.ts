export type Rol = 'administrador' | 'odontologo' | 'recepcion' | 'paciente';

/** Roles con usuario propio (C-09, DD-35): el paciente no tiene usuario. */
export type RolInterno = Exclude<Rol, 'paciente'>;

/**
 * Quién ejecuta un caso de uso (C-09, DD-33). El actor interno lo arma la sesión con los datos
 * guardados del usuario; el del paciente, las rutas públicas. El odontólogo siempre trae su
 * profesional, y el paciente trae el turno de su token cuando opera sobre uno.
 */
export type ActorInterno =
  | { readonly rol: 'administrador'; readonly usuarioId: string }
  | { readonly rol: 'recepcion'; readonly usuarioId: string }
  | { readonly rol: 'odontologo'; readonly usuarioId: string; readonly profesionalId: string };

export interface ActorPaciente {
  readonly rol: 'paciente';
  readonly turnoId?: string;
}

export type Actor = ActorInterno | ActorPaciente;
