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
    for (const ruta of ['/public/design-system/tokens.css', '/public/design-system/brand.js', '/public/design-system/assets/logo.svg', '/public/assets/paciente.css']) {
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
    for (const dato of ['30000001', 'Paciente', 'Ficticio', '1100000000', 'paciente1@ejemplo.test', ok.json().token]) {
      expect(log).not.toContain(dato);
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
