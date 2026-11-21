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

describe('GeneradorIdUuid', () => {
  test('genera ids únicos con formato uuid', () => {
    const gen = new GeneradorIdUuid();
    const a = gen.siguiente();
    const b = gen.siguiente();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
  });
});
