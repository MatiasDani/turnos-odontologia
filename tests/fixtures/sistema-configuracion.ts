// Cableado de C-05: los casos de uso de configuración, el alta, la disponibilidad y la reprogramación
// comparten UNA instancia de cada repositorio en memoria (solo para tests, datos ficticios).
import { AgendarTurno } from '../../src/application/agendar-turno.js';
import { ConfigurarHorarios } from '../../src/application/configurar-horarios.js';
import { ConfigurarProfesionales } from '../../src/application/configurar-profesionales.js';
import { ConfigurarPrestaciones } from '../../src/application/configurar-prestaciones.js';
import { ConfigurarSillones } from '../../src/application/configurar-sillones.js';
import { ConsultarDisponibilidad } from '../../src/application/consultar-disponibilidad.js';
import { ReprogramarTurno } from '../../src/application/reprogramar-turno.js';
import type { Actor } from '../../src/domain/actor.js';
import {
  BloqueoRepositorioEnMemoria,
  ConsultorioRepositorioEnMemoria,
  HorarioAtencionRepositorioEnMemoria,
  PrestacionRepositorioEnMemoria,
  ProfesionalRepositorioEnMemoria,
  SillonRepositorioEnMemoria,
} from '../../src/adapters/persistence/en-memoria/catalogos.js';
import { crearEntorno, type Entorno, local } from './seed.js';
import { RecordatoriosEspia } from './recordatorios-espia.js';
import { RelojFijo } from './reloj-fijo.js';
import { GeneradorIdConPrefijo, GeneradorIdSecuencial } from './sistema.js';
import { TurnoRepositorioDePrueba } from './turno-repositorio-de-prueba.js';
import { actores } from './actores.js';

export const ADMINISTRADOR: Actor = actores.administrador;
export const RECEPCION: Actor = actores.recepcion;
export const ODONTOLOGO: Actor = actores.odontologo();
export const PACIENTE: Actor = { rol: 'paciente' };

/** Lunes 2026-11-23 10:00 local: el `ahora` del contexto común de los specs de C-05. */
export const AHORA_CONFIGURACION = local('2026-11-23', '10:00');

export type OpcionesSistemaConfiguracion = Partial<Entorno> & {
  /** Instante del reloj fijo; por defecto el lunes 2026-11-23 10:00 local. */
  readonly ahora?: Date;
  /** Consultorio `c1` sin profesionales, sillones, prestaciones, tramos ni bloqueos. */
  readonly vacio?: boolean;
};

export function crearSistemaConfiguracion(opciones: OpcionesSistemaConfiguracion = {}) {
  const { ahora, vacio, ...overrides } = opciones;
  const base = vacio
    ? { profesionales: [], sillones: [], prestaciones: [], horarios: [], bloqueos: [] }
    : {};
  const datos = crearEntorno({ ...base, ...overrides });
  const reloj = new RelojFijo(ahora ?? AHORA_CONFIGURACION);
  const turnos = new TurnoRepositorioDePrueba(datos.turnos);
  const repos = {
    profesionales: new ProfesionalRepositorioEnMemoria(datos.profesionales),
    sillones: new SillonRepositorioEnMemoria(datos.sillones),
    prestaciones: new PrestacionRepositorioEnMemoria(datos.prestaciones),
    consultorios: new ConsultorioRepositorioEnMemoria([datos.consultorio]),
    horarios: new HorarioAtencionRepositorioEnMemoria(datos.horarios),
    bloqueos: new BloqueoRepositorioEnMemoria(datos.bloqueos),
    turnos,
  };
  const recordatorios = new RecordatoriosEspia();
  return {
    datos,
    reloj,
    ...repos,
    configurarSillones: new ConfigurarSillones({
      sillones: repos.sillones,
      consultorios: repos.consultorios,
      turnos,
      reloj,
      ids: new GeneradorIdConPrefijo('sn-'),
    }),
    configurarHorarios: new ConfigurarHorarios({
      horarios: repos.horarios,
      profesionales: repos.profesionales,
      consultorios: repos.consultorios,
      ids: new GeneradorIdConPrefijo('hn-'),
    }),
    configurarProfesionales: new ConfigurarProfesionales({
      profesionales: repos.profesionales,
      prestaciones: repos.prestaciones,
      consultorios: repos.consultorios,
      turnos,
      reloj,
      ids: new GeneradorIdConPrefijo('pn-'),
    }),
    configurarPrestaciones: new ConfigurarPrestaciones({
      prestaciones: repos.prestaciones,
      consultorios: repos.consultorios,
      turnos,
      reloj,
      ids: new GeneradorIdConPrefijo('prn-'),
    }),
    agendarTurno: new AgendarTurno({ ...repos, ids: new GeneradorIdSecuencial() }),
    consultarDisponibilidad: new ConsultarDisponibilidad(repos),
    reprogramarTurno: new ReprogramarTurno({ ...repos, reloj, recordatorios }),
  };
}

export type SistemaConfiguracion = ReturnType<typeof crearSistemaConfiguracion>;
