import { RecursoNoEncontradoError, ReglaNegocioError } from '../domain/errores.js';
import { crearIntervalo } from '../domain/intervalo.js';
import { duracionEfectiva } from '../domain/reglas/duracion.js';
import { validarAlta, type EntradaValidacion } from '../domain/reglas/validar-alta.js';
import { estadoInicial, type Turno } from '../domain/turno.js';
import type { AgendarTurnoInput } from './agendar-turno-input.js';
import type { GeneradorId } from './puertos/generador-id.js';
import type {
  BloqueoRepositorio,
  ConsultorioRepositorio,
  HorarioAtencionRepositorio,
  PrestacionRepositorio,
  ProfesionalRepositorio,
  SillonRepositorio,
  TurnoRepositorio,
} from './puertos/repositorios.js';

export type { AgendarTurnoInput } from './agendar-turno-input.js';

export interface AgendarTurnoDependencias {
  readonly profesionales: ProfesionalRepositorio;
  readonly sillones: SillonRepositorio;
  readonly prestaciones: PrestacionRepositorio;
  readonly consultorios: ConsultorioRepositorio;
  readonly horarios: HorarioAtencionRepositorio;
  readonly bloqueos: BloqueoRepositorio;
  readonly turnos: TurnoRepositorio;
  readonly ids: GeneradorId;
}

async function obtenerOFallar<T>(tipo: string, id: string, buscar: Promise<T | undefined>): Promise<T> {
  const encontrado = await buscar;
  if (encontrado === undefined) throw new RecursoNoEncontradoError(tipo, id);
  return encontrado;
}

export class AgendarTurno {
  constructor(private readonly deps: AgendarTurnoDependencias) {}

  async ejecutar(input: AgendarTurnoInput): Promise<Turno> {
    const { deps } = this;

    // Fase asíncrona: carga de entidades (la inexistencia se detecta antes de toda regla).
    const profesional = await obtenerOFallar('profesional', input.profesionalId, deps.profesionales.obtenerPorId(input.profesionalId));
    const sillon = await obtenerOFallar('sillon', input.sillonId, deps.sillones.obtenerPorId(input.sillonId));
    const prestacion = await obtenerOFallar('prestacion', input.prestacionId, deps.prestaciones.obtenerPorId(input.prestacionId));
    const consultorio = await obtenerOFallar('consultorio', profesional.consultorioId, deps.consultorios.obtenerPorId(profesional.consultorioId));
    const horarios = await deps.horarios.listarPorConsultorio(consultorio.id);

    // Intervalo tentativo solo para consultar bloqueos; si la duración es inválida,
    // validarAlta la rechaza (RN-06/RN-16) antes de mirar bloqueos.
    const tentativa = duracionEfectiva(prestacion, input.duracionMinutos);
    const minutosConsulta = Number.isInteger(tentativa) && tentativa > 0 ? tentativa : prestacion.duracionMinutos;
    const intervaloConsulta = crearIntervalo(input.inicio, new Date(input.inicio.getTime() + minutosConsulta * 60_000));
    const bloqueos = await deps.bloqueos.listarPorRecursos(profesional.id, sillon.id, intervaloConsulta);

    const entrada: Omit<EntradaValidacion, 'turnos'> = {
      actor: input.actor,
      profesional,
      sillon,
      prestacion,
      zonaHoraria: consultorio.zonaHoraria,
      horarios,
      bloqueos,
      inicio: input.inicio,
      ...(input.duracionMinutos !== undefined && { duracionMinutos: input.duracionMinutos }),
    };

    // Primera pasada sin agenda: rechaza temprano y obtiene intervalo y duración efectiva.
    const previa = validarAlta({ ...entrada, turnos: [] });
    if (!previa.ok) throw new ReglaNegocioError(previa.violacion);

    const { estado, origen } = estadoInicial(input.actor.rol);
    const candidato: Turno = {
      id: deps.ids.siguiente(),
      pacienteId: input.pacienteId,
      profesionalId: profesional.id,
      sillonId: sillon.id,
      prestacionId: prestacion.id,
      inicio: previa.intervalo.inicio,
      fin: previa.intervalo.fin,
      duracionMinutos: previa.duracionMinutos,
      estado,
      origen,
    };

    // Sección crítica (RN-12): el repositorio re-ejecuta validarAlta con los turnos leídos
    // atómicamente, de modo que el orden de errores es único (D2, D7).
    return deps.turnos.agregarSiDisponible(candidato, (turnos) => {
      const resultado = validarAlta({ ...entrada, turnos });
      return resultado.ok ? null : resultado.violacion;
    });
  }
}
