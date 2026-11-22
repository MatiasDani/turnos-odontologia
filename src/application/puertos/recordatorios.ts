/**
 * Puerto de recordatorios del turno (DD-19, DD-21). C-02 cancela los pendientes al cancelar un
 * turno; C-12 suma la programación y su implementación real (`RecordatoriosEmail`).
 */
export interface Recordatorios {
  /** Cancela los recordatorios pendientes del turno; sin pendientes no hace nada. */
  cancelarPendientes(turnoId: string): Promise<void>;
  /**
   * Idempotente (RN-25): crea o reemplaza el único recordatorio pendiente del turno con el
   * `programadoPara` calculado desde su `inicio` actual. C-03 lo llama después de reprogramar.
   */
  programar(turnoId: string): Promise<void>;
}
