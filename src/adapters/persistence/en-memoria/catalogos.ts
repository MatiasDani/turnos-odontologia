import type {
  BloqueoRepositorio,
  ConsultorioRepositorio,
  HorarioAtencionRepositorio,
  PrestacionRepositorio,
  ProfesionalRepositorio,
  SillonRepositorio,
} from '../../../application/puertos/repositorios.js';
import type { BloqueoHorario } from '../../../domain/bloqueo-horario.js';
import type { Consultorio } from '../../../domain/consultorio.js';
import type { HorarioAtencion } from '../../../domain/horario-atencion.js';
import { type Intervalo, seSolapa } from '../../../domain/intervalo.js';
import type { Prestacion } from '../../../domain/prestacion.js';
import type { Profesional } from '../../../domain/profesional.js';
import type { Sillon } from '../../../domain/sillon.js';

/** Base común: colección mutable en memoria con búsqueda por id y alta o reemplazo (patrón de Paciente). */
class PorId<T extends { readonly id: string }> {
  protected readonly items: T[];

  constructor(iniciales: readonly T[]) {
    this.items = [...iniciales];
  }

  obtenerPorId(id: string): Promise<T | undefined> {
    return Promise.resolve(this.items.find((item) => item.id === id));
  }

  /** Alta al final o reemplazo por `id` conservando la posición (C-05, DD-28). */
  guardar(item: T): Promise<void> {
    const indice = this.items.findIndex((existente) => existente.id === item.id);
    if (indice >= 0) this.items[indice] = item;
    else this.items.push(item);
    return Promise.resolve();
  }
}

/** Base con además listado por consultorio, conservando el orden de carga. */
class PorIdYConsultorio<T extends { readonly id: string; readonly consultorioId: string }> extends PorId<T> {
  listarPorConsultorio(consultorioId: string): Promise<readonly T[]> {
    return Promise.resolve(this.items.filter((item) => item.consultorioId === consultorioId));
  }
}

export class ProfesionalRepositorioEnMemoria
  extends PorIdYConsultorio<Profesional>
  implements ProfesionalRepositorio {}
export class SillonRepositorioEnMemoria extends PorIdYConsultorio<Sillon> implements SillonRepositorio {}
export class PrestacionRepositorioEnMemoria
  extends PorIdYConsultorio<Prestacion>
  implements PrestacionRepositorio {}
export class ConsultorioRepositorioEnMemoria extends PorId<Consultorio> implements ConsultorioRepositorio {}

export class HorarioAtencionRepositorioEnMemoria
  extends PorIdYConsultorio<HorarioAtencion>
  implements HorarioAtencionRepositorio
{
  /** Un id inexistente no hace nada: el caso de uso ya verificó la existencia. */
  eliminar(id: string): Promise<void> {
    const indice = this.items.findIndex((h) => h.id === id);
    if (indice >= 0) this.items.splice(indice, 1);
    return Promise.resolve();
  }
}

export class BloqueoRepositorioEnMemoria implements BloqueoRepositorio {
  constructor(private readonly bloqueos: readonly BloqueoHorario[]) {}

  listarPorRecursos(
    profesionalId: string,
    sillonId: string,
    intervalo: Intervalo,
  ): Promise<readonly BloqueoHorario[]> {
    return Promise.resolve(
      this.bloqueos.filter(
        (b) =>
          (b.profesionalId === profesionalId || b.sillonId === sillonId) &&
          seSolapa(intervalo, { inicio: b.inicio, fin: b.fin }),
      ),
    );
  }
}
