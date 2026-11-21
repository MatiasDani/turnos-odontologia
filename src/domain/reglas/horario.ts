import type { Violacion } from '../errores.js';
import type { HorarioAtencion } from '../horario-atencion.js';
import type { Intervalo } from '../intervalo.js';
import { aHoraLocal } from '../tiempo.js';

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

/**
 * RN-07 / RN-17: el turno empieza dentro de un tramo del consultorio (hora local) y cabe en él.
 * Si excede el tramo: RN-17 cuando no es el último del día, RN-07 cuando sí lo es.
 */
export function validarHorario(
  intervalo: Intervalo,
  zona: string,
  horarios: readonly HorarioAtencion[],
): Violacion | null {
  const { diaSemana, minutosDelDia } = aHoraLocal(intervalo.inicio, zona);
  const duracion = (intervalo.fin.getTime() - intervalo.inicio.getTime()) / 60_000;

  const tramos = horarios
    .filter((h) => h.profesionalId === undefined && h.diaSemana === diaSemana)
    .map((h) => ({ desde: aMinutos(h.desde), hasta: aMinutos(h.hasta) }))
    .sort((a, b) => a.desde - b.desde);

  const indice = tramos.findIndex((t) => t.desde <= minutosDelDia && minutosDelDia < t.hasta);
  const tramo = tramos[indice];
  if (tramo === undefined) return { codigo: 'RN-07' };

  if (minutosDelDia + duracion <= tramo.hasta) return null;
  return { codigo: indice === tramos.length - 1 ? 'RN-07' : 'RN-17' };
}
