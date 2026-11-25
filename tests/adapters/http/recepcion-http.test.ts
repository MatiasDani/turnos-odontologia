import { afterEach, describe, expect, test } from 'vitest';
import { local, MARTES } from '../../fixtures/seed.js';
import { crearSistemaHttpRecepcion, type SistemaHttpRecepcion } from '../../fixtures/sistema-http-recepcion.js';

/** Escenarios de `specs/api-interna/spec.md` (C-15). Contexto: lunes 10:00 y `t-base` el martes 09:00. */
let sistema: SistemaHttpRecepcion | undefined;
afterEach(async () => {
  await sistema?.cerrar();
  sistema = undefined;
});
const iniciar = async (opciones?: Parameters<typeof crearSistemaHttpRecepcion>[0]) => (sistema = await crearSistemaHttpRecepcion(opciones));
const iso = (fecha: string, hora: string) => local(fecha, hora).toISOString();

describe('Sesión obligatoria en las rutas internas', () => {
  test('Agenda sin sesión', async () => {
    const s = await iniciar();
    const r = await s.sinSesion.get('/interno/agenda?fecha=2026-11-24&vista=dia');
    expect(r.statusCode).toBe(401);
    expect(r.json()).toMatchObject({ error: { codigo: 'SESION_INVALIDA' } });
  });

  test('Respuestas internas sin caché', async () => {
    const s = await iniciar();
    const r = await (await s.como()).get('/interno/catalogo');
    expect(r.statusCode).toBe(200);
    expect(r.headers['cache-control']).toBe('no-store');
  });
});

describe('Agenda del día', () => {
  test('Agenda del martes', async () => {
    const s = await iniciar();
    const r = await (await s.como()).get('/interno/agenda?fecha=2026-11-24&vista=dia');
    expect(r.statusCode).toBe(200);
    expect(r.json().turnos[0]).toMatchObject({
      id: 't-base',
      estado: 'confirmado',
      inicio: '2026-11-24T12:00:00.000Z',
      paciente: { nombre: 'Carla', apellido: 'Prueba' },
      profesional: { nombre: 'Ana', apellido: 'Ejemplo' },
      sillon: { nombre: 'Sillón 1' },
    });
  });

  test('Fecha inválida', async () => {
    const s = await iniciar();
    const r = await (await s.como()).get('/interno/agenda?fecha=24/11/2026&vista=dia');
    expect(r.statusCode).toBe(400);
    expect(r.json()).toMatchObject({ error: { codigo: 'DATOS_INVALIDOS', campos: ['fecha'] } });
  });
});

describe('Agenda de la semana de un recurso', () => {
  test('Semana de un profesional', async () => {
    const s = await iniciar();
    const r = await (await s.como()).get('/interno/agenda?fecha=2026-11-25&vista=semana&profesionalId=p1');
    expect(r.statusCode).toBe(200);
    const dias = r.json().dias as { fecha: string; turnos: { id: string }[] }[];
    expect(dias.map((d) => d.fecha)).toEqual(['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29']);
    expect(dias[1]?.turnos.map((t) => t.id)).toEqual(['t-base']);
  });

  test('Semana sin recurso', async () => {
    const s = await iniciar();
    const r = await (await s.como()).get('/interno/agenda?fecha=2026-11-25&vista=semana');
    expect(r.statusCode).toBe(400);
    expect(r.json()).toMatchObject({ error: { codigo: 'DATOS_INVALIDOS', campos: ['recurso'] } });
  });

  test('Semana del odontólogo sin filtro', async () => {
    const s = await iniciar();
    const r = await (await s.como('u-odo1')).get('/interno/agenda?fecha=2026-11-25&vista=semana');
    expect(r.statusCode).toBe(200);
    expect(r.json().dias[1].turnos.map((t: { id: string }) => t.id)).toEqual(['t-base']);
  });
});

describe('Catálogo interno', () => {
  test('Catálogo para recepción', async () => {
    const s = await iniciar();
    const c = (await (await s.como()).get('/interno/catalogo')).json();
    expect(c.profesionales.map((p: { id: string }) => p.id)).toEqual(['p1', 'p2']);
    expect(c.sillones.map((x: { id: string }) => x.id)).toEqual(['s1', 's2']);
    expect(c.prestaciones).toContainEqual({ id: 'pr1', nombre: 'Consulta/control', duracionMinutos: 30 });
    expect(c.usuario).toEqual({ rol: 'recepcion' });
  });
});

describe('Disponibilidad interna', () => {
  test('Huecos del martes con sillón', async () => {
    const s = await iniciar();
    const r = await (await s.como()).get('/interno/disponibilidad?prestacionId=pr1&fecha=2026-11-24&profesionalId=p1');
    expect(r.statusCode).toBe(200);
    const horarios = r.json().horarios as { inicio: string; opciones: { profesionalId: string; sillonId: string }[] }[];
    const a = (hora: string) => horarios.find((h) => h.inicio === iso(MARTES, hora));
    expect(a('09:00')?.opciones ?? []).not.toContainEqual({ profesionalId: 'p1', sillonId: 's1' });
    expect(a('09:30')?.opciones).toContainEqual({ profesionalId: 'p1', sillonId: 's1' });
  });
});

