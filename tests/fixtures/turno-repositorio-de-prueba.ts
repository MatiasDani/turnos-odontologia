import { TurnoRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/turno-repositorio.js';
import type { Violacion } from '../../src/domain/errores.js';
import type { EstadoTurno, Turno } from '../../src/domain/turno.js';

/**
 * Repositorio en memoria con operaciones de prueba: cancelar sin pasar por un caso de uso y un
 * gancho `antesDeAgregar` que simula a recepción agendando entre la consulta y el alta (RN-12).
 */
export class TurnoRepositorioDePrueba extends TurnoRepositorioEnMemoria {
  /** Corre justo antes de cada alta, con el número de intento (1, 2, ...). */
  antesDeAgregar: ((candidato: Turno, intento: number) => void) | undefined;
  private intentos = 0;

  get intentosDeAlta(): number {
    return this.intentos;
  }

  cambiarEstado(id: string, estado: EstadoTurno): void {
    const indice = this.turnos.findIndex((t) => t.id === id);
    const actual = this.turnos[indice];
    if (actual === undefined) throw new Error(`Turno de prueba inexistente: ${id}`);
    this.turnos[indice] = { ...actual, estado };
  }

  /** Inserta un turno sin validar (lo que haría recepción por otro canal). */
  insertar(turno: Turno): void {
    this.turnos.push(turno);
  }

  todos(): readonly Turno[] {
    return [...this.turnos];
  }

  override agregarSiDisponible(
    candidato: Turno,
    validar: (turnosDeLosRecursos: readonly Turno[]) => Violacion | null,
  ): Promise<Turno> {
    this.intentos += 1;
    this.antesDeAgregar?.(candidato, this.intentos);
    return super.agregarSiDisponible(candidato, validar);
  }
}
