import type { UsuarioRepositorio } from '../../../application/puertos/usuarios.js';
import type { Usuario } from '../../../domain/usuario.js';

/** Usuarios internos en memoria (C-09): se pierden al reiniciar (DD-35). */
export class UsuarioRepositorioEnMemoria implements UsuarioRepositorio {
  private readonly usuarios: Usuario[];

  constructor(iniciales: readonly Usuario[] = []) {
    this.usuarios = [...iniciales];
  }

  obtenerPorId(id: string): Promise<Usuario | undefined> {
    return Promise.resolve(this.usuarios.find((u) => u.id === id));
  }

  obtenerPorEmail(email: string): Promise<Usuario | undefined> {
    return Promise.resolve(this.usuarios.find((u) => u.email === email));
  }

  listarPorConsultorio(consultorioId: string): Promise<readonly Usuario[]> {
    return Promise.resolve(this.usuarios.filter((u) => u.consultorioId === consultorioId));
  }

  guardar(usuario: Usuario): Promise<void> {
    const indice = this.usuarios.findIndex((u) => u.id === usuario.id);
    if (indice >= 0) this.usuarios[indice] = usuario;
    else this.usuarios.push(usuario);
    return Promise.resolve();
  }
}
