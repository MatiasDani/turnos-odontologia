/** Horizonte de la reserva online (RN-30): hoy a hoy + 30 días locales, ambos inclusive. */
export const HORIZONTE_DIAS = 30;

export interface DiasReservables {
  /** Primer día reservable ('AAAA-MM-DD' local del consultorio): hoy. */
  readonly desde: string;
  /** Último día reservable (inclusive): hoy + 30 días. */
  readonly hasta: string;
}

const FECHA_LOCAL = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Fecha local 'AAAA-MM-DD' del instante en la zona IANA dada (DD-09). */
export function fechaLocal(instante: Date, zona: string): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instante);
  const valor = (tipo: string): string => partes.find((p) => p.type === tipo)?.value ?? '';
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

/** Suma `dias` a una fecha 'AAAA-MM-DD' (calendario, sin zona horaria). */
export function sumarDias(fecha: string, dias: number): string {
  const m = FECHA_LOCAL.exec(fecha);
  if (m === null) throw new RangeError(`Fecha local inválida: ${fecha}`);
  const instante = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + dias));
  return instante.toISOString().slice(0, 10);
}

/** `true` si `fecha` es 'AAAA-MM-DD' con día de calendario real. */
export function esFechaLocalValida(fecha: string): boolean {
  const m = FECHA_LOCAL.exec(fecha);
  if (m === null) return false;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])] as [number, number, number];
  const calendario = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    calendario.getUTCFullYear() === anio && calendario.getUTCMonth() === mes - 1 && calendario.getUTCDate() === dia
  );
}

/** Rango de días reservables según el reloj y la zona del consultorio (RN-30). */
export function diasReservables(ahora: Date, zona: string): DiasReservables {
  const hoy = fechaLocal(ahora, zona);
  return { desde: hoy, hasta: sumarDias(hoy, HORIZONTE_DIAS) };
}

/** `true` si la fecha local está entre hoy y hoy + 30 días inclusive (RN-30). */
export function fechaEnHorizonte(fecha: string, ahora: Date, zona: string): boolean {
  const { desde, hasta } = diasReservables(ahora, zona);
  return fecha >= desde && fecha <= hasta;
}

/** `true` si el día local de `inicio` está dentro del horizonte (RN-30). */
export function dentroDelHorizonte(inicio: Date, ahora: Date, zona: string): boolean {
  return fechaEnHorizonte(fechaLocal(inicio, zona), ahora, zona);
}
