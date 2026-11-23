import { esFechaLocalValida, fechaEnHorizonte } from '../domain/reglas/horizonte-reserva.js';
import type { ConsultarDisponibilidad } from './consultar-disponibilidad.js';
import { ErrorReservaPublica, type HorarioOfrecido } from './errores-reserva-publica.js';
import { horariosLibresDelDia } from './horarios-del-dia.js';
import type { Reloj } from './puertos/reloj.js';
import type {
  ConsultorioRepositorio,
  PrestacionRepositorio,
  ProfesionalRepositorio,
} from './puertos/repositorios.js';

export interface ConsultarDisponibilidadPublicaInput {
  readonly prestacionId: string;
  /** Día local del consultorio, 'AAAA-MM-DD'. */
  readonly fecha: string;
  readonly profesionalId?: string;
}

export interface DisponibilidadPublica {
  readonly fecha: string;
  readonly zonaHoraria: string;
  readonly horarios: readonly HorarioOfrecido[];
}

export interface ConsultarDisponibilidadPublicaDependencias {
  readonly consultar: Pick<ConsultarDisponibilidad, 'ejecutar'>;
  readonly prestaciones: Pick<PrestacionRepositorio, 'obtenerPorId'>;
  readonly profesionales: Pick<ProfesionalRepositorio, 'listarPorConsultorio'>;
  readonly consultorios: Pick<ConsultorioRepositorio, 'obtenerPorId'>;
  readonly reloj: Reloj;
}

/**
 * `GET /public/disponibilidad` (DD-29): horarios únicos libres de un día dentro del horizonte
 * (RN-30), solo de profesionales activos habilitados (RN-19) y sin datos internos (DD-18).
 */
export class ConsultarDisponibilidadPublica {
  constructor(private readonly deps: ConsultarDisponibilidadPublicaDependencias) {}

  async ejecutar(input: ConsultarDisponibilidadPublicaInput): Promise<DisponibilidadPublica> {
    const { deps } = this;
    const prestacion = await deps.prestaciones.obtenerPorId(input.prestacionId);
    if (prestacion === undefined || !prestacion.activa) throw new ErrorReservaPublica('PRESTACION_NO_DISPONIBLE');
    const consultorio = await deps.consultorios.obtenerPorId(prestacion.consultorioId);
    if (consultorio === undefined) throw new ErrorReservaPublica('PRESTACION_NO_DISPONIBLE');
    const profesionales = await deps.profesionales.listarPorConsultorio(consultorio.id);
    if (input.profesionalId !== undefined) {
      const elegido = profesionales.find((p) => p.id === input.profesionalId);
      if (elegido === undefined || !elegido.activo || !elegido.prestacionIds.includes(prestacion.id)) {
        throw new ErrorReservaPublica('PROFESIONAL_NO_DISPONIBLE');
      }
    }
    const ahora = deps.reloj.ahora();
    if (!esFechaLocalValida(input.fecha) || !fechaEnHorizonte(input.fecha, ahora, consultorio.zonaHoraria)) {
      throw new ErrorReservaPublica('DATOS_INVALIDOS', { campos: ['fecha'] });
    }
    const horarios = await horariosLibresDelDia({
      consultar: deps.consultar,
      prestacion,
      profesionales,
      fecha: input.fecha,
      zonaHoraria: consultorio.zonaHoraria,
      ahora,
      ...(input.profesionalId === undefined ? {} : { profesionalId: input.profesionalId }),
    });
    return { fecha: input.fecha, zonaHoraria: consultorio.zonaHoraria, horarios };
  }
}
