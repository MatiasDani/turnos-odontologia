// Cableado de los recordatorios por e-mail (C-12) sobre el seed ficticio (solo para tests).
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
import type { ConfiguracionRecordatorios } from '../../src/application/configuracion-recordatorios.js';
import { ConfirmarDesdeEnlace } from '../../src/application/confirmar-desde-enlace.js';
import { ConfirmarTurno } from '../../src/application/confirmar-turno.js';
import { ErrorEnlacePublico } from '../../src/application/errores-enlace-publico.js';
import { ConsultarDisponibilidad } from '../../src/application/consultar-disponibilidad.js';
import {
  EnviarRecordatoriosPendientes,
  type ResumenBarrido,
} from '../../src/application/enviar-recordatorios-pendientes.js';
import { ListarRecordatoriosFallidos } from '../../src/application/listar-recordatorios-fallidos.js';
import { ListarRecordatoriosPendientesWaMe } from '../../src/application/listar-recordatorios-wa-me-pendientes.js';
import { MarcarRecordatorioEnviado } from '../../src/application/marcar-recordatorio-enviado.js';
import type { Recordatorios } from '../../src/application/puertos/recordatorios.js';
import { RecordatoriosConWaMe } from '../../src/application/recordatorios-wa-me.js';
import { RecordatoriosEmail } from '../../src/application/recordatorios-email.js';
import { ReservarOnline, type ReservaOnlineConfirmada } from '../../src/application/reservar-online.js';
import { ServicioTokens } from '../../src/application/servicio-tokens.js';
import type { Paciente } from '../../src/domain/paciente.js';
import type { Recordatorio } from '../../src/domain/recordatorio.js';
import type { Turno } from '../../src/domain/turno.js';
import { NotificadorFalso } from './notificador-falso.js';
import { RelojFijo } from './reloj-fijo.js';
import { crearEntorno, type Entorno, LUNES, local } from './seed.js';
import { AHORA_POR_DEFECTO, GeneradorIdConPrefijo } from './sistema.js';
import { TurnoRepositorioDePrueba } from './turno-repositorio-de-prueba.js';

export const DOMINGO = '2026-11-22';
export const EMAIL_PA1 = 'carla.prueba@demo.test';
export const BASE_URL = 'http://localhost:3000';

/**
 * Pacientes del contexto común del spec de recordatorios: `pa1` con e-mail ficticio y
 * consentimiento, `pa2` sin e-mail, `pa3` sin consentimiento. El seed global no cambia.
 */
export function pacientesRecordatorios(): Paciente[] {
  return crearEntorno().pacientes.map((p) => {
    if (p.id === 'pa1') return { ...p, email: EMAIL_PA1 };
    if (p.id === 'pa3') return { ...p, consentimientoContacto: false };
    return p;
  });
}

export type OpcionesSistemaRecordatorios = Partial<Entorno> & {
  /** Instante del reloj fijo; por defecto el domingo 2026-11-22 08:00 local. */
  readonly ahora?: Date;
  /** Anticipación en horas; por defecto 24. */
  readonly horasAntes?: number;
  /** Repositorio de recordatorios a usar (p. ej. uno que falla). */
  readonly recordatorios?: RecordatorioRepositorioEnMemoria;
  /**
   * Si es `true`, `CancelarTurno` recibe un puerto cuyo `cancelarPendientes` rechaza (simula la
   * falla del adaptador real que deja un pendiente sin anular, DD-19).
   */
  readonly fallarAnulacion?: boolean;
  /** C-13: cablea el decorador `wa.me` en alta, reserva y cancelación (por defecto `false`). */
  readonly conWaMe?: boolean;
};

