import { afterEach, describe, expect, test } from 'vitest';
import { traducirError } from '../../../src/adapters/http/errores-http.js';
import { CredencialesInvalidasError, SesionInvalidaError } from '../../../src/application/errores-autenticacion.js';
import { AccesoDenegadoError } from '../../../src/domain/errores.js';
import { crearSistemaHttpAutenticacion, RUTA_SOLO_ADMIN, type SistemaHttpAutenticacion } from '../../fixtures/sistema-http-autenticacion.js';

let sistema: SistemaHttpAutenticacion | undefined;
afterEach(async () => {
  await sistema?.cerrar();
  sistema = undefined;
});
const iniciar = async () => (sistema = await crearSistemaHttpAutenticacion());
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

describe('Errores públicos de autenticación (design D9)', () => {
  test.each([
    [new AccesoDenegadoError('recepcion', 'usuario.gestionar'), 403, 'ACCESO_DENEGADO', 'No tenés permiso para hacer esto.'],
    [new SesionInvalidaError(), 401, 'SESION_INVALIDA', 'Tu sesión no es válida o venció. Iniciá sesión de nuevo.'],
    [new CredencialesInvalidasError(), 401, 'CREDENCIALES_INVALIDAS', 'E-mail o clave incorrectos.'],
  ])('%s responde %i %s con mensaje fijo', (error, estado, codigo, mensaje) => {
    expect(traducirError(error)).toEqual({ estado, inesperado: false, cuerpo: { error: { codigo, mensaje } } });
  });

  test('el acceso denegado no expone rol ni acción en el cuerpo', () => {
    const cuerpo = JSON.stringify(traducirError(new AccesoDenegadoError('odontologo', 'turno.cancelar')).cuerpo);
    expect(cuerpo).not.toContain('odontologo');
    expect(cuerpo).not.toContain('turno.cancelar');
  });
});

describe('Ruta HTTP de inicio de sesión', () => {
  test('Login HTTP exitoso', async () => {
    const s = await iniciar();
    const r = await s.post('/auth/login', { email: 'recepcion@demo.test', clave: 'clave-ficticia-01' });
    expect(r.statusCode).toBe(200);
    const cuerpo = r.json<{ token: string; usuario: Record<string, unknown> }>();
    expect(cuerpo.token).toEqual(expect.any(String));
    expect(cuerpo.usuario).toEqual({
      id: 'u-rec',
      email: 'recepcion@demo.test',
      rol: 'recepcion',
      venceEn: '2026-11-23T21:00:00.000Z',
    });
    expect(r.headers['cache-control']).toBe('no-store');
  });

  test('Login HTTP con credenciales inválidas', async () => {
    const s = await iniciar();
    const r = await s.post('/auth/login', { email: 'recepcion@demo.test', clave: 'clave-incorrecta' });
    expect(r.statusCode).toBe(401);
    expect(r.json()).toEqual({ error: { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'E-mail o clave incorrectos.' } });
  });

  test('Login HTTP sin clave', async () => {
    const s = await iniciar();
    const r = await s.post('/auth/login', { email: 'recepcion@demo.test' });
    expect(r.statusCode).toBe(400);
    expect(r.json()).toMatchObject({ error: { codigo: 'DATOS_INVALIDOS', campos: ['clave'] } });
  });

  test.each([undefined, 'texto', [1], { email: 1, clave: 2 }])('cuerpo inválido %j responde 400', async (cuerpo) => {
    const s = await iniciar();
    const r = await s.post('/auth/login', cuerpo);
    expect(r.statusCode).toBe(400);
    expect(r.json()).toMatchObject({ error: { codigo: 'DATOS_INVALIDOS' } });
  });
});

describe('Protección HTTP de las rutas internas', () => {
  test('Ruta interna sin cabecera', async () => {
    const s = await iniciar();
    const r = await s.get('/auth/sesion');
    expect(r.statusCode).toBe(401);
    expect(r.json()).toMatchObject({ error: { codigo: 'SESION_INVALIDA' } });
  });

  test('Datos de la sesión vigente', async () => {
    const s = await iniciar();
    const token = await s.tokenDe('odontologo1@demo.test');
    const r = await s.get('/auth/sesion', bearer(token));
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({
      usuario: { id: 'u-odo1', email: 'odontologo1@demo.test', rol: 'odontologo', profesionalId: 'p1' },
    });
  });

  test('Acceso denegado responde 403', async () => {
    const s = await iniciar();
    const token = await s.tokenDe('recepcion@demo.test');
    const r = await s.get(RUTA_SOLO_ADMIN, bearer(token));
    expect(r.statusCode).toBe(403);
    expect(r.json()).toEqual({ error: { codigo: 'ACCESO_DENEGADO', mensaje: 'No tenés permiso para hacer esto.' } });
  });

  test('el administrador pasa la ruta interna', async () => {
    const s = await iniciar();
    const token = await s.tokenDe('admin@demo.test');
    const r = await s.get(RUTA_SOLO_ADMIN, bearer(token));
    expect(r.statusCode).toBe(200);
  });

  test.each(['Token abc', 'Bearer', 'Bearer ', 'Basic dXNlcjpjbGF2ZQ=='])('cabecera %j responde 401', async (valor) => {
    const s = await iniciar();
    const r = await s.get(RUTA_SOLO_ADMIN, { authorization: valor });
    expect(r.statusCode).toBe(401);
    expect(r.json()).toMatchObject({ error: { codigo: 'SESION_INVALIDA' } });
  });

  test('las rutas públicas de C-14 siguen sin pedir sesión', async () => {
    const s = await iniciar();
    const r = await s.get('/public/prestaciones', { accept: 'application/json' });
    expect(r.statusCode).toBe(200);
  });
});

describe('Sin secretos en los logs', () => {
  test('El login no deja la clave ni el token en el log', async () => {
    const s = await iniciar();
    const r = await s.post('/auth/login', { email: 'recepcion@demo.test', clave: 'clave-ficticia-01' });
    const token = r.json<{ token: string }>().token;
    await s.get('/auth/sesion', bearer(token));
    await s.post('/auth/login', { email: 'recepcion@demo.test', clave: 'clave-incorrecta' });
    const log = s.lineasDeLog.join('\n');
    expect(log).toContain('/auth/login');
    for (const secreto of ['clave-ficticia-01', 'clave-incorrecta', token, 'scrypt$']) expect(log).not.toContain(secreto);
  });
});
