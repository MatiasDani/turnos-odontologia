import { describe, expect, test } from 'vitest';
import { ConsultarDisponibilidadPublica } from '../../src/application/consultar-disponibilidad-publica.js';
import { ErrorReservaPublica } from '../../src/application/errores-reserva-publica.js';
import { local } from '../fixtures/seed.js';
import { crearSistemaPublico, type OpcionesSistemaPublico } from '../fixtures/sistema-publico.js';
import { rechazo } from '../fixtures/sistema.js';

async function consulta(opciones: OpcionesSistemaPublico = {}) {
  const s = await crearSistemaPublico(opciones);
  const caso = new ConsultarDisponibilidadPublica({
    consultar: s.consultarDisponibilidad,
    prestaciones: s.repos.prestaciones,
    profesionales: s.repos.profesionales,
    consultorios: s.repos.consultorios,
    reloj: s.reloj,
  });
  return { s, caso };
}

describe('ConsultarDisponibilidadPublica', () => {
  test('un horario cubierto por otro profesional figura una sola vez y sin datos internos', async () => {
    const { caso } = await consulta();
    const r = await caso.ejecutar({ prestacionId: 'pr1', fecha: '2026-11-23' });
    expect(r.fecha).toBe('2026-11-23');
    expect(r.zonaHoraria).toBe('America/Argentina/Buenos_Aires');
    const diez = r.horarios.filter((h) => h.inicio.getTime() === local('2026-11-23', '10:00').getTime());
    expect(diez).toEqual([{ inicio: local('2026-11-23', '10:00'), fin: local('2026-11-23', '10:30') }]);
    for (const h of r.horarios) expect(Object.keys(h).sort()).toEqual(['fin', 'inicio']);
    const inicios = r.horarios.map((h) => h.inicio.getTime());
    expect(inicios).toEqual([...inicios].sort((a, b) => a - b));
  });

  test('filtrada por profesional: el horario ocupado de p1 no figura y el siguiente sí', async () => {
    const { caso } = await consulta();
    const r = await caso.ejecutar({ prestacionId: 'pr1', fecha: '2026-11-23', profesionalId: 'p1' });
    const inicios = r.horarios.map((h) => h.inicio.getTime());
    expect(inicios).not.toContain(local('2026-11-23', '10:00').getTime());
    expect(inicios).toContain(local('2026-11-23', '10:30').getTime());
  });

  test('un profesional inactivo no aporta horarios (RN-19)', async () => {
    const base = await crearSistemaPublico();
    const profesionales = base.datos.profesionales.map((p) => (p.id === 'p2' ? { ...p, activo: false } : p));
    const { caso } = await consulta({ profesionales });
    const r = await caso.ejecutar({ prestacionId: 'pr1', fecha: '2026-11-23' });
    expect(r.horarios.map((h) => h.inicio.getTime())).not.toContain(local('2026-11-23', '10:00').getTime());
  });

  test('día sin atención devuelve lista vacía', async () => {
    const { caso } = await consulta();
    expect((await caso.ejecutar({ prestacionId: 'pr1', fecha: '2026-11-28' })).horarios).toEqual([]);
  });

  test('último día del horizonte devuelve horarios y el día siguiente es DATOS_INVALIDOS en fecha', async () => {
    const { caso } = await consulta();
    expect((await caso.ejecutar({ prestacionId: 'pr1', fecha: '2026-12-22' })).horarios.length).toBeGreaterThan(0);
    const error = await rechazo(caso.ejecutar({ prestacionId: 'pr1', fecha: '2026-12-23' }));
    expect(error).toBeInstanceOf(ErrorReservaPublica);
    expect(error).toMatchObject({ codigo: 'DATOS_INVALIDOS', campos: ['fecha'] });
  });

  test('una fecha pasada o con formato inválido es DATOS_INVALIDOS en fecha', async () => {
    const { caso } = await consulta();
    for (const fecha of ['2026-11-21', '2026-02-30', 'mañana']) {
      expect(await rechazo(caso.ejecutar({ prestacionId: 'pr1', fecha }))).toMatchObject({
        codigo: 'DATOS_INVALIDOS',
        campos: ['fecha'],
      });
    }
  });

  test('prestación inactiva o inexistente: PRESTACION_NO_DISPONIBLE', async () => {
    const base = await crearSistemaPublico();
    const prestaciones = base.datos.prestaciones.map((p) => (p.id === 'pr4' ? { ...p, activa: false } : p));
    const { caso } = await consulta({ prestaciones });
    for (const prestacionId of ['pr4', 'xx']) {
      expect(await rechazo(caso.ejecutar({ prestacionId, fecha: '2026-11-23' }))).toMatchObject({
        codigo: 'PRESTACION_NO_DISPONIBLE',
      });
    }
  });

  test('profesional inexistente, inactivo o no habilitado: PROFESIONAL_NO_DISPONIBLE', async () => {
    const base = await crearSistemaPublico();
    const profesionales = base.datos.profesionales.map((p) =>
      p.id === 'p2' ? { ...p, prestacionIds: ['pr2'] } : p,
    );
    const { caso } = await consulta({ profesionales });
    for (const profesionalId of ['p2', 'p9']) {
      expect(await rechazo(caso.ejecutar({ prestacionId: 'pr1', fecha: '2026-11-23', profesionalId }))).toMatchObject({
        codigo: 'PROFESIONAL_NO_DISPONIBLE',
      });
    }
  });
});
