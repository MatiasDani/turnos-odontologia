import { evaluarAnticipacionPaciente } from '../domain/reglas/anticipacion.js';
import { diasReservables, type DiasReservables } from '../domain/reglas/horizonte-reserva.js';
import { ErrorEnlacePublico } from './errores-enlace-publico.js';
import type { Reloj } from './puertos/reloj.js';
import type { ConsultorioRepositorio, PrestacionRepositorio } from './puertos/repositorios.js';
import type { ResolverTurnoDesdeToken } from './resolver-turno-desde-token.js';

/** Vista de gestión del propio turno (DD-31): sin `turnoId`, token, sillón ni datos del paciente. */
export interface VistaGestionTurno {
  readonly inicio: Date;
  readonly fin: Date;
  readonly prestacion: { readonly nombre: string };
  readonly profesional: { readonly nombre: string; readonly apellido: string };
  /** `true` si el turno ya está `confirmado`; evita ofrecer "Confirmar" a quien ya confirmó. */
  readonly asistenciaConfirmada: boolean;
  /** `true` solo con 24 h o más de anticipación (RN-08): el servidor decide, no el navegador. */
  readonly gestionOnline: boolean;
  readonly consultorio: {
    readonly nombre: string;
    readonly telefono: string;
    readonly email: string;
    readonly zonaHoraria: string;
  };
  readonly diasReservables: DiasReservables;
}

export interface ConsultarGestionDesdeTokenDependencias {
  readonly resolver: Pick<ResolverTurnoDesdeToken, 'ejecutar'>;
  readonly prestaciones: Pick<PrestacionRepositorio, 'obtenerPorId'>;
  readonly consultorios: Pick<ConsultorioRepositorio, 'obtenerPorId'>;
  readonly reloj: Reloj;
}

/** `GET /public/turnos/:token` (JSON): lo que la página de gestión necesita para decidir qué ofrecer. */
export class ConsultarGestionDesdeToken {
  constructor(private readonly deps: ConsultarGestionDesdeTokenDependencias) {}

  async ejecutar(input: { readonly token: string }): Promise<VistaGestionTurno> {
    const { deps } = this;
    const { turno, publico } = await deps.resolver.ejecutar(input.token);
    // Solo `reservado` y `confirmado` tienen gestión; cualquier otro estado es un enlace sin vigencia.
    if (turno.estado !== 'reservado' && turno.estado !== 'confirmado') throw new ErrorEnlacePublico();
    const prestacion = await deps.prestaciones.obtenerPorId(turno.prestacionId);
    const consultorio = prestacion === undefined ? undefined : await deps.consultorios.obtenerPorId(prestacion.consultorioId);
    if (consultorio === undefined) throw new ErrorEnlacePublico();
    const ahora = deps.reloj.ahora();
    return {
      inicio: publico.inicio,
      fin: publico.fin,
      prestacion: publico.prestacion,
      profesional: publico.profesional,
      asistenciaConfirmada: turno.estado === 'confirmado',
      gestionOnline: evaluarAnticipacionPaciente(turno, 'paciente', ahora) === null,
      consultorio: {
        nombre: consultorio.nombre,
        telefono: consultorio.telefonoContacto,
        email: consultorio.email,
        zonaHoraria: consultorio.zonaHoraria,
      },
      diasReservables: diasReservables(ahora, consultorio.zonaHoraria),
    };
  }
}
