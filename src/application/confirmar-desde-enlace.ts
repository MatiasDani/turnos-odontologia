import { RecursoNoEncontradoError, ReglaNegocioError } from '../domain/errores.js';
import type { Actor } from '../domain/actor.js';
import type { Turno } from '../domain/turno.js';
import type { ConfirmarTurno } from './confirmar-turno.js';
import { ErrorEnlacePublico } from './errores-enlace-publico.js';
import type { TurnoRepositorio } from './puertos/repositorios.js';
import type { ServicioTokens } from './servicio-tokens.js';

export interface ConfirmarDesdeEnlaceDependencias {
  readonly tokens: Pick<ServicioTokens, 'resolver'>;
  readonly turnos: Pick<TurnoRepositorio, 'obtenerPorId'>;
  readonly confirmar: Pick<ConfirmarTurno, 'ejecutar'>;
}

export interface ConfirmarDesdeEnlaceInput {
  readonly token: string;
}

/** Respuesta pública: solo el estado y el horario, sin sillón ni datos del paciente. */
export interface ConfirmacionDesdeEnlace {
  readonly estado: 'confirmado';
  readonly inicio: Date;
  readonly fin: Date;
}

const ACTOR_PACIENTE: Actor = { rol: 'paciente' };

function respuesta(turno: Pick<Turno, 'inicio' | 'fin'>): ConfirmacionDesdeEnlace {
  return { estado: 'confirmado', inicio: turno.inicio, fin: turno.fin };
}

/**
 * Confirmación de asistencia desde el enlace del recordatorio (RN-14, DD-21). Reutiliza
 * `ConfirmarTurno` (C-04). Un turno ya `confirmado` es éxito sin cambios; todo otro rechazo es
 * `ErrorEnlacePublico`; un error inesperado se propaga sin enmascarar.
 */
export class ConfirmarDesdeEnlace {
  constructor(private readonly deps: ConfirmarDesdeEnlaceDependencias) {}

  async ejecutar(input: ConfirmarDesdeEnlaceInput): Promise<ConfirmacionDesdeEnlace> {
    const { deps } = this;
    const turnoId = await deps.tokens.resolver(input.token);
    if (turnoId === undefined) throw new ErrorEnlacePublico();
    const turno = await deps.turnos.obtenerPorId(turnoId);
    if (turno === undefined) throw new ErrorEnlacePublico();
    if (turno.estado === 'confirmado') return respuesta(turno);
    if (turno.estado !== 'reservado') throw new ErrorEnlacePublico();
    try {
      return respuesta(await deps.confirmar.ejecutar({ turnoId, actor: ACTOR_PACIENTE }));
    } catch (error) {
      // Otra confirmación ganó la carrera: el turno quedó confirmado, que es lo pedido.
      if (error instanceof ReglaNegocioError && error.codigo === 'RN-10' && error.estadoActual === 'confirmado') {
        return respuesta(turno);
      }
      if (error instanceof ReglaNegocioError || error instanceof RecursoNoEncontradoError) {
        throw new ErrorEnlacePublico();
      }
      throw error;
    }
  }
}
