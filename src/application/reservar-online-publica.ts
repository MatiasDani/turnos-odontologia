import { validarDatosPacienteOnline } from '../domain/datos-paciente-online.js';
import { diasReservables, fechaLocal } from '../domain/reglas/horizonte-reserva.js';
import { ErrorReservaPublica } from './errores-reserva-publica.js';
import type { Reloj } from './puertos/reloj.js';
import type { ConsultorioRepositorio, PrestacionRepositorio } from './puertos/repositorios.js';
import type { ReservaOnlineConfirmada, ReservarOnline, ReservarOnlineInput } from './reservar-online.js';

export interface ReservarOnlinePublicaDependencias {
  readonly reservar: Pick<ReservarOnline, 'ejecutar'>;
  readonly prestaciones: Pick<PrestacionRepositorio, 'obtenerPorId'>;
  readonly consultorios: Pick<ConsultorioRepositorio, 'obtenerPorId'>;
  readonly reloj: Reloj;
}

/**
 * Reserva pública con el horizonte de 30 días (RN-30, DD-30): verifica que el día del `inicio` no
 * pase del último día reservable y delega en `ReservarOnline` sin modificarlo. Lo anterior a hoy
 * sigue siendo `RESERVA_EN_PASADO` de C-10. Fuera del horizonte responde `HORARIO_NO_DISPONIBLE`
 * con la oferta vacía (no se agrega un código al conjunto cerrado de C-10).
 */
export class ReservarOnlinePublica {
  constructor(private readonly deps: ReservarOnlinePublicaDependencias) {}

  async ejecutar(input: ReservarOnlineInput): Promise<ReservaOnlineConfirmada> {
    const { deps } = this;
    const prestacion = await deps.prestaciones.obtenerPorId(input.prestacionId);
    const consultorio =
      prestacion?.activa === true ? await deps.consultorios.obtenerPorId(prestacion.consultorioId) : undefined;
    if (consultorio !== undefined) {
      const { hasta } = diasReservables(deps.reloj.ahora(), consultorio.zonaHoraria);
      if (fechaLocal(input.inicio, consultorio.zonaHoraria) > hasta) {
        // Mismo orden que C-10: los datos inválidos se informan antes que el horario.
        const datos = validarDatosPacienteOnline(input.paciente);
        if (!datos.ok) throw new ErrorReservaPublica('DATOS_INVALIDOS', { campos: datos.campos });
        throw new ErrorReservaPublica('HORARIO_NO_DISPONIBLE', { nuevaOferta: [] });
      }
    }
    return deps.reservar.ejecutar(input);
  }
}
