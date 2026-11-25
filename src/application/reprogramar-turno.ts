import { autorizar, autorizarSobre } from '../domain/permisos/autorizar.js';
import { RecursoNoEncontradoError, ReglaNegocioError } from '../domain/errores.js';
import { crearIntervalo } from '../domain/intervalo.js';
import { duracionEfectiva } from '../domain/reglas/duracion.js';
import { evaluarReprogramacion, moverTurno } from '../domain/reglas/reprogramacion.js';
import { validarAlta, type EntradaValidacion } from '../domain/reglas/validar-alta.js';
import type { Turno } from '../domain/turno.js';
import type { ReprogramarTurnoInput } from './reprogramar-turno-input.js';
import type { Recordatorios } from './puertos/recordatorios.js';
import type { Reloj } from './puertos/reloj.js';
import type {
  BloqueoRepositorio,
  ConsultorioRepositorio,
  HorarioAtencionRepositorio,
  PrestacionRepositorio,
  ProfesionalRepositorio,
  SillonRepositorio,
  TurnoRepositorio,
} from './puertos/repositorios.js';

export type { ReprogramarTurnoInput } from './reprogramar-turno-input.js';

export interface ReprogramarTurnoDependencias {
  readonly profesionales: ProfesionalRepositorio;
  readonly sillones: SillonRepositorio;
  readonly prestaciones: PrestacionRepositorio;
  readonly consultorios: ConsultorioRepositorio;
  readonly horarios: HorarioAtencionRepositorio;
  readonly bloqueos: BloqueoRepositorio;
  readonly turnos: TurnoRepositorio;
  readonly reloj: Reloj;
  readonly recordatorios: Recordatorios;
}

async function obtenerOFallar<T>(tipo: string, id: string, buscar: Promise<T | undefined>): Promise<T> {
  const encontrado = await buscar;
  if (encontrado === undefined) throw new RecursoNoEncontradoError(tipo, id);
  return encontrado;
}

/**
 * Mueve un turno existente conservando su identidad (US-005, RN-11, DD-22). El nuevo horario se
 * valida como un alta que no se cuenta a sí misma, dentro de la misma sección crítica en la que se
 * persiste. El horario original solo se libera si la operación se concreta (RN-09, RN-12).
 */
export class ReprogramarTurno {
  constructor(private readonly deps: ReprogramarTurnoDependencias) {}

  async ejecutar(input: ReprogramarTurnoInput): Promise<Turno> {
    const { deps } = this;
    // Control de acceso antes de leer nada (C-09, DD-33): el odontólogo no reprograma.
    autorizar(input.actor, 'turno.reprogramar');
    const ahora = deps.reloj.ahora();

    // Un turno inexistente se detecta antes que cualquier regla de negocio.
    const turnoActual = await obtenerOFallar('turno', input.turnoId, deps.turnos.obtenerPorId(input.turnoId));
    // Alcance "propio" (paciente: el turno de su token), antes de RN-10 y RN-08.
    autorizarSobre(input.actor, 'turno.reprogramar', { profesionalId: turnoActual.profesionalId, turnoId: turnoActual.id });
    const violacionInicial = evaluarReprogramacion(turnoActual, input.actor.rol, ahora);
    if (violacionInicial !== null) throw new ReglaNegocioError(violacionInicial);

    // Fase asíncrona: carga de entidades del destino (los recursos omitidos se conservan).
    const profesionalId = input.profesionalId ?? turnoActual.profesionalId;
    const sillonId = input.sillonId ?? turnoActual.sillonId;
    const prestacionId = input.prestacionId ?? turnoActual.prestacionId;
    const profesional = await obtenerOFallar(
      'profesional',
      profesionalId,
      deps.profesionales.obtenerPorId(profesionalId),
    );
    const sillon = await obtenerOFallar('sillon', sillonId, deps.sillones.obtenerPorId(sillonId));
    const prestacion = await obtenerOFallar(
      'prestacion',
      prestacionId,
      deps.prestaciones.obtenerPorId(prestacionId),
    );
    const consultorio = await obtenerOFallar(
      'consultorio',
      profesional.consultorioId,
      deps.consultorios.obtenerPorId(profesional.consultorioId),
    );
    const horarios = await deps.horarios.listarPorConsultorio(consultorio.id);

    // Intervalo tentativo solo para consultar bloqueos; si la duración es inválida,
    // validarAlta la rechaza (RN-06/RN-16) antes de mirar bloqueos.
    const tentativa = duracionEfectiva(prestacion, input.duracionMinutos);
    const minutosConsulta = Number.isInteger(tentativa) && tentativa > 0 ? tentativa : prestacion.duracionMinutos;
    const intervaloConsulta = crearIntervalo(
      input.inicio,
      new Date(input.inicio.getTime() + minutosConsulta * 60_000),
    );
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
      ...(input.duracionMinutos === undefined ? {} : { duracionMinutos: input.duracionMinutos }),
    };

    // Primera pasada sin agenda: rechaza temprano y obtiene intervalo y duración efectiva.
    const previa = validarAlta({ ...entrada, turnos: [] });
    if (!previa.ok) throw new ReglaNegocioError(previa.violacion);

    const inicioEsperado = turnoActual.inicio.getTime();
    const profesionalEsperado = turnoActual.profesionalId;
    const sillonEsperado = turnoActual.sillonId;

    // Sección crítica (RN-12): el repositorio pasa los turnos de los recursos destino leídos
    // atómicamente. El propio turno se excluye por id (RN-11) y se re-ejecutan todas las reglas.
    const movido = await deps.turnos.actualizarSi(
      input.turnoId,
      (actual, turnosDeLosRecursos = []) => {
        // Control optimista: otra reprogramación ya movió el turno desde la lectura inicial.
        if (
          actual.inicio.getTime() !== inicioEsperado ||
          actual.profesionalId !== profesionalEsperado ||
          actual.sillonId !== sillonEsperado
        ) {
          return { ok: false, violacion: { codigo: 'RN-10', estadoActual: actual.estado } };
        }

        autorizarSobre(input.actor, 'turno.reprogramar', { profesionalId: actual.profesionalId, turnoId: actual.id });
        const violacion = evaluarReprogramacion(actual, input.actor.rol, ahora);
        if (violacion !== null) return { ok: false, violacion };

        const ajenos = turnosDeLosRecursos.filter((t) => t.id !== input.turnoId);
        const resultado = validarAlta({ ...entrada, turnos: ajenos });
        if (!resultado.ok) return { ok: false, violacion: resultado.violacion };

        return {
          ok: true,
          turno: moverTurno(actual, {
            inicio: resultado.intervalo.inicio,
            fin: resultado.intervalo.fin,
            duracionMinutos: resultado.duracionMinutos,
            ...(input.profesionalId === undefined ? {} : { profesionalId: profesional.id }),
            ...(input.sillonId === undefined ? {} : { sillonId: sillon.id }),
            ...(input.prestacionId === undefined ? {} : { prestacionId: prestacion.id }),
          }),
        };
      },
      { profesionalId: profesional.id, sillonId: sillon.id },
    );

    // Fuera de la sección crítica: si falla, el error se propaga y el movimiento no se deshace.
    await deps.recordatorios.programar(movido.id);
    return movido;
  }
}
