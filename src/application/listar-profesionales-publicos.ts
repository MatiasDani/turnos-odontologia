import { ErrorReservaPublica } from './errores-reserva-publica.js';
import type { PrestacionRepositorio, ProfesionalRepositorio } from './puertos/repositorios.js';

export interface ProfesionalPublico {
  readonly id: string;
  readonly nombre: string;
  readonly apellido: string;
}

export interface ListarProfesionalesPublicosDependencias {
  readonly prestaciones: Pick<PrestacionRepositorio, 'obtenerPorId'>;
  readonly profesionales: Pick<ProfesionalRepositorio, 'listarPorConsultorio'>;
}

/** Profesionales activos habilitados para una prestación activa (RN-19, DD-18): solo id y nombre. */
export class ListarProfesionalesPublicos {
  constructor(private readonly deps: ListarProfesionalesPublicosDependencias) {}

  async ejecutar(prestacionId: string): Promise<readonly ProfesionalPublico[]> {
    const prestacion = await this.deps.prestaciones.obtenerPorId(prestacionId);
    if (prestacion === undefined || !prestacion.activa) throw new ErrorReservaPublica('PRESTACION_NO_DISPONIBLE');
    return (await this.deps.profesionales.listarPorConsultorio(prestacion.consultorioId))
      .filter((p) => p.activo && p.prestacionIds.includes(prestacion.id))
      .map(({ id, nombre, apellido }) => ({ id, nombre, apellido }))
      .sort((a, b) => a.apellido.localeCompare(b.apellido, 'es') || a.nombre.localeCompare(b.nombre, 'es'));
  }
}
