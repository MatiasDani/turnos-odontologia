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

export interface ConfiguracionAutenticacion {
  /** Secreto de firma de las sesiones (`JWT_SECRET`, DD-37). */
  readonly jwtSecret: string;
  /** Administrador a crear en el primer arranque (`ADMIN_EMAIL_INICIAL` y `ADMIN_CLAVE_INICIAL`, DD-35). */
  readonly adminInicial?: { readonly email: string; readonly clave: string };
}

const LARGO_MINIMO_SECRETO = 32;

/**
 * `JWT_SECRET` obligatoria de 32 caracteres o más; `ADMIN_EMAIL_INICIAL` y `ADMIN_CLAVE_INICIAL`,
 * ambas o ninguna. Los errores nombran la variable y nunca muestran su valor (regla dura 9).
 */
export function leerConfiguracionAutenticacion(env: VariablesEntorno): ConfiguracionAutenticacion {
  const jwtSecret = env['JWT_SECRET'];
  if (jwtSecret === undefined || jwtSecret.trim() === '') {
    throw new ConfiguracionInvalidaError('JWT_SECRET', 'es obligatoria');
  }
  if (jwtSecret.length < LARGO_MINIMO_SECRETO) {
    throw new ConfiguracionInvalidaError('JWT_SECRET', `debe tener ${LARGO_MINIMO_SECRETO} caracteres o más`);
  }
  const email = env['ADMIN_EMAIL_INICIAL']?.trim() || undefined;
  const clave = env['ADMIN_CLAVE_INICIAL'] || undefined;
  if (email !== undefined && clave === undefined) {
    throw new ConfiguracionInvalidaError('ADMIN_CLAVE_INICIAL', 'es obligatoria si se define ADMIN_EMAIL_INICIAL');
  }
  if (clave !== undefined && email === undefined) {
    throw new ConfiguracionInvalidaError('ADMIN_EMAIL_INICIAL', 'es obligatoria si se define ADMIN_CLAVE_INICIAL');
  }
  return { jwtSecret, ...(email !== undefined && clave !== undefined ? { adminInicial: { email, clave } } : {}) };
}
