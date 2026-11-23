import type { Violacion } from '../errores.js';
import type { HorarioAtencion } from '../horario-atencion.js';
import type { Intervalo } from '../intervalo.js';
import { aHoraLocal } from '../tiempo.js';

export function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

export interface Tramo {
  readonly desde: number;
  readonly hasta: number;
}

/**
 * Horario efectivo del día (RN-28, DD-26): si el profesional tiene tramos propios ese día de la
 * semana rigen solo esos; si no, los del consultorio. Los tramos de otro profesional nunca aplican.
 * Minutos desde medianoche, ordenados por `desde`.
 */
export function tramosDelDia(
  horarios: readonly HorarioAtencion[],
  diaSemana: number,
  profesionalId?: string,
): Tramo[] {
  const delDia = horarios.filter((h) => h.diaSemana === diaSemana);
  const propios =
    profesionalId === undefined ? [] : delDia.filter((h) => h.profesionalId === profesionalId);
  const elegidos = propios.length > 0 ? propios : delDia.filter((h) => h.profesionalId === undefined);
  return elegidos
    .map((h) => ({ desde: aMinutos(h.desde), hasta: aMinutos(h.hasta) }))
    .sort((a, b) => a.desde - b.desde);
}

/**
 * RN-07 / RN-17: el turno empieza dentro de un tramo del consultorio (hora local) y cabe en él.
 * Si excede el tramo: RN-17 cuando no es el último del día, RN-07 cuando sí lo es. Con `profesionalId`
 * rige el horario efectivo del día de ese profesional (RN-28); sin él, el del consultorio.
 */
export function validarHorario(
  intervalo: Intervalo,
  zona: string,
  horarios: readonly HorarioAtencion[],
  profesionalId?: string,
): Violacion | null {
  const { diaSemana, minutosDelDia } = aHoraLocal(intervalo.inicio, zona);
  const duracion = (intervalo.fin.getTime() - intervalo.inicio.getTime()) / 60_000;

  const tramos = tramosDelDia(horarios, diaSemana, profesionalId);

  const indice = tramos.findIndex((t) => t.desde <= minutosDelDia && minutosDelDia < t.hasta);
  const tramo = tramos[indice];
  if (tramo === undefined) return { codigo: 'RN-07' };

  if (minutosDelDia + duracion <= tramo.hasta) return null;
  return { codigo: indice === tramos.length - 1 ? 'RN-07' : 'RN-17' };
}
