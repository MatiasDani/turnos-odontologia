import { TurnoRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/turno-repositorio.js';
import type { EstadoTurno } from '../../src/domain/turno.js';

/** Repositorio en memoria con operaciones de prueba (cancelar sin pasar por un caso de uso). */
export class TurnoRepositorioDePrueba extends TurnoRepositorioEnMemoria {
  cambiarEstado(id: string, estado: EstadoTurno): void {
    const indice = this.turnos.findIndex((t) => t.id === id);
    const actual = this.turnos[indice];
    if (actual === undefined) throw new Error(`Turno de prueba inexistente: ${id}`);
    this.turnos[indice] = { ...actual, estado };
  }
}
