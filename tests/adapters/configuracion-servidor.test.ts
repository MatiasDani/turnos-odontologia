import { describe, expect, test } from 'vitest';
import {
  ConfiguracionInvalidaError,
} from '../../src/adapters/config/configuracion-entorno.js';
import { leerConfiguracionServidor } from '../../src/adapters/config/configuracion-servidor.js';

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
