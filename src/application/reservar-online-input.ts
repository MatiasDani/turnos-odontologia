import type { DatosPacienteOnline } from '../domain/datos-paciente-online.js';

/**
 * Contrato tipado de la reserva pública (design D4). No hay `actor`, `duracionMinutos`,
 * `sillonId` ni `forzar`: el rol es siempre paciente y la duración sale de la prestación (RN-16, RN-04).
 */
export interface ReservarOnlineInput {
  readonly prestacionId: string;
  readonly inicio: Date;
  readonly profesionalId?: string;
  readonly paciente: DatosPacienteOnline;
}

/** Respuesta pública de una reserva exitosa (DD-18): sin sillón, sin id de paciente. */
export interface ReservaOnlineConfirmada {
  readonly turnoId: string;
  readonly inicio: Date;
  readonly fin: Date;
  readonly prestacion: { readonly nombre: string };
  readonly profesional: { readonly nombre: string; readonly apellido: string };
  readonly token: string;
}
