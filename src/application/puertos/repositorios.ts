import type { BloqueoHorario } from '../../domain/bloqueo-horario.js';
import type { Consultorio } from '../../domain/consultorio.js';
import type { Violacion } from '../../domain/errores.js';
import type { HorarioAtencion } from '../../domain/horario-atencion.js';
import type { Intervalo } from '../../domain/intervalo.js';
import type { Paciente } from '../../domain/paciente.js';
import type { Prestacion } from '../../domain/prestacion.js';
import type { Profesional } from '../../domain/profesional.js';
import type { EstadoRecordatorio, Recordatorio } from '../../domain/recordatorio.js';
import type { Sillon } from '../../domain/sillon.js';
import type { TokenGestion } from '../../domain/token-gestion.js';
import type { Turno } from '../../domain/turno.js';

export interface ProfesionalRepositorio {
  obtenerPorId(id: string): Promise<Profesional | undefined>;
  /** Profesionales del consultorio, activos e inactivos (el filtrado es de quien consulta). */
  listarPorConsultorio(consultorioId: string): Promise<readonly Profesional[]>;
  /** Alta o reemplazo por `id` (C-05, DD-28). */
  guardar(profesional: Profesional): Promise<void>;
}

export interface SillonRepositorio {
  obtenerPorId(id: string): Promise<Sillon | undefined>;
  /** Sillones del consultorio, activos e inactivos (el filtrado es de quien consulta). */
  listarPorConsultorio(consultorioId: string): Promise<readonly Sillon[]>;
  /** Alta o reemplazo por `id` (C-05, DD-28). */
  guardar(sillon: Sillon): Promise<void>;
}

export interface PrestacionRepositorio {
  obtenerPorId(id: string): Promise<Prestacion | undefined>;
  /** Prestaciones del consultorio, activas e inactivas. */
  listarPorConsultorio(consultorioId: string): Promise<readonly Prestacion[]>;
  /** Alta o reemplazo por `id` (C-05, DD-28). */
  guardar(prestacion: Prestacion): Promise<void>;
}

export interface ConsultorioRepositorio {
  obtenerPorId(id: string): Promise<Consultorio | undefined>;
}

export interface HorarioAtencionRepositorio {
  listarPorConsultorio(consultorioId: string): Promise<readonly HorarioAtencion[]>;
  /** Tramo por id, o `undefined` si no existe (C-05). */
  obtenerPorId(id: string): Promise<HorarioAtencion | undefined>;
  /** Alta o reemplazo por `id` (C-05, DD-28). */
  guardar(horario: HorarioAtencion): Promise<void>;
  /** Elimina el tramo; un id inexistente no hace nada. */
  eliminar(id: string): Promise<void>;
}

export interface BloqueoRepositorio {
  /** Bloqueos del profesional o del sillón que se solapan con el intervalo. */
  listarPorRecursos(
    profesionalId: string,
    sillonId: string,
    intervalo: Intervalo,
  ): Promise<readonly BloqueoHorario[]>;
  /** Alta o reemplazo por `id` (C-06). */
  guardar(bloqueo: BloqueoHorario): Promise<void>;
  /** Bloqueo por id, o `undefined` si no existe (C-06). */
  obtenerPorId(id: string): Promise<BloqueoHorario | undefined>;
  /** Elimina el bloqueo; un id inexistente no hace nada (C-06). */
  eliminar(id: string): Promise<void>;
  /** Lista todos los bloqueos registrados (C-06, C-08). */
  listarTodos(): Promise<readonly BloqueoHorario[]>;
}

/** Resultado de un cambio sobre un turno: el turno nuevo o la regla que lo impide (C-02, DD-19). */
export type ResultadoCambio =
  | { readonly ok: true; readonly turno: Turno }
  | { readonly ok: false; readonly violacion: Violacion };

/** Recursos de destino cuyos turnos deben leerse dentro de la sección crítica (C-03, RN-12). */
export interface RecursosDestino {
  readonly profesionalId: string;
  readonly sillonId: string;
}

