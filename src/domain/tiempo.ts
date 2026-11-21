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
