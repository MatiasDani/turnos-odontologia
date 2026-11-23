import { afterEach, describe, expect, test } from 'vitest';
import type { Paciente } from '../../../src/domain/paciente.js';
import { local } from '../../fixtures/seed.js';
import { crearSistemaHttp, cuerpoReserva, type SistemaHttp } from '../../fixtures/sistema-http.js';
import { turnoBasePublico } from '../../fixtures/sistema-publico.js';

let sistema: SistemaHttp | undefined;
afterEach(async () => {
  await sistema?.cerrar();
  sistema = undefined;
});

describe('Códigos HTTP de los errores públicos', () => {
  test('Límite de turnos online por HTTP', async () => {
    const paciente: Paciente = {
      id: 'pa-limite',
      nombre: 'Paciente',
      apellido: 'Ficticio 1',
      dni: '30000001',
      telefono: '5491100000000',
      consentimientoContacto: true,
    };
    const online = (id: string, hora: string) => ({
      ...turnoBasePublico({ id, pacienteId: 'pa-limite', profesionalId: 'p2', sillonId: 's2' }),
      inicio: local('2026-11-24', hora),
      fin: local('2026-11-24', `${hora.slice(0, 2)}:30`),
    });
    sistema = await crearSistemaHttp({
      pacientes: [paciente],
      turnos: [turnoBasePublico(), online('t-l1', '09:00'), online('t-l2', '10:00')],
    });
    const r = await sistema.post('/public/reservas', cuerpoReserva());
    expect(r.statusCode).toBe(422);
    expect(r.json()).toEqual({
      error: { codigo: 'LIMITE_DE_TURNOS', mensaje: 'Se alcanzó el máximo de turnos online permitidos.' },
    });
  });

  test('Error inesperado sin detalles', async () => {
    sistema = await crearSistemaHttp();
    sistema.s.turnos.antesDeAgregar = () => {
      throw new Error('conexión caída con la base de 30000001 Paciente Ficticio 1');
    };
    const r = await sistema.post('/public/reservas', cuerpoReserva());
    expect(r.statusCode).toBe(500);
    expect(r.json()).toEqual({
      error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error. Probá de nuevo en unos minutos.' },
    });
    for (const prohibido of ['conexión', 'caída', 'stack', 'at ', '30000001', 'Ficticio']) {
      expect(r.body).not.toContain(prohibido);
    }
  });
});

describe('Mapeo de códigos HTTP fijos', () => {
  test.each([
    { codigo: 'DATOS_INVALIDOS', cambios: { prestacionId: undefined }, estado: 400 },
    { codigo: 'RESERVA_EN_PASADO', cambios: { inicio: '2026-11-21T09:00:00-03:00' }, estado: 422 },
    { codigo: 'PRESTACION_NO_DISPONIBLE', cambios: { prestacionId: 'xx' }, estado: 422 },
    { codigo: 'PROFESIONAL_NO_DISPONIBLE', cambios: { profesionalId: 'p9' }, estado: 422 },
  ])('$codigo responde $estado', async ({ codigo, cambios, estado }) => {
    sistema = await crearSistemaHttp();
    const r = await sistema.post('/public/reservas', cuerpoReserva(cambios));
    expect(r.statusCode).toBe(estado);
    expect(r.json().error.codigo).toBe(codigo);
  });

  test('RESERVA_DUPLICADA responde 409', async () => {
    sistema = await crearSistemaHttp();
    expect((await sistema.post('/public/reservas', cuerpoReserva())).statusCode).toBe(201);
    const r = await sistema.post('/public/reservas', cuerpoReserva());
    expect(r.statusCode).toBe(409);
    expect(r.json().error.codigo).toBe('RESERVA_DUPLICADA');
  });

  test('un cuerpo que no es JSON o está mal formado es DATOS_INVALIDOS en pedido', async () => {
    sistema = await crearSistemaHttp();
    const mal = await sistema.app.inject({
      method: 'POST',
      url: '/public/reservas',
      headers: { 'content-type': 'application/json' },
      payload: '{no es json',
    });
    expect(mal.statusCode).toBe(400);
    expect(mal.json().error).toMatchObject({ codigo: 'DATOS_INVALIDOS', campos: ['pedido'] });
    const vacio = await sistema.app.inject({
      method: 'POST',
      url: '/public/reservas',
      headers: { 'content-type': 'application/json' },
      payload: '',
    });
    expect(vacio.json().error).toMatchObject({ codigo: 'DATOS_INVALIDOS', campos: ['pedido'] });
    const texto = await sistema.app.inject({
      method: 'POST',
      url: '/public/reservas',
      headers: { 'content-type': 'application/xml' },
      payload: '<x/>',
    });
    expect(texto.statusCode).toBe(400);
  });

  test('un cuerpo de más de 16 KB se rechaza como DATOS_INVALIDOS', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.post('/public/reservas', cuerpoReserva({ relleno: 'x'.repeat(20_000) }));
    expect(r.statusCode).toBe(400);
    expect(r.json().error.codigo).toBe('DATOS_INVALIDOS');
  });

  test('una ruta inexistente responde 404 JSON o HTML según Accept, sin detalles', async () => {
    sistema = await crearSistemaHttp();
    const json = await sistema.get('/public/nada');
    expect(json.statusCode).toBe(404);
    expect(json.json().error.codigo).toBe('NO_ENCONTRADO');
    const html = await sistema.get('/public/nada', { accept: 'text/html' });
    expect(html.statusCode).toBe(404);
    expect(html.headers['content-type']).toContain('text/html');
  });
});

