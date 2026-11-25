import type { Actor } from '../domain/actor.js';
import { RecursoNoEncontradoError } from '../domain/errores.js';
import { autorizar } from '../domain/permisos/autorizar.js';
import type {
  ConsultorioRepositorio,
  PrestacionRepositorio,
  ProfesionalRepositorio,
  SillonRepositorio,
} from './puertos/repositorios.js';

export interface ListarCatalogoInternoDependencias {
  readonly consultorios: Pick<ConsultorioRepositorio, 'obtenerPorId'>;
  readonly profesionales: Pick<ProfesionalRepositorio, 'listarPorConsultorio'>;
  readonly sillones: Pick<SillonRepositorio, 'listarPorConsultorio'>;
  readonly prestaciones: Pick<PrestacionRepositorio, 'listarPorConsultorio'>;
  readonly consultorioId: string;
}

export interface CatalogoInterno {
  readonly consultorio: { readonly nombre: string; readonly zonaHoraria: string };
  readonly profesionales: readonly { readonly id: string; readonly nombre: string; readonly apellido: string }[];
  readonly sillones: readonly { readonly id: string; readonly nombre: string }[];
  readonly prestaciones: readonly { readonly id: string; readonly nombre: string; readonly duracionMinutos: number }[];
}

const porNombre = (a: { nombre: string }, b: { nombre: string }): number => a.nombre.localeCompare(b.nombre, 'es');

/** Catálogo de la interfaz de recepción (C-15): recursos activos del consultorio, solo para el personal. */
export class ListarCatalogoInterno {
  constructor(private readonly deps: ListarCatalogoInternoDependencias) {}

  async ejecutar(input: { readonly actor: Actor }): Promise<CatalogoInterno> {
    autorizar(input.actor, 'agenda.ver');
    const { deps } = this;
    const consultorio = await deps.consultorios.obtenerPorId(deps.consultorioId);
    if (consultorio === undefined) throw new RecursoNoEncontradoError('consultorio', deps.consultorioId);
    const [profesionales, sillones, prestaciones] = await Promise.all([
      deps.profesionales.listarPorConsultorio(deps.consultorioId),
      deps.sillones.listarPorConsultorio(deps.consultorioId),
      deps.prestaciones.listarPorConsultorio(deps.consultorioId),
    ]);
    return {
      consultorio: { nombre: consultorio.nombre, zonaHoraria: consultorio.zonaHoraria },
      profesionales: profesionales.filter((p) => p.activo).sort(porNombre).map(({ id, nombre, apellido }) => ({ id, nombre, apellido })),
      sillones: sillones.filter((s) => s.activo).sort(porNombre).map(({ id, nombre }) => ({ id, nombre })),
      prestaciones: prestaciones.filter((p) => p.activa).sort(porNombre).map(({ id, nombre, duracionMinutos }) => ({ id, nombre, duracionMinutos })),
    };
  }
}
