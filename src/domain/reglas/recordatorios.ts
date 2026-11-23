import type { Paciente } from '../paciente.js';
import type { Recordatorio } from '../recordatorio.js';
import type { EstadoTurno, Turno } from '../turno.js';
import { normalizarTelefonoArgentino } from './telefono.js';

const MS_POR_HORA = 3_600_000;

/**
 * Estados del turno a los que se envía recordatorio. Lista explícita: `esActivo()` también
 * incluye `atendido`, que ocupa recursos pero no se recuerda (design D3).
 */
const ESTADOS_ENVIABLES: readonly EstadoTurno[] = ['reservado', 'confirmado'];

/** Decisión del barrido sobre un recordatorio pendiente (RN-25). */
export type DecisionEnvio = 'esperar' | 'anular' | 'enviar';

/** Solo hay recordatorio por e-mail con consentimiento de contacto y e-mail (RN-25, RN-D-02). */
export function debeProgramarse(paciente: Pick<Paciente, 'consentimientoContacto' | 'email'>): boolean {
  return paciente.consentimientoContacto && paciente.email !== undefined && paciente.email !== '';
}

/** Hay recordatorio `wa.me` con consentimiento y teléfono válido, sin exigir e-mail (RN-26, DD-24). */
export function debeProgramarseWaMe(
  paciente: Pick<Paciente, 'consentimientoContacto' | 'telefono'>,
): boolean {
  return paciente.consentimientoContacto && normalizarTelefonoArgentino(paciente.telefono) !== undefined;
}

/**
 * Revalidación del turno antes de enviar (RN-25): espera hasta `programadoPara`; anula si el turno
 * no existe, no está `reservado` ni `confirmado`, o ya empezó (`ahora >= inicio`).
 */
export function evaluarEnvio(recordatorio: Recordatorio, turno: Turno | undefined, ahora: Date): DecisionEnvio {
  if (recordatorio.programadoPara.getTime() > ahora.getTime()) return 'esperar';
  if (turno === undefined || !ESTADOS_ENVIABLES.includes(turno.estado)) return 'anular';
  if (ahora.getTime() >= turno.inicio.getTime()) return 'anular';
  return 'enviar';
}

/** `inicio - horasAntes` como aritmética de instantes (RN-25); no depende de la zona horaria. */
export function calcularProgramadoPara(inicio: Date, horasAntes: number): Date {
  return new Date(inicio.getTime() - horasAntes * MS_POR_HORA);
}

/** E-mail de texto plano (sin HTML) que entrega el puerto `Notificador`. */
export interface MensajeEmail {
  readonly para: string;
  readonly asunto: string;
  readonly texto: string;
}

/**
 * Lo único que puede contener el mensaje (RN-25, RN-D-02): sin DNI, teléfono, sillón ni datos
 * clínicos, que por eso ni siquiera se reciben.
 */
export interface DatosMensajeRecordatorio {
  readonly para: string;
  /** Fecha y hora local ya formateadas (`formatearFechaHoraLocal`). */
  readonly fechaHoraLocal: string;
  readonly prestacion: string;
  /** Nombre y apellido del profesional. */
  readonly profesional: string;
  readonly consultorio: string;
  readonly baseUrlPublica: string;
  /** Token de gestión en claro, recién rotado; solo viaja en los enlaces. */
  readonly token: string;
  /** Solo un turno `reservado` lleva el enlace de confirmación (RN-14). */
  readonly estadoTurno: 'reservado' | 'confirmado';
}

/** Enlace de gestión del turno, con la forma de las rutas públicas de C-11. */
function enlaceGestion(baseUrlPublica: string, token: string): string {
  return `${baseUrlPublica.replace(/\/+$/, '')}/public/turnos/${encodeURIComponent(token)}`;
}

/** Mensaje en texto plano (sin HTML, design D3). */
export function armarMensajeRecordatorio(datos: DatosMensajeRecordatorio): MensajeEmail {
  const gestion = enlaceGestion(datos.baseUrlPublica, datos.token);
  const lineas = [
    `Te recordamos tu turno en ${datos.consultorio}.`,
    '',
    `Fecha y hora: ${datos.fechaHoraLocal}`,
    `Prestación: ${datos.prestacion}`,
    `Profesional: ${datos.profesional}`,
    '',
    ...(datos.estadoTurno === 'reservado' ? [`Para confirmar tu asistencia: ${gestion}/confirmar`] : []),
    `Para ver o gestionar tu turno: ${gestion}`,
  ];
  return {
    para: datos.para,
    asunto: `Recordatorio de tu turno - ${datos.consultorio}`,
    texto: lineas.join('\n'),
  };
}
