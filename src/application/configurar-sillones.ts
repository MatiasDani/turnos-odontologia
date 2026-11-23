import type { Sillon } from '../domain/sillon.js';
import { validarSillon } from '../domain/reglas/configuracion.js';
import { exigirAdministrador } from './control-acceso.js';
import { exigirSinTurnosActivosFuturos, obtenerOFallar, valorOFallar } from './configuracion-comun.js';
import type { AltaSillonInput, ModificarSillonInput, PorIdInput } from './configuracion-input.js';
import type { GeneradorId } from './puertos/generador-id.js';
import type { Reloj } from './puertos/reloj.js';
import type { ConsultorioRepositorio, SillonRepositorio, TurnoRepositorio } from './puertos/repositorios.js';

export interface ConfigurarSillonesDependencias {
  readonly sillones: SillonRepositorio;
  readonly consultorios: ConsultorioRepositorio;
  readonly turnos: TurnoRepositorio;
  readonly reloj: Reloj;
  readonly ids: GeneradorId;
}

const OPERACION = 'configurar-sillon';

/**
 * Alta, modificación, desactivación y reactivación de sillones (US-008, C-05). Secuencia fija
 * (DD-27, DD-28): rol → datos inválidos → inexistente → RN-27.
 */
export class ConfigurarSillones {
  constructor(private readonly deps: ConfigurarSillonesDependencias) {}

  async alta(input: AltaSillonInput): Promise<Sillon> {
    exigirAdministrador(input.actor, OPERACION);
    const { nombre } = valorOFallar(validarSillon({ nombre: input.nombre }));
    const consultorio = await obtenerOFallar(
      'consultorio',
      input.consultorioId,
      this.deps.consultorios.obtenerPorId(input.consultorioId),
    );
    const sillon: Sillon = { id: this.deps.ids.siguiente(), consultorioId: consultorio.id, nombre, activo: true };
    await this.deps.sillones.guardar(sillon);
    return sillon;
  }

  async modificar(input: ModificarSillonInput): Promise<Sillon> {
    exigirAdministrador(input.actor, OPERACION);
    valorOFallar(validarSillon({ nombre: input.cambios.nombre ?? 'x' }));
    const actual = await obtenerOFallar('sillon', input.id, this.deps.sillones.obtenerPorId(input.id));
    const { nombre } = valorOFallar(validarSillon({ nombre: input.cambios.nombre ?? actual.nombre }));
    const modificado: Sillon = { ...actual, nombre };
    await this.deps.sillones.guardar(modificado);
    return modificado;
  }

  async desactivar(input: PorIdInput): Promise<Sillon> {
    exigirAdministrador(input.actor, OPERACION);
    const actual = await obtenerOFallar('sillon', input.id, this.deps.sillones.obtenerPorId(input.id));
    if (!actual.activo) return actual;
    exigirSinTurnosActivosFuturos(
      await this.deps.turnos.listarPorRecurso({ tipo: 'sillon', id: actual.id }),
      this.deps.reloj.ahora(),
    );
    const inactivo: Sillon = { ...actual, activo: false };
    await this.deps.sillones.guardar(inactivo);
    return inactivo;
  }

  async reactivar(input: PorIdInput): Promise<Sillon> {
    exigirAdministrador(input.actor, OPERACION);
    const actual = await obtenerOFallar('sillon', input.id, this.deps.sillones.obtenerPorId(input.id));
    if (actual.activo) return actual;
    const activo: Sillon = { ...actual, activo: true };
    await this.deps.sillones.guardar(activo);
    return activo;
  }
}
