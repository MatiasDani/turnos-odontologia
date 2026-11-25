import { ConfiguracionInvalidaError } from '../domain/errores.js';
import { validarDatosUsuario } from '../domain/reglas/usuario.js';
import type { GeneradorId } from './puertos/generador-id.js';
import type { HasherClaves, UsuarioRepositorio } from './puertos/usuarios.js';

export interface CrearAdministradorInicialDependencias {
  readonly usuarios: UsuarioRepositorio;
  readonly hasher: HasherClaves;
  readonly ids: GeneradorId;
  readonly consultorioId: string;
}

/**
 * Primer arranque (C-09, DD-35): si el consultorio no tiene usuarios, crea un administrador
 * activo con los datos del entorno. Con usuarios existentes o sin datos, no hace nada.
 * Devuelve `true` si lo creó.
 */
export class CrearAdministradorInicial {
  constructor(private readonly deps: CrearAdministradorInicialDependencias) {}

  async ejecutar(datos: { readonly email: string; readonly clave: string } | undefined): Promise<boolean> {
    if (datos === undefined) return false;
    if ((await this.deps.usuarios.listarPorConsultorio(this.deps.consultorioId)).length > 0) return false;
    const validos = validarDatosUsuario({ email: datos.email, rol: 'administrador', clave: datos.clave });
    if (!validos.ok) throw new ConfiguracionInvalidaError(validos.campo, validos.motivo);
    await this.deps.usuarios.guardar({
      id: this.deps.ids.siguiente(),
      consultorioId: this.deps.consultorioId,
      email: validos.valor.email,
      hashClave: await this.deps.hasher.hashear(validos.valor.clave),
      rol: 'administrador',
      activo: true,
    });
    return true;
  }
}
