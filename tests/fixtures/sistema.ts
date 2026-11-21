// Cableado de repos en memoria + caso de uso sobre el seed ficticio (solo para tests).
import {
  BloqueoRepositorioEnMemoria,
  ConsultorioRepositorioEnMemoria,
  HorarioAtencionRepositorioEnMemoria,
  PrestacionRepositorioEnMemoria,
  ProfesionalRepositorioEnMemoria,
  SillonRepositorioEnMemoria,
} from '../../src/adapters/persistence/en-memoria/catalogos.js';
import { TurnoRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/turno-repositorio.js';
import { AgendarTurno } from '../../src/application/agendar-turno.js';
import { ConsultarDisponibilidad } from '../../src/application/consultar-disponibilidad.js';
import type { ConsultarDisponibilidadInput } from '../../src/application/consultar-disponibilidad-input.js';
import type { GeneradorId } from '../../src/application/puertos/generador-id.js';
import type { Rol } from '../../src/domain/actor.js';
import type { Hueco } from '../../src/domain/disponibilidad/hueco.js';
import type { Turno } from '../../src/domain/turno.js';
import { crearEntorno, type Entorno, LUNES, local } from './seed.js';

/** Ids deterministas: t-1, t-2, ... */
export class GeneradorIdSecuencial implements GeneradorId {
  private contador = 0;
  siguiente(): string {
    this.contador += 1;
    return `t-${this.contador}`;
  }
}

export interface Sistema {
  readonly datos: Entorno;
  readonly turnos: TurnoRepositorioEnMemoria;
  readonly agendarTurno: AgendarTurno;
  readonly consultarDisponibilidad: ConsultarDisponibilidad;
}

export function crearSistema(overrides: Partial<Entorno> = {}): Sistema {
  const datos = crearEntorno(overrides);
  const turnos = new TurnoRepositorioEnMemoria(datos.turnos);
  const repos = {
    profesionales: new ProfesionalRepositorioEnMemoria(datos.profesionales),
    sillones: new SillonRepositorioEnMemoria(datos.sillones),
    prestaciones: new PrestacionRepositorioEnMemoria(datos.prestaciones),
    consultorios: new ConsultorioRepositorioEnMemoria([datos.consultorio]),
    horarios: new HorarioAtencionRepositorioEnMemoria(datos.horarios),
    bloqueos: new BloqueoRepositorioEnMemoria(datos.bloqueos),
    turnos,
  };
  const agendarTurno = new AgendarTurno({ ...repos, ids: new GeneradorIdSecuencial() });
  const consultarDisponibilidad = new ConsultarDisponibilidad(repos);
  return { datos, turnos, agendarTurno, consultarDisponibilidad };
}

export interface Solicitud {
  rol?: Rol;
  pacienteId?: string;
  profesionalId?: string;
  sillonId?: string;
  prestacionId?: string;
  dia?: string;
  hora: string;
  duracion?: number;
}

/** Agenda con valores por defecto: recepción, pa1, p1, s1, pr1, lunes. */
export function agendar(sistema: Sistema, s: Solicitud): Promise<Turno> {
  return sistema.agendarTurno.ejecutar({
    actor: { rol: s.rol ?? 'recepcion' },
    pacienteId: s.pacienteId ?? 'pa1',
    profesionalId: s.profesionalId ?? 'p1',
    sillonId: s.sillonId ?? 's1',
    prestacionId: s.prestacionId ?? 'pr1',
    inicio: local(s.dia ?? LUNES, s.hora),
    duracionMinutos: s.duracion,
  });
}

const DIA_EN_MS = 24 * 60 * 60_000;

/** Domingo anterior al lunes del seed, 08:00 local (valor por defecto de `ahora` en los escenarios). */
export const AHORA_POR_DEFECTO = local('2026-11-22', '08:00');

export interface Consulta {
  rol?: Rol;
  prestacionId?: string;
  /** Día consultado completo [00:00, 00:00 del día siguiente); por defecto el lunes. */
  dia?: string;
  /** Si se informa, reemplaza al rango del día. */
  rango?: { desde: Date; hasta: Date };
  ahora?: Date;
  duracion?: number;
  paso?: number;
  profesionalId?: string;
}

/** Consulta con los valores por defecto del contexto común del spec: recepción, pr1, paso 15, lunes. */
export function consultar(sistema: Sistema, c: Consulta = {}): Promise<readonly Hueco[]> {
  const desde = local(c.dia ?? LUNES, '00:00');
  const input: ConsultarDisponibilidadInput = {
    actor: { rol: c.rol ?? 'recepcion' },
    prestacionId: c.prestacionId ?? 'pr1',
    rango: c.rango ?? { desde, hasta: new Date(desde.getTime() + DIA_EN_MS) },
    ahora: c.ahora ?? AHORA_POR_DEFECTO,
    pasoMinutos: c.paso ?? 15,
    duracionMinutos: c.duracion,
    profesionalId: c.profesionalId,
  };
  return sistema.consultarDisponibilidad.ejecutar(input);
}
