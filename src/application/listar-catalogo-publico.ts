import { diasReservables, type DiasReservables } from '../domain/reglas/horizonte-reserva.js';
import { RecursoNoEncontradoError } from '../domain/errores.js';
import type { Reloj } from './puertos/reloj.js';
import type { ConsultorioRepositorio, PrestacionRepositorio } from './puertos/repositorios.js';

export interface PrestacionPublica {
  readonly id: string;
  readonly nombre: string;
  readonly duracionMinutos: number;
}

/** Catálogo público mínimo (DD-18): sin sillones, profesionales ni prestaciones inactivas. */
export interface CatalogoPublico {
  readonly consultorio: { readonly nombre: string; readonly zonaHoraria: string };
  readonly diasReservables: DiasReservables;
  readonly prestaciones: readonly PrestacionPublica[];
}

export interface ListarCatalogoPublicoDependencias {
  /** Consultorio que atiende el sistema público. */
  readonly consultorioId: string;
  readonly consultorios: Pick<ConsultorioRepositorio, 'obtenerPorId'>;
  readonly prestaciones: Pick<PrestacionRepositorio, 'listarPorConsultorio'>;
  readonly reloj: Reloj;
}

/** `GET /public/prestaciones` (DD-29): consultorio, días reservables (RN-30) y prestaciones activas. */
export class ListarCatalogoPublico {
  constructor(private readonly deps: ListarCatalogoPublicoDependencias) {}

  async ejecutar(): Promise<CatalogoPublico> {
    const { deps } = this;
    const consultorio = await deps.consultorios.obtenerPorId(deps.consultorioId);
    if (consultorio === undefined) throw new RecursoNoEncontradoError('consultorio', deps.consultorioId);
    const prestaciones = (await deps.prestaciones.listarPorConsultorio(consultorio.id))
      .filter((p) => p.activa)
      .map(({ id, nombre, duracionMinutos }) => ({ id, nombre, duracionMinutos }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return {
      consultorio: { nombre: consultorio.nombre, zonaHoraria: consultorio.zonaHoraria },
      diasReservables: diasReservables(deps.reloj.ahora(), consultorio.zonaHoraria),
      prestaciones,
    };
  }
}
