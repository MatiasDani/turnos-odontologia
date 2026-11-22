/**
 * Puerto de recordatorios del turno (DD-19). C-02 solo cancela los pendientes al cancelar un turno;
 * C-12 implementa el adaptador real (e-mail) y amplía el puerto con la programación.
 */
export interface Recordatorios {
  /** Cancela los recordatorios pendientes del turno; sin pendientes no hace nada. */
  cancelarPendientes(turnoId: string): Promise<void>;
}
