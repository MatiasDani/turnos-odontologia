import type { Rol } from './actor.js';

export type EstadoTurno = 'reservado' | 'confirmado' | 'cancelado' | 'ausente' | 'atendido';
export type OrigenTurno = 'recepcion' | 'online';

export interface Turno {
  readonly id: string;
  readonly pacienteId: string;
  readonly profesionalId: string;
  readonly sillonId: string;
  readonly prestacionId: string;
  readonly inicio: Date;
  readonly fin: Date;
  /** Duración efectiva (RN-06): fin = inicio + duracionMinutos. */
  readonly duracionMinutos: number;
  readonly estado: EstadoTurno;
  readonly origen: OrigenTurno;
  /** Instante en que se canceló (solo en turnos `cancelado`, DD-19). */
  readonly canceladoEn?: Date;
  /** Rol del actor que canceló (solo en turnos `cancelado`, DD-19). */
  readonly canceladoPor?: Rol;
}

/** Estados que ocupan profesional y sillón (DD-05). Único predicado de ocupación. */
export function esActivo(estado: EstadoTurno): boolean {
  return estado === 'reservado' || estado === 'confirmado' || estado === 'atendido';
}

/** Estado y origen de un turno recién creado según el rol del actor (DD-11). */
export function estadoInicial(rol: Rol): { estado: EstadoTurno; origen: OrigenTurno } {
  return rol === 'paciente'
    ? { estado: 'reservado', origen: 'online' }
    : { estado: 'confirmado', origen: 'recepcion' };
}
