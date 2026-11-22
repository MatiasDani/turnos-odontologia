import { describe, expect, test } from 'vitest';
import {
  ConfiguracionInvalidaError,
  leerConfiguracionRecordatorios,
  leerConfiguracionSmtp,
} from '../../src/adapters/config/configuracion-entorno.js';

const BASE = { BASE_URL_PUBLICA: 'http://localhost:3000' };

/** Ejecuta `leer` y devuelve el error de configuración; falla si no lanza ese error. */
function errorDe(leer: () => unknown): ConfiguracionInvalidaError {
  try {
    leer();
  } catch (error) {
    if (error instanceof ConfiguracionInvalidaError) return error;
    throw error;
  }
  throw new Error('Se esperaba un ConfiguracionInvalidaError');
}

describe('leerConfiguracionRecordatorios(env)', () => {
  test('sin RECORDATORIO_HORAS_ANTES usa 24 h', () => {
    expect(leerConfiguracionRecordatorios(BASE)).toEqual({ horasAntes: 24, baseUrlPublica: 'http://localhost:3000' });
  });

  test.each([
    ['48', 48],
    ['1', 1],
  ])('RECORDATORIO_HORAS_ANTES=%s → %i', (valor, horas) => {
    expect(leerConfiguracionRecordatorios({ ...BASE, RECORDATORIO_HORAS_ANTES: valor }).horasAntes).toBe(horas);
  });

  test.each(['0', '-3', '1.5', 'veinticuatro', ''])('RECORDATORIO_HORAS_ANTES=%j se rechaza', (valor) => {
    const error = errorDe(() => leerConfiguracionRecordatorios({ ...BASE, RECORDATORIO_HORAS_ANTES: valor }));
    expect(error.variable).toBe('RECORDATORIO_HORAS_ANTES');
    expect(error.message).toContain('RECORDATORIO_HORAS_ANTES');
  });

  test('acepta https', () => {
    expect(leerConfiguracionRecordatorios({ BASE_URL_PUBLICA: 'https://turnos.demo.test' }).baseUrlPublica).toBe(
      'https://turnos.demo.test',
    );
  });

  test.each([
    ['ausente', undefined],
    ['vacía', ''],
    ['sin esquema', 'localhost:3000'],
    ['con otro esquema', 'ftp://turnos.demo.test'],
  ])('BASE_URL_PUBLICA %s se rechaza', (_n, valor) => {
    const env = valor === undefined ? {} : { BASE_URL_PUBLICA: valor };
    expect(errorDe(() => leerConfiguracionRecordatorios(env)).variable).toBe('BASE_URL_PUBLICA');
  });
});

describe('leerConfiguracionSmtp(env)', () => {
  const SMTP = {
    SMTP_HOST: 'smtp.ethereal.email',
    SMTP_USER: 'usuario.ficticio@ethereal.email',
    SMTP_PASS: 'clave-ficticia-no-real',
  };

  test('sin SMTP_PORT usa 587', () => {
    expect(leerConfiguracionSmtp(SMTP)).toEqual({
      host: 'smtp.ethereal.email',
      puerto: 587,
      usuario: 'usuario.ficticio@ethereal.email',
      clave: 'clave-ficticia-no-real',
    });
  });

  test('SMTP_PORT=465 se respeta', () => {
    expect(leerConfiguracionSmtp({ ...SMTP, SMTP_PORT: '465' }).puerto).toBe(465);
  });

  test.each(['0', '70000', 'smtp', '587.5'])('SMTP_PORT=%j se rechaza', (valor) => {
    expect(errorDe(() => leerConfiguracionSmtp({ ...SMTP, SMTP_PORT: valor })).variable).toBe('SMTP_PORT');
  });

  test.each(['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'] as const)('%s ausente o vacía se rechaza', (variable) => {
    expect(errorDe(() => leerConfiguracionSmtp({ ...SMTP, [variable]: '' })).variable).toBe(variable);
    const { [variable]: _quitada, ...sinVariable } = SMTP;
    expect(errorDe(() => leerConfiguracionSmtp(sinVariable)).variable).toBe(variable);
  });

  test('el error nunca incluye el valor de la variable', () => {
    const error = errorDe(() => leerConfiguracionSmtp({ ...SMTP, SMTP_PORT: 'puerto-secreto-123' }));
    expect(error.message).not.toContain('puerto-secreto-123');
    expect(JSON.stringify(error)).not.toContain('puerto-secreto-123');
  });
});
