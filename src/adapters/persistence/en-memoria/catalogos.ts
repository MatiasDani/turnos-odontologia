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

/** Base común: búsqueda por id sobre una colección en memoria. */
class PorId<T extends { readonly id: string }> {
  constructor(private readonly items: readonly T[]) {}

  obtenerPorId(id: string): Promise<T | undefined> {
    return Promise.resolve(this.items.find((item) => item.id === id));
  }
}

/** Base con además listado por consultorio, conservando el orden de carga. */
class PorIdYConsultorio<T extends { readonly id: string; readonly consultorioId: string }> extends PorId<T> {
  constructor(private readonly coleccion: readonly T[]) {
    super(coleccion);
  }

  listarPorConsultorio(consultorioId: string): Promise<readonly T[]> {
    return Promise.resolve(this.coleccion.filter((item) => item.consultorioId === consultorioId));
  }
}

export class ProfesionalRepositorioEnMemoria
  extends PorIdYConsultorio<Profesional>
  implements ProfesionalRepositorio {}
export class SillonRepositorioEnMemoria extends PorIdYConsultorio<Sillon> implements SillonRepositorio {}
export class PrestacionRepositorioEnMemoria extends PorId<Prestacion> implements PrestacionRepositorio {}
export class ConsultorioRepositorioEnMemoria extends PorId<Consultorio> implements ConsultorioRepositorio {}

export class HorarioAtencionRepositorioEnMemoria implements HorarioAtencionRepositorio {
  constructor(private readonly horarios: readonly HorarioAtencion[]) {}

  listarPorConsultorio(consultorioId: string): Promise<readonly HorarioAtencion[]> {
    return Promise.resolve(this.horarios.filter((h) => h.consultorioId === consultorioId));
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
