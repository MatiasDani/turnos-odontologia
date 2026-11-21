import type { HorarioAtencion } from '../horario-atencion.js';
import { deHoraLocal } from '../tiempo.js';

export interface GenerarIniciosEntrada {
  /** Rango semiabierto por el inicio: `desde <= inicio < hasta`. */
  readonly rango: { readonly desde: Date; readonly hasta: Date };
  readonly ahora: Date;
  /** Zona IANA del consultorio (DD-09). */
  readonly zona: string;
  readonly horarios: readonly HorarioAtencion[];
  readonly pasoMinutos: number;
}

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

/** Fecha local 'YYYY-MM-DD' del instante en la zona. */
function fechaLocal(instante: Date, zona: string): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instante);
  const v = (tipo: string): string => partes.find((p) => p.type === tipo)?.value ?? '';
  return `${v('year')}-${v('month')}-${v('day')}`;
}

/** Fechas locales 'YYYY-MM-DD' desde `primera` hasta `ultima` inclusive (aritmética de calendario, sin sumar 24 h a instantes). */
function fechasEntre(primera: string, ultima: string): string[] {
  const fechas: string[] = [];
  const [anio, mes, dia] = primera.split('-').map(Number) as [number, number, number];
  for (let i = 0; ; i++) {
    const fecha = new Date(Date.UTC(anio, mes - 1, dia + i)).toISOString().slice(0, 10);
    if (fecha > ultima) return fechas;
    fechas.push(fecha);
  }
}

/** Día de la semana (0 = domingo) de una fecha de calendario. */
function diaSemanaDe(fecha: string): number {
  return new Date(`${fecha}T00:00:00Z`).getUTCDay();
}

/**
 * Inicios candidatos ordenados: por cada día local del rango, la grilla `tramo.desde + k·paso` de cada
 * tramo del consultorio, acotada a `desde <= inicio < hasta` e `inicio >= ahora`. El ajuste del fin al
 * tramo no se resuelve acá: lo decide `validarAlta` (D1).
 */
export function generarInicios(entrada: GenerarIniciosEntrada): Date[] {
  const { rango, ahora, zona, horarios, pasoMinutos } = entrada;
  const inicios: Date[] = [];
  for (const fecha of fechasEntre(fechaLocal(rango.desde, zona), fechaLocal(rango.hasta, zona))) {
    const diaSemana = diaSemanaDe(fecha);
    const tramos = horarios
      .filter((h) => h.profesionalId === undefined && h.diaSemana === diaSemana)
      .map((h) => ({ desde: aMinutos(h.desde), hasta: aMinutos(h.hasta) }))
      .sort((a, b) => a.desde - b.desde);
    for (const tramo of tramos) {
      for (let minutos = tramo.desde; minutos < tramo.hasta; minutos += pasoMinutos) {
        const inicio = deHoraLocal(fecha, minutos, zona);
        if (inicio >= rango.desde && inicio < rango.hasta && inicio >= ahora) inicios.push(inicio);
      }
    }
  }
  return inicios;
}
