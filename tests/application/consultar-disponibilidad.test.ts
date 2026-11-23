// Un test por escenario de specs/disponibilidad-turnos/spec.md, con el título idéntico (regla dura 8).
import { describe, expect, test } from 'vitest';
import { ConsultaInvalidaError, RecursoNoEncontradoError, ReglaNegocioError } from '../../src/domain/errores.js';
import { agruparPorHorario } from '../../src/domain/disponibilidad/agrupar-huecos.js';
import type { Hueco } from '../../src/domain/disponibilidad/hueco.js';
import { aHoraLocal } from '../../src/domain/tiempo.js';
import { crearEntorno, crearTurno } from '../fixtures/seed.js';
import { agendar, consultar, crearSistema } from '../fixtures/sistema.js';
import { LUNES, local } from '../fixtures/seed.js';

const DIA_MS = 24 * 60 * 60_000;
const BA = 'America/Argentina/Buenos_Aires';

function hhmm(d: Date): string {
  const { minutosDelDia: m } = aHoraLocal(d, BA);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** 'HH:mm-HH:mm p/s' por combo, en el orden devuelto. */
function combos(huecos: readonly Hueco[]): string[] {
  return huecos.map((h) => `${hhmm(h.inicio)}-${hhmm(h.fin)} ${h.profesionalId}/${h.sillonId}`);
}

/** Combos cuyo inicio es `hora` (HH:mm), como 'p/s'. */
function en(huecos: readonly Hueco[], hora: string): string[] {
  return huecos.filter((h) => hhmm(h.inicio) === hora).map((h) => `${h.profesionalId}/${h.sillonId}`);
}

/** Horarios únicos 'HH:mm-HH:mm' en orden. */
function horarios(huecos: readonly Hueco[]): string[] {
  return [...new Set(huecos.map((h) => `${hhmm(h.inicio)}-${hhmm(h.fin)}`))];
}

describe('Rango de consulta acotado', () => {
  test('Rango invertido o vacío rechazado', async () => {
    const sistema = crearSistema();
    const desde = local(LUNES, '10:00');
    const invertido = consultar(sistema, { rango: { desde, hasta: local(LUNES, '09:00') } });
    await expect(invertido).rejects.toBeInstanceOf(ConsultaInvalidaError);
    await expect(invertido).rejects.toMatchObject({ campo: 'rango' });
    const vacio = consultar(sistema, { rango: { desde, hasta: desde } });
    await expect(vacio).rejects.toMatchObject({ name: 'ConsultaInvalidaError', campo: 'rango' });
  });

  test('Rango mayor a 31 días rechazado', async () => {
    const desde = local(LUNES, '00:00');
    const hasta = new Date(desde.getTime() + 31 * DIA_MS + 60_000);
    await expect(consultar(crearSistema(), { rango: { desde, hasta } })).rejects.toMatchObject({
      name: 'ConsultaInvalidaError',
      campo: 'rango',
    });
  });
});

describe('Paso de los inicios candidatos', () => {
  test('Paso inválido rechazado', async () => {
    const sistema = crearSistema();
    for (const paso of [0, 7, 12.5]) {
      const consulta = consultar(sistema, { paso });
      await expect(consulta).rejects.toBeInstanceOf(ConsultaInvalidaError);
      await expect(consulta).rejects.toMatchObject({ campo: 'paso' });
    }
  });
});

describe('Errores de la consulta con orden fijo', () => {
  test('Consulta inválida prevalece sobre prestación inexistente', async () => {
    const consulta = consultar(crearSistema(), {
      prestacionId: 'pr9',
      rango: { desde: local(LUNES, '10:00'), hasta: local(LUNES, '09:00') },
    });
    await expect(consulta).rejects.toMatchObject({ name: 'ConsultaInvalidaError', campo: 'rango' });
  });
});

describe('Solo recursos activos', () => {
  test('Prestación inactiva rechaza la consulta', async () => {
    const e = crearEntorno();
    const prestaciones = e.prestaciones.map((p) => (p.id === 'pr1' ? { ...p, activa: false } : p));
    const consulta = consultar(crearSistema({ prestaciones }));
    await expect(consulta).rejects.toBeInstanceOf(ReglaNegocioError);
    await expect(consulta).rejects.toMatchObject({ codigo: 'RN-18' });
  });

  test('Prestación inexistente rechaza la consulta', async () => {
    const consulta = consultar(crearSistema(), { prestacionId: 'pr9' });
    await expect(consulta).rejects.toBeInstanceOf(RecursoNoEncontradoError);
    await expect(consulta).rejects.toMatchObject({ tipo: 'prestacion', id: 'pr9' });
  });
});

describe('Duración efectiva de la consulta', () => {
  test('Paciente con duración distinta rechazado', async () => {
    const consulta = consultar(crearSistema(), { rol: 'paciente', duracion: 45 });
    await expect(consulta).rejects.toBeInstanceOf(ReglaNegocioError);
    await expect(consulta).rejects.toMatchObject({ codigo: 'RN-16' });
  });

  test('Duración inválida rechazada', async () => {
    const consulta = consultar(crearSistema(), { duracion: 32 });
    await expect(consulta).rejects.toBeInstanceOf(ReglaNegocioError);
    await expect(consulta).rejects.toMatchObject({ codigo: 'RN-06' });
  });
});

describe('Filtro opcional por profesional', () => {
  test('Filtro por profesional inexistente', async () => {
    const consulta = consultar(crearSistema(), { profesionalId: 'p9' });
    await expect(consulta).rejects.toBeInstanceOf(RecursoNoEncontradoError);
    await expect(consulta).rejects.toMatchObject({ tipo: 'profesional', id: 'p9' });
  });
});

describe('Errores de la consulta con orden fijo: previas a la enumeración', () => {
  test('prestación inexistente prevalece sobre profesional inexistente', async () => {
    const consulta = consultar(crearSistema(), { prestacionId: 'pr9', profesionalId: 'p9' });
    await expect(consulta).rejects.toMatchObject({ tipo: 'prestacion', id: 'pr9' });
  });

  test('profesional inexistente prevalece sobre RN-18 de la prestación', async () => {
    const e = crearEntorno();
    const prestaciones = e.prestaciones.map((p) => (p.id === 'pr1' ? { ...p, activa: false } : p));
    const consulta = consultar(crearSistema({ prestaciones }), { profesionalId: 'p9' });
    await expect(consulta).rejects.toBeInstanceOf(RecursoNoEncontradoError);
  });

  test('RN-18 de la prestación prevalece sobre RN-16', async () => {
    const e = crearEntorno();
    const prestaciones = e.prestaciones.map((p) => (p.id === 'pr1' ? { ...p, activa: false } : p));
    const consulta = consultar(crearSistema({ prestaciones }), { rol: 'paciente', duracion: 45 });
    await expect(consulta).rejects.toMatchObject({ codigo: 'RN-18' });
  });

  test('RN-16 prevalece sobre RN-06', async () => {
    const consulta = consultar(crearSistema(), { rol: 'paciente', duracion: 32 });
    await expect(consulta).rejects.toMatchObject({ codigo: 'RN-16' });
  });
});

describe('Huecos con profesional y sillón libres a la vez', () => {
  test('Día vacío ofrece huecos en ambos tramos', async () => {
    const huecos = await consultar(crearSistema());
    const hs = horarios(huecos);
    expect(hs).toHaveLength(30);
    expect(huecos).toHaveLength(120);
    expect(hs.every((h) => en(huecos, h.slice(0, 5)).length === 4)).toBe(true);
    expect(hs[0]).toBe('09:00-09:30');
    expect(huecos[0]?.inicio.toISOString()).toBe('2026-11-23T12:00:00.000Z');
    expect(hs[14]).toBe('12:30-13:00');
    expect(hs[15]).toBe('15:00-15:30');
    expect(hs.at(-1)).toBe('18:30-19:00');
  });

  test('Hueco contiguo a un turno aparece', async () => {
    const turno = crearTurno({ inicio: local(LUNES, '09:00'), fin: local(LUNES, '09:45'), duracionMinutos: 45 });
    const huecos = await consultar(crearSistema({ turnos: [turno] }));
    expect(combos(huecos)).toContain('09:45-10:15 p1/s1');
    expect(combos(huecos)).not.toContain('09:15-09:45 p1/s1');
  });

  test('Profesional libre con sillón ocupado no basta', async () => {
    const turno = crearTurno({ profesionalId: 'p2', sillonId: 's1', fin: local(LUNES, '10:00'), duracionMinutos: 60 });
    const huecos = await consultar(crearSistema({ turnos: [turno] }));
    expect(en(huecos, '09:00')).toEqual(['p1/s2']);
  });

  test('Sillón libre con profesional ocupado no basta', async () => {
    const turno = crearTurno({ fin: local(LUNES, '10:00'), duracionMinutos: 60 });
    const huecos = await consultar(crearSistema({ turnos: [turno] }));
    expect(en(huecos, '09:30')).toEqual(['p2/s2']);
  });

  test('Sin recursos libres no hay hueco', async () => {
    const turnos = [
      crearTurno({ id: 't1', fin: local(LUNES, '10:00'), duracionMinutos: 60 }),
      crearTurno({ id: 't2', profesionalId: 'p2', sillonId: 's2', fin: local(LUNES, '10:00'), duracionMinutos: 60 }),
    ];
    const huecos = await consultar(crearSistema({ turnos }));
    for (const hora of ['09:00', '09:15', '09:30', '09:45']) expect(en(huecos, hora)).toEqual([]);
    expect(horarios(huecos)[0]).toBe('10:00-10:30');
  });
});

describe('Solo los turnos activos bloquean huecos', () => {
  test('Turno cancelado libera el hueco', async () => {
    const turno = crearTurno({ estado: 'cancelado' });
    const huecos = await consultar(crearSistema({ turnos: [turno] }));
    expect(en(huecos, '09:00')).toEqual(['p1/s1', 'p1/s2', 'p2/s1', 'p2/s2']);
  });

  test('Turno ausente no ocupa el hueco', async () => {
    const turno = crearTurno({ estado: 'ausente' });
    const huecos = await consultar(crearSistema({ turnos: [turno] }));
    expect(en(huecos, '09:00')).toContain('p1/s1');
  });

  test('un turno atendido sí ocupa el hueco', async () => {
    const turno = crearTurno({ estado: 'atendido' });
    const huecos = await consultar(crearSistema({ turnos: [turno] }));
    expect(en(huecos, '09:00')).toEqual(['p2/s2']);
  });
});

describe('Huecos dentro de un único tramo de atención', () => {
  test('Último hueco termina justo al cierre del tramo', async () => {
    const hs = horarios(await consultar(crearSistema()));
    expect(hs).toContain('12:30-13:00');
    expect(hs).toContain('18:30-19:00');
  });

  test('Hueco que excede el cierre no aparece', async () => {
    const hs = horarios(await consultar(crearSistema(), { prestacionId: 'pr3' }));
    expect(hs.at(-1)).toBe('18:00-19:00');
    expect(hs).not.toContain('18:15-19:15');
  });

  test('Hueco que cruza el corte del mediodía no aparece', async () => {
    const huecos = await consultar(crearSistema(), { prestacionId: 'pr2' });
    const hs = horarios(huecos);
    expect(hs).toContain('12:15-13:00');
    expect(hs).not.toContain('12:30-13:15');
    expect(huecos.filter((h) => hhmm(h.inicio) >= '13:00' && hhmm(h.inicio) < '15:00')).toEqual([]);
  });

  test('Fin de semana sin huecos', async () => {
    const rango = { desde: local('2026-11-28', '00:00'), hasta: local('2026-11-30', '00:00') };
    expect(await consultar(crearSistema(), { rango })).toEqual([]);
  });
});

describe('Bloqueos excluyen solo al recurso bloqueado', () => {
  const MIERCOLES = '2026-11-25';

  test('Bloqueo de profesional excluye solo a ese profesional', async () => {
    const huecos = await consultar(crearSistema(), { dia: MIERCOLES });
    expect(en(huecos, '15:00')).toEqual(['p2/s1', 'p2/s2']);
    expect(en(huecos, '16:45')).toEqual(['p2/s1', 'p2/s2']);
    expect(en(huecos, '17:00')).toContain('p1/s1');
    expect(en(huecos, '14:45')).toEqual([]); // fuera de tramo (13:00-15:00 cerrado)
    expect(en(huecos, '12:30')).toContain('p1/s1');
  });

  test('Bloqueo de sillón ofrece el otro sillón', async () => {
    const bloqueo = { id: 'b2', sillonId: 's1', inicio: local(LUNES, '09:00'), fin: local(LUNES, '11:00') };
    const huecos = await consultar(crearSistema({ bloqueos: [bloqueo] }));
    expect(en(huecos, '09:00')).toEqual(['p1/s2', 'p2/s2']);
    expect(en(huecos, '10:45')).toEqual(['p1/s2', 'p2/s2']);
    expect(en(huecos, '11:00')).toEqual(['p1/s1', 'p1/s2', 'p2/s1', 'p2/s2']);
  });
});

describe('Solo profesionales habilitados para la prestación', () => {
  test('Profesional que no realiza la prestación excluido', async () => {
    const e = crearEntorno();
    const profesionales = e.profesionales.map((p) => (p.id === 'p2' ? { ...p, prestacionIds: ['pr1'] } : p));
    const huecos = await consultar(crearSistema({ profesionales }), { prestacionId: 'pr4' });
    expect(huecos.length).toBeGreaterThan(0);
    expect(huecos.some((h) => h.profesionalId === 'p2')).toBe(false);
    expect(huecos.some((h) => h.profesionalId === 'p1')).toBe(true);
  });
});

describe('Solo recursos activos: recursos inactivos', () => {
  test('Recursos inactivos excluidos', async () => {
    const e = crearEntorno();
    const profesionales = e.profesionales.map((p) => (p.id === 'p2' ? { ...p, activo: false } : p));
    const sillones = e.sillones.map((s) => (s.id === 's2' ? { ...s, activo: false } : s));
    const huecos = await consultar(crearSistema({ profesionales, sillones }));
    expect(huecos.length).toBeGreaterThan(0);
    expect(huecos.every((h) => h.profesionalId === 'p1' && h.sillonId === 's1')).toBe(true);
  });
});

describe('Duración efectiva de la consulta: duración ajustada', () => {
  test('Duración ajustada por recepción cambia los huecos', async () => {
    const huecos = await consultar(crearSistema(), { duracion: 60 });
    expect(huecos.every((h) => h.fin.getTime() - h.inicio.getTime() === 60 * 60_000)).toBe(true);
    const hs = horarios(huecos);
    expect(hs.filter((h) => h < '13:00').at(-1)).toBe('12:00-13:00');
    expect(hs).not.toContain('12:15-13:15');
    expect(en(huecos, '12:15')).toEqual([]);
  });
});

describe('Filtro opcional por profesional: filtro', () => {
  test('Filtro por profesional', async () => {
    const huecos = await consultar(crearSistema(), { profesionalId: 'p1' });
    expect(huecos).toHaveLength(60);
    expect(huecos.every((h) => h.profesionalId === 'p1')).toBe(true);
  });

  test('profesional existente pero no habilitado o inactivo: resultado vacío', async () => {
    const e = crearEntorno();
    const noHabilitado = e.profesionales.map((p) => (p.id === 'p2' ? { ...p, prestacionIds: ['pr1'] } : p));
    expect(await consultar(crearSistema({ profesionales: noHabilitado }), { prestacionId: 'pr4', profesionalId: 'p2' })).toEqual([]);
    const inactivo = e.profesionales.map((p) => (p.id === 'p2' ? { ...p, activo: false } : p));
    expect(await consultar(crearSistema({ profesionales: inactivo }), { profesionalId: 'p2' })).toEqual([]);
  });
});

describe('Paso de los inicios candidatos: grilla', () => {
  test('Paso configurable de 30 minutos', async () => {
    const huecos = await consultar(crearSistema(), { paso: 30 });
    const manana = [...new Set(huecos.map((h) => hhmm(h.inicio)))].filter((h) => h < '13:00');
    expect(manana).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30']);
    expect(en(huecos, '09:15')).toEqual([]);
  });

  test('Paso alineado al inicio de cada tramo', async () => {
    const huecos = await consultar(crearSistema(), { paso: 25 });
    const inicios = [...new Set(huecos.map((h) => hhmm(h.inicio)))];
    const manana = inicios.filter((h) => h < '13:00');
    expect(manana.slice(0, 3)).toEqual(['09:00', '09:25', '09:50']);
    expect(manana.at(-1)).toBe('12:20');
    const tarde = inicios.filter((h) => h >= '13:00');
    expect(tarde.slice(0, 2)).toEqual(['15:00', '15:25']);
  });
});

describe('Sin huecos en el pasado', () => {
  test('Huecos en el pasado excluidos', async () => {
    const huecos = await consultar(crearSistema(), { ahora: local(LUNES, '10:07') });
    expect(horarios(huecos)[0]).toBe('10:15-10:45');
    expect(huecos.every((h) => h.inicio.getTime() >= local(LUNES, '10:07').getTime())).toBe(true);
  });

  test('Hueco que empieza justo ahora aparece', async () => {
    const huecos = await consultar(crearSistema(), { ahora: local(LUNES, '10:15') });
    expect(horarios(huecos)[0]).toBe('10:15-10:45');
  });
});

describe('Rango de consulta acotado: semiabierto y 31 días', () => {
  test('Rango semiabierto por inicio del hueco', async () => {
    const rango = { desde: local(LUNES, '09:00'), hasta: local(LUNES, '10:00') };
    const hs = horarios(await consultar(crearSistema(), { rango }));
    expect(hs.at(-1)).toBe('09:45-10:15');
    expect(hs).not.toContain('10:00-10:30');
  });

  test('Rango de exactamente 31 días aceptado', async () => {
    const desde = local(LUNES, '00:00');
    const hasta = new Date(desde.getTime() + 31 * DIA_MS);
    const huecos = await consultar(crearSistema(), { rango: { desde, hasta } });
    expect(huecos.length).toBeGreaterThan(0);
  });
});

describe('Orden determinista de los combos', () => {
  test('Orden determinista de combos', async () => {
    const e = crearEntorno();
    const sistema = crearSistema({
      profesionales: [...e.profesionales].reverse(),
      sillones: [...e.sillones].reverse(),
    });
    expect(sistema.datos.profesionales.map((p) => p.id)).toEqual(['p2', 'p1']);
    expect(sistema.datos.sillones.map((x) => x.id)).toEqual(['s2', 's1']);
    const rango = { desde: local(LUNES, '00:00'), hasta: local('2026-11-25', '00:00') };
    const huecos = await consultar(sistema, { rango });
    const lunes = huecos.filter((h) => hhmm(h.inicio) === '09:00' && h.inicio.getTime() < local('2026-11-24', '00:00').getTime());
    expect(lunes.map((h) => `${h.profesionalId}/${h.sillonId}`)).toEqual(['p1/s1', 'p1/s2', 'p2/s1', 'p2/s2']);
    const ms = huecos.map((h) => h.inicio.getTime());
    expect(ms).toEqual([...ms].sort((a, b) => a - b));
    const ultimoLunes = huecos.map((h) => h.inicio.getTime() < local('2026-11-24', '00:00').getTime()).lastIndexOf(true);
    const primerMartes = huecos.findIndex((h) => h.inicio.getTime() >= local('2026-11-24', '00:00').getTime());
    expect(ultimoLunes).toBeLessThan(primerMartes);
  });
});

describe('Agrupación por horario único', () => {
  test('Agrupación por horario único', async () => {
    const grupos = agruparPorHorario(await consultar(crearSistema()));
    expect(grupos).toHaveLength(30);
    const primero = grupos[0];
    expect(`${hhmm(primero!.inicio)}-${hhmm(primero!.fin)}`).toBe('09:00-09:30');
    expect(primero?.opciones).toEqual([
      { profesionalId: 'p1', sillonId: 's1' },
      { profesionalId: 'p1', sillonId: 's2' },
      { profesionalId: 'p2', sillonId: 's1' },
      { profesionalId: 'p2', sillonId: 's2' },
    ]);
  });

  test('Agrupación de una lista vacía', async () => {
    const rango = { desde: local('2026-11-28', '00:00'), hasta: local('2026-11-29', '00:00') };
    expect(agruparPorHorario(await consultar(crearSistema(), { rango }))).toEqual([]);
  });
});

describe('Consistencia con el alta de turnos', () => {
  test('Todo hueco ofrecido se puede agendar', async () => {
    const turno = crearTurno({ inicio: local(LUNES, '09:00'), fin: local(LUNES, '09:45'), duracionMinutos: 45 });
    const bloqueo = { id: 'b2', sillonId: 's2', inicio: local(LUNES, '15:00'), fin: local(LUNES, '16:00') };
    const agenda = { turnos: [turno], bloqueos: [...crearEntorno().bloqueos, bloqueo] };

    const huecos = await consultar(crearSistema(agenda), { prestacionId: 'pr2' });
    expect(huecos.length).toBeGreaterThan(0);
    // La agenda condicionó la oferta: el combo ocupado y el sillón bloqueado no se ofrecen.
    expect(combos(huecos)).not.toContain('09:00-09:45 p1/s1');
    expect(en(huecos, '15:00')).toEqual(['p1/s1', 'p2/s1']);

    for (const h of huecos) {
      // Cada combo se agenda por separado sobre un sistema nuevo con la misma agenda.
      const sistema = crearSistema(agenda);
      const creado = await agendar(sistema, {
        profesionalId: h.profesionalId,
        sillonId: h.sillonId,
        prestacionId: 'pr2',
        dia: LUNES,
        hora: hhmm(h.inicio),
      });
      expect(creado.inicio).toEqual(h.inicio);
      expect(creado.fin).toEqual(h.fin);
    }
  });
});

describe('Consulta de solo lectura', () => {
  test('La consulta no modifica la agenda', async () => {
    const turno = crearTurno({ inicio: local(LUNES, '09:00'), fin: local(LUNES, '09:45'), duracionMinutos: 45 });
    const sistema = crearSistema({ turnos: [turno] });
    const primera = await consultar(sistema);
    const segunda = await consultar(sistema);
    expect(segunda).toEqual(primera);
    expect(primera.length).toBeGreaterThan(0);
    // listarPorRecursos devuelve los turnos del profesional o del sillón: la agenda sigue con ese único turno.
    expect((await sistema.turnos.listarPorRecursos('p1', 's1')).map((t) => t.id)).toEqual([turno.id]);
    expect((await sistema.turnos.listarPorRecursos('p2', 's2')).length).toBe(0);
    expect(await sistema.turnos.listarPorRecursos('p1', 's2')).toHaveLength(1);
    expect(await sistema.turnos.listarPorRecursos('p2', 's1')).toHaveLength(1);
  });
});

describe('Horario propio del profesional en la disponibilidad', () => {
  const propio = (id: string, profesionalId: string, desde: string, hasta: string) => ({
    id,
    consultorioId: 'c1',
    profesionalId,
    diaSemana: 1,
    desde,
    hasta,
  });
  const sistemaCon = (...tramos: ReturnType<typeof propio>[]) =>
    crearSistema({ horarios: [...crearEntorno().horarios, ...tramos] });
  const de = (huecos: readonly Hueco[], profesionalId: string) =>
    huecos.filter((h) => h.profesionalId === profesionalId);

  test('Huecos de un profesional con horario propio', async () => {
    const huecos = await consultar(sistemaCon(propio('hp1', 'p2', '14:00', '18:00')));
    const p2 = de(huecos, 'p2');
    expect(hhmm(p2[0]!.inicio)).toBe('14:00');
    expect(hhmm(p2[0]!.fin)).toBe('14:30');
    expect(hhmm(p2[p2.length - 1]!.inicio)).toBe('17:30');
    expect(hhmm(p2[p2.length - 1]!.fin)).toBe('18:00');
    expect(new Set(p2.map((h) => hhmm(h.inicio))).size).toBe(15);
    const inicios1 = [...new Set(de(huecos, 'p1').map((h) => hhmm(h.inicio)))];
    expect(inicios1[0]).toBe('09:00');
    expect(inicios1).toContain('12:30');
    expect(inicios1).not.toContain('12:45');
    expect(inicios1).toContain('15:00');
    expect(inicios1[inicios1.length - 1]).toBe('18:30');
  });

  test('Inicios alineados al tramo propio del profesional', async () => {
    const huecos = await consultar(sistemaCon(propio('hp1', 'p2', '14:10', '15:00')), { paso: 15 });
    expect(horarios(de(huecos, 'p2'))).toEqual(['14:10-14:40', '14:25-14:55']);
    expect(en(huecos, '14:10').filter((c) => c.startsWith('p1'))).toEqual([]);
    expect(en(huecos, '14:25').filter((c) => c.startsWith('p1'))).toEqual([]);
  });

  test('Orden determinista con horarios propios', async () => {
    const huecos = await consultar(sistemaCon(propio('hp1', 'p2', '14:00', '18:00')));
    expect(en(huecos, '14:00')).toEqual(['p2/s1', 'p2/s2']);
    expect(en(huecos, '15:00')).toEqual(['p1/s1', 'p1/s2', 'p2/s1', 'p2/s2']);
    const inicios = huecos.map((h) => h.inicio.getTime());
    expect(inicios).toEqual([...inicios].sort((a, b) => a - b));
  });

  test('Día sin horario propio en la disponibilidad', async () => {
    const huecos = await consultar(sistemaCon(propio('hp1', 'p2', '14:00', '18:00')), { dia: '2026-11-24' });
    expect(horarios(huecos)).toHaveLength(30);
    expect(huecos).toHaveLength(120);
    expect(en(huecos, '09:00')).toEqual(['p1/s1', 'p1/s2', 'p2/s1', 'p2/s2']);
  });

  test('cada profesional queda alineado a su propia grilla (triangulación)', async () => {
    const sistema = sistemaCon(propio('hp1', 'p2', '14:10', '16:00'), propio('hp2', 'p1', '15:05', '16:00'));
    const huecos = await consultar(sistema, { paso: 15 });
    expect(horarios(de(huecos, 'p2'))).toEqual([
      '14:10-14:40',
      '14:25-14:55',
      '14:40-15:10',
      '14:55-15:25',
      '15:10-15:40',
      '15:25-15:55',
    ]);
    expect(horarios(de(huecos, 'p1'))).toEqual(['15:05-15:35', '15:20-15:50']);
  });
});
