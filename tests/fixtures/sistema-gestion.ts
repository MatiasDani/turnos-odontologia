// Cableado de la gestión pública por token (C-11) sobre los repos del seed ficticio (solo tests).
import {
  BloqueoRepositorioEnMemoria,
  ConsultorioRepositorioEnMemoria,
  HorarioAtencionRepositorioEnMemoria,
  PrestacionRepositorioEnMemoria,
  ProfesionalRepositorioEnMemoria,
  SillonRepositorioEnMemoria,
} from '../../src/adapters/persistence/en-memoria/catalogos.js';
import { GeneradorTokenCrypto } from '../../src/adapters/crypto/generador-token-crypto.js';
import { HasherSha256 } from '../../src/adapters/crypto/hasher-sha256.js';
import { PacienteRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/paciente-repositorio.js';
import { RecordatorioRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/recordatorio-repositorio.js';
import { TokenGestionRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/token-gestion-repositorio.js';
import { AgendarTurno } from '../../src/application/agendar-turno.js';
import { AgendarTurnoConRecordatorio } from '../../src/application/agendar-turno-con-recordatorio.js';
import { CancelarTurno } from '../../src/application/cancelar-turno.js';
import { CancelarTurnoDesdeToken } from '../../src/application/cancelar-turno-desde-token.js';
import { ConsultarTurnoDesdeToken } from '../../src/application/consultar-turno-desde-token.js';
import type { ConfiguracionRecordatorios } from '../../src/application/configuracion-recordatorios.js';
import {
  EnviarRecordatoriosPendientes,
  type ResumenBarrido,
} from '../../src/application/enviar-recordatorios-pendientes.js';
import { ReprogramarTurno } from '../../src/application/reprogramar-turno.js';
import { ReprogramarTurnoDesdeToken } from '../../src/application/reprogramar-turno-desde-token.js';
import { RecordatoriosEmail } from '../../src/application/recordatorios-email.js';
import { ResolverTurnoDesdeToken } from '../../src/application/resolver-turno-desde-token.js';
import { ServicioTokens } from '../../src/application/servicio-tokens.js';
import { NotificadorFalso } from './notificador-falso.js';
import { RelojFijo } from './reloj-fijo.js';
import { crearEntorno, local, type Entorno } from './seed.js';
import {
  BASE_URL,
  DOMINGO,
  pacientesRecordatorios,
  tokenDelMensaje,
} from './sistema-recordatorios.js';
import { AHORA_POR_DEFECTO, GeneradorIdConPrefijo, turnoBaseCancelacion } from './sistema.js';
import { TurnoRepositorioDePrueba } from './turno-repositorio-de-prueba.js';

const TURNO_BASE_ID = 't-base';

export type OpcionesSistemaGestion = Partial<Entorno> & {
  /** Instante del reloj fijo; por defecto el domingo 2026-11-22 08:00 local (25 h antes del turno base). */
  readonly ahora?: Date;
};

export interface SistemaGestion {
  readonly datos: Entorno;
  readonly reloj: RelojFijo;
  readonly turnos: TurnoRepositorioDePrueba;
  readonly tokens: TokenGestionRepositorioEnMemoria;
  readonly repoRecordatorios: RecordatorioRepositorioEnMemoria;
  readonly servicioTokens: ServicioTokens;
  readonly notificador: NotificadorFalso;
  readonly agendarTurno: AgendarTurnoConRecordatorio;
  readonly cancelarTurno: CancelarTurno;
  readonly reprogramarTurno: ReprogramarTurno;
  readonly enviarPendientes: EnviarRecordatoriosPendientes;
  readonly consultarDesdeToken: ConsultarTurnoDesdeToken;
  readonly cancelarDesdeToken: CancelarTurnoDesdeToken;
  readonly reprogramarDesdeToken: ReprogramarTurnoDesdeToken;
}

/**
 * Cablea el turno base de C-02 con token, recordatorios reales y los tres casos de uso de C-11.
 * Un mismo reloj y unos mismos repositorios garantizan que resolver, anticipación y delegación
 * vean el mismo estado.
 */
export function crearSistemaGestion(opciones: OpcionesSistemaGestion = {}): SistemaGestion {
  const { ahora, ...overrides } = opciones;
  const datos = crearEntorno({
    turnos: [turnoBaseCancelacion()],
    pacientes: pacientesRecordatorios(),
    ...overrides,
  });
  const reloj = new RelojFijo(ahora ?? AHORA_POR_DEFECTO);
  const turnos = new TurnoRepositorioDePrueba(datos.turnos);
  const tokens = new TokenGestionRepositorioEnMemoria();
  const repoRecordatorios = new RecordatorioRepositorioEnMemoria([
    {
      id: 'rec-base',
      turnoId: TURNO_BASE_ID,
      canal: 'email',
      programadoPara: local(DOMINGO, '09:00'),
      estado: 'pendiente',
    },
  ]);
  const hasher = new HasherSha256();
  const repos = {
    profesionales: new ProfesionalRepositorioEnMemoria(datos.profesionales),
    sillones: new SillonRepositorioEnMemoria(datos.sillones),
    prestaciones: new PrestacionRepositorioEnMemoria(datos.prestaciones),
    consultorios: new ConsultorioRepositorioEnMemoria([datos.consultorio]),
    horarios: new HorarioAtencionRepositorioEnMemoria(datos.horarios),
    bloqueos: new BloqueoRepositorioEnMemoria(datos.bloqueos),
    turnos,
  };
  const config: ConfiguracionRecordatorios = { horasAntes: 24, baseUrlPublica: BASE_URL };
  const recordatorios = new RecordatoriosEmail({
    recordatorios: repoRecordatorios,
    turnos,
    pacientes: new PacienteRepositorioEnMemoria(datos.pacientes),
    ids: new GeneradorIdConPrefijo('rec-'),
    config,
  });
  const servicioTokens = new ServicioTokens({
    generador: new GeneradorTokenCrypto(),
    hasher,
    tokens,
    turnos,
    reloj,
  });
  const resolver = new ResolverTurnoDesdeToken({
    tokens: servicioTokens,
    turnos,
    prestaciones: repos.prestaciones,
    profesionales: repos.profesionales,
  });
  const notificador = new NotificadorFalso();
  const cancelarTurno = new CancelarTurno({ turnos, reloj, recordatorios });
  const reprogramarTurno = new ReprogramarTurno({ ...repos, reloj, recordatorios });
  return {
    datos,
    reloj,
    turnos,
    tokens,
    repoRecordatorios,
    servicioTokens,
    notificador,
    agendarTurno: new AgendarTurnoConRecordatorio(
      new AgendarTurno({ ...repos, ids: new GeneradorIdConPrefijo('tu-') }),
      recordatorios,
    ),
    cancelarTurno,
    reprogramarTurno,
    enviarPendientes: new EnviarRecordatoriosPendientes({
      reloj,
      recordatorios: repoRecordatorios,
      turnos,
      pacientes: new PacienteRepositorioEnMemoria(datos.pacientes),
      profesionales: repos.profesionales,
      prestaciones: repos.prestaciones,
      consultorios: repos.consultorios,
      tokens: servicioTokens,
      notificador,
      config,
    }),
    consultarDesdeToken: new ConsultarTurnoDesdeToken({ resolver }),
    cancelarDesdeToken: new CancelarTurnoDesdeToken({ resolver, reloj, cancelar: cancelarTurno }),
    reprogramarDesdeToken: new ReprogramarTurnoDesdeToken({ resolver, reloj, reprogramar: reprogramarTurno }),
  };
}

/** Ejecuta un barrido con el reloj fijado en el día y la hora locales indicados. */
export function barrido(sistema: SistemaGestion, dia: string = DOMINGO, hora = '09:00'): Promise<ResumenBarrido> {
  sistema.reloj.fijar(local(dia, hora));
  return sistema.enviarPendientes.ejecutar();
}

/** Token del último mensaje enviado por un barrido (el que quedó en el enlace del recordatorio). */
export function tokenDelBarrido(sistema: SistemaGestion): string {
  const mensaje = sistema.notificador.enviados.at(-1);
  if (mensaje === undefined) throw new Error('El barrido no envió ningún mensaje');
  return tokenDelMensaje(mensaje.texto);
}
