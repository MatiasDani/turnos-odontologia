import type { MensajeEmail, Notificador } from '../../src/application/puertos/notificador.js';

/** Doble del notificador: guarda los mensajes y puede rechazar todos o envíos puntuales. */
export class NotificadorFalso implements Notificador {
  private readonly mensajes: MensajeEmail[] = [];
  private intentos = 0;
  private rechazarTodos: Error | undefined;
  private readonly rechazosPorIntento = new Map<number, Error>();
  private exponer = false;

  /** Mensajes entregados con éxito, en orden. */
  get enviados(): readonly MensajeEmail[] {
    return [...this.mensajes];
  }

  /** A partir de ahora rechaza todos los envíos con `error`. */
  fallarCon(error: Error): void {
    this.rechazarTodos = error;
  }

  /** Vuelve a aceptar los envíos. */
  restablecer(): void {
    this.rechazarTodos = undefined;
    this.exponer = false;
    this.rechazosPorIntento.clear();
  }

  /** Rechaza solo el intento número `n` (1, 2, ...) contado desde la creación del doble. */
  fallarEnIntento(n: number, error: Error): void {
    this.rechazosPorIntento.set(n, error);
  }

  /**
   * A partir de ahora rechaza con un error cuyo mensaje copia el destinatario y el texto (con el
   * enlace y el token), como haría un proveedor SMTP verboso.
   */
  fallarExponiendoElMensaje(): void {
    this.exponer = true;
  }

  enviar(mensaje: MensajeEmail): Promise<void> {
    this.intentos += 1;
    if (this.exponer) return Promise.reject(new Error(`550 rechazado para ${mensaje.para}: ${mensaje.texto}`));
    const error = this.rechazarTodos ?? this.rechazosPorIntento.get(this.intentos);
    if (error !== undefined) return Promise.reject(error);
    this.mensajes.push(mensaje);
    return Promise.resolve();
  }
}
