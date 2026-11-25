import type { Actor } from '../domain/actor.js';
import { ConsultaInvalidaError, RecursoNoEncontradoError, type PacienteResumen } from '../domain/errores.js';
import type { Paciente } from '../domain/paciente.js';
import { autorizar } from '../domain/permisos/autorizar.js';
import { coincidePaciente, normalizarBusqueda, normalizarTexto, RESULTADOS_MAXIMOS } from '../domain/reglas/pacientes-recepcion.js';
import type { PacienteRepositorio } from './puertos/repositorios.js';

export interface BuscarPacientesDependencias {
  readonly pacientes: Pick<PacienteRepositorio, 'listar'>;
}

export interface BuscarPacientesInput {
  readonly actor: Actor;
  readonly texto: string;
}

export interface ResultadoBusquedaPacientes {
  readonly pacientes: readonly PacienteResumen[];
  /** `true` si había más de 10 coincidencias y la lista se recortó (RN-34). */
  readonly hayMas: boolean;
}

/** Mínimo dato (RN-34, RN-D-02): nunca e-mail ni consentimiento. */
export function aResumen(paciente: Paciente): PacienteResumen {
  return { id: paciente.id, nombre: paciente.nombre, apellido: paciente.apellido, dni: paciente.dni, telefono: paciente.telefono };
}

const porApellidoYNombre = (a: Paciente, b: Paciente): number =>
  normalizarTexto(a.apellido).localeCompare(normalizarTexto(b.apellido), 'es') ||
  normalizarTexto(a.nombre).localeCompare(normalizarTexto(b.nombre), 'es') ||
  a.id.localeCompare(b.id);

/** Búsqueda de pacientes del personal (C-15, RN-34): el rol antes que el texto. */
export class BuscarPacientes {
  constructor(private readonly deps: BuscarPacientesDependencias) {}

  async ejecutar(input: BuscarPacientesInput): Promise<ResultadoBusquedaPacientes> {
    autorizar(input.actor, 'paciente.buscar');
    const busqueda = normalizarBusqueda(input.texto);
    if (busqueda === null) throw new ConsultaInvalidaError('texto', 'debe tener 3 caracteres o más');
    const coincidencias = (await this.deps.pacientes.listar())
      .filter((p) => coincidePaciente(p, busqueda))
      .sort(porApellidoYNombre);
    return {
      pacientes: coincidencias.slice(0, RESULTADOS_MAXIMOS).map(aResumen),
      hayMas: coincidencias.length > RESULTADOS_MAXIMOS,
    };
  }
}

/** Datos de contacto de un paciente para el detalle del turno (C-15): solo recepción y administrador. */
export class ResumenPaciente {
  constructor(private readonly deps: { readonly pacientes: Pick<PacienteRepositorio, 'obtenerPorId'> }) {}

  async ejecutar(input: { readonly actor: Actor; readonly pacienteId: string }): Promise<PacienteResumen> {
    autorizar(input.actor, 'paciente.buscar');
    const paciente = await this.deps.pacientes.obtenerPorId(input.pacienteId);
    if (paciente === undefined) throw new RecursoNoEncontradoError('paciente', input.pacienteId);
    return aResumen(paciente);
  }
}
