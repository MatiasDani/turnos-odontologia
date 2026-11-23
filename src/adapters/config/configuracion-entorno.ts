import type { ConfiguracionRecordatorios } from '../../application/configuracion-recordatorios.js';
import type { ConfiguracionSmtp } from '../notificador/notificador-smtp.js';

/** Variables de entorno tal como llegan (p. ej. `process.env`). */
export type VariablesEntorno = Readonly<Record<string, string | undefined>>;

/**
 * Variable de entorno ausente o inválida. Nombra la variable y nunca incluye su valor, que puede
 * ser un secreto (regla dura 9).
 */
export class ConfiguracionInvalidaError extends Error {
  readonly variable: string;

  constructor(variable: string, motivo: string) {
    super(`Configuración inválida: ${variable} ${motivo}`);
    this.name = 'ConfiguracionInvalidaError';
    this.variable = variable;
  }
}

const HORAS_ANTES_POR_DEFECTO = 24;
const PUERTO_SMTP_POR_DEFECTO = 587;
const ENTERO = /^\d+$/;

export function obligatoria(env: VariablesEntorno, variable: string): string {
  const valor = env[variable]?.trim();
  if (valor === undefined || valor === '') throw new ConfiguracionInvalidaError(variable, 'es obligatoria');
  return valor;
}

export function enteroPositivo(env: VariablesEntorno, variable: string, porDefecto: number, maximo: number): number {
  const valor = env[variable];
  if (valor === undefined) return porDefecto;
  const numero = ENTERO.test(valor.trim()) ? Number(valor.trim()) : Number.NaN;
  if (!Number.isInteger(numero) || numero < 1 || numero > maximo) {
    throw new ConfiguracionInvalidaError(variable, `debe ser un entero entre 1 y ${maximo}`);
  }
  return numero;
}

export function urlHttp(env: VariablesEntorno, variable: string): string {
  const valor = obligatoria(env, variable);
  let protocolo: string;
  try {
    protocolo = new URL(valor).protocol;
  } catch {
    throw new ConfiguracionInvalidaError(variable, 'debe ser una URL http o https');
  }
  if (protocolo !== 'http:' && protocolo !== 'https:') {
    throw new ConfiguracionInvalidaError(variable, 'debe ser una URL http o https');
  }
  return valor;
}

/** `RECORDATORIO_HORAS_ANTES` (24 por defecto) y `BASE_URL_PUBLICA` (obligatoria). */
export function leerConfiguracionRecordatorios(env: VariablesEntorno): ConfiguracionRecordatorios {
  return {
    horasAntes: enteroPositivo(env, 'RECORDATORIO_HORAS_ANTES', HORAS_ANTES_POR_DEFECTO, 24 * 30),
    baseUrlPublica: urlHttp(env, 'BASE_URL_PUBLICA'),
  };
}

/** `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (obligatorias) y `SMTP_PORT` (587 por defecto). */
export function leerConfiguracionSmtp(env: VariablesEntorno): ConfiguracionSmtp {
  return {
    host: obligatoria(env, 'SMTP_HOST'),
    puerto: enteroPositivo(env, 'SMTP_PORT', PUERTO_SMTP_POR_DEFECTO, 65_535),
    usuario: obligatoria(env, 'SMTP_USER'),
    clave: obligatoria(env, 'SMTP_PASS'),
  };
}
