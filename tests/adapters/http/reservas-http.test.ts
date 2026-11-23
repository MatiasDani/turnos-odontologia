import { afterEach, describe, expect, test } from 'vitest';
import { local } from '../../fixtures/seed.js';
import { crearSistemaHttp, cuerpoReserva, type SistemaHttp } from '../../fixtures/sistema-http.js';
import { turnoBasePublico } from '../../fixtures/sistema-publico.js';

let sistema: SistemaHttp | undefined;
afterEach(async () => {
  await sistema?.cerrar();
  sistema = undefined;
});

describe('Alta de reserva por HTTP', () => {
  test('Reserva exitosa por HTTP', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.post('/public/reservas', cuerpoReserva());
    expect(r.statusCode).toBe(201);
    const cuerpo = r.json();
    expect(cuerpo.inicio).toBe(local('2026-11-23', '11:00').toISOString());
    expect(cuerpo.fin).toBe(local('2026-11-23', '11:30').toISOString());
    expect(cuerpo.prestacion).toEqual({ nombre: 'Consulta/control' });
    expect(['Ana', 'Bruno']).toContain(cuerpo.profesional.nombre);
    expect(cuerpo.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Object.keys(cuerpo).sort()).toEqual(['fin', 'inicio', 'prestacion', 'profesional', 'token']);
    expect(r.body).not.toMatch(/turnoId|sillonId|pacienteId/);
  });

  test('Cuerpo de reserva con clave desconocida', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.post('/public/reservas', cuerpoReserva({ sillonId: 's1' }));
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toMatchObject({ codigo: 'DATOS_INVALIDOS', campos: ['sillonId'] });
    expect(sistema.s.turnos.todos()).toHaveLength(1);
  });

  test('Horario tomado entre la consulta y la reserva', async () => {
    const ocupar = (id: string, profesionalId: string, sillonId: string) => ({
      ...turnoBasePublico({ id, profesionalId, sillonId }),
      inicio: local('2026-11-23', '11:00'),
      fin: local('2026-11-23', '11:30'),
    });
    sistema = await crearSistemaHttp({
      turnos: [turnoBasePublico(), ocupar('t-a', 'p1', 's1'), ocupar('t-b', 'p2', 's2')],
    });
    const r = await sistema.post('/public/reservas', cuerpoReserva());
    expect(r.statusCode).toBe(409);
    const { codigo, nuevaOferta } = r.json().error;
    expect(codigo).toBe('HORARIO_NO_DISPONIBLE');
    expect(nuevaOferta.length).toBeGreaterThan(0);
    for (const h of nuevaOferta) {
      expect(Object.keys(h).sort()).toEqual(['fin', 'inicio']);
      expect(h.inicio.slice(0, 10)).toBe('2026-11-23');
      expect(h.inicio).not.toBe(local('2026-11-23', '11:00').toISOString());
    }
  });
});
