import { describe, expect, test } from 'vitest';
import { crearDatosDemo } from '../../src/adapters/persistence/en-memoria/seed-demo.js';

describe('crearDatosDemo', () => {
  test('consultorio ficticio de Buenos Aires con 2 profesionales, 2 sillones y 4 prestaciones activas', () => {
    const d = crearDatosDemo();
    expect(d.consultorio).toMatchObject({ id: 'c1', nombre: 'Consultorio Odontológico Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' });
    expect(d.profesionales.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(d.sillones.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(d.prestaciones.map((p) => p.nombre)).toEqual(['Consulta/control', 'Limpieza', 'Extracción simple', 'Endodoncia']);
    expect(d.prestaciones.every((p) => p.activa)).toBe(true);
  });

  test('atiende de lunes a viernes de 09:00 a 13:00 y de 15:00 a 19:00', () => {
    const { horarios } = crearDatosDemo();
    expect(horarios).toHaveLength(10);
    expect(new Set(horarios.map((h) => h.diaSemana))).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(horarios.filter((h) => h.diaSemana === 1).map((h) => `${h.desde}-${h.hasta}`)).toEqual(['09:00-13:00', '15:00-19:00']);
  });

  test('arranca sin pacientes ni turnos y cada llamada devuelve datos independientes', () => {
    const a = crearDatosDemo();
    expect(a.pacientes).toEqual([]);
    expect(a.turnos).toEqual([]);
    expect(crearDatosDemo().profesionales).not.toBe(a.profesionales);
  });
});

describe('crearDatosDemo con ahora (C-15, design D6)', () => {
  const ahora = new Date('2026-11-28T15:00:00Z'); // sábado: arranca el lunes siguiente
  const d = crearDatosDemo(ahora);

  test('suma 6 pacientes ficticios y 8 turnos en los próximos días hábiles', () => {
    expect(d.pacientes.map((p) => `${p.nombre} ${p.apellido}`)).toEqual([1, 2, 3, 4, 5, 6].map((n) => `Paciente Ficticio ${n}`));
    expect(d.turnos).toHaveLength(8);
    expect(d.turnos[0]?.inicio).toEqual(new Date('2026-11-30T12:00:00Z'));
  });

  test('los turnos no se solapan por profesional ni por sillón', () => {
    for (const a of d.turnos) {
      for (const b of d.turnos) {
        if (a.id === b.id || (a.profesionalId !== b.profesionalId && a.sillonId !== b.sillonId)) continue;
        expect(a.inicio < b.fin && b.inicio < a.fin, `${a.id} y ${b.id}`).toBe(false);
      }
    }
  });

  test('los turnos caen dentro del horario de atención y su fin coincide con la duración', () => {
    for (const t of d.turnos) {
      const minutos = (t.inicio.getUTCHours() - 3) * 60 + t.inicio.getUTCMinutes();
      const finMin = minutos + t.duracionMinutos;
      expect((minutos >= 540 && finMin <= 780) || (minutos >= 900 && finMin <= 1140), t.id).toBe(true);
      expect(t.fin.getTime() - t.inicio.getTime()).toBe(t.duracionMinutos * 60_000);
    }
  });
});
