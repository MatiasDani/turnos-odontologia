import type { Turno } from '../domain/turno.js';
import { ErrorEnlacePublico } from './errores-enlace-publico.js';
import type { ProfesionalRepositorio, PrestacionRepositorio, TurnoRepositorio } from './puertos/repositorios.js';
import type { ServicioTokens } from './servicio-tokens.js';
import { aTurnoPublico, type TurnoPublico } from './turno-publico.js';

export interface ResolverTurnoDesdeTokenDependencias {
  readonly tokens: Pick<ServicioTokens, 'resolver'>;
  readonly turnos: Pick<TurnoRepositorio, 'obtenerPorId'>;
  readonly prestaciones: Pick<PrestacionRepositorio, 'obtenerPorId'>;
  readonly profesionales: Pick<ProfesionalRepositorio, 'obtenerPorId'>;
}

export interface TurnoResuelto {
  readonly turno: Turno;
  readonly publico: TurnoPublico;
}

/**
 * Resolución compartida de las tres operaciones públicas (DD-23). `resolver` no revela por qué un
 * token no sirve; aquí solo se traduce esa ausencia a `ENLACE_INVALIDO`, sin exponer el turno.
 */
export class ResolverTurnoDesdeToken {
  constructor(private readonly deps: ResolverTurnoDesdeTokenDependencias) {}

  async ejecutar(token: string): Promise<TurnoResuelto> {
    const turnoId = await this.deps.tokens.resolver(token);
    if (turnoId === undefined) throw new ErrorEnlacePublico();
    const turno = await this.deps.turnos.obtenerPorId(turnoId);
    if (turno === undefined) throw new ErrorEnlacePublico();
    return { turno, publico: await this.publico(turno) };
  }

  /** Arma el DTO de un turno ya resuelto (o recién movido), cargando solo los campos públicos. */
  async publico(turno: Turno): Promise<TurnoPublico> {
    const [prestacion, profesional] = await Promise.all([
      this.deps.prestaciones.obtenerPorId(turno.prestacionId),
      this.deps.profesionales.obtenerPorId(turno.profesionalId),
    ]);
    if (prestacion === undefined || profesional === undefined) throw new ErrorEnlacePublico();
    return aTurnoPublico(turno, prestacion, profesional);
  }
}
