import { RecursoNoEncontradoError } from '../domain/errores.js';
import { calcularProgramadoPara, debeProgramarse } from '../domain/reglas/recordatorios.js';
import type { ConfiguracionRecordatorios } from './configuracion-recordatorios.js';
import type { GeneradorId } from './puertos/generador-id.js';
import type { Recordatorios } from './puertos/recordatorios.js';
import type { PacienteRepositorio, RecordatorioRepositorio, TurnoRepositorio } from './puertos/repositorios.js';

export interface RecordatoriosEmailDependencias {
  readonly recordatorios: RecordatorioRepositorio;
  readonly turnos: Pick<TurnoRepositorio, 'obtenerPorId'>;
  readonly pacientes: Pick<PacienteRepositorio, 'obtenerPorId'>;
  readonly ids: GeneradorId;
  readonly config: Pick<ConfiguracionRecordatorios, 'horasAntes'>;
}

/**
 * Implementación real del puerto `Recordatorios` para el canal e-mail (DD-21, RN-25). Reemplaza a
 * `RecordatoriosNoOp` sin modificar `CancelarTurno`.
 */
export class RecordatoriosEmail implements Recordatorios {
  constructor(private readonly deps: RecordatoriosEmailDependencias) {}

  async programar(turnoId: string): Promise<void> {
    const { deps } = this;
    const turno = await deps.turnos.obtenerPorId(turnoId);
    if (turno === undefined) throw new RecursoNoEncontradoError('turno', turnoId);
    const paciente = await deps.pacientes.obtenerPorId(turno.pacienteId);
    if (paciente === undefined) throw new RecursoNoEncontradoError('paciente', turno.pacienteId);
    // Sin consentimiento o sin e-mail no hay recordatorio por e-mail (RN-25, RN-D-02).
    if (!debeProgramarse(paciente)) return;
    // Idempotente: el pendiente existente se reemplaza conservando su id; enviados, fallidos y
    // cancelados no se tocan (RN-25).
    const pendiente = (await deps.recordatorios.listarPorTurno(turnoId)).find((r) => r.estado === 'pendiente');
    await deps.recordatorios.guardar({
      id: pendiente?.id ?? deps.ids.siguiente(),
      turnoId,
      canal: 'email',
      programadoPara: calcularProgramadoPara(turno.inicio, deps.config.horasAntes),
      estado: 'pendiente',
    });
  }

  /** Los `pendiente` del turno pasan a `cancelado`; el resto no cambia (RN-25). */
  async cancelarPendientes(turnoId: string): Promise<void> {
    const pendientes = (await this.deps.recordatorios.listarPorTurno(turnoId)).filter((r) => r.estado === 'pendiente');
    for (const pendiente of pendientes) {
      await this.deps.recordatorios.guardar({ ...pendiente, estado: 'cancelado' });
    }
  }
}