/**
 * Callback de modificación atómica. Recibe el turno actual y, cuando se informan recursos de
 * destino, los turnos de esos recursos leídos dentro de la sección crítica (DD-22). El segundo
 * argumento es opcional para no alterar a los callers de C-02 y C-04.
 */
export type CambioTurno = (
  actual: Turno,
  turnosDeLosRecursos?: readonly Turno[],
) => ResultadoCambio;

/** Recurso cuyos turnos se consultan para decidir su desactivación (C-05, RN-27). */
export type RecursoDeTurno = {
  readonly tipo: 'profesional' | 'sillon' | 'prestacion';
  readonly id: string;
};

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

  /** Turnos del recurso, de cualquier estado; el dominio filtra (C-05, RN-27). */
  listarPorRecurso(recurso: RecursoDeTurno): Promise<readonly Turno[]>;

  /** Turno por id (cualquier estado), o `undefined` si no existe. */
  obtenerPorId(id: string): Promise<Turno | undefined>;

  /** Turnos del paciente, de cualquier estado. */
  listarPorPaciente(pacienteId: string): Promise<readonly Turno[]>;

  /**
   * Operación atómica de modificación (RN-12, DD-19): lee el turno actual, ejecuta `cambio` con él
   * y, si el resultado es `ok`, lo reemplaza y resuelve con el turno nuevo. Si se informan
   * `recursos`, el callback recibe también los turnos de esos recursos leídos en la misma sección
   * crítica; sin ellos el callback recibe un solo argumento (C-02, C-04). Si `cambio` informa una
   * violación rechaza con `ReglaNegocioError` y no modifica nada. Un id inexistente rechaza con
   * `RecursoNoEncontradoError('turno', id)`. El turno devuelto por `cambio` debe conservar el `id`.
   */
  actualizarSi(id: string, cambio: CambioTurno, recursos?: RecursosDestino): Promise<Turno>;
}

export interface PacienteRepositorio {
  /** Paciente con ese DNI normalizado, o `undefined` si no existe. */
  obtenerPorDni(dni: string): Promise<Paciente | undefined>;
  /** Paciente por id, o `undefined` si no existe (C-12: e-mail y consentimiento del turno). */
  obtenerPorId(id: string): Promise<Paciente | undefined>;
  /** Persiste el paciente (alta; si el id ya existe reemplaza el registro). */
  guardar(paciente: Paciente): Promise<void>;
}

export interface TokenGestionRepositorio {
  /** Persiste el registro; rechaza si el hash ya existe (índice único). */
  guardar(token: TokenGestion): Promise<void>;
  /** Registro por hash, vigente o invalidado. */
  obtenerPorHash(hash: string): Promise<TokenGestion | undefined>;
  /** Registro vigente (no invalidado) del turno. */
  obtenerPorTurno(turnoId: string): Promise<TokenGestion | undefined>;
  /** Invalida los registros vigentes del turno; sin registros vigentes no hace nada. */
  invalidar(turnoId: string, en: Date): Promise<void>;
}

/** Recordatorios de turnos (C-12, DD-21). Nunca guarda tokens. */
export interface RecordatorioRepositorio {
  /** Alta o reemplazo por `id`. */
  guardar(recordatorio: Recordatorio): Promise<void>;
  /** Recordatorio por `id`, o `undefined` si no existe (C-13: marca manual del envío). */
  obtenerPorId(id: string): Promise<Recordatorio | undefined>;
  /** Recordatorios del turno, de cualquier estado. */
  listarPorTurno(turnoId: string): Promise<readonly Recordatorio[]>;
  /** Recordatorios `pendiente` con `programadoPara <= hasta`, por `programadoPara` ascendente. */
  listarPendientesHasta(hasta: Date): Promise<readonly Recordatorio[]>;
  /** Recordatorios en ese estado. */
  listarPorEstado(estado: EstadoRecordatorio): Promise<readonly Recordatorio[]>;
}
