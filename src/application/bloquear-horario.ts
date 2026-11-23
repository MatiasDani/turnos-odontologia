import type { Actor } from '../domain/actor.js';
import type { BloqueoHorario } from '../domain/bloqueo-horario.js';
import { ReglaNegocioError } from '../domain/errores.js';
import { evaluarConflictosBloqueo, validarDatosBloqueo } from '../domain/reglas/bloqueos.js';
import type { Turno } from '../domain/turno.js';
import { exigirPermisoBloqueo } from './control-acceso.js';
import type { GeneradorId } from './puertos/generador-id.js';
import type { BloqueoRepositorio, TurnoRepositorio } from './puertos/repositorios.js';

export interface BloquearHorarioInput {
  readonly actor: Actor;
  readonly profesionalId?: string;
  readonly sillonId?: string;
  readonly inicio: Date;
  readonly fin: Date;
  readonly motivo?: string;
}

export interface BloquearHorarioDependencias {
  readonly bloqueos: BloqueoRepositorio;
  readonly turnos: TurnoRepositorio;
  readonly generadorId: GeneradorId;
}

export class BloquearHorario {
  constructor(private readonly deps: BloquearHorarioDependencias) {}

  async ejecutar(input: BloquearHorarioInput): Promise<BloqueoHorario> {
    const { actor, profesionalId, sillonId, inicio, fin, motivo } = input;

    // 1. Control de acceso
    exigirPermisoBloqueo(actor, profesionalId);

    // 2. Validación de datos de entrada
    validarDatosBloqueo({ profesionalId, sillonId, inicio, fin });

    // 3. Obtener turnos existentes de los recursos especificados
    const turnosDelRecurso = await this.obtenerTurnosDeRecursos(profesionalId, sillonId);

    // 4. Evaluar conflictos con turnos activos preexistentes (DD-06 / RN-31)
    const violacion = evaluarConflictosBloqueo(
      { profesionalId, sillonId, inicio, fin },
      turnosDelRecurso,
    );
    if (violacion !== null) {
      throw new ReglaNegocioError(violacion);
    }

    // 5. Crear y persistir el nuevo bloqueo
    const id = this.deps.generadorId.siguiente();
    const nuevoBloqueo: BloqueoHorario = {
      id,
      inicio,
      fin,
      ...(profesionalId !== undefined ? { profesionalId } : {}),
      ...(sillonId !== undefined ? { sillonId } : {}),
      ...(motivo?.trim() ? { motivo: motivo.trim() } : {}),
    };

    await this.deps.bloqueos.guardar(nuevoBloqueo);
    return nuevoBloqueo;
  }

  private async obtenerTurnosDeRecursos(
    profesionalId?: string,
    sillonId?: string,
  ): Promise<readonly Turno[]> {
    if (profesionalId !== undefined && sillonId !== undefined) {
      return this.deps.turnos.listarPorRecursos(profesionalId, sillonId);
    }
    if (profesionalId !== undefined) {
      return this.deps.turnos.listarPorRecurso({ tipo: 'profesional', id: profesionalId });
    }
    if (sillonId !== undefined) {
      return this.deps.turnos.listarPorRecurso({ tipo: 'sillon', id: sillonId });
    }
    return [];
  }
}
