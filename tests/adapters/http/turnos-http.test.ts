import { afterEach, describe, expect, test } from 'vitest';
import { local } from '../../fixtures/seed.js';
import { crearSistemaHttp, type SistemaHttp } from '../../fixtures/sistema-http.js';
import { ID_TURNO_BASE, turnoBasePublico } from '../../fixtures/sistema-publico.js';

let sistema: SistemaHttp | undefined;
afterEach(async () => {
  await sistema?.cerrar();
  sistema = undefined;
});

const MENSAJE_ENLACE = 'El enlace no es válido o ya no está vigente.';

function turnoDe(id: string, profesionalId: string, sillonId: string, dia: string, hora: string, fin: string) {
  return { ...turnoBasePublico({ id, profesionalId, sillonId }), inicio: local(dia, hora), fin: local(dia, fin) };
}

describe('Consulta del turno por token', () => {
  test('Paciente consulta su turno por HTTP', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.json(`/public/turnos/${sistema.token}`);
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({
      inicio: local('2026-11-23', '10:00').toISOString(),
      fin: local('2026-11-23', '10:30').toISOString(),
      prestacion: { nombre: 'Consulta/control' },
      profesional: { nombre: 'Ana', apellido: 'Ejemplo' },
      asistenciaConfirmada: false,
      gestionOnline: true,
      consultorio: {
        nombre: 'Consultorio Odontológico Demo',
        telefono: '+54 9 11 0000-0000',
        email: 'contacto@demo.test',
        zonaHoraria: 'America/Argentina/Buenos_Aires',
      },
      diasReservables: { desde: '2026-11-22', hasta: '2026-12-22' },
    });
    expect(r.body).not.toMatch(/turnoId|sillonId|pacienteId/);
    expect(r.body).not.toContain(sistema.token);
    expect(r.headers['vary']).toBe('Accept');
    expect(r.headers['cache-control']).toBe('no-store');
  });

  test('Turno con menos de 24 horas', async () => {
    sistema = await crearSistemaHttp({ ahora: local('2026-11-22', '10:01') });
    const r = await sistema.json(`/public/turnos/${sistema.token}`);
    expect(r.statusCode).toBe(200);
    expect(r.json().gestionOnline).toBe(false);
  });

  test('Enlace inválido por HTTP', async () => {
    sistema = await crearSistemaHttp();
    const rotado = sistema.token;
    await sistema.s.servicioTokens.rotar(ID_TURNO_BASE);
    const cancelado = await sistema.s.servicioTokens.rotar(ID_TURNO_BASE);
    sistema.s.turnos.cambiarEstado(ID_TURNO_BASE, 'cancelado');
    for (const token of ['N'.repeat(43), rotado, cancelado, 'corto']) {
      const r = await sistema.json(`/public/turnos/${token}`);
      expect(r.statusCode).toBe(404);
      expect(r.json()).toEqual({ error: { codigo: 'ENLACE_INVALIDO', mensaje: MENSAJE_ENLACE } });
    }
  });
});

describe('Confirmación de asistencia por HTTP', () => {
  test('Confirmar asistencia por HTTP', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.post(`/public/turnos/${sistema.token}/confirmar`);
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({
      asistenciaConfirmada: true,
      inicio: local('2026-11-23', '10:00').toISOString(),
      fin: local('2026-11-23', '10:30').toISOString(),
    });
    await expect(sistema.s.turnos.obtenerPorId(ID_TURNO_BASE)).resolves.toMatchObject({ estado: 'confirmado' });
  });

  test('Confirmar dos veces el mismo turno', async () => {
    sistema = await crearSistemaHttp({ ahora: local('2026-11-22', '10:01') });
    expect((await sistema.post(`/public/turnos/${sistema.token}/confirmar`)).statusCode).toBe(200);
    const r = await sistema.post(`/public/turnos/${sistema.token}/confirmar`);
    expect(r.statusCode).toBe(200);
    expect(r.json().asistenciaConfirmada).toBe(true);
    await expect(sistema.s.turnos.obtenerPorId(ID_TURNO_BASE)).resolves.toMatchObject({ estado: 'confirmado' });
  });

  test('un token con forma inválida o desconocido en POST es ENLACE_INVALIDO', async () => {
    sistema = await crearSistemaHttp();
    for (const accion of ['confirmar', 'cancelar']) {
      expect((await sistema.post(`/public/turnos/x/${accion}`)).statusCode).toBe(404);
      expect((await sistema.post(`/public/turnos/${'N'.repeat(43)}/${accion}`)).json().error.codigo).toBe('ENLACE_INVALIDO');
    }
  });
});

