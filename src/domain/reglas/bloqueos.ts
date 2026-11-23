import type { BloqueoHorario } from '../bloqueo-horario.js';
import type { Violacion } from '../errores.js';
import { type Intervalo, seSolapa } from '../intervalo.js';
import { esActivo, type Turno } from '../turno.js';

export function validarDatosBloqueo(datos: {
  readonly profesionalId?: string | undefined;
  readonly sillonId?: string | undefined;
  readonly inicio: Date;
  readonly fin: Date;
}): void {
  const tieneProfesional = datos.profesionalId !== undefined && datos.profesionalId.trim().length > 0;
  const tieneSillon = datos.sillonId !== undefined && datos.sillonId.trim().length > 0;
  if (!tieneProfesional && !tieneSillon) {
    throw new Error('El bloqueo debe especificar profesionalId o sillonId');
  }
  if (datos.inicio.getTime() >= datos.fin.getTime()) {
    throw new Error('El inicio del bloqueo debe ser anterior al fin');
  }
}

/** DD-06 / RN-31: no se puede crear un bloqueo si hay turnos activos solapados. */
export function evaluarConflictosBloqueo(
  bloqueo: {
    readonly profesionalId?: string | undefined;
    readonly sillonId?: string | undefined;
    readonly inicio: Date;
    readonly fin: Date;
  },
  turnos: readonly Turno[],
): Violacion | null {
  const intervaloBloqueo = { inicio: bloqueo.inicio, fin: bloqueo.fin };
  const conflictos = turnos.filter((t) => {
    if (!esActivo(t.estado)) return false;
    const coincideRecurso =
      (bloqueo.profesionalId !== undefined && t.profesionalId === bloqueo.profesionalId) ||
      (bloqueo.sillonId !== undefined && t.sillonId === bloqueo.sillonId);
    if (!coincideRecurso) return false;
    return seSolapa(intervaloBloqueo, { inicio: t.inicio, fin: t.fin });
  });

  if (conflictos.length === 0) return null;

  const ordenados = [...conflictos].sort((a, b) => {
    const diff = a.inicio.getTime() - b.inicio.getTime();
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });

  return { codigo: 'RN-31', turnosEnConflicto: ordenados };
}

/** RN-07: bloqueos del profesional (primero) o del sillón que se solapan con el intervalo. */
export function validarBloqueos(
  intervalo: Intervalo,
  profesionalId: string,
  sillonId: string,
  bloqueos: readonly BloqueoHorario[],
): Violacion | null {
  const solapados = bloqueos.filter((b) => seSolapa(intervalo, { inicio: b.inicio, fin: b.fin }));

  const deProfesional = solapados.find((b) => b.profesionalId === profesionalId);
  if (deProfesional !== undefined) {
    return { codigo: 'RN-07', bloqueoEnConflicto: deProfesional, recursoBloqueado: 'profesional' };
  }
  const deSillon = solapados.find((b) => b.sillonId === sillonId);
  if (deSillon !== undefined) {
    return { codigo: 'RN-07', bloqueoEnConflicto: deSillon, recursoBloqueado: 'sillon' };
  }
  return null;
}
