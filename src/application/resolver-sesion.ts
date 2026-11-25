import type { ActorInterno } from '../domain/actor.js';
import type { Usuario } from '../domain/usuario.js';
import { SesionInvalidaError } from './errores-autenticacion.js';
import type { Reloj } from './puertos/reloj.js';
import type { EmisorSesion, UsuarioRepositorio } from './puertos/usuarios.js';

export interface ResolverSesionDependencias {
  readonly usuarios: Pick<UsuarioRepositorio, 'obtenerPorId'>;
  readonly emisor: Pick<EmisorSesion, 'verificar'>;
  readonly reloj: Reloj;
}

export interface SesionResuelta {
  readonly actor: ActorInterno;
  readonly usuario: Usuario;
}

function aActor(usuario: Usuario): ActorInterno | null {
  switch (usuario.rol) {
    case 'administrador':
      return { rol: 'administrador', usuarioId: usuario.id };
    case 'recepcion':
      return { rol: 'recepcion', usuarioId: usuario.id };
    case 'odontologo':
      return usuario.profesionalId === undefined
        ? null
        : { rol: 'odontologo', usuarioId: usuario.id, profesionalId: usuario.profesionalId };
  }
}

/**
 * Cada pedido interno (C-09, DD-37, RN-33): el token solo identifica al usuario; rol y profesional
 * salen de los datos guardados ahora, así que desactivar a un usuario corta su sesión.
 */
export class ResolverSesion {
  constructor(private readonly deps: ResolverSesionDependencias) {}

  async ejecutar(token: string): Promise<SesionResuelta> {
    const usuarioId = await this.deps.emisor.verificar(token, this.deps.reloj.ahora());
    if (usuarioId === null) throw new SesionInvalidaError();
    const usuario = await this.deps.usuarios.obtenerPorId(usuarioId);
    if (usuario === undefined || !usuario.activo) throw new SesionInvalidaError();
    const actor = aActor(usuario);
    if (actor === null) throw new SesionInvalidaError();
    return { actor, usuario };
  }
}
