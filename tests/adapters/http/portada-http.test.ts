import { afterEach, describe, expect, test } from 'vitest';
import { crearSistemaHttp, type SistemaHttp } from '../../fixtures/sistema-http.js';

/** Escenarios de `specs/portada/spec.md` (mejora-visual-ui): la portada pública en `GET /`. */
let sistema: SistemaHttp | undefined;
afterEach(async () => {
  await sistema?.cerrar();
  sistema = undefined;
});

const HTML = { accept: 'text/html,application/xhtml+xml' };

describe('Portada en la raíz', () => {
  test('La raíz ya no da 404', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.get('/', HTML);
    expect(r.statusCode).toBe(200);
    expect(r.headers['content-type']).toContain('text/html');
    expect(r.headers['cache-control']).toBe('no-store');
    expect(r.headers['content-security-policy']).toContain("default-src 'self'");
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['referrer-policy']).toBe('no-referrer');
    // Sin estilos ni scripts en línea: los exige la CSP.
    expect(r.body).not.toMatch(/<style[\s>]/i);
    expect(r.body).not.toMatch(/\sstyle=/i);
    expect(r.body).not.toMatch(/<script(?![^>]*\ssrc=)[^>]*>/i);
  });

  test('La portada no expone datos', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.get('/', HTML);
    expect(r.statusCode).toBe(200);
    for (const dato of ['Carla', 'Prueba', '00000001', '+54 9 11', 'Ana', 'Ejemplo']) expect(r.body).not.toContain(dato);
  });

  test('la portada enlaza solo a la reserva y al ingreso del personal', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.get('/', HTML);
    const enlaces = [...r.body.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)].map((m) => m[1]);
    expect(new Set(enlaces)).toEqual(new Set(['#contenido', '/', '/public/reservar', '/recepcion/login']));
    expect(r.body.match(/<h1[\s>]/g)).toHaveLength(1);
  });
});
