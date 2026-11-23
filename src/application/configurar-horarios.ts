import { ConfiguracionInvalidaError, RecursoNoEncontradoError } from '../domain/errores.js';
import type { HorarioAtencion } from '../domain/horario-atencion.js';
import { tramoEnConflicto, validarTramo } from '../domain/reglas/configuracion.js';
import { exigirAdministrador } from './control-acceso.js';
import { obtenerOFallar, valorOFallar } from './configuracion-comun.js';
import type { AgregarTramoInput, ModificarTramoInput, PorIdInput } from './configuracion-input.js';
import type { GeneradorId } from './puertos/generador-id.js';
import type {
  ConsultorioRepositorio,
  HorarioAtencionRepositorio,
  ProfesionalRepositorio,
} from './puertos/repositorios.js';

export interface ConfigurarHorariosDependencias {
  readonly horarios: HorarioAtencionRepositorio;
  readonly profesionales: ProfesionalRepositorio;
  readonly consultorios: ConsultorioRepositorio;
  readonly ids: GeneradorId;
}

const OPERACION = 'configurar-horario';

/**
 * Alta, modificación y baja de tramos del horario de atención, del consultorio o de un profesional
 * (US-008, RN-28, RN-29). Los cambios rigen de inmediato: el alta, la disponibilidad y la
 * reprogramación leen los tramos en cada operación. Dejar turnos futuros fuera de horario queda
 * fuera de alcance (DD-27).
 */
export class ConfigurarHorarios {
  constructor(private readonly deps: ConfigurarHorariosDependencias) {}

  async agregarTramo(input: AgregarTramoInput): Promise<HorarioAtencion> {
    exigirAdministrador(input.actor, OPERACION);
    const { diaSemana, desde, hasta } = valorOFallar(
      validarTramo({ diaSemana: input.diaSemana, desde: input.desde, hasta: input.hasta }),
    );
    const consultorio = await obtenerOFallar(
      'consultorio',
      input.consultorioId,
      this.deps.consultorios.obtenerPorId(input.consultorioId),
    );
    if (input.profesionalId !== undefined) {
      const profesional = await this.deps.profesionales.obtenerPorId(input.profesionalId);
      if (profesional === undefined || profesional.consultorioId !== consultorio.id) {
        throw new RecursoNoEncontradoError('profesional', input.profesionalId);
      }
    }
    const existentes = await this.deps.horarios.listarPorConsultorio(consultorio.id);
    const choque = tramoEnConflicto({ diaSemana, desde, hasta, profesionalId: input.profesionalId }, existentes);
    if (choque !== undefined) throw solapado(choque);
    const tramo: HorarioAtencion = {
      id: this.deps.ids.siguiente(),
      consultorioId: consultorio.id,
      ...(input.profesionalId === undefined ? {} : { profesionalId: input.profesionalId }),
      diaSemana,
      desde,
      hasta,
    };
    await this.deps.horarios.guardar(tramo);
    return tramo;
  }

  async modificarTramo(input: ModificarTramoInput): Promise<HorarioAtencion> {
    exigirAdministrador(input.actor, OPERACION);
    const { cambios } = input;
    // Primero solo lo informado (los campos omitidos toman un valor que no puede fallar por sí solo),
    // después el tramo completo: así se valida igual que en el alta (D5).
    valorOFallar(
      validarTramo({
        diaSemana: cambios.diaSemana ?? 0,
        desde: cambios.desde ?? '00:00',
        hasta: cambios.hasta ?? '23:59',
      }),
    );
    const actual = await obtenerOFallar('horario', input.id, this.deps.horarios.obtenerPorId(input.id));
    const datos = valorOFallar(
      validarTramo({
        diaSemana: cambios.diaSemana ?? actual.diaSemana,
        desde: cambios.desde ?? actual.desde,
        hasta: cambios.hasta ?? actual.hasta,
      }),
    );
    const existentes = await this.deps.horarios.listarPorConsultorio(actual.consultorioId);
    const choque = tramoEnConflicto({ ...datos, profesionalId: actual.profesionalId }, existentes, actual.id);
    if (choque !== undefined) throw solapado(choque);
    const modificado: HorarioAtencion = { ...actual, ...datos };
    await this.deps.horarios.guardar(modificado);
    return modificado;
  }

  async eliminarTramo(input: PorIdInput): Promise<void> {
    exigirAdministrador(input.actor, OPERACION);
    await obtenerOFallar('horario', input.id, this.deps.horarios.obtenerPorId(input.id));
    await this.deps.horarios.eliminar(input.id);
  }
}

function solapado(conflicto: HorarioAtencion): ConfiguracionInvalidaError {
  return new ConfiguracionInvalidaError(
    'tramo',
    `se solapa con el tramo ${conflicto.desde}-${conflicto.hasta} del mismo día`,
    conflicto,
  );
}
