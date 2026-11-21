import type { Actor } from '../actor.js';
import type { BloqueoHorario } from '../bloqueo-horario.js';
import type { Violacion } from '../errores.js';
import type { HorarioAtencion } from '../horario-atencion.js';
import { crearIntervalo, type Intervalo } from '../intervalo.js';
import type { Prestacion } from '../prestacion.js';
import type { Profesional } from '../profesional.js';
import type { Sillon } from '../sillon.js';
import type { Turno } from '../turno.js';
import { validarBloqueos } from './bloqueos.js';
import { duracionEfectiva, validarDuracion } from './duracion.js';
import { validarHorario } from './horario.js';
import { validarRecursosActivos } from './recursos-activos.js';
import { validarSolapamiento } from './solapamiento.js';

export interface EntradaValidacion {
  readonly actor: Actor;
  readonly profesional: Profesional;
  readonly sillon: Sillon;
  readonly prestacion: Prestacion;
  readonly zonaHoraria: string;
  readonly horarios: readonly HorarioAtencion[];
  readonly bloqueos: readonly BloqueoHorario[];
  /** Turnos existentes de los recursos involucrados (los no activos se ignoran). */
  readonly turnos: readonly Turno[];
  readonly inicio: Date;
  readonly duracionMinutos?: number;
}

export type ResultadoValidacion =
  | { readonly ok: true; readonly intervalo: Intervalo; readonly duracionMinutos: number }
  | { readonly ok: false; readonly violacion: Violacion };

const rechazo = (violacion: Violacion): ResultadoValidacion => ({ ok: false, violacion });

/**
 * Única fuente de evaluación de reglas del alta. Orden fijo (D2):
 * RN-18 → RN-16 → RN-06 → RN-07/RN-17 → bloqueos (RN-07) → RN-02 → RN-03.
 * Devuelve solo la primera violación.
 */
export function validarAlta(entrada: EntradaValidacion): ResultadoValidacion {
  const { actor, profesional, sillon, prestacion, inicio } = entrada;

  const inactivo = validarRecursosActivos({ profesional, sillon, prestacion });
  if (inactivo !== null) return rechazo(inactivo);

  const duracionInvalida = validarDuracion(actor, prestacion, entrada.duracionMinutos);
  if (duracionInvalida !== null) return rechazo(duracionInvalida);

  const duracionMinutos = duracionEfectiva(prestacion, entrada.duracionMinutos);
  const intervalo = crearIntervalo(inicio, new Date(inicio.getTime() + duracionMinutos * 60_000));

  const reglasDeIntervalo: readonly (() => Violacion | null)[] = [
    () => validarHorario(intervalo, entrada.zonaHoraria, entrada.horarios),
    () => validarBloqueos(intervalo, profesional.id, sillon.id, entrada.bloqueos),
    () => validarSolapamiento(intervalo, profesional.id, sillon.id, entrada.turnos),
  ];
  for (const regla of reglasDeIntervalo) {
    const violacion = regla();
    if (violacion !== null) return rechazo(violacion);
  }
  return { ok: true, intervalo, duracionMinutos };
}
