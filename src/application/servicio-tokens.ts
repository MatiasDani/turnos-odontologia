import { RecursoNoEncontradoError } from '../domain/errores.js';
import type { GeneradorToken } from './puertos/generador-token.js';
import type { Hasher } from './puertos/hasher.js';
import type { Reloj } from './puertos/reloj.js';
import type { TokenGestionRepositorio, TurnoRepositorio } from './puertos/repositorios.js';

/** Se intentó emitir un token para un turno que ya tiene uno vigente (usar `rotar`). */
export class TokenYaEmitidoError extends Error {
  readonly turnoId: string;

  constructor(turnoId: string) {
    super('El turno ya tiene un token de gestión vigente');
    this.name = 'TokenYaEmitidoError';
    this.turnoId = turnoId;
  }
}

export interface DependenciasServicioTokens {
  readonly generador: GeneradorToken;
  readonly hasher: Hasher;
  readonly tokens: TokenGestionRepositorio;
  readonly turnos: Pick<TurnoRepositorio, 'obtenerPorId'>;
  readonly reloj: Reloj;
}

/**
 * Tokens de gestión de turnos (DD-15, RN-21). Solo el hash SHA-256 se almacena; el token en claro
 * se devuelve una única vez a quien lo emite.
 */
export class ServicioTokens {
  constructor(private readonly deps: DependenciasServicioTokens) {}

  async emitir(turnoId: string): Promise<string> {
    const turno = await this.deps.turnos.obtenerPorId(turnoId);
    if (turno === undefined) throw new RecursoNoEncontradoError('turno', turnoId);
    if ((await this.deps.tokens.obtenerPorTurno(turnoId)) !== undefined) {
      throw new TokenYaEmitidoError(turnoId);
    }
    const token = this.deps.generador.generar();
    await this.deps.tokens.guardar({
      turnoId,
      hash: this.deps.hasher.sha256(token),
      creadoEn: this.deps.reloj.ahora(),
    });
    return token;
  }

  /**
   * Turno al que pertenece un token vigente, o `undefined` sin revelar el motivo: hash inexistente,
   * token invalidado, turno inexistente o cancelado, o `ahora >= fin` (vencimiento calculado al
   * resolver, sin TTL almacenado).
   */
  async resolver(tokenPlano: string): Promise<string | undefined> {
    if (tokenPlano === '') return undefined;
    const registro = await this.deps.tokens.obtenerPorHash(this.deps.hasher.sha256(tokenPlano));
    if (registro === undefined || registro.invalidadoEn !== undefined) return undefined;
    const turno = await this.deps.turnos.obtenerPorId(registro.turnoId);
    if (turno === undefined || turno.estado === 'cancelado') return undefined;
    if (this.deps.reloj.ahora().getTime() >= turno.fin.getTime()) return undefined;
    return turno.id;
  }

  /** Invalida el token vigente del turno (si hay) y emite uno nuevo; lo usará el recordatorio (C-12). */
  async rotar(turnoId: string): Promise<string> {
    await this.deps.tokens.invalidar(turnoId, this.deps.reloj.ahora());
    return this.emitir(turnoId);
  }
}
