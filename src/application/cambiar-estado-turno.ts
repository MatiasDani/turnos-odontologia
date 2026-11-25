import type { Actor } from '../domain/actor.js';
import { autorizar, autorizarSobre } from '../domain/permisos/autorizar.js';
import { cambiarEstado, evaluarCambioDeEstado, type EstadoDestino } from '../domain/reglas/estados.js';
import type { Turno } from '../domain/turno.js';
import type { Reloj } from './puertos/reloj.js';
import type { TurnoRepositorio } from './puertos/repositorios.js';

export interface CambiarEstadoTurnoDependencias {
  readonly turnos: TurnoRepositorio;
  readonly reloj: Reloj;
}

/**
 * Aplica un cambio de estado de C-04 de forma atómica (RN-12, DD-20). El instante se lee una sola
 * vez, antes de la sección crítica, y las reglas se evalúan sobre el estado real del turno dentro
 * de `actualizarSi`. Un turno inexistente lo informa el repositorio con `RecursoNoEncontradoError`.
 * El control de acceso (C-09, DD-33) va primero: el rol antes de leer y el alcance "propio" sobre
 * el turno real, antes de RN-10 y RN-24. Confirmar es `turno.confirmar`; cerrar, `turno.cerrar`.
 */
export async function aplicarCambioDeEstado(
  deps: CambiarEstadoTurnoDependencias,
  entrada: { readonly turnoId: string; readonly actor: Actor },
  hacia: EstadoDestino,
): Promise<Turno> {
  const { actor, turnoId } = entrada;
  const accion = hacia === 'confirmado' ? 'turno.confirmar' : 'turno.cerrar';
  autorizar(actor, accion);
  const ahora = deps.reloj.ahora();
  return deps.turnos.actualizarSi(turnoId, (actual) => {
    autorizarSobre(actor, accion, { profesionalId: actual.profesionalId, turnoId: actual.id });
    const violacion = evaluarCambioDeEstado(actual, hacia, ahora);
    return violacion === null ? { ok: true, turno: cambiarEstado(actual, hacia) } : { ok: false, violacion };
  });
}
