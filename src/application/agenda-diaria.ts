import type { Actor } from '../domain/actor.js';
import type { BloqueoHorario } from '../domain/bloqueo-horario.js';
import { esActivo, type Turno } from '../domain/turno.js';
import { AccesoDenegadoError } from '../domain/errores.js';
import { esFechaLocalValida, fechaLocal } from '../domain/reglas/horizonte-reserva.js';
import type {
  BloqueoRepositorio,
  TurnoRepositorio,
} from './puertos/repositorios.js';

interface DependenciasAgendaDiaria {
  turnos: TurnoRepositorio;
  bloqueos: BloqueoRepositorio;
}

export interface ConsultaAgendaDiaria {
  actor: Actor;
  fecha: string;
  profesionalId?: string;
  sillonId?: string;
}

export interface ResultadoAgendaDiaria {
  turnos: (Turno & { readonly ocupa: boolean })[];
  bloqueos: BloqueoHorario[];
}

export class AgendaDiaria {
  constructor(
    private readonly dependencias: DependenciasAgendaDiaria,
    private readonly zona = 'America/Argentina/Buenos_Aires',
  ) {}

  async ejecutar(consulta: ConsultaAgendaDiaria): Promise<ResultadoAgendaDiaria> {
    const [dia] = await this.consultarDias(consulta, [consulta.fecha]);
    return dia!;
  }

  async consultarDias(
    consulta: ConsultaAgendaDiaria,
    fechas: readonly string[],
  ): Promise<(ResultadoAgendaDiaria & { fecha: string })[]> {
    const { actor, sillonId } = consulta;
    if (actor.rol === 'paciente' || (actor.rol === 'odontologo' && !actor.profesionalId)) {
      throw new AccesoDenegadoError(actor.rol, 'consultar agenda diaria');
    }

    const profesionalPropio = actor.rol === 'odontologo' ? actor.profesionalId : undefined;
    if (profesionalPropio && consulta.profesionalId !== undefined && consulta.profesionalId !== profesionalPropio) {
      throw new AccesoDenegadoError(actor.rol, 'consultar agenda ajena');
    }

    const profesionalId = profesionalPropio ?? consulta.profesionalId;
    if (!fechas.every(esFechaLocalValida)) throw new RangeError('Fecha de agenda inválida');
    const [turnos, bloqueos] = await Promise.all([
      this.dependencias.turnos.listarTodos(),
      this.dependencias.bloqueos.listarTodos(),
    ]);

    const coincideConRecursos = (registro: Turno | BloqueoHorario): boolean =>
      (profesionalId === undefined || registro.profesionalId === profesionalId) &&
      (sillonId === undefined || registro.sillonId === sillonId);

    const turnosVisibles = turnos.filter(coincideConRecursos).map((turno) => ({
      registro: { ...turno, ocupa: esActivo(turno.estado) },
      fecha: fechaLocal(turno.inicio, this.zona),
    }));
    const bloqueosVisibles = bloqueos.filter(coincideConRecursos).map((bloqueo) => ({
      registro: bloqueo,
      desde: fechaLocal(bloqueo.inicio, this.zona),
      // El fin del intervalo es exclusivo, incluso cuando coincide con medianoche.
      hasta: fechaLocal(new Date(bloqueo.fin.getTime() - 1), this.zona),
    }));

    return fechas.map((fecha) => ({
      fecha,
      turnos: turnosVisibles.filter((turno) => turno.fecha === fecha).map(({ registro }) => registro),
      bloqueos: bloqueosVisibles
        .filter(({ desde, hasta }) => desde <= fecha && fecha <= hasta)
        .map(({ registro }) => registro),
    }));
  }
}
