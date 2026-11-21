import type { BloqueoHorario } from '../../domain/bloqueo-horario.js';
import type { Consultorio } from '../../domain/consultorio.js';
import type { Violacion } from '../../domain/errores.js';
import type { HorarioAtencion } from '../../domain/horario-atencion.js';
import type { Intervalo } from '../../domain/intervalo.js';
import type { Prestacion } from '../../domain/prestacion.js';
import type { Profesional } from '../../domain/profesional.js';
import type { Sillon } from '../../domain/sillon.js';
import type { Turno } from '../../domain/turno.js';

export interface ProfesionalRepositorio {
  obtenerPorId(id: string): Promise<Profesional | undefined>;
}

export interface SillonRepositorio {
  obtenerPorId(id: string): Promise<Sillon | undefined>;
}

export interface PrestacionRepositorio {
  obtenerPorId(id: string): Promise<Prestacion | undefined>;
}

export interface ConsultorioRepositorio {
  obtenerPorId(id: string): Promise<Consultorio | undefined>;
}

export interface HorarioAtencionRepositorio {
  listarPorConsultorio(consultorioId: string): Promise<readonly HorarioAtencion[]>;
}

export interface BloqueoRepositorio {
  /** Bloqueos del profesional o del sillón que se solapan con el intervalo. */
  listarPorRecursos(
    profesionalId: string,
    sillonId: string,
    intervalo: Intervalo,
  ): Promise<readonly BloqueoHorario[]>;
}

export interface TurnoRepositorio {
  /**
   * Operación atómica (RN-12): lee los turnos del profesional y del sillón del candidato,
   * ejecuta `validar` con ellos y, si no hay violación, inserta el candidato. Si hay violación
   * rechaza con `ReglaNegocioError` y no persiste nada.
   */
  agregarSiDisponible(
    candidato: Turno,
    validar: (turnosDeLosRecursos: readonly Turno[]) => Violacion | null,
  ): Promise<Turno>;

  /** Lectura de los turnos del profesional o del sillón (cualquier estado). */
  listarPorRecursos(profesionalId: string, sillonId: string): Promise<readonly Turno[]>;
}
