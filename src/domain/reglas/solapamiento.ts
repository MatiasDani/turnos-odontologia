import type { Violacion } from '../errores.js';
import { type Intervalo, seSolapa } from '../intervalo.js';
import { esActivo, type Turno } from '../turno.js';

/** RN-02 (profesional) antes que RN-03 (sillón); solo cuentan turnos activos (DD-05). */
export function validarSolapamiento(
  intervalo: Intervalo,
  profesionalId: string,
  sillonId: string,
  turnos: readonly Turno[],
): Violacion | null {
  const ocupantes = turnos.filter(
    (t) => esActivo(t.estado) && seSolapa(intervalo, { inicio: t.inicio, fin: t.fin }),
  );

  const porProfesional = ocupantes.find((t) => t.profesionalId === profesionalId);
  if (porProfesional !== undefined) return { codigo: 'RN-02', turnoEnConflicto: porProfesional };

  const porSillon = ocupantes.find((t) => t.sillonId === sillonId);
  if (porSillon !== undefined) return { codigo: 'RN-03', turnoEnConflicto: porSillon };

  return null;
}