describe('Cancelación por HTTP', () => {
  test('Cancelar por HTTP con anticipación', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.post(`/public/turnos/${sistema.token}/cancelar`);
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ estado: 'cancelado', prestacion: { nombre: 'Consulta/control' } });
    expect(r.body).not.toMatch(/turnoId|sillonId|pacienteId/);
    await expect(sistema.s.turnos.obtenerPorId(ID_TURNO_BASE)).resolves.toMatchObject({
      estado: 'cancelado',
      canceladoPor: 'paciente',
    });
    const despues = await sistema.json(`/public/turnos/${sistema.token}`);
    expect(despues.statusCode).toBe(404);
    expect(despues.json().error.codigo).toBe('ENLACE_INVALIDO');
  });

  test('Cancelar por HTTP con menos de 24 horas', async () => {
    sistema = await crearSistemaHttp({ ahora: local('2026-11-22', '10:01') });
    const r = await sistema.post(`/public/turnos/${sistema.token}/cancelar`);
    expect(r.statusCode).toBe(422);
    expect(r.json().error.codigo).toBe('CONTACTAR_CONSULTORIO');
    await expect(sistema.s.turnos.obtenerPorId(ID_TURNO_BASE)).resolves.toMatchObject({ estado: 'reservado' });
  });
});

describe('Reprogramación por HTTP', () => {
  test('Horarios para reprogramar del mismo profesional', async () => {
    sistema = await crearSistemaHttp({
      turnos: [turnoBasePublico(), turnoDe('t-p2', 'p2', 's2', '2026-11-24', '09:00', '09:30')],
    });
    const r = await sistema.get(`/public/turnos/${sistema.token}/disponibilidad?fecha=2026-11-24`, {
      accept: 'application/json',
    });
    expect(r.statusCode).toBe(200);
    const inicios = r.json().horarios.map((h: { inicio: string }) => h.inicio);
    expect(inicios).toContain(local('2026-11-24', '09:00').toISOString());
    for (const h of r.json().horarios) expect(Object.keys(h).sort()).toEqual(['fin', 'inicio']);
    expect(r.body).not.toMatch(/sillonId|profesionalId/);
  });

  test('Reprogramar por HTTP a un horario libre', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.post(`/public/turnos/${sistema.token}/reprogramar`, { inicio: '2026-11-24T09:00:00-03:00' });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({
      inicio: local('2026-11-24', '09:00').toISOString(),
      fin: local('2026-11-24', '09:30').toISOString(),
      profesional: { nombre: 'Ana', apellido: 'Ejemplo' },
    });
    const consulta = await sistema.json(`/public/turnos/${sistema.token}`);
    expect(consulta.statusCode).toBe(200);
    expect(consulta.json().inicio).toBe(local('2026-11-24', '09:00').toISOString());
  });

  test('Reprogramar por HTTP a un horario ocupado', async () => {
    sistema = await crearSistemaHttp({
      turnos: [turnoBasePublico(), turnoDe('t-otro', 'p1', 's2', '2026-11-24', '09:00', '09:30')],
    });
    const r = await sistema.post(`/public/turnos/${sistema.token}/reprogramar`, { inicio: '2026-11-24T09:00:00-03:00' });
    expect(r.statusCode).toBe(409);
    expect(r.json().error.codigo).toBe('HORARIO_NO_DISPONIBLE');
    await expect(sistema.s.turnos.obtenerPorId(ID_TURNO_BASE)).resolves.toMatchObject({
      inicio: local('2026-11-23', '10:00'),
    });
  });

  test('Cuerpo de reprogramación con claves no admitidas', async () => {
    sistema = await crearSistemaHttp();
    const r = await sistema.post(`/public/turnos/${sistema.token}/reprogramar`, {
      inicio: '2026-11-24T09:00:00-03:00',
      profesionalId: 'p2',
      sillonId: 's2',
    });
    expect(r.statusCode).toBe(400);
    expect(r.json().error).toMatchObject({ codigo: 'DATOS_INVALIDOS', campos: ['profesionalId', 'sillonId'] });
    await expect(sistema.s.turnos.obtenerPorId(ID_TURNO_BASE)).resolves.toMatchObject({
      inicio: local('2026-11-23', '10:00'),
    });
  });

  test('reprogramar con menos de 24 horas es CONTACTAR_CONSULTORIO y fuera del horizonte HORARIO_NO_DISPONIBLE', async () => {
    sistema = await crearSistemaHttp();
    const fuera = await sistema.post(`/public/turnos/${sistema.token}/reprogramar`, { inicio: '2026-12-23T09:00:00-03:00' });
    expect(fuera.statusCode).toBe(409);
    sistema.s.reloj.fijar(local('2026-11-22', '10:01'));
    const tarde = await sistema.post(`/public/turnos/${sistema.token}/reprogramar`, { inicio: '2026-11-24T09:00:00-03:00' });
    expect(tarde.statusCode).toBe(422);
    expect(tarde.json().error.codigo).toBe('CONTACTAR_CONSULTORIO');
  });
});
