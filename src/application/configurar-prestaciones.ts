import type { Prestacion } from '../domain/prestacion.js';
import { validarPrestacion } from '../domain/reglas/configuracion.js';
import { exigirAdministrador } from './control-acceso.js';
import { exigirSinTurnosActivosFuturos, obtenerOFallar, valorOFallar } from './configuracion-comun.js';
import type { AltaPrestacionInput, ModificarPrestacionInput, PorIdInput } from './configuracion-input.js';
import type { GeneradorId } from './puertos/generador-id.js';
import type { Reloj } from './puertos/reloj.js';
import type {
  ConsultorioRepositorio,
  PrestacionRepositorio,
  TurnoRepositorio,
} from './puertos/repositorios.js';

export interface ConfigurarPrestacionesDependencias {
  readonly prestaciones: PrestacionRepositorio;
  readonly consultorios: ConsultorioRepositorio;
  readonly turnos: TurnoRepositorio;
  readonly reloj: Reloj;
  readonly ids: GeneradorId;
}

const OPERACION = 'configurar-prestacion';

/**
 * Alta, modificación, desactivación y reactivación de prestaciones (US-008, C-05). Modificar la
 * duración no altera los turnos existentes: cada turno guarda su propia `duracionMinutos` (RN-06).
 */
export class ConfigurarPrestaciones {
  constructor(private readonly deps: ConfigurarPrestacionesDependencias) {}

  async alta(input: AltaPrestacionInput): Promise<Prestacion> {
    exigirAdministrador(input.actor, OPERACION);
    const datos = valorOFallar(
      validarPrestacion({ nombre: input.nombre, duracionMinutos: input.duracionMinutos }),
    );
    const consultorio = await obtenerOFallar(
      'consultorio',
      input.consultorioId,
      this.deps.consultorios.obtenerPorId(input.consultorioId),
    );
    const prestacion: Prestacion = {
      id: this.deps.ids.siguiente(),
      consultorioId: consultorio.id,
      ...datos,
      activa: true,
    };
    await this.deps.prestaciones.guardar(prestacion);
    return prestacion;
  }

  async modificar(input: ModificarPrestacionInput): Promise<Prestacion> {
    exigirAdministrador(input.actor, OPERACION);
    const { cambios } = input;
    // Primero solo lo informado (los campos omitidos toman un valor válido), después la entidad completa.
    valorOFallar(validarPrestacion({ nombre: cambios.nombre ?? 'x', duracionMinutos: cambios.duracionMinutos ?? 5 }));
    const actual = await obtenerOFallar('prestacion', input.id, this.deps.prestaciones.obtenerPorId(input.id));
    const datos = valorOFallar(
      validarPrestacion({
        nombre: cambios.nombre ?? actual.nombre,
        duracionMinutos: cambios.duracionMinutos ?? actual.duracionMinutos,
      }),
    );
    const modificada: Prestacion = { ...actual, ...datos };
    await this.deps.prestaciones.guardar(modificada);
    return modificada;
  }

  async desactivar(input: PorIdInput): Promise<Prestacion> {
    exigirAdministrador(input.actor, OPERACION);
    const actual = await obtenerOFallar('prestacion', input.id, this.deps.prestaciones.obtenerPorId(input.id));
    if (!actual.activa) return actual;
    exigirSinTurnosActivosFuturos(
      await this.deps.turnos.listarPorRecurso({ tipo: 'prestacion', id: actual.id }),
      this.deps.reloj.ahora(),
    );
    const inactiva: Prestacion = { ...actual, activa: false };
    await this.deps.prestaciones.guardar(inactiva);
    return inactiva;
  }

  async reactivar(input: PorIdInput): Promise<Prestacion> {
    exigirAdministrador(input.actor, OPERACION);
    const actual = await obtenerOFallar('prestacion', input.id, this.deps.prestaciones.obtenerPorId(input.id));
    if (actual.activa) return actual;
    const activa: Prestacion = { ...actual, activa: true };
    await this.deps.prestaciones.guardar(activa);
    return activa;
  }
}
