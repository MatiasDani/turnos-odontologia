import type { Recordatorios } from '../../src/application/puertos/recordatorios.js';

/** Doble de prueba: registra cada pedido de cancelación y puede configurarse para rechazar. */
export class RecordatoriosEspia implements Recordatorios {
  private readonly pedidos: string[] = [];
  private readonly pedidosProgramar: string[] = [];
  private error: Error | undefined;
  private errorProgramar: Error | undefined;

  /** Turnos para los que se pidió cancelar recordatorios, en orden. */
  get cancelados(): readonly string[] {
    return [...this.pedidos];
  }

  /** A partir de ahora cada pedido rechaza con `error` (el pedido se registra igual). */
  fallarCon(error: Error): void {
    this.error = error;
  }

  cancelarPendientes(turnoId: string): Promise<void> {
    this.pedidos.push(turnoId);
    return this.error === undefined ? Promise.resolve() : Promise.reject(this.error);
  }

  /** Turnos para los que se pidió programar recordatorio, en orden (C-12). */
  get programados(): readonly string[] {
    return [...this.pedidosProgramar];
  }

  /** A partir de ahora cada pedido de programar rechaza con `error` (el pedido se registra igual). */
  fallarProgramarCon(error: Error): void {
    this.errorProgramar = error;
  }

  programar(turnoId: string): Promise<void> {
    this.pedidosProgramar.push(turnoId);
    return this.errorProgramar === undefined ? Promise.resolve() : Promise.reject(this.errorProgramar);
  }
}
