import { RecursoNoEncontradoError } from '../domain/errores.js';
import { calcularProgramadoPara, debeProgramarseWaMe } from '../domain/reglas/recordatorios.js';
import { armarEnlaceWaMe } from '../domain/reglas/recordatorio-wa-me.js';
import { normalizarTelefonoArgentino } from '../domain/reglas/telefono.js';
import { formatearFechaHoraLocal } from '../domain/tiempo.js';
import type { ConfiguracionRecordatorios } from './configuracion-recordatorios.js';
import type { GeneradorId } from './puertos/generador-id.js';
import type { Recordatorios } from './puertos/recordatorios.js';
import type {
  ConsultorioRepositorio,
  PacienteRepositorio,
  PrestacionRepositorio,
  ProfesionalRepositorio,
  RecordatorioRepositorio,
  TurnoRepositorio,
} from './puertos/repositorios.js';

export interface RecordatoriosConWaMeDependencias {
  /** Implementación del canal `email` (C-12), que se ejecuta primero. */
  readonly recordatorios: Recordatorios;
  /** Persistencia compartida: el `wa.me` convive con el `email` (RN-26). */
  readonly repoRecordatorios: Pick<RecordatorioRepositorio, 'listarPorTurno' | 'guardar'>;
  readonly turnos: Pick<TurnoRepositorio, 'obtenerPorId'>;
  readonly pacientes: Pick<PacienteRepositorio, 'obtenerPorId'>;
  readonly profesionales: Pick<ProfesionalRepositorio, 'obtenerPorId'>;
  readonly prestaciones: Pick<PrestacionRepositorio, 'obtenerPorId'>;
  readonly consultorios: Pick<ConsultorioRepositorio, 'obtenerPorId'>;
  readonly ids: GeneradorId;
  readonly config: Pick<ConfiguracionRecordatorios, 'horasAntes'>;
}

async function obtenerOFallar<T>(tipo: string, id: string, buscar: Promise<T | undefined>): Promise<T> {
  const encontrado = await buscar;
  if (encontrado === undefined) throw new RecursoNoEncontradoError(tipo, id);
  return encontrado;
}

/**
 * Decorador del puerto `Recordatorios` (DD-24): programa el e-mail de C-12 y agrega el `wa_me`
 * sin tocar `AgendarTurno`, `ReservarOnline` ni `AgendarTurnoConRecordatorio`. La cancelación se
 * delega: el adaptador interno anula los pendientes de ambos canales.
 */
export class RecordatoriosConWaMe implements Recordatorios {
  constructor(private readonly deps: RecordatoriosConWaMeDependencias) {}

  async programar(turnoId: string): Promise<void> {
    const { deps } = this;
    await deps.recordatorios.programar(turnoId);
    const turno = await deps.turnos.obtenerPorId(turnoId);
    if (turno === undefined) throw new RecursoNoEncontradoError('turno', turnoId);
    const paciente = await deps.pacientes.obtenerPorId(turno.pacienteId);
    if (paciente === undefined) throw new RecursoNoEncontradoError('paciente', turno.pacienteId);
    if (!debeProgramarseWaMe(paciente)) return;
    const telefono = normalizarTelefonoArgentino(paciente.telefono);
    if (telefono === undefined) return;

    const profesional = await obtenerOFallar(
      'profesional',
      turno.profesionalId,
      deps.profesionales.obtenerPorId(turno.profesionalId),
    );
    const prestacion = await obtenerOFallar(
      'prestacion',
      turno.prestacionId,
      deps.prestaciones.obtenerPorId(turno.prestacionId),
    );
    const consultorio = await obtenerOFallar(
      'consultorio',
      prestacion.consultorioId,
      deps.consultorios.obtenerPorId(prestacion.consultorioId),
    );
    const enlaceWaMe = armarEnlaceWaMe({
      telefono,
      fechaHoraLocal: formatearFechaHoraLocal(turno.inicio, consultorio.zonaHoraria),
      prestacion: prestacion.nombre,
      profesional: `${profesional.nombre} ${profesional.apellido}`,
      consultorio: consultorio.nombre,
    });
    const pendiente = (await deps.repoRecordatorios.listarPorTurno(turnoId)).find(
      (recordatorio) => recordatorio.canal === 'wa_me' && recordatorio.estado === 'pendiente',
    );
    await deps.repoRecordatorios.guardar({
      id: pendiente?.id ?? deps.ids.siguiente(),
      turnoId,
      canal: 'wa_me',
      programadoPara: calcularProgramadoPara(turno.inicio, deps.config.horasAntes),
      estado: 'pendiente',
      enlaceWaMe,
    });
  }

  cancelarPendientes(turnoId: string): Promise<void> {
    return this.deps.recordatorios.cancelarPendientes(turnoId);
  }
}
