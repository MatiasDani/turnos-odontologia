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
