import { describe, expect, test } from 'vitest';
import {
  BloqueoRepositorioEnMemoria,
  ConsultorioRepositorioEnMemoria,
  HorarioAtencionRepositorioEnMemoria,
  PrestacionRepositorioEnMemoria,
  ProfesionalRepositorioEnMemoria,
  SillonRepositorioEnMemoria,
} from '../../src/adapters/persistence/en-memoria/catalogos.js';
import { GeneradorIdUuid } from '../../src/adapters/persistence/en-memoria/generador-id-uuid.js';
import { crearIntervalo } from '../../src/domain/intervalo.js';
import { crearEntorno, LUNES, local, MIERCOLES } from '../fixtures/seed.js';

const e = crearEntorno();

describe('repositorios de catálogo en memoria', () => {
  test('obtenerPorId devuelve la entidad o undefined', async () => {
    expect((await new ProfesionalRepositorioEnMemoria(e.profesionales).obtenerPorId('p1'))?.id).toBe('p1');
    expect(await new ProfesionalRepositorioEnMemoria(e.profesionales).obtenerPorId('p9')).toBeUndefined();
    expect((await new SillonRepositorioEnMemoria(e.sillones).obtenerPorId('s2'))?.id).toBe('s2');
    expect(await new SillonRepositorioEnMemoria(e.sillones).obtenerPorId('s9')).toBeUndefined();
    expect((await new PrestacionRepositorioEnMemoria(e.prestaciones).obtenerPorId('pr4'))?.id).toBe('pr4');
    expect(await new PrestacionRepositorioEnMemoria(e.prestaciones).obtenerPorId('pr9')).toBeUndefined();
    expect((await new ConsultorioRepositorioEnMemoria([e.consultorio]).obtenerPorId('c1'))?.id).toBe('c1');
    expect(await new ConsultorioRepositorioEnMemoria([e.consultorio]).obtenerPorId('c9')).toBeUndefined();
  });

  test('listarPorConsultorio: solo los profesionales del consultorio, incluidos inactivos', async () => {
    const ajeno = { ...e.profesionales[0]!, id: 'p8', consultorioId: 'c2' };
    const inactivo = { ...e.profesionales[1]!, id: 'p7', activo: false };
    const repo = new ProfesionalRepositorioEnMemoria([...e.profesionales, inactivo, ajeno]);
    expect((await repo.listarPorConsultorio('c1')).map((p) => p.id)).toEqual(['p1', 'p2', 'p7']);
    expect((await repo.listarPorConsultorio('c2')).map((p) => p.id)).toEqual(['p8']);
    expect(await repo.listarPorConsultorio('c9')).toEqual([]);
  });

  test('listarPorConsultorio: solo los sillones del consultorio, incluidos inactivos', async () => {
    const ajeno = { ...e.sillones[0]!, id: 's8', consultorioId: 'c2' };
    const inactivo = { ...e.sillones[1]!, id: 's7', activo: false };
    const repo = new SillonRepositorioEnMemoria([...e.sillones, inactivo, ajeno]);
    expect((await repo.listarPorConsultorio('c1')).map((s) => s.id)).toEqual(['s1', 's2', 's7']);
    expect((await repo.listarPorConsultorio('c2')).map((s) => s.id)).toEqual(['s8']);
    expect(await repo.listarPorConsultorio('c9')).toEqual([]);
  });

  test('horarios: lista solo los del consultorio pedido', async () => {
    const repo = new HorarioAtencionRepositorioEnMemoria(e.horarios);
    expect(await repo.listarPorConsultorio('c1')).toHaveLength(10);
    expect(await repo.listarPorConsultorio('c9')).toEqual([]);
  });

  test('bloqueos: filtra por recurso e intervalo (semiabierto)', async () => {
    const repo = new BloqueoRepositorioEnMemoria(e.bloqueos);
    const dentro = crearIntervalo(local(MIERCOLES, '15:30'), local(MIERCOLES, '16:00'));
    const contiguo = crearIntervalo(local(MIERCOLES, '17:00'), local(MIERCOLES, '17:30'));
    const otroDia = crearIntervalo(local(LUNES, '15:30'), local(LUNES, '16:00'));
    expect(await repo.listarPorRecursos('p1', 's1', dentro)).toEqual(e.bloqueos);
    expect(await repo.listarPorRecursos('p2', 's1', dentro)).toEqual([]);
    expect(await repo.listarPorRecursos('p1', 's1', contiguo)).toEqual([]);
    expect(await repo.listarPorRecursos('p1', 's1', otroDia)).toEqual([]);
  });
});

