import { evaluarAnticipacionPaciente } from '../domain/reglas/anticipacion.js';
import { dentroDelHorizonte } from '../domain/reglas/horizonte-reserva.js';
import { ErrorGestionTurnoPublica } from './errores-gestion-turno-publica.js';
import type { Reloj } from './puertos/reloj.js';
import type { ConsultorioRepositorio, PrestacionRepositorio } from './puertos/repositorios.js';
import type { ReprogramarTurnoDesdeToken } from './reprogramar-turno-desde-token.js';
import type { ResolverTurnoDesdeToken } from './resolver-turno-desde-token.js';
import type { TurnoPublico } from './turno-publico.js';

export interface ReprogramarDesdeTokenPublicaDependencias {
  readonly reprogramar: Pick<ReprogramarTurnoDesdeToken, 'ejecutar'>;
  readonly resolver: Pick<ResolverTurnoDesdeToken, 'ejecutar'>;
  readonly prestaciones: Pick<PrestacionRepositorio, 'obtenerPorId'>;
  readonly consultorios: Pick<ConsultorioRepositorio, 'obtenerPorId'>;
  readonly reloj: Reloj;
}

/**
 * Reprogramación pública con horizonte (RN-30, D8): token, anticipación (RN-08) y luego el límite
 * de 30 días, antes de delegar en C-11 sin modificarlo. Solo se mueve el horario (D7).
 */
export class ReprogramarDesdeTokenPublica {
  constructor(private readonly deps: ReprogramarDesdeTokenPublicaDependencias) {}

  async ejecutar(input: { readonly token: string; readonly inicio: Date }): Promise<TurnoPublico> {
    const { deps } = this;
    const { turno } = await deps.resolver.ejecutar(input.token);
    const ahora = deps.reloj.ahora();
    if (evaluarAnticipacionPaciente(turno, 'paciente', ahora) !== null) {
      throw new ErrorGestionTurnoPublica('CONTACTAR_CONSULTORIO');
    }
    const prestacion = await deps.prestaciones.obtenerPorId(turno.prestacionId);
    const consultorio =
      prestacion === undefined ? undefined : await deps.consultorios.obtenerPorId(prestacion.consultorioId);
    const fechaValida = !Number.isNaN(input.inicio.getTime());
    if (fechaValida && consultorio !== undefined && !dentroDelHorizonte(input.inicio, ahora, consultorio.zonaHoraria)) {
      throw new ErrorGestionTurnoPublica('HORARIO_NO_DISPONIBLE');
    }
    return deps.reprogramar.ejecutar({ token: input.token, inicio: input.inicio });
  }
}
