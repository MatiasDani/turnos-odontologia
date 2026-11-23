import { esFechaLocalValida, sumarDias } from '../domain/reglas/horizonte-reserva.js';
import { AgendaDiaria, type ConsultaAgendaDiaria } from './agenda-diaria.js';

export class AgendaSemanal {
  constructor(private readonly agendaDiaria: AgendaDiaria) {}

  async ejecutar(consulta: ConsultaAgendaDiaria) {
    const { fecha } = consulta;
    if (!esFechaLocalValida(fecha)) throw new RangeError('Fecha de agenda inválida');

    // UTC se usa para calcular el día de una fecha de calendario, sin convertir la hora local.
    const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay();
    const lunes = sumarDias(fecha, -((diaSemana + 6) % 7));
    const fechas = Array.from({ length: 7 }, (_, dia) => sumarDias(lunes, dia));
    return this.agendaDiaria.consultarDias(consulta, fechas);
  }
}
