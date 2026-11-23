import { ErrorMarcarRecordatorio } from '../errores-recordatorio.js';
import type { Recordatorio } from '../recordatorio.js';

/** Datos mínimos del mensaje de un recordatorio `wa.me` (RN-14, RN-26, RN-D-02). */
export interface DatosEnlaceWaMe {
  /** Teléfono ya normalizado a dígitos por `normalizarTelefonoArgentino`. */
  readonly telefono: string;
  /** Fecha y hora local ya formateadas (`formatearFechaHoraLocal`, DD-09). */
  readonly fechaHoraLocal: string;
  readonly prestacion: string;
  /** Nombre y apellido del profesional. */
  readonly profesional: string;
  readonly consultorio: string;
}

/**
 * URL `https://wa.me/<digitos>?text=<mensaje codificado>`. No recibe token ni base pública:
 * el envío es manual y el mensaje no lleva enlace de gestión (DD-24).
 */
export function armarEnlaceWaMe(datos: DatosEnlaceWaMe): string {
  const mensaje = [
    `Te recordamos tu turno en ${datos.consultorio}.`,
    `Fecha y hora: ${datos.fechaHoraLocal}`,
    `Prestación: ${datos.prestacion}`,
    `Profesional: ${datos.profesional}`,
  ].join('\n');
  return `https://wa.me/${datos.telefono}?text=${encodeURIComponent(mensaje)}`;
}

/** Idempotente sobre `enviado`; rechaza cualquier otro estado que no sea `pendiente` (RN-26). */
export function marcarEnviado(recordatorio: Recordatorio, ahora: Date): Recordatorio {
  if (recordatorio.estado === 'enviado') return recordatorio;
  if (recordatorio.estado !== 'pendiente') throw new ErrorMarcarRecordatorio('ESTADO_NO_ENVIABLE');
  return { ...recordatorio, estado: 'enviado', enviadoEn: ahora };
}
