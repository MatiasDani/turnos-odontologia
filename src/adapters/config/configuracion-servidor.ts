import { ConfiguracionInvalidaError, enteroPositivo, urlHttp, type VariablesEntorno } from './configuracion-entorno.js';

export interface ConfiguracionServidor {
  readonly puerto: number;
  readonly host: string;
  readonly nivelDeLog: string;
  /** Base pública de los enlaces (`BASE_URL_PUBLICA`); por defecto la dirección del servidor. */
  readonly baseUrlPublica: string;
}

const PUERTO_POR_DEFECTO = 3000;
const HOST_POR_DEFECTO = '127.0.0.1';
const NIVELES = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];

/** `PORT` (3000), `HOST` (127.0.0.1), `LOG_LEVEL` (info) y `BASE_URL_PUBLICA` (derivada). */
export function leerConfiguracionServidor(env: VariablesEntorno): ConfiguracionServidor {
  const puerto = enteroPositivo(env, 'PORT', PUERTO_POR_DEFECTO, 65_535);
  const host = env['HOST']?.trim() || HOST_POR_DEFECTO;
  const nivelDeLog = env['LOG_LEVEL']?.trim() || 'info';
  if (!NIVELES.includes(nivelDeLog)) throw new ConfiguracionInvalidaError('LOG_LEVEL', 'no es un nivel de log válido');
  return {
    puerto,
    host,
    nivelDeLog,
    baseUrlPublica: env['BASE_URL_PUBLICA'] === undefined ? `http://${host}:${puerto}` : urlHttp(env, 'BASE_URL_PUBLICA'),
  };
}
