import { RecursoNoEncontradoError } from '../domain/errores.js';
import type { Profesional } from '../domain/profesional.js';
import { validarProfesional } from '../domain/reglas/configuracion.js';
import { exigirAdministrador } from './control-acceso.js';
import { exigirSinTurnosActivosFuturos, obtenerOFallar, valorOFallar } from './configuracion-comun.js';
import type { AltaProfesionalInput, ModificarProfesionalInput, PorIdInput } from './configuracion-input.js';
import type { GeneradorId } from './puertos/generador-id.js';
import type { Reloj } from './puertos/reloj.js';
import type {
  ConsultorioRepositorio,
  PrestacionRepositorio,
  ProfesionalRepositorio,
  TurnoRepositorio,
} from './puertos/repositorios.js';

export interface ConfigurarProfesionalesDependencias {
  readonly profesionales: ProfesionalRepositorio;
  readonly prestaciones: PrestacionRepositorio;
  readonly consultorios: ConsultorioRepositorio;
  readonly turnos: TurnoRepositorio;
  readonly reloj: Reloj;
  readonly ids: GeneradorId;
}

const OPERACION = 'configurar-profesional';

/**
 * Alta, modificación, desactivación y reactivación de profesionales (US-008, C-05). Las prestaciones
 * que deja de realizar un profesional dejan de ofrecerlo en la disponibilidad (RN-13).
 */
export class ConfigurarProfesionales {
  constructor(private readonly deps: ConfigurarProfesionalesDependencias) {}

  async alta(input: AltaProfesionalInput): Promise<Profesional> {
    exigirAdministrador(input.actor, OPERACION);
    const datos = valorOFallar(
      validarProfesional({
        nombre: input.nombre,
        apellido: input.apellido,
        matricula: input.matricula,
        prestacionIds: input.prestacionIds,
      }),
    );
    const consultorio = await obtenerOFallar(
      'consultorio',
      input.consultorioId,
      this.deps.consultorios.obtenerPorId(input.consultorioId),
    );
    await this.exigirPrestaciones(consultorio.id, datos.prestacionIds);
    const profesional: Profesional = {
      id: this.deps.ids.siguiente(),
      consultorioId: consultorio.id,
      ...datos,
      activo: true,
    };
    await this.deps.profesionales.guardar(profesional);
    return profesional;
  }

  async modificar(input: ModificarProfesionalInput): Promise<Profesional> {
    exigirAdministrador(input.actor, OPERACION);
    const { cambios } = input;
    // Primero solo lo informado (los campos omitidos toman un valor válido), después la entidad completa.
    valorOFallar(
      validarProfesional({
        nombre: cambios.nombre ?? 'x',
        apellido: cambios.apellido ?? 'x',
        matricula: cambios.matricula,
        prestacionIds: cambios.prestacionIds ?? [],
      }),
    );
    const actual = await obtenerOFallar('profesional', input.id, this.deps.profesionales.obtenerPorId(input.id));
    const datos = valorOFallar(
      validarProfesional({
        nombre: cambios.nombre ?? actual.nombre,
        apellido: cambios.apellido ?? actual.apellido,
        matricula: cambios.matricula ?? actual.matricula,
        prestacionIds: cambios.prestacionIds ?? actual.prestacionIds,
      }),
    );
    if (cambios.prestacionIds !== undefined) await this.exigirPrestaciones(actual.consultorioId, datos.prestacionIds);
    const modificado: Profesional = {
      id: actual.id,
      consultorioId: actual.consultorioId,
      ...datos,
      activo: actual.activo,
    };
    await this.deps.profesionales.guardar(modificado);
    return modificado;
  }

  async desactivar(input: PorIdInput): Promise<Profesional> {
    exigirAdministrador(input.actor, OPERACION);
    const actual = await obtenerOFallar('profesional', input.id, this.deps.profesionales.obtenerPorId(input.id));
    if (!actual.activo) return actual;
    exigirSinTurnosActivosFuturos(
      await this.deps.turnos.listarPorRecurso({ tipo: 'profesional', id: actual.id }),
      this.deps.reloj.ahora(),
    );
    const inactivo: Profesional = { ...actual, activo: false };
    await this.deps.profesionales.guardar(inactivo);
    return inactivo;
  }

  async reactivar(input: PorIdInput): Promise<Profesional> {
    exigirAdministrador(input.actor, OPERACION);
    const actual = await obtenerOFallar('profesional', input.id, this.deps.profesionales.obtenerPorId(input.id));
    if (actual.activo) return actual;
    const activo: Profesional = { ...actual, activo: true };
    await this.deps.profesionales.guardar(activo);
    return activo;
  }

  /** Cada prestación debe existir y ser del mismo consultorio; si no, es una prestación inexistente. */
  private async exigirPrestaciones(consultorioId: string, ids: readonly string[]): Promise<void> {
    for (const id of ids) {
      const prestacion = await this.deps.prestaciones.obtenerPorId(id);
      if (prestacion === undefined || prestacion.consultorioId !== consultorioId) {
        throw new RecursoNoEncontradoError('prestacion', id);
      }
    }
  }
}
