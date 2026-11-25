/** Mensaje único ante cualquier falla de login (DD-37): no revela si el e-mail existe. */
export const MENSAJE_CREDENCIALES_INVALIDAS = 'E-mail o clave incorrectos.';
export const MENSAJE_SESION_INVALIDA = 'Tu sesión no es válida o venció. Iniciá sesión de nuevo.';

/** E-mail inexistente, clave incorrecta o usuario inactivo: el mismo error (DD-37). */
export class CredencialesInvalidasError extends Error {
  readonly codigo = 'CREDENCIALES_INVALIDAS';

  constructor() {
    super(MENSAJE_CREDENCIALES_INVALIDAS);
    this.name = 'CredencialesInvalidasError';
  }
}

/** Token ausente, alterado, vencido o de un usuario inactivo o inexistente (DD-37, RN-33). */
export class SesionInvalidaError extends Error {
  readonly codigo = 'SESION_INVALIDA';

  constructor() {
    super(MENSAJE_SESION_INVALIDA);
    this.name = 'SesionInvalidaError';
  }
}
