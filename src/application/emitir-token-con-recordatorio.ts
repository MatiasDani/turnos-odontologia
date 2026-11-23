import type { Recordatorios } from './puertos/recordatorios.js';
import type { ServicioTokens } from './servicio-tokens.js';

/**
 * Decorador de `ServicioTokens.emitir` para la reserva online (C-14): programa el recordatorio del
 * turno recién creado cuando el paciente ya está guardado. `ReservarOnline` guarda al paciente nuevo
 * después del alta, por lo que programarlo dentro del alta (`AgendarTurnoConRecordatorio`) fallaría
 * para un DNI nuevo. Si programar falla, el error se propaga y el turno no se deshace (DD-19).
 */
export class EmitirTokenConRecordatorio implements Pick<ServicioTokens, 'emitir'> {
  constructor(
    private readonly tokens: Pick<ServicioTokens, 'emitir'>,
    private readonly recordatorios: Pick<Recordatorios, 'programar'>,
  ) {}

  async emitir(turnoId: string): Promise<string> {
    const token = await this.tokens.emitir(turnoId);
    await this.recordatorios.programar(turnoId);
    return token;
  }
}
