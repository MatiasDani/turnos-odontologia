import { afterEach, describe, expect, test } from 'vitest';
import { crearSistemaHttp, cuerpoReserva, type SistemaHttp } from '../../fixtures/sistema-http.js';
import { ID_TURNO_BASE } from '../../fixtures/sistema-publico.js';
import { redactarUrl } from '../../../src/adapters/http/logs.js';

let sistema: SistemaHttp | undefined;
afterEach(async () => {
  await sistema?.cerrar();
  sistema = undefined;
});

const HTML = { accept: 'text/html,application/xhtml+xml' };

/**
 * Valores de las líneas de log (JSON de pino) donde un dato del paciente podría filtrarse.
 * Los textos se devuelven tal cual; los números solo como entero exacto, para que dígitos
 * de campos como `responseTime` (13.300000011920929) o `time` no den falsos positivos.
 * `hostname` es metadato de pino ajeno a la petición.
 */
function valoresDeLog(lineas: readonly string[]): string[] {
  const valores: string[] = [];
  const recorrer = (valor: unknown, clave: string): void => {
    if (typeof valor === 'string') {
      if (clave !== 'hostname') valores.push(valor);
    } else if (typeof valor === 'number') {
      if (Number.isInteger(valor)) valores.push(`=${String(valor)}`);
    } else if (Array.isArray(valor)) {
      for (const v of valor) recorrer(v, clave);
    } else if (typeof valor === 'object' && valor !== null) {
      for (const [k, v] of Object.entries(valor)) {
        valores.push(k);
        recorrer(v, k);
      }
    }
  };
  for (const linea of lineas) recorrer(JSON.parse(linea) as unknown, '');
  return valores;
}

/** ¿Aparece el dato en algún texto del log o como número entero exacto? */
function apareceEnLog(lineas: readonly string[], dato: string): boolean {
  return valoresDeLog(lineas).some((v) => v === `=${dato}` || (!v.startsWith('=') && v.includes(dato)));
}

describe('Navegación segura de los enlaces', () => {
  test('Abrir el enlace de confirmación no confirma el turno', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.get(`/public/turnos/${sistema.token}/confirmar`, HTML);
    expect(r.statusCode).toBe(200);
    expect(r.headers['content-type']).toContain('text/html');
    await expect(sistema.s.turnos.obtenerPorId(ID_TURNO_BASE)).resolves.toMatchObject({ estado: 'reservado' });
    // Ni siquiera con otros Accept ni con la ruta principal.
    await sistema.get(`/public/turnos/${sistema.token}/confirmar`);
    await sistema.get(`/public/turnos/${sistema.token}`, HTML);
    await expect(sistema.s.turnos.obtenerPorId(ID_TURNO_BASE)).resolves.toMatchObject({ estado: 'reservado' });
  });

  test('La página no incluye el token ni datos del turno', async () => {
    sistema = await crearSistemaHttp();
    const valido = await sistema.get(`/public/turnos/${sistema.token}`, HTML);
    const invalido = await sistema.get(`/public/turnos/${'N'.repeat(43)}`, HTML);
    for (const r of [valido, invalido]) {
      expect(r.statusCode).toBe(200);
      expect(r.headers['content-type']).toContain('text/html');
      expect(r.headers['vary']).toBe('Accept');
      expect(r.headers['cache-control']).toBe('no-store');
      expect(r.headers['referrer-policy']).toBe('no-referrer');
      expect(r.body).not.toContain(sistema.token);
      for (const dato of ['Ana', 'Ejemplo', 'Carla', '00000001', 'Consulta/control']) expect(r.body).not.toContain(dato);
    }
    expect(valido.body).toBe(invalido.body);
  });

  test('la página de reserva y los estáticos llevan las cabeceras de seguridad', async () => {
    sistema = await crearSistemaHttp();
    const pagina = await sistema.get('/public/reservar', HTML);
    expect(pagina.statusCode).toBe(200);
    expect(pagina.headers['referrer-policy']).toBe('no-referrer');
    expect(pagina.headers['x-content-type-options']).toBe('nosniff');
    expect(pagina.headers['content-security-policy']).toContain("default-src 'self'");
    for (const ruta of ['/public/design-system/tokens.css', '/public/design-system/brand.js', '/public/design-system/assets/logo.svg', '/public/assets/paciente.css', '/public/assets/portada.css']) {
      const r = await sistema.get(ruta);
      expect(r.statusCode, ruta).toBe(200);
    }
  });

  test('solo se sirven los estáticos de la lista blanca', async () => {
    sistema = await crearSistemaHttp();
    for (const ruta of [
      '/public/design-system/README.md',
      '/public/design-system/../package.json',
      '/public/design-system/%2e%2e/package.json',
      '/public/assets/..%2fapp.ts',
      '/public/assets/reserva.html',
      '/public/assets/portada.html',
    ]) {
      const r = await sistema.get(ruta);
      expect(r.statusCode, ruta).toBe(404);
    }
  });
});

