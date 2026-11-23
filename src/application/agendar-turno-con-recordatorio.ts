import type { Turno } from '../domain/turno.js';
import type { AgendarTurno, AgendarTurnoInput } from './agendar-turno.js';
import type { Recordatorios } from './puertos/recordatorios.js';

/**
 * Decorador del alta de recepción (DD-21): ejecuta `AgendarTurno` y, si el turno se creó, programa su
 * recordatorio. No modifica `AgendarTurno`. NO se inyecta en `ReservarOnline`: la reserva online guarda
 * al paciente nuevo después del alta y recibe el puerto `recordatorios` directamente (DD-32).
 * Si programar falla, el error se propaga y el turno creado no se deshace (mismo criterio que DD-19).
 */
export class AgendarTurnoConRecordatorio implements Pick<AgendarTurno, 'ejecutar'> {
  constructor(
    private readonly agendar: Pick<AgendarTurno, 'ejecutar'>,
    private readonly recordatorios: Pick<Recordatorios, 'programar'>,
  ) {}

  async ejecutar(input: AgendarTurnoInput): Promise<Turno> {
    const turno = await this.agendar.ejecutar(input);
    await this.recordatorios.programar(turno.id);
    return turno;
  }
}
