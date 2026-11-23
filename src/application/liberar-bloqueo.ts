import type { Actor } from '../domain/actor.js';
import { RecursoNoEncontradoError } from '../domain/errores.js';
import { exigirPermisoLiberarBloqueo } from './control-acceso.js';
import type { BloqueoRepositorio } from './puertos/repositorios.js';

export interface LiberarBloqueoInput {
  readonly actor: Actor;
  readonly bloqueoId: string;
}

export interface LiberarBloqueoDependencias {
  readonly bloqueos: BloqueoRepositorio;
}

export class LiberarBloqueo {
  constructor(private readonly deps: LiberarBloqueoDependencias) {}

  async ejecutar(input: LiberarBloqueoInput): Promise<void> {
    const { actor, bloqueoId } = input;

    const bloqueo = await this.deps.bloqueos.obtenerPorId(bloqueoId);
    if (bloqueo === undefined) {
      throw new RecursoNoEncontradoError('bloqueo', bloqueoId);
    }

    exigirPermisoLiberarBloqueo(actor, bloqueo.profesionalId);

    await this.deps.bloqueos.eliminar(bloqueoId);
  }
}