describe('Pacientes por HTTP', () => {
  test('Búsqueda por HTTP', async () => {
    const s = await iniciar();
    const r = await (await s.como()).get('/interno/pacientes?texto=Prueba');
    expect(r.statusCode).toBe(200);
    expect(r.json().pacientes).toEqual([{ id: 'pa1', nombre: 'Carla', apellido: 'Prueba', dni: '00000001', telefono: '+54 9 11 0000-0001' }]);
  });

  test('Resumen de un paciente por HTTP', async () => {
    const s = await iniciar();
    const r = await (await s.como()).get('/interno/pacientes/pa1');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ id: 'pa1', nombre: 'Carla', apellido: 'Prueba', dni: '00000001', telefono: '+54 9 11 0000-0001' });
  });

  test('Odontólogo no ve datos de contacto', async () => {
    const s = await iniciar();
    const r = await (await s.como('u-odo1')).get('/interno/pacientes/pa1');
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ error: { codigo: 'ACCESO_DENEGADO' } });
  });

  test('Alta con DNI repetido por HTTP', async () => {
    const s = await iniciar();
    const r = await (await s.como()).post('/interno/pacientes', {
      dni: '00000001',
      nombre: 'Otra',
      apellido: 'Persona',
      telefono: '11 0000 0099',
      consentimientoContacto: true,
    });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ error: { codigo: 'RN-35', paciente: { id: 'pa1' } } });
  });

  test('alta rápida por HTTP responde 201', async () => {
    const s = await iniciar();
    const r = await (await s.como()).post('/interno/pacientes', {
      dni: '30000009',
      nombre: 'Paciente',
      apellido: 'Ficticio 9',
      telefono: '11 0000 0009',
      consentimientoContacto: true,
    });
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ dni: '30000009', nombre: 'Paciente' });
  });
});

describe('Turnos por HTTP', () => {
  test('Dar un turno por HTTP', async () => {
    const s = await iniciar();
    const r = await (await s.como()).post('/interno/turnos', {
      pacienteId: 'pa2',
      profesionalId: 'p2',
      sillonId: 's2',
      prestacionId: 'pr1',
      inicio: iso(MARTES, '15:00'),
    });
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ estado: 'confirmado', paciente: { nombre: 'Diego', apellido: 'Modelo' }, fin: iso(MARTES, '15:30') });
  });

  test('Cancelar por HTTP', async () => {
    const s = await iniciar();
    const r = await (await s.como()).post('/interno/turnos/t-base/cancelar');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ id: 't-base', estado: 'cancelado' });
  });

  test('Reprogramar por HTTP', async () => {
    const s = await iniciar();
    const r = await (await s.como()).post('/interno/turnos/t-base/reprogramar', { inicio: iso(MARTES, '10:00') });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ id: 't-base', inicio: iso(MARTES, '10:00'), fin: iso(MARTES, '10:30') });
  });

  test('confirmar, atendido y ausente por HTTP', async () => {
    const s = await iniciar({
      ahora: local(MARTES, '10:00'),
      turnos: [crearTurnoReservado(), { ...crearTurnoReservado(), id: 't-ya', estado: 'confirmado', origen: 'recepcion' }],
    });
    const rec = await s.como();
    expect((await rec.post('/interno/turnos/t-res/confirmar')).json()).toMatchObject({ estado: 'confirmado' });
    expect((await rec.post('/interno/turnos/t-ya/ausente')).json()).toMatchObject({ estado: 'ausente' });
    expect((await rec.post('/interno/turnos/t-res/atendido')).json()).toMatchObject({ estado: 'atendido' });
  });
});

function crearTurnoReservado() {
  return { ...tBaseLike(), id: 't-res', estado: 'reservado' as const, origen: 'online' as const };
}
function tBaseLike() {
  return {
    id: 't-x',
    pacienteId: 'pa1',
    profesionalId: 'p1',
    sillonId: 's1',
    prestacionId: 'pr1',
    inicio: local(MARTES, '09:00'),
    fin: local(MARTES, '09:30'),
    duracionMinutos: 30,
    estado: 'confirmado' as const,
    origen: 'recepcion' as const,
  };
}

