import type { BloqueoHorario } from '../domain/bloqueo-horario.js';
import { ConsultaInvalidaError } from '../domain/errores.js';
import { esActivo, type EstadoTurno, type OrigenTurno, type Turno } from '../domain/turno.js';
import type { AgendaDiaria, ConsultaAgendaDiaria } from './agenda-diaria.js';
import type { AgendaSemanal } from './agenda-semanal.js';
import type { PacienteRepositorio, PrestacionRepositorio, ProfesionalRepositorio, SillonRepositorio } from './puertos/repositorios.js';

export interface VistaAgendaDependencias {
  readonly agendaDiaria: Pick<AgendaDiaria, 'ejecutar'>;
  readonly agendaSemanal: Pick<AgendaSemanal, 'ejecutar'>;
  readonly pacientes: Pick<PacienteRepositorio, 'obtenerPorId'>;
  readonly profesionales: Pick<ProfesionalRepositorio, 'obtenerPorId'>;
  readonly sillones: Pick<SillonRepositorio, 'obtenerPorId'>;
  readonly prestaciones: Pick<PrestacionRepositorio, 'obtenerPorId'>;
}

export interface PersonaVista {
  readonly id: string;
  readonly nombre: string;
  readonly apellido: string;
}

export interface RecursoVista {
  readonly id: string;
  readonly nombre: string;
}

/** Turno para mostrar (DD-40): nombres, nunca DNI, teléfono ni e-mail del paciente (RN-D-02). */
export interface TurnoVista {
  readonly id: string;
  readonly estado: EstadoTurno;
  readonly ocupa: boolean;
  readonly origen: OrigenTurno;
  readonly inicio: Date;
  readonly fin: Date;
  readonly duracionMinutos: number;
  readonly paciente: PersonaVista;
  readonly prestacion: RecursoVista;
  readonly profesional: PersonaVista;
  readonly sillon: RecursoVista;
}

export interface BloqueoVista {
  readonly id: string;
  readonly inicio: Date;
  readonly fin: Date;
  readonly motivo?: string;
  readonly profesional?: PersonaVista;
  readonly sillon?: RecursoVista;
}

export interface DiaVista {
  readonly fecha: string;
  readonly turnos: readonly TurnoVista[];
  readonly bloqueos: readonly BloqueoVista[];
}

type Buscador<T> = (id: string) => Promise<T>;

/** Cache por pedido: un `obtenerPorId` por id distinto (design D3). */
function cacheado<T>(buscar: Buscador<T>): Buscador<T> {
  const cache = new Map<string, Promise<T>>();
  return (id) => {
    const existente = cache.get(id);
    if (existente !== undefined) return existente;
    const nuevo = buscar(id);
    cache.set(id, nuevo);
    return nuevo;
  };
}

const porInicio = <T extends { readonly inicio: Date; readonly id: string }>(a: T, b: T): number =>
  a.inicio.getTime() - b.inicio.getTime() || a.id.localeCompare(b.id);

/**
 * Agenda diaria y semanal para la interfaz de recepción (C-15, DD-40): envuelve a C-08 (que aplica
 * la visibilidad por rol) y agrega los nombres de paciente, prestación, profesional y sillón.
 */
export class VistaAgenda {
  constructor(private readonly deps: VistaAgendaDependencias) {}

  async diaria(consulta: ConsultaAgendaDiaria): Promise<DiaVista> {
    const resultado = await this.deps.agendaDiaria.ejecutar(consulta);
    return this.enriquecer(this.buscadores(), { fecha: consulta.fecha, ...resultado });
  }

  /** DD-39: recepción y administrador eligen un profesional o un sillón; el odontólogo ve el suyo. */
  async semanal(consulta: ConsultaAgendaDiaria): Promise<{ readonly dias: readonly DiaVista[] }> {
    const conRecurso = consulta.profesionalId !== undefined || consulta.sillonId !== undefined;
    if (!conRecurso && consulta.actor.rol !== 'odontologo' && consulta.actor.rol !== 'paciente') {
      throw new ConsultaInvalidaError('recurso', 'la semana muestra un profesional o un sillón');
    }
    const dias = await this.deps.agendaSemanal.ejecutar(consulta);
    const buscadores = this.buscadores();
    return { dias: await Promise.all(dias.map((dia) => this.enriquecer(buscadores, dia))) };
  }

  /** Un turno suelto con sus nombres (respuesta de las acciones de recepción). */
  async turno(turno: Turno): Promise<TurnoVista> {
    const dia = await this.enriquecer(this.buscadores(), {
      fecha: '',
      turnos: [{ ...turno, ocupa: esActivo(turno.estado) }],
      bloqueos: [],
    });
    return dia.turnos[0] as TurnoVista;
  }

  /** Un bloqueo suelto con sus nombres. */
  async bloqueo(bloqueo: BloqueoHorario): Promise<BloqueoVista> {
    const dia = await this.enriquecer(this.buscadores(), { fecha: '', turnos: [], bloqueos: [bloqueo] });
    return dia.bloqueos[0] as BloqueoVista;
  }

  private buscadores() {
    const { deps } = this;
    return {
      paciente: cacheado(async (id): Promise<PersonaVista> => {
        const p = await deps.pacientes.obtenerPorId(id);
        return { id, nombre: p?.nombre ?? '', apellido: p?.apellido ?? '' };
      }),
      profesional: cacheado(async (id): Promise<PersonaVista> => {
        const p = await deps.profesionales.obtenerPorId(id);
        return { id, nombre: p?.nombre ?? '', apellido: p?.apellido ?? '' };
      }),
      sillon: cacheado(async (id): Promise<RecursoVista> => ({ id, nombre: (await deps.sillones.obtenerPorId(id))?.nombre ?? '' })),
      prestacion: cacheado(async (id): Promise<RecursoVista> => ({ id, nombre: (await deps.prestaciones.obtenerPorId(id))?.nombre ?? '' })),
    };
  }

  private async enriquecer(
    b: ReturnType<VistaAgenda['buscadores']>,
    dia: { readonly fecha: string; readonly turnos: readonly (Turno & { readonly ocupa: boolean })[]; readonly bloqueos: readonly BloqueoHorario[] },
  ): Promise<DiaVista> {
    const turnos = await Promise.all(
      dia.turnos.map(async (t): Promise<TurnoVista> => ({
        id: t.id,
        estado: t.estado,
        ocupa: t.ocupa,
        origen: t.origen,
        inicio: t.inicio,
        fin: t.fin,
        duracionMinutos: t.duracionMinutos,
        paciente: await b.paciente(t.pacienteId),
        prestacion: await b.prestacion(t.prestacionId),
        profesional: await b.profesional(t.profesionalId),
        sillon: await b.sillon(t.sillonId),
      })),
    );
    const bloqueos = await Promise.all(
      dia.bloqueos.map(async (bl): Promise<BloqueoVista> => ({
        id: bl.id,
        inicio: bl.inicio,
        fin: bl.fin,
        ...(bl.motivo === undefined ? {} : { motivo: bl.motivo }),
        ...(bl.profesionalId === undefined ? {} : { profesional: await b.profesional(bl.profesionalId) }),
        ...(bl.sillonId === undefined ? {} : { sillon: await b.sillon(bl.sillonId) }),
      })),
    );
    return { fecha: dia.fecha, turnos: turnos.sort(porInicio), bloqueos: bloqueos.sort(porInicio) };
  }
}
