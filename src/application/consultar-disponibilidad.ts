import { ConsultaInvalidaError, RecursoNoEncontradoError, ReglaNegocioError } from '../domain/errores.js';
import type { Hueco } from '../domain/disponibilidad/hueco.js';
import type { BloqueoHorario } from '../domain/bloqueo-horario.js';
import type { Turno } from '../domain/turno.js';
import { generarInicios } from '../domain/disponibilidad/generar-candidatos.js';
import { crearIntervalo } from '../domain/intervalo.js';
import { duracionEfectiva, validarDuracion } from '../domain/reglas/duracion.js';
import { validarAlta } from '../domain/reglas/validar-alta.js';
import type { ConsultarDisponibilidadInput } from './consultar-disponibilidad-input.js';
import type {
  BloqueoRepositorio,
  ConsultorioRepositorio,
  HorarioAtencionRepositorio,
  PrestacionRepositorio,
  ProfesionalRepositorio,
  SillonRepositorio,
  TurnoRepositorio,
} from './puertos/repositorios.js';

export type { ConsultarDisponibilidadInput } from './consultar-disponibilidad-input.js';

export interface ConsultarDisponibilidadDependencias {
  readonly profesionales: ProfesionalRepositorio;
  readonly sillones: SillonRepositorio;
  readonly prestaciones: PrestacionRepositorio;
  readonly consultorios: ConsultorioRepositorio;
  readonly horarios: HorarioAtencionRepositorio;
  readonly bloqueos: BloqueoRepositorio;
  readonly turnos: TurnoRepositorio;
}

const PASO_POR_DEFECTO = 15;

/** Comparación por id (strings): fija el orden de los combos sin depender del repositorio (D6). */
const porId = (a: { readonly id: string }, b: { readonly id: string }): number =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const RANGO_MAXIMO_MS = 31 * 24 * 60 * 60_000;

/** Validaciones de entrada sin I/O, en orden fijo (D2): rango y luego paso. */
function validarConsulta(input: ConsultarDisponibilidadInput): number {
  const { desde, hasta } = input.rango;
  if (!(hasta.getTime() > desde.getTime())) {
    throw new ConsultaInvalidaError('rango', 'hasta debe ser posterior a desde');
  }
  if (hasta.getTime() - desde.getTime() > RANGO_MAXIMO_MS) {
    throw new ConsultaInvalidaError('rango', 'el rango no puede superar los 31 días');
  }
  const paso = input.pasoMinutos ?? PASO_POR_DEFECTO;
  if (!Number.isInteger(paso) || paso <= 0 || paso % 5 !== 0) {
    throw new ConsultaInvalidaError('paso', 'el paso debe ser un entero mayor a 0 y múltiplo de 5');
  }
  return paso;
}

export class ConsultarDisponibilidad {
  constructor(private readonly deps: ConsultarDisponibilidadDependencias) {}

  async ejecutar(input: ConsultarDisponibilidadInput): Promise<readonly Hueco[]> {
    const { deps } = this;
    const paso = validarConsulta(input);

    const prestacion = await deps.prestaciones.obtenerPorId(input.prestacionId);
    if (prestacion === undefined) throw new RecursoNoEncontradoError('prestacion', input.prestacionId);
    if (input.profesionalId !== undefined) {
      const filtrado = await deps.profesionales.obtenerPorId(input.profesionalId);
      if (filtrado === undefined) throw new RecursoNoEncontradoError('profesional', input.profesionalId);
    }
    // Violaciones de la consulta entera (no de un candidato): RN-18 de la prestación, RN-16, RN-06.
    if (!prestacion.activa) throw new ReglaNegocioError({ codigo: 'RN-18' });
    const duracionInvalida = validarDuracion(input.actor, prestacion, input.duracionMinutos);
    if (duracionInvalida !== null) throw new ReglaNegocioError(duracionInvalida);

    const consultorio = await deps.consultorios.obtenerPorId(prestacion.consultorioId);
    if (consultorio === undefined) throw new RecursoNoEncontradoError('consultorio', prestacion.consultorioId);
    const horarios = await deps.horarios.listarPorConsultorio(consultorio.id);

    const profesionales = (await deps.profesionales.listarPorConsultorio(consultorio.id))
      .filter((p) => p.prestacionIds.includes(prestacion.id))
      .filter((p) => input.profesionalId === undefined || p.id === input.profesionalId)
      .sort(porId);
    const sillones = [...(await deps.sillones.listarPorConsultorio(consultorio.id))].sort(porId);

    const duracion = duracionEfectiva(prestacion, input.duracionMinutos);
    const ventana = crearIntervalo(
      input.rango.desde,
      new Date(input.rango.hasta.getTime() + duracion * 60_000),
    );

    // Turnos y bloqueos se cargan una vez por par (profesional, sillón) y se reutilizan (D7).
    const agendas = new Map<string, { turnos: readonly Turno[]; bloqueos: readonly BloqueoHorario[] }>();
    for (const profesional of profesionales) {
      for (const sillon of sillones) {
        agendas.set(`${profesional.id}|${sillon.id}`, {
          turnos: await deps.turnos.listarPorRecursos(profesional.id, sillon.id),
          bloqueos: await deps.bloqueos.listarPorRecursos(profesional.id, sillon.id, ventana),
        });
      }
    }

    // Inicios por profesional (D3, RN-28): cada uno sigue la grilla de su horario efectivo del día.
    const iniciosDe = new Map<string, ReadonlySet<number>>();
    const union = new Map<number, Date>();
    for (const profesional of profesionales) {
      const propios = generarInicios({
        rango: input.rango,
        ahora: input.ahora,
        zona: consultorio.zonaHoraria,
        horarios,
        pasoMinutos: paso,
        profesionalId: profesional.id,
      });
      iniciosDe.set(profesional.id, new Set(propios.map((i) => i.getTime())));
      for (const inicio of propios) union.set(inicio.getTime(), inicio);
    }
    const inicios = [...union.values()].sort((a, b) => a.getTime() - b.getTime());

    // Orden determinista (D6): inicio → profesionalId → sillonId. Cada combo lo decide validarAlta (D1);
    // un profesional solo se evalúa en los inicios de su propia grilla (D3).
    const huecos: Hueco[] = [];
    for (const inicio of inicios) {
      for (const profesional of profesionales) {
        if (iniciosDe.get(profesional.id)?.has(inicio.getTime()) !== true) continue;
        for (const sillon of sillones) {
          const agenda = agendas.get(`${profesional.id}|${sillon.id}`);
          if (agenda === undefined) continue;
          const resultado = validarAlta({
            actor: input.actor,
            profesional,
            sillon,
            prestacion,
            zonaHoraria: consultorio.zonaHoraria,
            horarios,
            bloqueos: agenda.bloqueos,
            turnos: agenda.turnos,
            inicio,
            ...(input.duracionMinutos !== undefined && { duracionMinutos: input.duracionMinutos }),
          });
          if (resultado.ok) {
            huecos.push({
              inicio,
              fin: resultado.intervalo.fin,
              profesionalId: profesional.id,
              sillonId: sillon.id,
            });
          }
        }
      }
    }
    return huecos;
  }
}
