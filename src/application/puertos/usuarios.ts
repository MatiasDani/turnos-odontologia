import type { Usuario } from '../../domain/usuario.js';

/** Hash adaptativo de claves con sal (RN-D-03, DD-36). */
export interface HasherClaves {
  hashear(clave: string): Promise<string>;
  /** `false` ante una clave distinta o un hash mal formado; nunca lanza con la clave en el error. */
  verificar(clave: string, hash: string): Promise<boolean>;
}

/** Usuarios internos (C-09, DD-35). */
export interface UsuarioRepositorio {
  obtenerPorId(id: string): Promise<Usuario | undefined>;
  /** Busca por e-mail ya normalizado (recortado y en minúsculas). */
  obtenerPorEmail(email: string): Promise<Usuario | undefined>;
  listarPorConsultorio(consultorioId: string): Promise<readonly Usuario[]>;
  /** Alta o reemplazo por `id`. */
  guardar(usuario: Usuario): Promise<void>;
}

export interface SesionEmitida {
  readonly token: string;
  readonly venceEn: Date;
}

/** Sesión firmada del personal (DD-37, RN-33). La hora siempre viene del `Reloj`. */
export interface EmisorSesion {
  emitir(usuarioId: string, ahora: Date): Promise<SesionEmitida>;
  /** El `usuarioId` de una sesión vigente, o `null` si el token no es válido o venció. */
  verificar(token: string, ahora: Date): Promise<string | null>;
}
