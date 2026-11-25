import type { Actor } from '../domain/actor.js';
import { validarDatosPacienteOnline, type DatosPacienteOnline } from '../domain/datos-paciente-online.js';
import { ConfiguracionInvalidaError, ReglaNegocioError, type CampoConfiguracion, type PacienteResumen } from '../domain/errores.js';
import { autorizar } from '../domain/permisos/autorizar.js';
import { aResumen } from './buscar-pacientes.js';
import type { GeneradorId } from './puertos/generador-id.js';
import type { PacienteRepositorio } from './puertos/repositorios.js';

export interface AltaRapidaPacienteDependencias {
  readonly pacientes: Pick<PacienteRepositorio, 'obtenerPorDni' | 'guardar'>;
  readonly ids: GeneradorId;
}

export interface AltaRapidaPacienteInput {
  readonly actor: Actor;
  readonly datos: DatosPacienteOnline;
}

/**
 * Alta de un paciente desde recepción (C-15, RN-35): mismas validaciones y normalizaciones que
 * la reserva online (DD-17); un DNI existente se rechaza con `RN-35` sin tocar sus datos.
 */
export class AltaRapidaPaciente {
  constructor(private readonly deps: AltaRapidaPacienteDependencias) {}

  async ejecutar(input: AltaRapidaPacienteInput): Promise<PacienteResumen> {
    autorizar(input.actor, 'paciente.crear');
    const validos = validarDatosPacienteOnline(input.datos);
    if (!validos.ok) {
      const campos = validos.campos.map((c) => c.replace(/^paciente\./, '') as CampoConfiguracion);
      const [primero = 'dni'] = campos;
      throw new ConfiguracionInvalidaError(primero, 'datos del paciente inválidos', undefined, campos);
    }
    const existente = await this.deps.pacientes.obtenerPorDni(validos.datos.dni);
    if (existente !== undefined) throw new ReglaNegocioError({ codigo: 'RN-35', pacienteExistente: aResumen(existente) });
    const paciente = { id: this.deps.ids.siguiente(), ...validos.datos };
    await this.deps.pacientes.guardar(paciente);
    return aResumen(paciente);
  }
}
