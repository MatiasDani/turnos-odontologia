import { describe, expect, test } from 'vitest';
import { ErrorReservaPublica } from '../../src/application/errores-reserva-publica.js';
import { ListarCatalogoPublico } from '../../src/application/listar-catalogo-publico.js';
import { ListarProfesionalesPublicos } from '../../src/application/listar-profesionales-publicos.js';
import { crearSistemaPublico } from '../fixtures/sistema-publico.js';
import { rechazo } from '../fixtures/sistema.js';

async function catalogo(opciones: Parameters<typeof crearSistemaPublico>[0] = {}) {
  const s = await crearSistemaPublico(opciones);
  return new ListarCatalogoPublico({
    consultorioId: 'c1',
    consultorios: s.repos.consultorios,
    prestaciones: s.repos.prestaciones,
    reloj: s.reloj,
  });
}

describe('ListarCatalogoPublico', () => {
  test('devuelve el consultorio, los días reservables y las prestaciones activas ordenadas por nombre', async () => {
    const base = await crearSistemaPublico();
    const prestaciones = base.datos.prestaciones.map((p) => (p.id === 'pr4' ? { ...p, activa: false } : p));
    const resultado = await (await catalogo({ prestaciones })).ejecutar();
    expect(resultado).toEqual({
      consultorio: { nombre: 'Consultorio Odontológico Demo', zonaHoraria: 'America/Argentina/Buenos_Aires' },
      diasReservables: { desde: '2026-11-22', hasta: '2026-12-22' },
      prestaciones: [
        { id: 'pr1', nombre: 'Consulta/control', duracionMinutos: 30 },
        { id: 'pr3', nombre: 'Extracción simple', duracionMinutos: 60 },
        { id: 'pr2', nombre: 'Limpieza', duracionMinutos: 45 },
      ],
    });
  });

  test('triangulación: ordena por nombre aunque el repositorio las tenga en otro orden y sin inactivas', async () => {
    const prestaciones = [
      { id: 'z', consultorioId: 'c1', nombre: 'Zeta', duracionMinutos: 15, activa: true },
      { id: 'a', consultorioId: 'c1', nombre: 'Álamo', duracionMinutos: 15, activa: true },
      { id: 'i', consultorioId: 'c1', nombre: 'Inactiva', duracionMinutos: 15, activa: false },
      { id: 'o', consultorioId: 'c2', nombre: 'De otro consultorio', duracionMinutos: 15, activa: true },
    ];
    const resultado = await (await catalogo({ prestaciones })).ejecutar();
    expect(resultado.prestaciones.map((p) => p.id)).toEqual(['a', 'z']);
  });

  test('no expone ningún campo fuera de id, nombre y duracionMinutos', async () => {
    const resultado = await (await catalogo()).ejecutar();
    for (const p of resultado.prestaciones) expect(Object.keys(p).sort()).toEqual(['duracionMinutos', 'id', 'nombre']);
    expect(Object.keys(resultado.consultorio).sort()).toEqual(['nombre', 'zonaHoraria']);
  });
});

describe('ListarProfesionalesPublicos', () => {
  async function profesionales(opciones: Parameters<typeof crearSistemaPublico>[0] = {}) {
    const s = await crearSistemaPublico(opciones);
    return new ListarProfesionalesPublicos({ prestaciones: s.repos.prestaciones, profesionales: s.repos.profesionales });
  }

  test('solo activos y habilitados, con id, nombre y apellido', async () => {
    const base = await crearSistemaPublico();
    const lista = base.datos.profesionales.map((p) => (p.id === 'p2' ? { ...p, activo: false } : p));
    const resultado = await (await profesionales({ profesionales: lista })).ejecutar('pr1');
    expect(resultado).toEqual([{ id: 'p1', nombre: 'Ana', apellido: 'Ejemplo' }]);
  });

  test('triangulación: excluye al no habilitado para la prestación y ordena por apellido y nombre', async () => {
    const lista = [
      { id: 'p3', consultorioId: 'c1', nombre: 'Zoe', apellido: 'Zeta', activo: true, prestacionIds: ['pr1'] },
      { id: 'p4', consultorioId: 'c1', nombre: 'Ana', apellido: 'Zeta', activo: true, prestacionIds: ['pr1'] },
      { id: 'p5', consultorioId: 'c1', nombre: 'Sin', apellido: 'Habilitación', activo: true, prestacionIds: ['pr2'] },
      { id: 'p1', consultorioId: 'c1', nombre: 'Ana', apellido: 'Ejemplo', matricula: '0001', activo: true, prestacionIds: ['pr1'] },
    ];
    const resultado = await (await profesionales({ profesionales: lista })).ejecutar('pr1');
    expect(resultado.map((p) => p.id)).toEqual(['p1', 'p4', 'p3']);
    for (const p of resultado) expect(Object.keys(p).sort()).toEqual(['apellido', 'id', 'nombre']);
  });

  test('prestación inexistente o inactiva rechaza con PRESTACION_NO_DISPONIBLE', async () => {
    const base = await crearSistemaPublico();
    const prestaciones = base.datos.prestaciones.map((p) => (p.id === 'pr4' ? { ...p, activa: false } : p));
    const caso = await profesionales({ prestaciones });
    for (const id of ['pr4', 'no-existe']) {
      const error = await rechazo(caso.ejecutar(id));
      expect(error).toBeInstanceOf(ErrorReservaPublica);
      expect(error).toMatchObject({ codigo: 'PRESTACION_NO_DISPONIBLE' });
    }
  });
});
