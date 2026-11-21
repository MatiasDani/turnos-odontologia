/**
 * Registro de un token de gestión (RN-21, DD-15). Solo guarda el hash SHA-256: el token en claro
 * no existe en ningún registro.
 */
export interface TokenGestion {
  readonly turnoId: string;
  readonly hash: string;
  readonly creadoEn: Date;
  readonly invalidadoEn?: Date;
}
