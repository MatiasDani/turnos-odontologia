import type { Actor } from '../domain/actor.js';
import { evaluarAnticipacionPaciente } from '../domain/reglas/anticipacion.js';
import type { Turno } from '../domain/turno.js';
import { ErrorGestionTurnoPublica } from './errores-gestion-turno-publica.js';
import type { Reloj } from './puertos/reloj.js';
import type { ReprogramarTurno } from './reprogramar-turno.js';
import type { ReprogramarDesdeTokenInput } from './reprogramar-desde-token-input.js';
import type { ResolverTurnoDesdeToken } from './resolver-turno-desde-token.js';
import { traducirErrorGestion } from './traducir-error-gestion.js';
import type { TurnoPublico } from './turno-publico.js';

export interface ReprogramarTurnoDesdeTokenDependencias {
  readonly resolver: Pick<ResolverTurnoDesdeToken, 'ejecutar' | 'publico'>;
  readonly reloj: Reloj;
  readonly reprogramar: Pick<ReprogramarTurno, 'ejecutar'>;
}

const ACTOR_PACIENTE: Actor = { rol: 'paciente' };

function esFechaValida(valor: Date): boolean {
  return valor instanceof Date && !Number.isNaN(valor.getTime());
}

/**
 * Reprogramación del propio turno (US-010, RN-08, RN-11, RN-12). Orden de rechazos: token →
 * anticipación → forma del `inicio` → reglas del nuevo horario en C-03. El token no se rota:
 * `resolver` ya calcula su vigencia con el `fin` actual del turno (DD-23, RN-21).
 */
export class ReprogramarTurnoDesdeToken {
  constructor(private readonly deps: ReprogramarTurnoDesdeTokenDependencias) {}

  async ejecutar(input: ReprogramarDesdeTokenInput): Promise<TurnoPublico> {
    const { deps } = this;
    const { turno } = await deps.resolver.ejecutar(input.token);
    if (evaluarAnticipacionPaciente(turno, 'paciente', deps.reloj.ahora()) !== null) {
      throw new ErrorGestionTurnoPublica('CONTACTAR_CONSULTORIO');
    }
    if (!esFechaValida(input.inicio)) throw new ErrorGestionTurnoPublica('DATOS_INVALIDOS');

    let movido: Turno;
    try {
      movido = await deps.reprogramar.ejecutar({
        turnoId: turno.id,
        actor: ACTOR_PACIENTE,
        inicio: input.inicio,
        ...(input.profesionalId === undefined ? {} : { profesionalId: input.profesionalId }),
        ...(input.prestacionId === undefined ? {} : { prestacionId: input.prestacionId }),
      });
    } catch (error) {
      traducirErrorGestion(error);
    }
    return deps.resolver.publico(movido);
  }
}
