import type { Actor, Rol } from '../domain/actor.js';
import { ConfiguracionInvalidaError, RecursoNoEncontradoError } from '../domain/errores.js';
import { autorizar } from '../domain/permisos/autorizar.js';
import { validarClave, validarDatosUsuario } from '../domain/reglas/usuario.js';
import { aUsuarioPublico, type Usuario, type UsuarioPublico } from '../domain/usuario.js';
import type { GeneradorId } from './puertos/generador-id.js';
import type { ProfesionalRepositorio } from './puertos/repositorios.js';
import type { HasherClaves, UsuarioRepositorio } from './puertos/usuarios.js';

export interface GestionarUsuariosDependencias {
  readonly usuarios: UsuarioRepositorio;
  readonly profesionales: Pick<ProfesionalRepositorio, 'obtenerPorId'>;
  readonly hasher: HasherClaves;
  readonly ids: GeneradorId;
  /** MVP: un solo consultorio por instalación (`04_modelo_de_datos.md`). */
  readonly consultorioId: string;
}

export interface CrearUsuarioInput {
  readonly actor: Actor;
  readonly email: string;
  readonly rol: Rol;
  readonly profesionalId?: string | undefined;
  readonly clave: string;
}

export interface UsuarioObjetivoInput {
  readonly actor: Actor;
  readonly usuarioId: string;
}

export interface RestablecerClaveInput extends UsuarioObjetivoInput {
  readonly clave: string;
}

/**
 * Gestión de usuarios internos por el administrador (C-09, DD-35). Orden de rechazo: rol →
 * datos (rol, profesionalId, email, clave) → referencias → e-mail repetido. La clave nunca se
 * guarda ni aparece en un error: solo su hash scrypt (RN-D-03, DD-36).
 */
export class GestionarUsuarios {
  constructor(private readonly deps: GestionarUsuariosDependencias) {}

  /** Alta de usuario (RN-32 para la clave). */
  async crear(input: CrearUsuarioInput): Promise<UsuarioPublico> {
    autorizar(input.actor, 'usuario.gestionar');
    const datos = validarDatosUsuario(input);
    if (!datos.ok) throw new ConfiguracionInvalidaError(datos.campo, datos.motivo);
    const { email, rol, profesionalId } = datos.valor;
    if (profesionalId !== undefined && (await this.deps.profesionales.obtenerPorId(profesionalId)) === undefined) {
      throw new RecursoNoEncontradoError('profesional', profesionalId);
    }
    if ((await this.deps.usuarios.obtenerPorEmail(email)) !== undefined) {
      throw new ConfiguracionInvalidaError('email', 'ya existe un usuario con ese e-mail');
    }
    const usuario: Usuario = {
      id: this.deps.ids.siguiente(),
      consultorioId: this.deps.consultorioId,
      email,
      hashClave: await this.deps.hasher.hashear(datos.valor.clave),
      rol,
      ...(profesionalId === undefined ? {} : { profesionalId }),
      activo: true,
    };
    await this.deps.usuarios.guardar(usuario);
    return aUsuarioPublico(usuario);
  }

  /** Baja lógica; nunca deja el consultorio sin un administrador activo. */
  async desactivar(input: UsuarioObjetivoInput): Promise<UsuarioPublico> {
    const usuario = await this.objetivo(input);
    if (usuario.rol === 'administrador' && usuario.activo) {
      const administradoresActivos = (await this.deps.usuarios.listarPorConsultorio(usuario.consultorioId)).filter(
        (u) => u.rol === 'administrador' && u.activo,
      );
      if (administradoresActivos.length <= 1) {
        throw new ConfiguracionInvalidaError('usuarioId', 'es el último administrador activo');
      }
    }
    return this.guardar({ ...usuario, activo: false });
  }

  async reactivar(input: UsuarioObjetivoInput): Promise<UsuarioPublico> {
    const usuario = await this.objetivo(input);
    return this.guardar({ ...usuario, activo: true });
  }

  /** Asigna una clave nueva (RN-32); la anterior deja de servir. */
  async restablecerClave(input: RestablecerClaveInput): Promise<UsuarioPublico> {
    autorizar(input.actor, 'usuario.gestionar');
    const clave = validarClave(input.clave);
    if (!clave.ok) throw new ConfiguracionInvalidaError(clave.campo, clave.motivo);
    const usuario = await this.objetivo(input);
    return this.guardar({ ...usuario, hashClave: await this.deps.hasher.hashear(clave.valor) });
  }

  private async objetivo(input: UsuarioObjetivoInput): Promise<Usuario> {
    autorizar(input.actor, 'usuario.gestionar');
    const usuario = await this.deps.usuarios.obtenerPorId(input.usuarioId);
    if (usuario === undefined) throw new RecursoNoEncontradoError('usuario', input.usuarioId);
    return usuario;
  }

  private async guardar(usuario: Usuario): Promise<UsuarioPublico> {
    await this.deps.usuarios.guardar(usuario);
    return aUsuarioPublico(usuario);
  }
}
