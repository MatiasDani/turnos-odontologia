import type { Actor } from '../domain/actor.js';
import { evaluarAnticipacionPaciente } from '../domain/reglas/anticipacion.js';
import type { CancelarTurno } from './cancelar-turno.js';
import { ErrorGestionTurnoPublica } from './errores-gestion-turno-publica.js';
import type { Reloj } from './puertos/reloj.js';
import type { ResolverTurnoDesdeToken } from './resolver-turno-desde-token.js';
import { traducirErrorGestion } from './traducir-error-gestion.js';
import type { TurnoPublico } from './turno-publico.js';

export interface CancelarTurnoDesdeTokenDependencias {
  readonly resolver: Pick<ResolverTurnoDesdeToken, 'ejecutar'>;
  readonly reloj: Reloj;
  readonly cancelar: Pick<CancelarTurno, 'ejecutar'>;
}

export interface CancelarTurnoDesdeTokenInput {
  readonly token: string;
}

const ACTOR_PACIENTE: Actor = { rol: 'paciente' };

/**
 * Cancelación del propio turno (US-010, RN-08, RN-09). Comprueba la anticipación antes de delegar
 * en C-02 con actor paciente; la regla de 24 h no se duplica, se reutiliza la misma función pura.
 */
export class CancelarTurnoDesdeToken {
  constructor(private readonly deps: CancelarTurnoDesdeTokenDependencias) {}

  async ejecutar(input: CancelarTurnoDesdeTokenInput): Promise<TurnoPublico> {
    const { deps } = this;
    const { turno, publico } = await deps.resolver.ejecutar(input.token);
    if (evaluarAnticipacionPaciente(turno, 'paciente', deps.reloj.ahora()) !== null) {
      throw new ErrorGestionTurnoPublica('CONTACTAR_CONSULTORIO');
    }
    try {
      await deps.cancelar.ejecutar({ turnoId: turno.id, actor: ACTOR_PACIENTE });
    } catch (error) {
      traducirErrorGestion(error);
    }
    return publico;
  }
}
