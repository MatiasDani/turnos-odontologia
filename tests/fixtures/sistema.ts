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
import type { GeneradorId } from '../../src/application/puertos/generador-id.js';
import type { Rol } from '../../src/domain/actor.js';
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
}

export function crearSistema(overrides: Partial<Entorno> = {}): Sistema {
  const datos = crearEntorno(overrides);
  const turnos = new TurnoRepositorioEnMemoria(datos.turnos);
  const agendarTurno = new AgendarTurno({
    profesionales: new ProfesionalRepositorioEnMemoria(datos.profesionales),
    sillones: new SillonRepositorioEnMemoria(datos.sillones),
    prestaciones: new PrestacionRepositorioEnMemoria(datos.prestaciones),
    consultorios: new ConsultorioRepositorioEnMemoria([datos.consultorio]),
    horarios: new HorarioAtencionRepositorioEnMemoria(datos.horarios),
    bloqueos: new BloqueoRepositorioEnMemoria(datos.bloqueos),
    turnos,
    ids: new GeneradorIdSecuencial(),
  });
  return { datos, turnos, agendarTurno };
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
