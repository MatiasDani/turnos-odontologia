import { GeneradorTokenCrypto } from './adapters/crypto/generador-token-crypto.js';
import { HasherSha256 } from './adapters/crypto/hasher-sha256.js';
import {
  BloqueoRepositorioEnMemoria,
  ConsultorioRepositorioEnMemoria,
  HorarioAtencionRepositorioEnMemoria,
  PrestacionRepositorioEnMemoria,
  ProfesionalRepositorioEnMemoria,
  SillonRepositorioEnMemoria,
} from './adapters/persistence/en-memoria/catalogos.js';
import { GeneradorIdUuid } from './adapters/persistence/en-memoria/generador-id-uuid.js';
import { PacienteRepositorioEnMemoria } from './adapters/persistence/en-memoria/paciente-repositorio.js';
import { RecordatorioRepositorioEnMemoria } from './adapters/persistence/en-memoria/recordatorio-repositorio.js';
import { TokenGestionRepositorioEnMemoria } from './adapters/persistence/en-memoria/token-gestion-repositorio.js';
import { TurnoRepositorioEnMemoria } from './adapters/persistence/en-memoria/turno-repositorio.js';
import { AgendarTurno } from './application/agendar-turno.js';
import { CancelarTurno } from './application/cancelar-turno.js';
import type { CasosDeUsoPublicos } from './adapters/http/casos-de-uso.js';
import { CancelarTurnoDesdeToken } from './application/cancelar-turno-desde-token.js';
import { ConsultarDisponibilidadParaReprogramar } from './application/consultar-disponibilidad-para-reprogramar.js';
import { ConsultarDisponibilidadPublica } from './application/consultar-disponibilidad-publica.js';
import { ConsultarGestionDesdeToken } from './application/consultar-gestion-desde-token.js';
import { ConfirmarDesdeEnlace } from './application/confirmar-desde-enlace.js';
import { ConfirmarTurno } from './application/confirmar-turno.js';
import { ConsultarDisponibilidad } from './application/consultar-disponibilidad.js';
import { EmitirTokenConRecordatorio } from './application/emitir-token-con-recordatorio.js';
import type { GeneradorId } from './application/puertos/generador-id.js';
import type { Reloj } from './application/puertos/reloj.js';
import type { TurnoRepositorio } from './application/puertos/repositorios.js';
import { ListarCatalogoPublico } from './application/listar-catalogo-publico.js';
import { ListarProfesionalesPublicos } from './application/listar-profesionales-publicos.js';
import { RecordatoriosEmail } from './application/recordatorios-email.js';
import { ReprogramarTurno } from './application/reprogramar-turno.js';
import { ReprogramarDesdeTokenPublica } from './application/reprogramar-desde-token-publica.js';
import { ReprogramarTurnoDesdeToken } from './application/reprogramar-turno-desde-token.js';
import { ReservarOnline } from './application/reservar-online.js';
import { ReservarOnlinePublica } from './application/reservar-online-publica.js';
import { ResolverTurnoDesdeToken } from './application/resolver-turno-desde-token.js';
import { ServicioTokens } from './application/servicio-tokens.js';
import type { BloqueoHorario } from './domain/bloqueo-horario.js';
import type { Consultorio } from './domain/consultorio.js';
import type { HorarioAtencion } from './domain/horario-atencion.js';
import type { Paciente } from './domain/paciente.js';
import type { Prestacion } from './domain/prestacion.js';
import type { Profesional } from './domain/profesional.js';
import type { Sillon } from './domain/sillon.js';
import type { Turno } from './domain/turno.js';

/** Datos con los que arranca el sistema en memoria (siempre ficticios). */
export interface DatosIniciales {
  readonly consultorio: Consultorio;
  readonly profesionales: readonly Profesional[];
  readonly sillones: readonly Sillon[];
  readonly prestaciones: readonly Prestacion[];
  readonly pacientes: readonly Paciente[];
  readonly horarios: readonly HorarioAtencion[];
  readonly bloqueos: readonly BloqueoHorario[];
  readonly turnos: readonly Turno[];
}

export interface OpcionesComposicion {
  readonly reloj: Reloj;
  readonly datos: DatosIniciales;
  /** Repositorio de turnos a usar (tests: uno con ganchos o que falla); por defecto en memoria. */
  readonly turnos?: TurnoRepositorio;
  /** Generador de ids de turnos y pacientes; por defecto UUID. */
  readonly ids?: GeneradorId;
  readonly horasAntesRecordatorio?: number;
}

/**
 * Raíz de composición (DD-29): único lugar que conoce adaptadores concretos. Cablea repos en
 * memoria, tokens reales y los casos de uso de C-02 a C-12 con el `Reloj` inyectado.
 */
