import { describe, expect, test } from 'vitest';
import { AgendaDiaria } from '../../src/application/agenda-diaria.js';
import { AgendaSemanal } from '../../src/application/agenda-semanal.js';
import { ListarCatalogoInterno } from '../../src/application/listar-catalogo-interno.js';
import { VistaAgenda } from '../../src/application/vista-agenda.js';
import {
  BloqueoRepositorioEnMemoria,
  ConsultorioRepositorioEnMemoria,
  PrestacionRepositorioEnMemoria,
  ProfesionalRepositorioEnMemoria,
  SillonRepositorioEnMemoria,
} from '../../src/adapters/persistence/en-memoria/catalogos.js';
import { PacienteRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/paciente-repositorio.js';
import { TurnoRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/turno-repositorio.js';
import type { BloqueoHorario } from '../../src/domain/bloqueo-horario.js';
import { AccesoDenegadoError, ConsultaInvalidaError } from '../../src/domain/errores.js';
import type { Turno } from '../../src/domain/turno.js';
import { actores } from '../fixtures/actores.js';
import { crearEntorno, crearTurno, local, LUNES } from '../fixtures/seed.js';
import { rechazo } from '../fixtures/sistema.js';

/** Escenarios de "Vista de la agenda con datos para mostrar" (`specs/consulta-agenda`, C-15). */
function sistema(turnos: Turno[] = [], bloqueos: BloqueoHorario[] = []) {
  const e = crearEntorno({ turnos, bloqueos });
  const repos = {
    turnos: new TurnoRepositorioEnMemoria(e.turnos),
    bloqueos: new BloqueoRepositorioEnMemoria(e.bloqueos),
  };
  const agendaDiaria = new AgendaDiaria(repos, e.consultorio.zonaHoraria);
  const catalogo = {
    pacientes: new PacienteRepositorioEnMemoria(e.pacientes),
    profesionales: new ProfesionalRepositorioEnMemoria(e.profesionales),
    sillones: new SillonRepositorioEnMemoria(e.sillones),
    prestaciones: new PrestacionRepositorioEnMemoria(e.prestaciones),
  };
  return {
    vista: new VistaAgenda({ agendaDiaria, agendaSemanal: new AgendaSemanal(agendaDiaria), ...catalogo }),
    catalogo: new ListarCatalogoInterno({ ...catalogo, consultorios: new ConsultorioRepositorioEnMemoria([e.consultorio]), consultorioId: 'c1' }),
  };
}

const turnoPa1 = crearTurno({ id: 't-1', pacienteId: 'pa1', profesionalId: 'p1', sillonId: 's1', prestacionId: 'pr1', inicio: local(LUNES, '09:00'), fin: local(LUNES, '09:30') });
const turnoPa2 = crearTurno({ id: 't-2', pacienteId: 'pa2', profesionalId: 'p2', sillonId: 's2', prestacionId: 'pr1', inicio: local(LUNES, '11:00'), fin: local(LUNES, '11:30') });

describe('Vista de la agenda con datos para mostrar', () => {
  test('Turno de la agenda con nombres', async () => {
    const dia = await sistema([turnoPa1]).vista.diaria({ actor: actores.recepcion, fecha: LUNES });
    expect(dia.turnos[0]).toMatchObject({
      id: 't-1',
      estado: 'confirmado',
      paciente: { id: 'pa1', nombre: 'Carla', apellido: 'Prueba' },
      prestacion: { id: 'pr1', nombre: 'Consulta/control' },
      profesional: { id: 'p1', nombre: 'Ana', apellido: 'Ejemplo' },
      sillon: { id: 's1', nombre: 'Sillón 1' },
    });
    expect(JSON.stringify(dia)).not.toContain('00000001');
    expect(JSON.stringify(dia)).not.toContain('0000-0001');
  });

  test('Bloqueo de la agenda con nombre', async () => {
    const bloqueo = { id: 'b-1', profesionalId: 'p2', inicio: local(LUNES, '15:00'), fin: local(LUNES, '16:00'), motivo: 'Capacitación' };
    const dia = await sistema([], [bloqueo]).vista.diaria({ actor: actores.recepcion, fecha: LUNES });
    expect(dia.bloqueos[0]).toMatchObject({ id: 'b-1', motivo: 'Capacitación', profesional: { id: 'p2', nombre: 'Bruno', apellido: 'Muestra' } });
    expect(dia.bloqueos[0]).not.toHaveProperty('sillon');
  });

  test('El odontólogo ve los nombres solo de sus turnos', async () => {
    const dia = await sistema([turnoPa1, turnoPa2]).vista.diaria({ actor: actores.odontologo('p1'), fecha: LUNES });
    expect(dia.turnos.map((t) => t.paciente.nombre)).toEqual(['Carla']);
  });

  test('ordena los turnos por inicio', async () => {
    const dia = await sistema([turnoPa2, turnoPa1]).vista.diaria({ actor: actores.recepcion, fecha: LUNES });
    expect(dia.turnos.map((t) => t.id)).toEqual(['t-1', 't-2']);
  });

  test('un id de catálogo inexistente no rompe la vista', async () => {
    const huerfano = { ...turnoPa1, pacienteId: 'pa-borrado' };
    const dia = await sistema([huerfano]).vista.diaria({ actor: actores.recepcion, fecha: LUNES });
    expect(dia.turnos[0]?.paciente).toEqual({ id: 'pa-borrado', nombre: '', apellido: '' });
  });

  test('el paciente no ve la agenda', async () => {
    await expect(rechazo(sistema().vista.diaria({ actor: actores.paciente(), fecha: LUNES }))).resolves.toBeInstanceOf(AccesoDenegadoError);
  });
});

describe('Semana de un recurso (DD-39)', () => {
  test('recepción debe elegir un recurso', async () => {
    const error = await rechazo(sistema().vista.semanal({ actor: actores.recepcion, fecha: LUNES }));
    expect(error).toBeInstanceOf(ConsultaInvalidaError);
    expect(error).toMatchObject({ campo: 'recurso' });
  });

  test('semana de un profesional con 7 días', async () => {
    const semana = await sistema([turnoPa1, turnoPa2]).vista.semanal({ actor: actores.recepcion, fecha: '2026-11-25', profesionalId: 'p1' });
    expect(semana.dias.map((d) => d.fecha)).toEqual(['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29']);
    expect(semana.dias[0]?.turnos.map((t) => t.id)).toEqual(['t-1']);
  });

  test('el odontólogo no necesita filtro', async () => {
    const semana = await sistema([turnoPa1, turnoPa2]).vista.semanal({ actor: actores.odontologo('p1'), fecha: LUNES });
    expect(semana.dias[0]?.turnos.map((t) => t.id)).toEqual(['t-1']);
  });
});

describe('Catálogo interno', () => {
  test('consultorio y recursos activos para recepción', async () => {
    const c = await sistema().catalogo.ejecutar({ actor: actores.recepcion });
    expect(c.consultorio).toEqual({ nombre: expect.any(String), zonaHoraria: 'America/Argentina/Buenos_Aires' });
    expect(c.profesionales.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(c.sillones.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(c.prestaciones.find((p) => p.id === 'pr1')).toEqual({ id: 'pr1', nombre: 'Consulta/control', duracionMinutos: 30 });
  });

  test('el paciente no ve el catálogo interno', async () => {
    await expect(rechazo(sistema().catalogo.ejecutar({ actor: actores.paciente() }))).resolves.toBeInstanceOf(AccesoDenegadoError);
  });
});
