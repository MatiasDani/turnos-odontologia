import { createTransport } from 'nodemailer';
import { describe, expect, test } from 'vitest';
import {
  crearNotificadorSmtp,
  NotificadorSmtp,
  opcionesTransporteSmtp,
  type EnvioSmtp,
  type TransporteSmtp,
} from '../../src/adapters/notificador/notificador-smtp.js';
import type { MensajeEmail } from '../../src/application/puertos/notificador.js';

const REMITENTE = 'turnos@demo.test';
const MENSAJE: MensajeEmail = {
  para: 'carla.prueba@demo.test',
  asunto: 'Recordatorio de tu turno - Consultorio Odontológico Demo',
  texto: 'Te recordamos tu turno en Consultorio Odontológico Demo.',
};

/** Transporte doble: registra cada envío y puede rechazar. Nunca abre conexiones. */
class TransporteEspia implements TransporteSmtp {
  readonly envios: EnvioSmtp[] = [];
  error: Error | undefined;

  sendMail(envio: EnvioSmtp): Promise<unknown> {
    this.envios.push(envio);
    return this.error === undefined ? Promise.resolve({}) : Promise.reject(this.error);
  }
}

describe('NotificadorSmtp', () => {
  test('mapea el mensaje a from, to, subject y text', async () => {
    const transporte = new TransporteEspia();
    await new NotificadorSmtp(transporte, REMITENTE).enviar(MENSAJE);
    expect(transporte.envios).toEqual([
      { from: REMITENTE, to: MENSAJE.para, subject: MENSAJE.asunto, text: MENSAJE.texto },
    ]);
  });

  test('un transporte que rechaza propaga el error', async () => {
    const transporte = new TransporteEspia();
    transporte.error = new Error('550 buzón inexistente');
    await expect(new NotificadorSmtp(transporte, REMITENTE).enviar(MENSAJE)).rejects.toThrow('550 buzón inexistente');
  });

  test('funciona con un transporte real de nodemailer sin red (jsonTransport)', async () => {
    const transporte = createTransport({ jsonTransport: true });
    const enviados: string[] = [];
    const espiaReal: TransporteSmtp = {
      sendMail: async (envio) => {
        const info = await transporte.sendMail(envio);
        enviados.push(String(info.message));
        return info;
      },
    };
    await new NotificadorSmtp(espiaReal, REMITENTE).enviar(MENSAJE);
    const json = JSON.parse(enviados[0] ?? '{}') as { subject?: string; text?: string; to?: { address: string }[] };
    expect(json.subject).toBe(MENSAJE.asunto);
    expect(json.text).toBe(MENSAJE.texto);
    expect(json.to?.[0]?.address).toBe(MENSAJE.para);
  });
});

describe('opcionesTransporteSmtp(config)', () => {
  const base = { host: 'smtp.ethereal.email', usuario: 'usuario.ficticio@ethereal.email', clave: 'clave-ficticia' };

  test.each([
    [587, false],
    [465, true],
    [25, false],
  ])('con el puerto %i secure es %s', (puerto, secure) => {
    expect(opcionesTransporteSmtp({ ...base, puerto })).toMatchObject({ host: base.host, port: puerto, secure });
  });

  test('las credenciales van en auth', () => {
    expect(opcionesTransporteSmtp({ ...base, puerto: 587 }).auth).toEqual({ user: base.usuario, pass: base.clave });
  });
});

describe('crearNotificadorSmtp(config)', () => {
  test('crea el notificador sin abrir conexiones', () => {
    const notificador = crearNotificadorSmtp({
      host: 'smtp.ethereal.email',
      puerto: 587,
      usuario: 'usuario.ficticio@ethereal.email',
      clave: 'clave-ficticia',
    });
    expect(notificador).toBeInstanceOf(NotificadorSmtp);
  });
});
