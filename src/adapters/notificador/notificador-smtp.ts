import { createTransport } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import type { MensajeEmail, Notificador } from '../../application/puertos/notificador.js';

/** Campos que el adaptador entrega al transporte (texto plano, sin HTML). */
export interface EnvioSmtp {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

/** Lo único que el adaptador usa de un transporte de `nodemailer` (inyectable en tests). */
export interface TransporteSmtp {
  sendMail(envio: EnvioSmtp): Promise<unknown>;
}

/** Configuración SMTP ya validada (la lee `configuracion-entorno.ts`). */
export interface ConfiguracionSmtp {
  readonly host: string;
  readonly puerto: number;
  readonly usuario: string;
  readonly clave: string;
}

/** Opciones del transporte: TLS directo solo con el puerto 465; en el resto, STARTTLS. */
export function opcionesTransporteSmtp(config: ConfiguracionSmtp): SMTPTransport.Options {
  return {
    host: config.host,
    port: config.puerto,
    secure: config.puerto === 465,
    auth: { user: config.usuario, pass: config.clave },
  };
}

/**
 * Adaptador SMTP del puerto `Notificador` (DD-21). Única pieza que conoce `nodemailer`; un
 * rechazo del transporte se propaga y el barrido lo registra como `fallido`.
 */
export class NotificadorSmtp implements Notificador {
  constructor(
    private readonly transporte: TransporteSmtp,
    private readonly remitente: string,
  ) {}

  async enviar(mensaje: MensajeEmail): Promise<void> {
    await this.transporte.sendMail({
      from: this.remitente,
      to: mensaje.para,
      subject: mensaje.asunto,
      text: mensaje.texto,
    });
  }
}

/**
 * Notificador listo para usar con un servidor SMTP real (p. ej. Ethereal en desarrollo). El
 * remitente es la cuenta SMTP (`SMTP_USER`): los proveedores con free tier exigen que coincidan.
 */
export function crearNotificadorSmtp(config: ConfiguracionSmtp): NotificadorSmtp {
  return new NotificadorSmtp(createTransport(opcionesTransporteSmtp(config)), config.usuario);
}