describe('repositorios de catálogo mutables (C-05)', () => {
  test('guardar agrega un profesional nuevo al final y lo hace obtenible', async () => {
    const repo = new ProfesionalRepositorioEnMemoria(e.profesionales);
    const nuevo = { ...e.profesionales[0]!, id: 'p3', nombre: 'Franco' };
    await repo.guardar(nuevo);
    expect(await repo.obtenerPorId('p3')).toEqual(nuevo);
    expect((await repo.listarPorConsultorio('c1')).map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
  });

  test('guardar reemplaza por id conservando la posición', async () => {
    const repo = new ProfesionalRepositorioEnMemoria(e.profesionales);
    await repo.guardar({ ...e.profesionales[0]!, activo: false });
    expect((await repo.listarPorConsultorio('c1')).map((p) => [p.id, p.activo])).toEqual([
      ['p1', false],
      ['p2', true],
    ]);
  });

  test('sillones: alta al final y reemplazo por id', async () => {
    const repo = new SillonRepositorioEnMemoria(e.sillones);
    await repo.guardar({ id: 's3', consultorioId: 'c1', nombre: 'Sillón 3', activo: true });
    await repo.guardar({ ...e.sillones[1]!, nombre: 'Box 2' });
    expect((await repo.listarPorConsultorio('c1')).map((s) => [s.id, s.nombre])).toEqual([
      ['s1', 'Sillón 1'],
      ['s2', 'Box 2'],
      ['s3', 'Sillón 3'],
    ]);
  });

  test('prestaciones: listarPorConsultorio, alta al final y reemplazo por id', async () => {
    const ajena = { ...e.prestaciones[0]!, id: 'pr8', consultorioId: 'c2' };
    const repo = new PrestacionRepositorioEnMemoria([...e.prestaciones, ajena]);
    expect((await repo.listarPorConsultorio('c1')).map((p) => p.id)).toEqual(['pr1', 'pr2', 'pr3', 'pr4']);
    expect((await repo.listarPorConsultorio('c2')).map((p) => p.id)).toEqual(['pr8']);
    expect(await repo.listarPorConsultorio('c9')).toEqual([]);
    await repo.guardar({ id: 'pr5', consultorioId: 'c1', nombre: 'Blanqueamiento', duracionMinutos: 60, activa: true });
    await repo.guardar({ ...e.prestaciones[0]!, duracionMinutos: 40 });
    const lista = await repo.listarPorConsultorio('c1');
    expect(lista.map((p) => p.id)).toEqual(['pr1', 'pr2', 'pr3', 'pr4', 'pr5']);
    expect(lista[0]?.duracionMinutos).toBe(40);
  });

  test('horarios: obtenerPorId, guardar (alta y reemplazo) y eliminar', async () => {
    const repo = new HorarioAtencionRepositorioEnMemoria(e.horarios);
    expect((await repo.obtenerPorId('h1m'))?.desde).toBe('09:00');
    expect(await repo.obtenerPorId('h9')).toBeUndefined();
    await repo.guardar({ id: 'hn-1', consultorioId: 'c1', diaSemana: 6, desde: '09:00', hasta: '13:00' });
    await repo.guardar({ ...e.horarios[0]!, hasta: '12:00' });
    expect(await repo.listarPorConsultorio('c1')).toHaveLength(11);
    expect((await repo.obtenerPorId('h1m'))?.hasta).toBe('12:00');
    await repo.eliminar('h1m');
    expect(await repo.obtenerPorId('h1m')).toBeUndefined();
    expect(await repo.listarPorConsultorio('c1')).toHaveLength(10);
  });

  test('eliminar un id inexistente no hace nada', async () => {
    const repo = new HorarioAtencionRepositorioEnMemoria(e.horarios);
    await repo.eliminar('h9');
    expect(await repo.listarPorConsultorio('c1')).toHaveLength(10);
  });

  test('modificar el arreglo pasado al constructor no altera el repositorio', async () => {
    const inicial = [...e.sillones];
    const repo = new SillonRepositorioEnMemoria(inicial);
    inicial.push({ id: 's9', consultorioId: 'c1', nombre: 'Intruso', activo: true });
    expect(await repo.obtenerPorId('s9')).toBeUndefined();
    const horarios = [...e.horarios];
    const repoH = new HorarioAtencionRepositorioEnMemoria(horarios);
    horarios.length = 0;
    expect(await repoH.listarPorConsultorio('c1')).toHaveLength(10);
  });

  test('guardar no modifica el arreglo pasado al constructor', async () => {
    const inicial = [...e.profesionales];
    await new ProfesionalRepositorioEnMemoria(inicial).guardar({ ...e.profesionales[0]!, id: 'p3' });
    expect(inicial).toHaveLength(2);
  });

  test('bloqueos: guardar, obtenerPorId, eliminar y listarTodos (C-06)', async () => {
    const repo = new BloqueoRepositorioEnMemoria(e.bloqueos);
    expect(await repo.listarTodos()).toHaveLength(1);
    expect((await repo.obtenerPorId('b1'))?.profesionalId).toBe('p1');

    const nuevo = {
      id: 'b2',
      profesionalId: 'p2',
      sillonId: 's1',
      inicio: local(LUNES, '10:00'),
      fin: local(LUNES, '12:00'),
      motivo: 'Vacaciones',
    };
    await repo.guardar(nuevo);
    expect(await repo.listarTodos()).toHaveLength(2);
    expect(await repo.obtenerPorId('b2')).toEqual(nuevo);

    // Reemplazo por id
    const editado = { ...nuevo, motivo: 'Congreso' };
    await repo.guardar(editado);
    expect(await repo.listarTodos()).toHaveLength(2);
    expect((await repo.obtenerPorId('b2'))?.motivo).toBe('Congreso');

    // Eliminar
    await repo.eliminar('b2');
    expect(await repo.listarTodos()).toHaveLength(1);
    expect(await repo.obtenerPorId('b2')).toBeUndefined();

    // Eliminar id inexistente no falla
    await repo.eliminar('b-inexistente');
    expect(await repo.listarTodos()).toHaveLength(1);
  });
});

describe('GeneradorIdUuid', () => {
  test('genera ids únicos con formato uuid', () => {
    const gen = new GeneradorIdUuid();
    const a = gen.siguiente();
    const b = gen.siguiente();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
  });
});