export function componerNucleo(opciones: OpcionesComposicion) {
  const { reloj, datos } = opciones;
  const ids = opciones.ids ?? new GeneradorIdUuid();
  const turnos: TurnoRepositorio = opciones.turnos ?? new TurnoRepositorioEnMemoria(datos.turnos);
  const pacientes = new PacienteRepositorioEnMemoria([...datos.pacientes]);
  const repos = {
    profesionales: new ProfesionalRepositorioEnMemoria(datos.profesionales),
    sillones: new SillonRepositorioEnMemoria(datos.sillones),
    prestaciones: new PrestacionRepositorioEnMemoria(datos.prestaciones),
    consultorios: new ConsultorioRepositorioEnMemoria([datos.consultorio]),
    horarios: new HorarioAtencionRepositorioEnMemoria([...datos.horarios]),
    bloqueos: new BloqueoRepositorioEnMemoria([...datos.bloqueos]),
    turnos,
  };
  const repoRecordatorios = new RecordatorioRepositorioEnMemoria();
  const recordatorios = new RecordatoriosEmail({
    recordatorios: repoRecordatorios,
    turnos,
    pacientes,
    ids,
    config: { horasAntes: opciones.horasAntesRecordatorio ?? 24 },
  });
  const servicioTokens = new ServicioTokens({
    generador: new GeneradorTokenCrypto(),
    hasher: new HasherSha256(),
    tokens: new TokenGestionRepositorioEnMemoria(),
    turnos,
    reloj,
  });
  const consultarDisponibilidad = new ConsultarDisponibilidad(repos);
  // El recordatorio se programa al emitir el token (ver EmitirTokenConRecordatorio), no en el alta.
  const agendar = new AgendarTurno({ ...repos, ids });
  const reservarOnline = new ReservarOnline({
    reloj,
    pacientes,
    turnos,
    profesionales: repos.profesionales,
    prestaciones: repos.prestaciones,
    consultorios: repos.consultorios,
    ids,
    consultar: consultarDisponibilidad,
    agendar,
    tokens: new EmitirTokenConRecordatorio(servicioTokens, recordatorios),
  });
  const resolver = new ResolverTurnoDesdeToken({
    tokens: servicioTokens,
    turnos,
    prestaciones: repos.prestaciones,
    profesionales: repos.profesionales,
  });
  const confirmarTurno = new ConfirmarTurno({ turnos, reloj });
  const cancelarTurno = new CancelarTurno({ turnos, reloj, recordatorios });
  const reprogramarTurno = new ReprogramarTurno({ ...repos, reloj, recordatorios });
  return {
    reloj,
    repos,
    pacientes,
    repoRecordatorios,
    servicioTokens,
    consultarDisponibilidad,
    reservarOnline,
    resolver,
    confirmarDesdeEnlace: new ConfirmarDesdeEnlace({ tokens: servicioTokens, turnos, confirmar: confirmarTurno }),
    cancelarDesdeToken: new CancelarTurnoDesdeToken({ resolver, reloj, cancelar: cancelarTurno }),
    reprogramarDesdeToken: new ReprogramarTurnoDesdeToken({ resolver, reloj, reprogramar: reprogramarTurno }),
  };
}

export type NucleoPublico = ReturnType<typeof componerNucleo>;

/** Casos de uso que consume la capa HTTP pública (DD-29): nada de repositorios ni de dominio crudo. */
export function crearCasosPublicos(nucleo: NucleoPublico, consultorioId: string): CasosDeUsoPublicos {
  const { repos, reloj, resolver } = nucleo;
  return {
    catalogo: new ListarCatalogoPublico({
      consultorioId,
      consultorios: repos.consultorios,
      prestaciones: repos.prestaciones,
      reloj,
    }),
    profesionales: new ListarProfesionalesPublicos({
      prestaciones: repos.prestaciones,
      profesionales: repos.profesionales,
    }),
    disponibilidad: new ConsultarDisponibilidadPublica({
      consultar: nucleo.consultarDisponibilidad,
      prestaciones: repos.prestaciones,
      profesionales: repos.profesionales,
      consultorios: repos.consultorios,
      reloj,
    }),
    reservar: new ReservarOnlinePublica({
      reservar: nucleo.reservarOnline,
      prestaciones: repos.prestaciones,
      consultorios: repos.consultorios,
      reloj,
    }),
    gestion: new ConsultarGestionDesdeToken({
      resolver,
      prestaciones: repos.prestaciones,
      consultorios: repos.consultorios,
      reloj,
    }),
    confirmar: nucleo.confirmarDesdeEnlace,
    cancelar: nucleo.cancelarDesdeToken,
    disponibilidadParaReprogramar: new ConsultarDisponibilidadParaReprogramar({
      resolver,
      consultar: nucleo.consultarDisponibilidad,
      prestaciones: repos.prestaciones,
      profesionales: repos.profesionales,
      consultorios: repos.consultorios,
      reloj,
    }),
    reprogramar: new ReprogramarDesdeTokenPublica({
      reprogramar: nucleo.reprogramarDesdeToken,
      resolver,
      prestaciones: repos.prestaciones,
      consultorios: repos.consultorios,
      reloj,
    }),
  };
}

/** Sistema completo: núcleo (C-02 a C-12) más los casos de uso públicos de C-14. */
export function componerSistema(opciones: OpcionesComposicion) {
  const nucleo = componerNucleo(opciones);
  return { ...nucleo, casos: crearCasosPublicos(nucleo, opciones.datos.consultorio.id) };
}

export type SistemaCompuesto = ReturnType<typeof componerSistema>;
