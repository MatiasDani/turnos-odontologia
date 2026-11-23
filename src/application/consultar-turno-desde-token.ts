import type { ResolverTurnoDesdeToken } from './resolver-turno-desde-token.js';
import type { TurnoPublico } from './turno-publico.js';

export interface ConsultarTurnoDesdeTokenDependencias {
  readonly resolver: Pick<ResolverTurnoDesdeToken, 'ejecutar'>;
}

export interface ConsultarTurnoDesdeTokenInput {
  readonly token: string;
}

/** Consulta del propio turno desde el enlace público (DD-23, DD-18). */
export class ConsultarTurnoDesdeToken {
  constructor(private readonly deps: ConsultarTurnoDesdeTokenDependencias) {}

  async ejecutar(input: ConsultarTurnoDesdeTokenInput): Promise<TurnoPublico> {
    const { publico } = await this.deps.resolver.ejecutar(input.token);
    return publico;
  }
}
