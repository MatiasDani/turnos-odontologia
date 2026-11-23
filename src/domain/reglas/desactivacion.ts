import type { Violacion } from '../errores.js';
import type { Turno } from '../turno.js';

/**
 * RN-27: un recurso no se desactiva con turnos `reservado` o `confirmado` cuyo `inicio` es igual o
 * posterior a `ahora`. Devuelve todos esos turnos ordenados por `inicio` y luego `id`, o `null`.
 * No usa `esActivo`: `atendido` ocupa agenda (DD-05) pero nunca impide desactivar.
 */
export function evaluarDesactivacion(turnos: readonly Turno[], ahora: Date): Violacion | null {
  const conflictos = turnos
    .filter(
      (t) =>
        (t.estado === 'reservado' || t.estado === 'confirmado') && t.inicio.getTime() >= ahora.getTime(),
    )
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return conflictos.length === 0 ? null : { codigo: 'RN-27', turnosEnConflicto: conflictos };
}
