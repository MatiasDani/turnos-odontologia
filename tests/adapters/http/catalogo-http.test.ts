import { afterEach, describe, expect, test } from 'vitest';
import { local } from '../../fixtures/seed.js';
import { crearSistemaHttp, cuerpoReserva, type SistemaHttp } from '../../fixtures/sistema-http.js';
import { crearEntorno } from '../../fixtures/seed.js';

let sistema: SistemaHttp | undefined;
afterEach(async () => {
  await sistema?.cerrar();
  sistema = undefined;
});

const prestacionesConPr4Inactiva = () =>
  crearEntorno().prestaciones.map((p) => (p.id === 'pr4' ? { ...p, activa: false } : p));

describe('Catálogo público de prestaciones', () => {
  test('Lista de prestaciones activas', async () => {
    sistema = await crearSistemaHttp({ prestaciones: prestacionesConPr4Inactiva() });
    const r = await sistema.get('/public/prestaciones');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({
      consultorio: { nombre: 'Consultorio Odontológico Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' },
      diasReservables: { desde: '2026-11-22', hasta: '2026-12-22' },
      prestaciones: [
        { id: 'pr1', nombre: 'Consulta/control', duracionMinutos: 30 },
        { id: 'pr3', nombre: 'Extracción simple', duracionMinutos: 60 },
        { id: 'pr2', nombre: 'Limpieza', duracionMinutos: 45 },
      ],
    });
    expect(r.body).not.toContain('pr4');
    expect(r.body).not.toMatch(/sill[oó]n|profesional|paciente/i);
  });
});

describe('Profesionales habilitados de una prestación', () => {
  test('Profesionales activos y habilitados', async () => {
    const profesionales = crearEntorno().profesionales.map((p) => (p.id === 'p2' ? { ...p, activo: false } : p));
    sistema = await crearSistemaHttp({ profesionales });
    const r = await sistema.get('/public/prestaciones/pr1/profesionales');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ profesionales: [{ id: 'p1', nombre: 'Ana', apellido: 'Ejemplo' }] });
    for (const prohibido of ['matricula', 'prestacionIds', 'sillon', 'activo', '0001']) {
      expect(r.body).not.toContain(prohibido);
    }
  });

  test('Profesionales de una prestación inactiva', async () => {
    sistema = await crearSistemaHttp({ prestaciones: prestacionesConPr4Inactiva() });
    const r = await sistema.get('/public/prestaciones/pr4/profesionales');
    expect(r.statusCode).toBe(422);
    expect(r.json().error.codigo).toBe('PRESTACION_NO_DISPONIBLE');
  });
});

describe('Disponibilidad pública por día', () => {
  test('Horarios libres del día sin datos internos', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.get('/public/disponibilidad?prestacionId=pr1&fecha=2026-11-23');
    expect(r.statusCode).toBe(200);
    const { horarios, fecha, zonaHoraria } = r.json();
    expect(fecha).toBe('2026-11-23');
    expect(zonaHoraria).toBe('America/Argentina/Buenos_Aires');
    const diez = horarios.filter((h: { inicio: string }) => h.inicio === local('2026-11-23', '10:00').toISOString());
    expect(diez).toEqual([
      { inicio: local('2026-11-23', '10:00').toISOString(), fin: local('2026-11-23', '10:30').toISOString() },
    ]);
    for (const h of horarios) expect(Object.keys(h).sort()).toEqual(['fin', 'inicio']);
    expect(r.body).not.toMatch(/sillonId|profesionalId/);
  });

  test('Disponibilidad filtrada por profesional', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.get('/public/disponibilidad?prestacionId=pr1&fecha=2026-11-23&profesionalId=p1');
    const inicios = r.json().horarios.map((h: { inicio: string }) => h.inicio);
    expect(inicios).not.toContain(local('2026-11-23', '10:00').toISOString());
    expect(inicios).toContain(local('2026-11-23', '10:30').toISOString());
  });

  test('Día sin atención devuelve lista vacía', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.get('/public/disponibilidad?prestacionId=pr1&fecha=2026-11-28');
    expect(r.statusCode).toBe(200);
    expect(r.json().horarios).toEqual([]);
  });

  test('Parámetros de disponibilidad inválidos', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.get('/public/disponibilidad?fecha=2026-02-30');
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toMatchObject({ codigo: 'DATOS_INVALIDOS', campos: ['prestacionId', 'fecha'] });
  });
});

describe('Horizonte de reserva online de 30 días', () => {
  test('Último día del horizonte', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.get('/public/disponibilidad?prestacionId=pr1&fecha=2026-12-22');
    expect(r.statusCode).toBe(200);
    expect(r.json().horarios.length).toBeGreaterThan(0);
  });

  test('Disponibilidad fuera del horizonte', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.get('/public/disponibilidad?prestacionId=pr1&fecha=2026-12-23');
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toMatchObject({ codigo: 'DATOS_INVALIDOS', campos: ['fecha'] });
  });

  test('Reserva fuera del horizonte', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.post('/public/reservas', cuerpoReserva({ inicio: '2026-12-23T09:00:00-03:00' }));
    expect(r.statusCode).toBe(409);
    expect(r.json().error).toMatchObject({ codigo: 'HORARIO_NO_DISPONIBLE', nuevaOferta: [] });
    expect(sistema.s.turnos.todos()).toHaveLength(1);
    await expect(sistema.s.pacientes.obtenerPorDni('30000001')).resolves.toBeUndefined();
  });
});
