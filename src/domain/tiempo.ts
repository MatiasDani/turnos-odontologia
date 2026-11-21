export interface HoraLocal {
  /** 0 = domingo .. 6 = sábado */
  readonly diaSemana: number;
  readonly minutosDelDia: number;
}

const DIAS: Readonly<Record<string, number>> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Convierte un instante UTC a día de semana y minutos del día en la zona IANA dada (DD-09). */
export function aHoraLocal(instante: Date, zona: string): HoraLocal {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    hourCycle: 'h23',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instante);
  const valor = (tipo: string): string => partes.find((p) => p.type === tipo)?.value ?? '';
  const diaSemana = DIAS[valor('weekday')];
  if (diaSemana === undefined) {
    throw new RangeError(`No se pudo resolver el día de la semana en la zona ${zona}`);
  }
  return { diaSemana, minutosDelDia: Number(valor('hour')) * 60 + Number(valor('minute')) };
}

/** Hora de pared de `instante` en `zona`, expresada como milisegundos "como si fuera UTC". */
function paredComoUtc(instante: Date, zona: string): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instante);
  const n = (tipo: string): number => Number(partes.find((p) => p.type === tipo)?.value ?? Number.NaN);
  return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'));
}

/**
 * Inverso de `aHoraLocal`: la fecha local 'YYYY-MM-DD' y los minutos del día en `zona` → instante UTC.
 * Estima el instante como si la zona fuera UTC y corrige con el desfase medido (sin dependencias, DD-09).
 */
export function deHoraLocal(fecha: string, minutos: number, zona: string): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number) as [number, number, number];
  const pared = Date.UTC(anio, mes - 1, dia, 0, minutos);
  let instante = pared - (paredComoUtc(new Date(pared), zona) - pared);
  // Segunda pasada: si el desfase cambió entre la estimación y el resultado (cambio de offset).
  instante = pared - (paredComoUtc(new Date(instante), zona) - instante);
  return new Date(instante);
}
