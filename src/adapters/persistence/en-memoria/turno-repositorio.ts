import type { ResultadoCambio, TurnoRepositorio } from '../../../application/puertos/repositorios.js';
import { RecursoNoEncontradoError, ReglaNegocioError, type Violacion } from '../../../domain/errores.js';
import type { Turno } from '../../../domain/turno.js';

export class TurnoRepositorioEnMemoria implements TurnoRepositorio {
  protected readonly turnos: Turno[];

  constructor(iniciales: readonly Turno[] = []) {
    this.turnos = [...iniciales];
  }

  /**
   * SECCIÓN CRÍTICA (RN-12): leer, validar e insertar ocurren sin ningún `await` entre medio.
   * Node ejecuta un solo hilo: ninguna otra alta puede intercalarse entre la lectura de los
   * turnos y la inserción, por lo que dos altas concurrentes sobre el mismo recurso y horario
   * nunca se crean ambas. NO agregar `await` dentro de este método.
   */
  agregarSiDisponible(
    candidato: Turno,
    validar: (turnosDeLosRecursos: readonly Turno[]) => Violacion | null,
  ): Promise<Turno> {
    const deLosRecursos = this.filtrarPorRecursos(candidato.profesionalId, candidato.sillonId);
    const violacion = validar(deLosRecursos);
    if (violacion !== null) return Promise.reject(new ReglaNegocioError(violacion));
    this.turnos.push(candidato);
    return Promise.resolve(candidato);
  }

  listarPorRecursos(profesionalId: string, sillonId: string): Promise<readonly Turno[]> {
    return Promise.resolve(this.filtrarPorRecursos(profesionalId, sillonId));
  }

  obtenerPorId(id: string): Promise<Turno | undefined> {
    return Promise.resolve(this.turnos.find((t) => t.id === id));
  }

  listarPorPaciente(pacienteId: string): Promise<readonly Turno[]> {
    return Promise.resolve(this.turnos.filter((t) => t.pacienteId === pacienteId));
  }

  /**
   * SECCIÓN CRÍTICA (RN-12, DD-19): leer, ejecutar `cambio` y reemplazar ocurren sin ningún `await`
   * entre medio, igual que `agregarSiDisponible`. Dos modificaciones concurrentes del mismo turno se
   * serializan: la segunda ve el estado que dejó la primera. NO agregar `await` dentro de este método.
   */
  actualizarSi(id: string, cambio: (actual: Turno) => ResultadoCambio): Promise<Turno> {
    const indice = this.turnos.findIndex((t) => t.id === id);
    const actual = this.turnos[indice];
    if (actual === undefined) return Promise.reject(new RecursoNoEncontradoError('turno', id));
    const resultado = cambio(actual);
    if (!resultado.ok) return Promise.reject(new ReglaNegocioError(resultado.violacion));
    if (resultado.turno.id !== id) {
      return Promise.reject(new Error(`actualizarSi: el cambio no puede alterar el id del turno (${id})`));
    }
    this.turnos[indice] = resultado.turno;
    return Promise.resolve(resultado.turno);
  }

  private filtrarPorRecursos(profesionalId: string, sillonId: string): Turno[] {
    return this.turnos.filter((t) => t.profesionalId === profesionalId || t.sillonId === sillonId);
  }
}
