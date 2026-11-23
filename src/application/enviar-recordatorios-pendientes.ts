import { RecursoNoEncontradoError } from '../domain/errores.js';
import type { Paciente } from '../domain/paciente.js';
import type { Recordatorio } from '../domain/recordatorio.js';
import { armarMensajeRecordatorio, debeProgramarse, evaluarEnvio } from '../domain/reglas/recordatorios.js';
import { formatearFechaHoraLocal } from '../domain/tiempo.js';
import type { Turno } from '../domain/turno.js';
import type { ConfiguracionRecordatorios } from './configuracion-recordatorios.js';
import type { Notificador } from './puertos/notificador.js';
import type { Reloj } from './puertos/reloj.js';
import type {
  ConsultorioRepositorio,
  PacienteRepositorio,
  PrestacionRepositorio,
  ProfesionalRepositorio,
  RecordatorioRepositorio,
  TurnoRepositorio,
} from './puertos/repositorios.js';
import type { ServicioTokens } from './servicio-tokens.js';

export interface EnviarRecordatoriosPendientesDependencias {
  readonly reloj: Reloj;
  readonly recordatorios: RecordatorioRepositorio;
  readonly turnos: Pick<TurnoRepositorio, 'obtenerPorId'>;
  readonly pacientes: Pick<PacienteRepositorio, 'obtenerPorId'>;
  readonly profesionales: Pick<ProfesionalRepositorio, 'obtenerPorId'>;
  readonly prestaciones: Pick<PrestacionRepositorio, 'obtenerPorId'>;
  readonly consultorios: Pick<ConsultorioRepositorio, 'obtenerPorId'>;
  readonly tokens: Pick<ServicioTokens, 'rotar'>;
  readonly notificador: Notificador;
  readonly config: ConfiguracionRecordatorios;
}

/** Conteos del barrido, sin datos personales. */
export interface ResumenBarrido {
  readonly enviados: number;
  readonly fallidos: number;
  readonly anulados: number;
}

/** Motivo registrado en un envío fallido: sin datos personales ni token (RN-25). */
export const MOTIVO_ENVIO_RECHAZADO = 'El servicio de e-mail rechazó el envío.';

async function obtenerOFallar<T>(tipo: string, id: string, buscar: Promise<T | undefined>): Promise<T> {
  const encontrado = await buscar;
  if (encontrado === undefined) throw new RecursoNoEncontradoError(tipo, id);
  return encontrado;
}

/**
 * Barrido de envío (RN-25, DD-21): toma los pendientes con `programadoPara <= ahora`, revalida el
 * turno, rota el token (DD-15) y entrega el mensaje al `Notificador`. Lo ejecuta periódicamente
 * el proceso que integre C-14.
 */
export class EnviarRecordatoriosPendientes {
  constructor(private readonly deps: EnviarRecordatoriosPendientesDependencias) {}

  async ejecutar(): Promise<ResumenBarrido> {
    const { deps } = this;
    const ahora = deps.reloj.ahora();
    let enviados = 0;
    let fallidos = 0;
    let anulados = 0;
    for (const recordatorio of await deps.recordatorios.listarPendientesHasta(ahora)) {
      // Los `wa.me` los ve la recepción y los envía a mano (RN-26): nunca por este barrido.
      if (recordatorio.canal !== 'email') continue;
      const turno = await deps.turnos.obtenerPorId(recordatorio.turnoId);
      const decision = evaluarEnvio(recordatorio, turno, ahora);
      if (decision === 'esperar') continue;
      const paciente = turno === undefined ? undefined : await deps.pacientes.obtenerPorId(turno.pacienteId);
      // Turno no activo o ya iniciado, o paciente que perdió e-mail o consentimiento: se anula sin
      // enviar. Así un pendiente que quedó sin anular nunca llega al paciente (RN-25, DD-21).
      if (decision === 'anular' || turno === undefined || paciente === undefined || !debeProgramarse(paciente)) {
        await deps.recordatorios.guardar({ ...recordatorio, estado: 'cancelado' });
        anulados += 1;
        continue;
      }
      if (await this.enviar(recordatorio, turno, paciente, ahora)) enviados += 1;
      else fallidos += 1;
    }
    return { enviados, fallidos, anulados };
  }

  /**
   * Envía y registra el resultado. Devuelve `false` si el notificador rechazó el envío; los
   * errores de repositorios o de `rotar` (infraestructura inesperada) se propagan sin enmascarar.
   */
  private async enviar(recordatorio: Recordatorio, turno: Turno, paciente: Paciente, ahora: Date): Promise<boolean> {
    const { deps } = this;
    const profesional = await obtenerOFallar('profesional', turno.profesionalId, deps.profesionales.obtenerPorId(turno.profesionalId));
    const prestacion = await obtenerOFallar('prestacion', turno.prestacionId, deps.prestaciones.obtenerPorId(turno.prestacionId));
    const consultorio = await obtenerOFallar('consultorio', prestacion.consultorioId, deps.consultorios.obtenerPorId(prestacion.consultorioId));
    // El token en claro solo existe al emitirlo: se rota antes de armar el mensaje (DD-15).
    const token = await deps.tokens.rotar(turno.id);
    const mensaje = armarMensajeRecordatorio({
      para: paciente.email ?? '',
      fechaHoraLocal: formatearFechaHoraLocal(turno.inicio, consultorio.zonaHoraria),
      prestacion: prestacion.nombre,
      profesional: `${profesional.nombre} ${profesional.apellido}`,
      consultorio: consultorio.nombre,
      baseUrlPublica: deps.config.baseUrlPublica,
      token,
      estadoTurno: turno.estado === 'reservado' ? 'reservado' : 'confirmado',
    });
    try {
      await deps.notificador.enviar(mensaje);
    } catch {
      // Motivo fijo: el error del proveedor puede copiar la dirección o el enlace con el token
      // (RN-25). Sin reintento automático: la recepción lo ve en la lista de fallidos.
      await deps.recordatorios.guardar({ ...recordatorio, estado: 'fallido', motivoFallo: MOTIVO_ENVIO_RECHAZADO });
      return false;
    }
    await deps.recordatorios.guardar({ ...recordatorio, estado: 'enviado', enviadoEn: ahora });
    return true;
  }
}