export interface SistemaRecordatorios {
  readonly datos: Entorno;
  readonly config: ConfiguracionRecordatorios;
  readonly reloj: RelojFijo;
  readonly turnos: TurnoRepositorioDePrueba;
  readonly pacientes: PacienteRepositorioEnMemoria;
  readonly repoRecordatorios: RecordatorioRepositorioEnMemoria;
  readonly hasher: HasherSha256;
  readonly servicioTokens: ServicioTokens;
  readonly notificador: NotificadorFalso;
  readonly recordatorios: RecordatoriosEmail;
  /** Alta de recepción con recordatorio (decorador sobre `AgendarTurno`). */
  readonly agendarTurno: AgendarTurnoConRecordatorio;
  /** Reserva online con el decorador inyectado como `agendar`. */
  readonly reservarOnline: ReservarOnline;
  readonly cancelarTurno: CancelarTurno;
  readonly confirmarTurno: ConfirmarTurno;
  readonly enviarPendientes: EnviarRecordatoriosPendientes;
  readonly listarFallidos: ListarRecordatoriosFallidos;
  readonly confirmarDesdeEnlace: ConfirmarDesdeEnlace;
  /** C-13: presentes solo cuando el fixture se crea con `conWaMe: true`. */
  readonly recordatoriosConWaMe?: RecordatoriosConWaMe | undefined;
  readonly listarPendientesWaMe?: ListarRecordatoriosPendientesWaMe | undefined;
  readonly marcarEnviado?: MarcarRecordatorioEnviado | undefined;
}

/** Cableado completo con repos en memoria, reloj fijo, tokens reales y notificador falso. */
export function crearSistemaRecordatorios(opciones: OpcionesSistemaRecordatorios = {}): SistemaRecordatorios {
  const { ahora, horasAntes, recordatorios: repoInyectado, fallarAnulacion, conWaMe, ...overrides } = opciones;
  const datos = crearEntorno({ turnos: [], pacientes: pacientesRecordatorios(), ...overrides });
  const config: ConfiguracionRecordatorios = { horasAntes: horasAntes ?? 24, baseUrlPublica: BASE_URL };
  const reloj = new RelojFijo(ahora ?? AHORA_POR_DEFECTO);
  const turnos = new TurnoRepositorioDePrueba(datos.turnos);
  const pacientes = new PacienteRepositorioEnMemoria(datos.pacientes);
  const repoRecordatorios = repoInyectado ?? new RecordatorioRepositorioEnMemoria();
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
  const servicioTokens = new ServicioTokens({
    generador: new GeneradorTokenCrypto(),
    hasher,
    tokens: new TokenGestionRepositorioEnMemoria(),
    turnos,
    reloj,
  });
  const recordatorios = new RecordatoriosEmail({
    recordatorios: repoRecordatorios,
    turnos,
    pacientes,
    ids: new GeneradorIdConPrefijo('rec-'),
    config,
  });
  const paraCancelar: Recordatorios =
    fallarAnulacion === true
      ? {
          programar: (turnoId) => recordatorios.programar(turnoId),
          cancelarPendientes: () => Promise.reject(new Error('anulación de recordatorios caída')),
        }
      : recordatorios;
  const recordatoriosConWaMe =
    conWaMe === true
      ? new RecordatoriosConWaMe({
          recordatorios: fallarAnulacion === true ? paraCancelar : recordatorios,
          repoRecordatorios,
          turnos,
          pacientes,
          profesionales: repos.profesionales,
          prestaciones: repos.prestaciones,
          consultorios: repos.consultorios,
          ids: new GeneradorIdConPrefijo('rec-wa-'),
          config,
        })
      : undefined;
  const agendarTurno = new AgendarTurnoConRecordatorio(
    new AgendarTurno({ ...repos, ids: new GeneradorIdConPrefijo('tu-') }),
    recordatoriosConWaMe ?? recordatorios,
  );
  const reservarOnline = new ReservarOnline({
    reloj,
    pacientes,
    turnos,
    profesionales: repos.profesionales,
    prestaciones: repos.prestaciones,
    consultorios: repos.consultorios,
    ids: new GeneradorIdConPrefijo('pn-'),
    consultar: new ConsultarDisponibilidad(repos),
    agendar: agendarTurno,
    tokens: servicioTokens,
  });
  const notificador = new NotificadorFalso();
  const confirmarTurno = new ConfirmarTurno({ turnos, reloj });
  const enviarPendientes = new EnviarRecordatoriosPendientes({
    reloj,
    recordatorios: repoRecordatorios,
    turnos,
    pacientes,
    profesionales: repos.profesionales,
    prestaciones: repos.prestaciones,
    consultorios: repos.consultorios,
    tokens: servicioTokens,
    notificador,
    config,
  });
  return {
    datos,
    config,
    reloj,
    turnos,
    pacientes,
    repoRecordatorios,
    hasher,
    servicioTokens,
    notificador,
    recordatorios,
    agendarTurno,
    reservarOnline,
    cancelarTurno: new CancelarTurno({ turnos, reloj, recordatorios: recordatoriosConWaMe ?? paraCancelar }),
    confirmarTurno,
    enviarPendientes,
    listarFallidos: new ListarRecordatoriosFallidos({ recordatorios: repoRecordatorios }),
    confirmarDesdeEnlace: new ConfirmarDesdeEnlace({ tokens: servicioTokens, turnos, confirmar: confirmarTurno }),
    recordatoriosConWaMe,
    listarPendientesWaMe:
      conWaMe === true ? new ListarRecordatoriosPendientesWaMe({ recordatorios: repoRecordatorios }) : undefined,
    marcarEnviado:
      conWaMe === true ? new MarcarRecordatorioEnviado({ recordatorios: repoRecordatorios, reloj }) : undefined,
  };
}