describe('Logs sin token ni datos personales', () => {
  test('El token no aparece en los logs', async () => {
    sistema = await crearSistemaHttp();
    const t = sistema.token;
    await sistema.json(`/public/turnos/${t}`);
    await sistema.post(`/public/turnos/${t}/confirmar`);
    await sistema.post(`/public/turnos/${t}/cancelar`);
    await sistema.get(`/public/turnos/${t}`, HTML);
    const log = sistema.lineasDeLog.join('\n');
    expect(log).not.toContain(t);
    expect(log).toContain('/public/turnos/[redactado]');
    expect(log).toContain('/public/turnos/[redactado]/confirmar');
  });

  test('Los datos del paciente no aparecen en los logs', async () => {
    sistema = await crearSistemaHttp();
    const ok = await sistema.post('/public/reservas', cuerpoReserva());
    await sistema.post('/public/reservas', cuerpoReserva({}, { dni: '12' }));
    const log = sistema.lineasDeLog.join('\n');
    expect(log).toContain('/public/reservas');
    // Texto y token: sobre el log crudo, sin excepciones.
    for (const dato of ['Paciente', 'Ficticio', 'paciente1@ejemplo.test', ok.json().token]) {
      expect(log).not.toContain(dato);
    }
    // DNI y teléfono son solo dígitos: se buscan en los valores parseados para no confundirlos
    // con los decimales de `responseTime` o el epoch de `time`.
    for (const dato of ['30000001', '1100000000']) {
      expect(apareceEnLog(sistema.lineasDeLog, dato), dato).toBe(false);
    }
  });

  test('la query string no se registra', async () => {
    sistema = await crearSistemaHttp();
    await sistema.get('/public/disponibilidad?prestacionId=pr1&fecha=2026-11-23&dato=secreto77');
    expect(sistema.lineasDeLog.join('\n')).not.toContain('secreto77');
  });
});

describe('redactarUrl', () => {
  test('reemplaza el token en cualquier subruta y quita la query', () => {
    expect(redactarUrl('/public/turnos/abc')).toBe('/public/turnos/[redactado]');
    expect(redactarUrl('/public/turnos/abc/confirmar?x=1')).toBe('/public/turnos/[redactado]/confirmar');
    expect(redactarUrl('/public/prestaciones?a=b')).toBe('/public/prestaciones');
    expect(redactarUrl('/public/turnos/')).toBe('/public/turnos/');
  });
});

describe('apareceEnLog (auxiliar de los tests de logs)', () => {
  test('detecta el dato en textos y como entero, pero no dentro de decimales ni del epoch', () => {
    const limpia = JSON.stringify({ level: 30, time: 1730000000123, responseTime: 13.300000011920929, msg: 'request completed' });
    const conDecimal = JSON.stringify({ responseTime: 0.1100000000123, req: { url: '/public/reservas' } });
    expect(apareceEnLog([limpia, conDecimal], '30000001')).toBe(false);
    expect(apareceEnLog([conDecimal], '1100000000')).toBe(false);
    expect(apareceEnLog([JSON.stringify({ req: { url: '/x?dni=30000001' } })], '30000001')).toBe(true);
    expect(apareceEnLog([JSON.stringify({ err: { message: 'tel 1100000000 inválido' } })], '1100000000')).toBe(true);
    expect(apareceEnLog([JSON.stringify({ paciente: { dni: 30000001 } })], '30000001')).toBe(true);
  });
});