describe('Reglas de negocio por HTTP', () => {
  test('Solapamiento de profesional por HTTP', async () => {
    const s = await iniciar();
    const r = await (await s.como()).post('/interno/turnos', {
      pacienteId: 'pa2',
      profesionalId: 'p1',
      sillonId: 's2',
      prestacionId: 'pr1',
      inicio: iso(MARTES, '09:00'),
    });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toEqual({
      error: {
        codigo: 'RN-02',
        mensaje: 'El profesional ya tiene un turno en ese horario.',
        conflicto: { inicio: iso(MARTES, '09:00'), fin: iso(MARTES, '09:30') },
      },
    });
  });

  test('Turno inexistente por HTTP', async () => {
    const s = await iniciar();
    const r = await (await s.como()).post('/interno/turnos/t-inexistente/cancelar');
    expect(r.statusCode).toBe(404);
    expect(r.json()).toMatchObject({ error: { codigo: 'NO_ENCONTRADO' } });
  });

  test('Inicio sin formato por HTTP', async () => {
    const s = await iniciar();
    const r = await (await s.como()).post('/interno/turnos', { pacienteId: 'pa2', profesionalId: 'p2', sillonId: 's2', prestacionId: 'pr1', inicio: 'mañana' });
    expect(r.statusCode).toBe(400);
    expect(r.json()).toMatchObject({ error: { codigo: 'DATOS_INVALIDOS', campos: ['inicio'] } });
  });

  test('las rutas públicas nunca responden un código RN', async () => {
    const s = await iniciar();
    const r = await s.app.inject({
      method: 'POST',
      url: '/public/reservas',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ prestacionId: 'pr1', inicio: iso(MARTES, '09:00'), paciente: { dni: '30000001', nombre: 'Paciente', apellido: 'Ficticio 1', telefono: '11 0000 0000', consentimientoContacto: true } }),
    });
    expect(JSON.stringify(r.json())).not.toMatch(/RN-\d\d/);
  });
});

describe('Bloqueos por HTTP', () => {
  test('Bloquear por HTTP', async () => {
    const s = await iniciar();
    const r = await (await s.como()).post('/interno/bloqueos', {
      profesionalId: 'p2',
      inicio: iso(MARTES, '15:00'),
      fin: iso(MARTES, '16:00'),
      motivo: 'Capacitación',
    });
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ motivo: 'Capacitación', profesional: { nombre: 'Bruno', apellido: 'Muestra' } });
  });

  test('Bloqueo sobre un turno por HTTP', async () => {
    const s = await iniciar();
    const r = await (await s.como()).post('/interno/bloqueos', { profesionalId: 'p1', inicio: iso(MARTES, '09:00'), fin: iso(MARTES, '10:00') });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toMatchObject({ error: { codigo: 'RN-31', turnos: [{ id: 't-base', paciente: { nombre: 'Carla' } }] } });
  });

  test('liberar un bloqueo por HTTP', async () => {
    const s = await iniciar({ bloqueos: [{ id: 'b-1', profesionalId: 'p2', inicio: local(MARTES, '15:00'), fin: local(MARTES, '16:00') }] });
    const r = await (await s.como()).post('/interno/bloqueos/b-1/liberar');
    expect(r.statusCode).toBe(200);
  });
});

describe('Recordatorios wa.me por HTTP', () => {
  const conPendiente = async () => {
    const s = await iniciar();
    await s.nucleo.recordatorios.programar('t-base');
    const lista = (await (await s.como()).get('/interno/recordatorios/wa-me')).json().recordatorios as { id: string; turno: { id: string } }[];
    return { s, lista };
  };

  test('lista los pendientes con el turno y el paciente', async () => {
    const { lista } = await conPendiente();
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ turno: { id: 't-base', paciente: { nombre: 'Carla' } }, enlaceWaMe: expect.stringMatching(/^https:\/\/wa\.me\//) });
  });

  test('Marcar enviado por HTTP', async () => {
    const { s, lista } = await conPendiente();
    const r = await (await s.como()).post(`/interno/recordatorios/${lista[0]?.id}/enviado`);
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ estado: 'enviado' });
  });

  test('Administrador no marca enviado por HTTP', async () => {
    const { s, lista } = await conPendiente();
    const r = await (await s.como('u-admin')).post(`/interno/recordatorios/${lista[0]?.id}/enviado`);
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ error: { codigo: 'ACCESO_DENEGADO' } });
  });
});

describe('Mínimo dato en las respuestas internas', () => {
  test('La agenda no expone datos de contacto', async () => {
    const s = await iniciar();
    const cuerpo = (await (await s.como()).get('/interno/agenda?fecha=2026-11-24&vista=dia')).body;
    expect(cuerpo).not.toContain('00000001');
    expect(cuerpo).not.toContain('0000-0001');
  });

  test('Logs sin datos de pacientes', async () => {
    const s = await iniciar();
    const token = await s.tokenDe('u-rec');
    const rec = await s.como();
    await rec.get('/interno/pacientes?texto=Prueba');
    await rec.post('/interno/pacientes', { dni: '30000009', nombre: 'Paciente', apellido: 'Ficticio 9', telefono: '11 0000 0009', consentimientoContacto: true });
    const log = s.lineasDeLog.map((l) => JSON.stringify((JSON.parse(l) as { req?: unknown; msg?: unknown }).req ?? '') + String((JSON.parse(l) as { msg?: unknown }).msg ?? '')).join('\n');
    for (const dato of ['Prueba', '30000009', token]) expect(log).not.toContain(dato);
    expect(log).toContain('/interno/pacientes');
  });
});
