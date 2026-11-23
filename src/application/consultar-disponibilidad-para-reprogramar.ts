import { evaluarAnticipacionPaciente } from '../domain/reglas/anticipacion.js';
import { esFechaLocalValida, fechaEnHorizonte } from '../domain/reglas/horizonte-reserva.js';
import type { ConsultarDisponibilidad } from './consultar-disponibilidad.js';
import { ErrorEnlacePublico } from './errores-enlace-publico.js';
import { ErrorGestionTurnoPublica } from './errores-gestion-turno-publica.js';
import { ErrorReservaPublica } from './errores-reserva-publica.js';
import { horariosLibresDelDia } from './horarios-del-dia.js';
import type { DisponibilidadPublica } from './consultar-disponibilidad-publica.js';
import type { Reloj } from './puertos/reloj.js';
import type {
  ConsultorioRepositorio,
  PrestacionRepositorio,
  ProfesionalRepositorio,
} from './puertos/repositorios.js';
import type { ResolverTurnoDesdeToken } from './resolver-turno-desde-token.js';

export interface ConsultarDisponibilidadParaReprogramarDependencias {
  readonly resolver: Pick<ResolverTurnoDesdeToken, 'ejecutar'>;
  readonly consultar: Pick<ConsultarDisponibilidad, 'ejecutar'>;
  readonly prestaciones: Pick<PrestacionRepositorio, 'obtenerPorId'>;
  readonly profesionales: Pick<ProfesionalRepositorio, 'listarPorConsultorio'>;
  readonly consultorios: Pick<ConsultorioRepositorio, 'obtenerPorId'>;
  readonly reloj: Reloj;
}

/**
 * `GET /public/turnos/:token/disponibilidad` (D7): horarios del día en que están libres el mismo
 * profesional y el mismo sillón del turno (C-03 conserva ambos), dentro del horizonte (RN-30).
 * Orden de rechazos: token, anticipación de 24 h (RN-08) y `fecha`.
 */
export class ConsultarDisponibilidadParaReprogramar {
  constructor(private readonly deps: ConsultarDisponibilidadParaReprogramarDependencias) {}

  async ejecutar(input: { readonly token: string; readonly fecha: string }): Promise<DisponibilidadPublica> {
    const { deps } = this;
    const { turno } = await deps.resolver.ejecutar(input.token);
    const ahora = deps.reloj.ahora();
    if (evaluarAnticipacionPaciente(turno, 'paciente', ahora) !== null) {
      throw new ErrorGestionTurnoPublica('CONTACTAR_CONSULTORIO');
    }
    const prestacion = await deps.prestaciones.obtenerPorId(turno.prestacionId);
    const consultorio =
      prestacion === undefined ? undefined : await deps.consultorios.obtenerPorId(prestacion.consultorioId);
    if (prestacion === undefined || consultorio === undefined) throw new ErrorEnlacePublico();
    if (!esFechaLocalValida(input.fecha) || !fechaEnHorizonte(input.fecha, ahora, consultorio.zonaHoraria)) {
      throw new ErrorReservaPublica('DATOS_INVALIDOS', { campos: ['fecha'] });
    }
    const horarios = await horariosLibresDelDia({
      consultar: deps.consultar,
      prestacion,
      profesionales: await deps.profesionales.listarPorConsultorio(consultorio.id),
      fecha: input.fecha,
      zonaHoraria: consultorio.zonaHoraria,
      ahora,
      profesionalId: turno.profesionalId,
      sillonId: turno.sillonId,
    });
    return { fecha: input.fecha, zonaHoraria: consultorio.zonaHoraria, horarios };
  }
}
