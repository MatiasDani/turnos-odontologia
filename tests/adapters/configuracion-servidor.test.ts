import { describe, expect, test } from 'vitest';
import {
  ConfiguracionInvalidaError,
} from '../../src/adapters/config/configuracion-entorno.js';
import { leerConfiguracionAutenticacion, leerConfiguracionServidor } from '../../src/adapters/config/configuracion-servidor.js';

describe('leerConfiguracionServidor', () => {
  test('valores por defecto: puerto 3000, host local, nivel info y base derivada', () => {
    expect(leerConfiguracionServidor({})).toEqual({
      puerto: 3000,
      host: '127.0.0.1',
      nivelDeLog: 'info',
      baseUrlPublica: 'http://127.0.0.1:3000',
    });
  });

  test('lee PORT, HOST, LOG_LEVEL y BASE_URL_PUBLICA', () => {
    expect(
      leerConfiguracionServidor({ PORT: '8080', HOST: '0.0.0.0', LOG_LEVEL: 'warn', BASE_URL_PUBLICA: 'https://turnos.demo.test' }),
    ).toEqual({ puerto: 8080, host: '0.0.0.0', nivelDeLog: 'warn', baseUrlPublica: 'https://turnos.demo.test' });
  });

  test('la base derivada sigue al puerto y al host informados', () => {
    expect(leerConfiguracionServidor({ PORT: '4000', HOST: 'localhost' }).baseUrlPublica).toBe('http://localhost:4000');
  });

  test('rechaza un puerto inválido nombrando la variable sin su valor', () => {
    for (const PORT of ['0', '70000', 'abc', '30.5']) {
      const error = (() => {
        try {
          leerConfiguracionServidor({ PORT });
        } catch (e) {
          return e;
        }
        return undefined;
      })();
      expect(error).toBeInstanceOf(ConfiguracionInvalidaError);
      expect((error as Error).message).toContain('PORT');
      expect((error as Error).message).not.toContain(PORT === 'abc' ? 'abc' : `${PORT} `);
    }
  });

  test('rechaza un nivel de log desconocido y una URL pública no http', () => {
    expect(() => leerConfiguracionServidor({ LOG_LEVEL: 'ruidoso' })).toThrow(ConfiguracionInvalidaError);
    expect(() => leerConfiguracionServidor({ BASE_URL_PUBLICA: 'ftp://x' })).toThrow(ConfiguracionInvalidaError);
  });
});

describe('leerConfiguracionAutenticacion (C-09)', () => {
  const SECRETO = 'secreto-ficticio-de-tests-0123456';

  test('lee JWT_SECRET sin administrador inicial', () => {
    expect(leerConfiguracionAutenticacion({ JWT_SECRET: SECRETO })).toEqual({ jwtSecret: SECRETO });
  });

  test('lee el administrador inicial cuando están las dos variables', () => {
    expect(
      leerConfiguracionAutenticacion({ JWT_SECRET: SECRETO, ADMIN_EMAIL_INICIAL: ' admin@demo.test ', ADMIN_CLAVE_INICIAL: 'cambiar-en-local' }),
    ).toEqual({ jwtSecret: SECRETO, adminInicial: { email: 'admin@demo.test', clave: 'cambiar-en-local' } });
  });

  test.each([{}, { JWT_SECRET: '  ' }])('JWT_SECRET ausente o vacía es un error que la nombra (%j)', (env) => {
    expect(() => leerConfiguracionAutenticacion(env)).toThrow(/JWT_SECRET/);
  });

  test('JWT_SECRET corta es un error que no muestra su valor', () => {
    let mensaje = '';
    try {
      leerConfiguracionAutenticacion({ JWT_SECRET: 'secreto-corto-ficticio' });
    } catch (e) {
      mensaje = e instanceof Error ? e.message : '';
    }
    expect(mensaje).toContain('JWT_SECRET');
    expect(mensaje).not.toContain('secreto-corto-ficticio');
  });

  test('Falta la clave inicial', () => {
    expect(() => leerConfiguracionAutenticacion({ JWT_SECRET: SECRETO, ADMIN_EMAIL_INICIAL: 'admin-inicial@demo.test' })).toThrow(
      /ADMIN_CLAVE_INICIAL/,
    );
  });

  test('falta el e-mail inicial', () => {
    let mensaje = '';
    try {
      leerConfiguracionAutenticacion({ JWT_SECRET: SECRETO, ADMIN_CLAVE_INICIAL: 'clave-ficticia-inicial' });
    } catch (e) {
      mensaje = e instanceof Error ? e.message : '';
    }
    expect(mensaje).toContain('ADMIN_EMAIL_INICIAL');
    expect(mensaje).not.toContain('clave-ficticia-inicial');
  });
});
