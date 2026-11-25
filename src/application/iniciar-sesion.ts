import { normalizarEmail } from '../domain/reglas/usuario.js';
import { aUsuarioPublico, type UsuarioPublico } from '../domain/usuario.js';
import { CredencialesInvalidasError } from './errores-autenticacion.js';
import type { Reloj } from './puertos/reloj.js';
import type { EmisorSesion, HasherClaves, UsuarioRepositorio } from './puertos/usuarios.js';

export interface IniciarSesionDependencias {
  readonly usuarios: Pick<UsuarioRepositorio, 'obtenerPorEmail'>;
  readonly hasher: HasherClaves;
  readonly emisor: Pick<EmisorSesion, 'emitir'>;
  readonly reloj: Reloj;
}

export interface IniciarSesionInput {
  readonly email: string;
  readonly clave: string;
}

export interface SesionIniciada {
  readonly token: string;
  readonly usuario: UsuarioPublico & { readonly venceEn: Date };
}

/** Clave de relleno: se verifica contra su hash cuando el e-mail no existe (design D8). */
const CLAVE_DE_RELLENO = 'relleno-para-igualar-el-tiempo-de-respuesta';

/**
 * Login del personal (C-09, DD-37). Con un e-mail inexistente igual se verifica un hash, para que
 * el tiempo de respuesta no revele qué e-mails existen; toda falla es `CredencialesInvalidasError`.
 */
export class IniciarSesion {
  private readonly hashDeRelleno: Promise<string>;

  constructor(private readonly deps: IniciarSesionDependencias) {
    this.hashDeRelleno = deps.hasher.hashear(CLAVE_DE_RELLENO);
  }

  async ejecutar(input: IniciarSesionInput): Promise<SesionIniciada> {
    const email = normalizarEmail(input.email);
    const usuario = email === null ? undefined : await this.deps.usuarios.obtenerPorEmail(email);
    const hash = usuario?.hashClave ?? (await this.hashDeRelleno);
    const claveCorrecta = await this.deps.hasher.verificar(input.clave, hash);
    if (usuario === undefined || !claveCorrecta || !usuario.activo) throw new CredencialesInvalidasError();
    const { token, venceEn } = await this.deps.emisor.emitir(usuario.id, this.deps.reloj.ahora());
    return { token, usuario: { ...aUsuarioPublico(usuario), venceEn } };
  }
}