export interface AltaRecepcion {
  readonly pacienteId?: string;
  readonly dia?: string;
  readonly hora?: string;
}

/** Alta de recepción con los valores del turno base: `pa1`, `p1`, `s1`, `pr1`, lunes 09:00. */
export function agendarRecepcion(sistema: SistemaRecordatorios, alta: AltaRecepcion = {}): Promise<Turno> {
  return sistema.agendarTurno.ejecutar({
    actor: { rol: 'recepcion' },
    pacienteId: alta.pacienteId ?? 'pa1',
    profesionalId: 'p1',
    sillonId: 's1',
    prestacionId: 'pr1',
    inicio: local(alta.dia ?? LUNES, alta.hora ?? '09:00'),
  });
}

/** Reserva online de `pa1` (DNI existente, se vincula sin modificarlo) para `pr1` con `p1`. */
export function reservarOnlinePa1(sistema: SistemaRecordatorios, hora: string, dia: string = LUNES): Promise<ReservaOnlineConfirmada> {
  return sistema.reservarOnline.ejecutar({
    prestacionId: 'pr1',
    profesionalId: 'p1',
    inicio: local(dia, hora),
    paciente: {
      dni: '00000001',
      nombre: 'Carla',
      apellido: 'Prueba',
      telefono: '5491100000001',
      consentimientoContacto: true,
    },
  });
}

/** Recordatorios guardados del turno, en el orden del repositorio. */
export function recordatoriosDe(sistema: SistemaRecordatorios, turnoId: string): Promise<readonly Recordatorio[]> {
  return sistema.repoRecordatorios.listarPorTurno(turnoId);
}

/** Ejecuta un barrido con `ahora` en el día y la hora locales indicados. */
export function barrido(sistema: SistemaRecordatorios, dia: string, hora: string): Promise<ResumenBarrido> {
  sistema.reloj.fijar(local(dia, hora));
  return sistema.enviarPendientes.ejecutar();
}

/** Token del enlace de gestión de un mensaje enviado. */
export function tokenDelMensaje(texto: string): string {
  const coincidencia = /\/public\/turnos\/([^\s/]+)/.exec(texto);
  if (coincidencia?.[1] === undefined) throw new Error('El mensaje no tiene enlace de gestión');
  return decodeURIComponent(coincidencia[1]);
}

/** Espera un rechazo y devuelve el error público del enlace; falla si llega otro resultado. */
export async function rechazoEnlace(promesa: Promise<unknown>): Promise<ErrorEnlacePublico> {
  const error = await promesa.then(
    () => undefined,
    (e: unknown) => e,
  );
  if (!(error instanceof ErrorEnlacePublico)) {
    throw new Error(`Se esperaba un ErrorEnlacePublico y llegó: ${String(error)}`);
  }
  return error;
}
