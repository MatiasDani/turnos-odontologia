import { cancelar, evaluarCancelacion } from '../domain/reglas/cancelacion.js';
import type { Turno } from '../domain/turno.js';
import type { CancelarTurnoInput } from './cancelar-turno-input.js';
import type { Recordatorios } from './puertos/recordatorios.js';
import type { Reloj } from './puertos/reloj.js';
import type { TurnoRepositorio } from './puertos/repositorios.js';
import { autorizar, autorizarSobre } from '../domain/permisos/autorizar.js';

export type { CancelarTurnoInput } from './cancelar-turno-input.js';

export interface CancelarTurnoDependencias {
  readonly turnos: TurnoRepositorio;
  readonly reloj: Reloj;
  readonly recordatorios: Recordatorios;
}

/**
 * Cancela un turno liberando el horario del profesional y del sillón (US-004, RN-09, DD-19).
 * El turno cancelado deja de ser activo, así que el alta y la disponibilidad ya no lo cuentan.
 */
export class CancelarTurno {
  constructor(private readonly deps: CancelarTurnoDependencias) {}

  async ejecutar(input: CancelarTurnoInput): Promise<Turno> {
    const { turnos, reloj, recordatorios } = this.deps;
    const { actor } = input;
    const { rol } = actor;
    // Control de acceso antes de leer nada (C-09, DD-33): el odontólogo no cancela.
    autorizar(actor, 'turno.cancelar');
    // Un único instante para RN-08 y para `canceladoEn`, leído antes de la sección crítica.
    const ahora = reloj.ahora();

    // Sección crítica (RN-12): las reglas se evalúan sobre el estado real del turno al modificarlo.
    // Un turno inexistente lo informa el repositorio con RecursoNoEncontradoError.
    const cancelado = await turnos.actualizarSi(input.turnoId, (actual) => {
      // Alcance "propio" sobre el estado real del turno, antes de RN-10 y RN-08 (C-09, DD-33).
      autorizarSobre(actor, 'turno.cancelar', { profesionalId: actual.profesionalId, turnoId: actual.id });
      const violacion = evaluarCancelacion(actual, rol, ahora);
      return violacion === null ? { ok: true, turno: cancelar(actual, rol, ahora) } : { ok: false, violacion };
    });

    // Fuera de la sección crítica: si falla, el error se propaga y la cancelación queda hecha.
    await recordatorios.cancelarPendientes(cancelado.id);
    return cancelado;
  }
}
