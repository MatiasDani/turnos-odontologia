// Un test por escenario de specs/configuracion-recursos/spec.md, con el título idéntico (regla dura 8);
// un `describe` por requisito. Contexto común: seed ficticio, administrador y `ahora` lunes 10:00.
import { describe, expect, test } from 'vitest';
import {
  AccesoDenegadoError,
  ConfiguracionInvalidaError,
  RecursoNoEncontradoError,
  ReglaNegocioError,
} from '../../src/domain/errores.js';
import type { Turno } from '../../src/domain/turno.js';
import { crearEntorno, crearTurno, LUNES, local, MARTES } from '../fixtures/seed.js';
import {
  ADMINISTRADOR,
  crearSistemaConfiguracion,
  ODONTOLOGO,
  PACIENTE,
  RECEPCION,
  type SistemaConfiguracion,
} from '../fixtures/sistema-configuracion.js';
import type { AltaProfesionalInput } from '../../src/application/configuracion-input.js';
import { agendar, consultar, rechazo } from '../fixtures/sistema.js';

describe('Solo el administrador configura recursos', () => {
  test('El administrador da de alta un sillón', async () => {
    const sistema = crearSistemaConfiguracion();
    const sillon = await sistema.configurarSillones.alta({
      actor: ADMINISTRADOR,
      consultorioId: 'c1',
      nombre: 'Sillón 3',
    });
    expect(sillon).toMatchObject({ nombre: 'Sillón 3', consultorioId: 'c1', activo: true });
    await expect(sistema.sillones.obtenerPorId(sillon.id)).resolves.toEqual(sillon);
  });

  test('Recepción no puede dar de alta un sillón', async () => {
    const sistema = crearSistemaConfiguracion();
    const error = await rechazo(
      sistema.configurarSillones.alta({ actor: RECEPCION, consultorioId: 'c1', nombre: 'Sillón 3' }),
    );
    expect(error).toBeInstanceOf(AccesoDenegadoError);
    expect(error).toMatchObject({ rol: 'recepcion' });
    expect((await sistema.sillones.listarPorConsultorio('c1')).map((s) => s.id)).toEqual(['s1', 's2']);
  });

  test('Paciente no puede modificar una prestación', async () => {
    const sistema = crearSistemaConfiguracion();
    const error = await rechazo(
      sistema.configurarPrestaciones.modificar({ actor: PACIENTE, id: 'pr1', cambios: { duracionMinutos: 40 } }),
    );
    expect(error).toBeInstanceOf(AccesoDenegadoError);
    expect(error).toMatchObject({ rol: 'paciente' });
    expect((await sistema.prestaciones.obtenerPorId('pr1'))?.duracionMinutos).toBe(30);
  });

  test('Odontólogo no puede desactivar un profesional', async () => {
    const sistema = crearSistemaConfiguracion();
    const error = await rechazo(sistema.configurarProfesionales.desactivar({ actor: ODONTOLOGO, id: 'p2' }));
    expect(error).toBeInstanceOf(AccesoDenegadoError);
    expect(error).toMatchObject({ rol: 'odontologo' });
    expect((await sistema.profesionales.obtenerPorId('p2'))?.activo).toBe(true);
  });

  // [[ADMIN]]
});

describe('Alta y modificación de sillón', () => {
  test('Alta de un sillón', async () => {
    const sistema = crearSistemaConfiguracion();
    const sillon = await sistema.configurarSillones.alta({
      actor: ADMINISTRADOR,
      consultorioId: 'c1',
      nombre: 'Sillón 3',
    });
    expect(sillon).toMatchObject({ consultorioId: 'c1', nombre: 'Sillón 3', activo: true });
    expect(['s1', 's2']).not.toContain(sillon.id);
    const lista = await sistema.sillones.listarPorConsultorio('c1');
    expect(lista.map((s) => s.id)).toEqual(['s1', 's2', sillon.id]);
  });

  test('Renombrar un sillón', async () => {
    const sistema = crearSistemaConfiguracion();
    const sillon = await sistema.configurarSillones.modificar({
      actor: ADMINISTRADOR,
      id: 's2',
      cambios: { nombre: 'Box 2' },
    });
    expect(sillon).toMatchObject({ id: 's2', nombre: 'Box 2', activo: true, consultorioId: 'c1' });
    await expect(sistema.sillones.obtenerPorId('s2')).resolves.toEqual(sillon);
  });

  test('Alta de un sillón con nombre vacío', async () => {
    const sistema = crearSistemaConfiguracion();
    const error = await rechazo(
      sistema.configurarSillones.alta({ actor: ADMINISTRADOR, consultorioId: 'c1', nombre: '' }),
    );
    expect(error).toBeInstanceOf(ConfiguracionInvalidaError);
    expect(error).toMatchObject({ campo: 'nombre' });
    expect(await sistema.sillones.listarPorConsultorio('c1')).toHaveLength(2);
  });

  test('Nombre de sillón en el límite de longitud', async () => {
    const sistema = crearSistemaConfiguracion();
    const largo = await sistema.configurarSillones.alta({
      actor: ADMINISTRADOR,
      consultorioId: 'c1',
      nombre: 'n'.repeat(80),
    });
    expect(largo.nombre).toHaveLength(80);
    const error = await rechazo(
      sistema.configurarSillones.alta({ actor: ADMINISTRADOR, consultorioId: 'c1', nombre: 'n'.repeat(81) }),
    );
    expect(error).toBeInstanceOf(ConfiguracionInvalidaError);
    expect(error).toMatchObject({ campo: 'nombre' });
    expect(await sistema.sillones.listarPorConsultorio('c1')).toHaveLength(3);
  });

  test('Modificar un sillón inexistente', async () => {
    const sistema = crearSistemaConfiguracion();
    const error = await rechazo(
      sistema.configurarSillones.modificar({ actor: ADMINISTRADOR, id: 's9', cambios: { nombre: 'Box' } }),
    );
    expect(error).toBeInstanceOf(RecursoNoEncontradoError);
    expect(error).toMatchObject({ tipo: 'sillon', id: 's9' });
  });
});

describe('Alta y modificación de prestación', () => {
  test('Alta de una prestación', async () => {
    const sistema = crearSistemaConfiguracion();
    const prestacion = await sistema.configurarPrestaciones.alta({
      actor: ADMINISTRADOR,
      consultorioId: 'c1',
      nombre: 'Blanqueamiento',
      duracionMinutos: 60,
    });
    expect(prestacion).toMatchObject({
      consultorioId: 'c1',
      nombre: 'Blanqueamiento',
      duracionMinutos: 60,
      activa: true,
    });
    expect(['pr1', 'pr2', 'pr3', 'pr4']).not.toContain(prestacion.id);
    await expect(sistema.prestaciones.obtenerPorId(prestacion.id)).resolves.toEqual(prestacion);
  });

  test('La nueva duración se usa en los turnos siguientes', async () => {
    const sistema = crearSistemaConfiguracion();
    await sistema.configurarPrestaciones.modificar({
      actor: ADMINISTRADOR,
      id: 'pr1',
      cambios: { duracionMinutos: 40 },
    });
    const turno = await agendar(sistema, { hora: '09:00', dia: MARTES });
    expect(turno).toMatchObject({
      inicio: local(MARTES, '09:00'),
      fin: local(MARTES, '09:40'),
      duracionMinutos: 40,
    });
  });

  test('Cambiar la duración no altera los turnos existentes', async () => {
    const existente = crearTurno({
      id: 't-existente',
      prestacionId: 'pr1',
      inicio: local(MARTES, '09:00'),
      fin: local(MARTES, '09:30'),
      duracionMinutos: 30,
    });
    const sistema = crearSistemaConfiguracion({ turnos: [existente] });
    await sistema.configurarPrestaciones.modificar({
      actor: ADMINISTRADOR,
      id: 'pr1',
      cambios: { duracionMinutos: 40 },
    });
    await expect(sistema.turnos.obtenerPorId('t-existente')).resolves.toMatchObject({
      inicio: local(MARTES, '09:00'),
      fin: local(MARTES, '09:30'),
      duracionMinutos: 30,
    });
  });

  test('Modificar una prestación inexistente', async () => {
    const sistema = crearSistemaConfiguracion();
    const error = await rechazo(
      sistema.configurarPrestaciones.modificar({ actor: ADMINISTRADOR, id: 'pr9', cambios: { nombre: 'Otra' } }),
    );
    expect(error).toBeInstanceOf(RecursoNoEncontradoError);
    expect(error).toMatchObject({ tipo: 'prestacion', id: 'pr9' });
  });
});

describe('Duración válida de la prestación', () => {
  const altaDe = (sistema: SistemaConfiguracion, duracionMinutos: number) =>
    sistema.configurarPrestaciones.alta({
      actor: ADMINISTRADOR,
      consultorioId: 'c1',
      nombre: 'Control rápido',
      duracionMinutos,
    });

  test('Prestación de 5 minutos es válida', async () => {
    const sistema = crearSistemaConfiguracion();
    const prestacion = await altaDe(sistema, 5);
    expect(prestacion.duracionMinutos).toBe(5);
    await expect(sistema.prestaciones.obtenerPorId(prestacion.id)).resolves.toEqual(prestacion);
  });

  test('Duraciones de prestación inválidas', async () => {
    const sistema = crearSistemaConfiguracion();
    for (const duracion of [0, -15, 32, 12.5]) {
      const error = await rechazo(altaDe(sistema, duracion));
      expect(error).toBeInstanceOf(ConfiguracionInvalidaError);
      expect(error).toMatchObject({ campo: 'duracionMinutos' });
    }
    expect(await sistema.prestaciones.listarPorConsultorio('c1')).toHaveLength(4);
  });

  test('Modificar una prestación a una duración inválida', async () => {
    const sistema = crearSistemaConfiguracion();
    const error = await rechazo(
      sistema.configurarPrestaciones.modificar({ actor: ADMINISTRADOR, id: 'pr1', cambios: { duracionMinutos: 32 } }),
    );
    expect(error).toBeInstanceOf(ConfiguracionInvalidaError);
    expect(error).toMatchObject({ campo: 'duracionMinutos' });
    expect((await sistema.prestaciones.obtenerPorId('pr1'))?.duracionMinutos).toBe(30);
  });
});

describe('Alta de profesional', () => {
  const alta = (sistema: SistemaConfiguracion, extra: Partial<AltaProfesionalInput> = {}) =>
    sistema.configurarProfesionales.alta({
      actor: ADMINISTRADOR,
      consultorioId: 'c1',
      nombre: 'Franco',
      apellido: 'Ficticio',
      matricula: '0003',
      prestacionIds: ['pr1', 'pr2'],
      ...extra,
    });

  test('Alta de un profesional con sus prestaciones', async () => {
    const sistema = crearSistemaConfiguracion();
    const profesional = await alta(sistema);
    expect(profesional).toMatchObject({
      consultorioId: 'c1',
      nombre: 'Franco',
      apellido: 'Ficticio',
      matricula: '0003',
      activo: true,
      prestacionIds: ['pr1', 'pr2'],
    });
    expect(['p1', 'p2']).not.toContain(profesional.id);
    const lista = await sistema.profesionales.listarPorConsultorio('c1');
    expect(lista.map((p) => p.id)).toContain(profesional.id);
  });

  test('Alta de un profesional sin matrícula ni prestaciones', async () => {
    const sistema = crearSistemaConfiguracion();
    const profesional = await alta(sistema, { matricula: undefined, prestacionIds: [] });
    expect(profesional.activo).toBe(true);
    expect(profesional).not.toHaveProperty('matricula');
    expect(profesional.prestacionIds).toEqual([]);
  });

  test('Nombre del profesional con espacios en los extremos', async () => {
    const sistema = crearSistemaConfiguracion();
    const profesional = await alta(sistema, { nombre: '  Franco  ', apellido: '  Ficticio ' });
    expect(profesional).toMatchObject({ nombre: 'Franco', apellido: 'Ficticio' });
  });

  test('Alta de un profesional con una prestación inexistente', async () => {
    const sistema = crearSistemaConfiguracion();
    const error = await rechazo(alta(sistema, { prestacionIds: ['pr1', 'pr9'] }));
    expect(error).toBeInstanceOf(RecursoNoEncontradoError);
    expect(error).toMatchObject({ tipo: 'prestacion', id: 'pr9' });
    expect(await sistema.profesionales.listarPorConsultorio('c1')).toHaveLength(2);
  });

  test('Alta de un profesional con prestaciones repetidas', async () => {
    const sistema = crearSistemaConfiguracion();
    const error = await rechazo(alta(sistema, { prestacionIds: ['pr1', 'pr1'] }));
    expect(error).toBeInstanceOf(ConfiguracionInvalidaError);
    expect(error).toMatchObject({ campo: 'prestacionIds' });
  });

  test('Alta de un profesional en un consultorio inexistente', async () => {
    const sistema = crearSistemaConfiguracion();
    const error = await rechazo(alta(sistema, { consultorioId: 'c9' }));
    expect(error).toBeInstanceOf(RecursoNoEncontradoError);
    expect(error).toMatchObject({ tipo: 'consultorio', id: 'c9' });
  });
});

describe('Modificación de profesional', () => {
  test('Modificar las prestaciones de un profesional', async () => {
    const sistema = crearSistemaConfiguracion();
    const modificado = await sistema.configurarProfesionales.modificar({
      actor: ADMINISTRADOR,
      id: 'p2',
      cambios: { prestacionIds: ['pr1'] },
    });
    expect(modificado).toEqual({
      id: 'p2',
      consultorioId: 'c1',
      nombre: 'Bruno',
      apellido: 'Muestra',
      matricula: '0002',
      activo: true,
      prestacionIds: ['pr1'],
    });
    await expect(sistema.profesionales.obtenerPorId('p2')).resolves.toEqual(modificado);
  });

  test('Profesional que deja una prestación no aparece en su disponibilidad', async () => {
    const sistema = crearSistemaConfiguracion();
    await sistema.configurarProfesionales.modificar({
      actor: ADMINISTRADOR,
      id: 'p2',
      cambios: { prestacionIds: ['pr1'] },
    });
    const pr2 = await consultar(sistema, { prestacionId: 'pr2' });
    expect(pr2.length).toBeGreaterThan(0);
    expect(pr2.every((h) => h.profesionalId !== 'p2')).toBe(true);
    const pr1 = await consultar(sistema, { prestacionId: 'pr1' });
    expect(pr1.some((h) => h.profesionalId === 'p2')).toBe(true);
  });

  test('Modificar un profesional inactivo no lo reactiva', async () => {
    const seed = crearEntorno();
    const inactivo = { ...seed.profesionales[1]!, activo: false };
    const sistema = crearSistemaConfiguracion({ profesionales: [seed.profesionales[0]!, inactivo] });
    const modificado = await sistema.configurarProfesionales.modificar({
      actor: ADMINISTRADOR,
      id: 'p2',
      cambios: { nombre: 'Bruno José' },
    });
    expect(modificado).toMatchObject({ nombre: 'Bruno José', activo: false });
    expect((await sistema.profesionales.obtenerPorId('p2'))?.activo).toBe(false);
  });

  test('Modificar un profesional con apellido vacío', async () => {
    const sistema = crearSistemaConfiguracion();
    const error = await rechazo(
      sistema.configurarProfesionales.modificar({ actor: ADMINISTRADOR, id: 'p2', cambios: { apellido: '   ' } }),
    );
    expect(error).toBeInstanceOf(ConfiguracionInvalidaError);
    expect(error).toMatchObject({ campo: 'apellido' });
    expect((await sistema.profesionales.obtenerPorId('p2'))?.apellido).toBe('Muestra');
  });

  test('Modificar un profesional inexistente', async () => {
    const sistema = crearSistemaConfiguracion();
    const error = await rechazo(
      sistema.configurarProfesionales.modificar({ actor: ADMINISTRADOR, id: 'p9', cambios: { nombre: 'Otro' } }),
    );
    expect(error).toBeInstanceOf(RecursoNoEncontradoError);
    expect(error).toMatchObject({ tipo: 'profesional', id: 'p9' });
  });
});

describe('Desactivación lógica de recursos', () => {
  test('Desactivar un profesional sin turnos futuros', async () => {
    const sistema = crearSistemaConfiguracion();
    const inactivo = await sistema.configurarProfesionales.desactivar({ actor: ADMINISTRADOR, id: 'p2' });
    expect(inactivo.activo).toBe(false);
    await expect(sistema.profesionales.obtenerPorId('p2')).resolves.toMatchObject({
      activo: false,
      nombre: 'Bruno',
      apellido: 'Muestra',
      prestacionIds: ['pr1', 'pr2', 'pr3', 'pr4'],
    });
  });

  test('Desactivar un sillón sin turnos futuros', async () => {
    const sistema = crearSistemaConfiguracion();
    await sistema.configurarSillones.desactivar({ actor: ADMINISTRADOR, id: 's2' });
    const lista = await sistema.sillones.listarPorConsultorio('c1');
    expect(lista.map((s) => [s.id, s.activo])).toEqual([
      ['s1', true],
      ['s2', false],
    ]);
  });

  test('Desactivar una prestación sin turnos futuros', async () => {
    const sistema = crearSistemaConfiguracion();
    await sistema.configurarPrestaciones.desactivar({ actor: ADMINISTRADOR, id: 'pr4' });
    await expect(sistema.prestaciones.obtenerPorId('pr4')).resolves.toMatchObject({
      activa: false,
      duracionMinutos: 90,
    });
  });

  test('Desactivar un recurso ya inactivo', async () => {
    const seed = crearEntorno();
    const sistema = crearSistemaConfiguracion({
      sillones: [seed.sillones[0]!, { ...seed.sillones[1]!, activo: false }],
    });
    const resultado = await sistema.configurarSillones.desactivar({ actor: ADMINISTRADOR, id: 's2' });
    expect(resultado.activo).toBe(false);
    expect((await sistema.sillones.obtenerPorId('s2'))?.activo).toBe(false);
  });

  test('Desactivar un profesional inexistente', async () => {
    const sistema = crearSistemaConfiguracion();
    const error = await rechazo(sistema.configurarProfesionales.desactivar({ actor: ADMINISTRADOR, id: 'p9' }));
    expect(error).toBeInstanceOf(RecursoNoEncontradoError);
    expect(error).toMatchObject({ tipo: 'profesional', id: 'p9' });
  });
});

describe('Desactivación bloqueada por turnos activos futuros', () => {
  const martes = (id: string, hora: string, fin: string, extra: Partial<Turno> = {}) =>
    crearTurno({
      id,
      prestacionId: 'pr1',
      inicio: local(MARTES, hora),
      fin: local(MARTES, fin),
      duracionMinutos: 30,
      ...extra,
    });

  test('Desactivar un profesional con un turno confirmado futuro', async () => {
    const turno = martes('t-1', '09:00', '09:30');
    const sistema = crearSistemaConfiguracion({ turnos: [turno] });
    const error = await rechazo(sistema.configurarProfesionales.desactivar({ actor: ADMINISTRADOR, id: 'p1' }));
    expect(error).toBeInstanceOf(ReglaNegocioError);
    expect(error).toMatchObject({ codigo: 'RN-27', turnosEnConflicto: [turno] });
    expect((await sistema.profesionales.obtenerPorId('p1'))?.activo).toBe(true);
  });

  test('Desactivar un sillón con un turno reservado futuro', async () => {
    const turno = martes('t-1', '10:00', '10:30', {
      pacienteId: 'pa2',
      profesionalId: 'p2',
      sillonId: 's2',
      estado: 'reservado',
      origen: 'online',
    });
    const sistema = crearSistemaConfiguracion({ turnos: [turno] });
    const error = await rechazo(sistema.configurarSillones.desactivar({ actor: ADMINISTRADOR, id: 's2' }));
    expect(error).toBeInstanceOf(ReglaNegocioError);
    expect(error).toMatchObject({ codigo: 'RN-27', turnosEnConflicto: [turno] });
    expect((await sistema.sillones.obtenerPorId('s2'))?.activo).toBe(true);
  });

  test('Desactivar una prestación lista todos los turnos en conflicto', async () => {
    const delMartes = martes('t-martes', '11:00', '11:45', { prestacionId: 'pr2', duracionMinutos: 45 });
    const delLunes = crearTurno({
      id: 't-lunes',
      pacienteId: 'pa2',
      profesionalId: 'p2',
      sillonId: 's2',
      prestacionId: 'pr2',
      inicio: local(LUNES, '15:00'),
      fin: local(LUNES, '15:45'),
      duracionMinutos: 45,
      estado: 'reservado',
      origen: 'online',
    });
    const sistema = crearSistemaConfiguracion({ turnos: [delMartes, delLunes] });
    const error = await rechazo(sistema.configurarPrestaciones.desactivar({ actor: ADMINISTRADOR, id: 'pr2' }));
    expect(error).toMatchObject({ codigo: 'RN-27', turnosEnConflicto: [delLunes, delMartes] });
    expect((await sistema.prestaciones.obtenerPorId('pr2'))?.activa).toBe(true);
  });

  test('Un turno que empieza justo ahora impide desactivar', async () => {
    const turno = crearTurno({
      id: 't-1',
      prestacionId: 'pr1',
      inicio: local(LUNES, '10:00'),
      fin: local(LUNES, '10:30'),
      duracionMinutos: 30,
    });
    const sistema = crearSistemaConfiguracion({ turnos: [turno], ahora: local(LUNES, '10:00') });
    const error = await rechazo(sistema.configurarProfesionales.desactivar({ actor: ADMINISTRADOR, id: 'p1' }));
    expect(error).toMatchObject({ codigo: 'RN-27', turnosEnConflicto: [turno] });
  });

  test('Turnos no activos o ya iniciados no impiden desactivar', async () => {
    const turnos = [
      martes('t-1', '09:00', '09:30', { estado: 'cancelado' }),
      martes('t-2', '10:00', '10:30', { estado: 'ausente' }),
      crearTurno({
        id: 't-3',
        prestacionId: 'pr1',
        inicio: local(LUNES, '09:00'),
        fin: local(LUNES, '09:30'),
        duracionMinutos: 30,
        estado: 'atendido',
      }),
      crearTurno({
        id: 't-4',
        prestacionId: 'pr1',
        inicio: local(LUNES, '09:45'),
        fin: local(LUNES, '10:15'),
        duracionMinutos: 30,
      }),
    ];
    const sistema = crearSistemaConfiguracion({ turnos, ahora: local(LUNES, '10:00') });
    await sistema.configurarProfesionales.desactivar({ actor: ADMINISTRADOR, id: 'p1' });
    expect((await sistema.profesionales.obtenerPorId('p1'))?.activo).toBe(false);
  });

  test('Turnos de otro recurso no impiden desactivar', async () => {
    const sistema = crearSistemaConfiguracion({ turnos: [martes('t-1', '09:00', '09:30')] });
    await sistema.configurarSillones.desactivar({ actor: ADMINISTRADOR, id: 's2' });
    expect((await sistema.sillones.obtenerPorId('s2'))?.activo).toBe(false);
  });
});

describe('Reactivación de recursos', () => {
  const inactivos = () => {
    const seed = crearEntorno();
    return {
      profesionales: [seed.profesionales[0]!, { ...seed.profesionales[1]!, activo: false }],
      sillones: [seed.sillones[0]!, { ...seed.sillones[1]!, activo: false }],
      prestaciones: [
        ...seed.prestaciones.slice(0, 3),
        { ...seed.prestaciones[3]!, activa: false },
      ],
    };
  };

  test('Reactivar un profesional inactivo', async () => {
    const sistema = crearSistemaConfiguracion(inactivos());
    await sistema.configurarProfesionales.reactivar({ actor: ADMINISTRADOR, id: 'p2' });
    expect((await sistema.profesionales.obtenerPorId('p2'))?.activo).toBe(true);
    const turno = await agendar(sistema, { profesionalId: 'p2', dia: MARTES, hora: '09:00' });
    expect(turno).toMatchObject({ profesionalId: 'p2', pacienteId: 'pa1', inicio: local(MARTES, '09:00') });
  });

  test('Reactivar un sillón y una prestación inactivos', async () => {
    const sistema = crearSistemaConfiguracion(inactivos());
    await sistema.configurarSillones.reactivar({ actor: ADMINISTRADOR, id: 's2' });
    await sistema.configurarPrestaciones.reactivar({ actor: ADMINISTRADOR, id: 'pr4' });
    expect((await sistema.sillones.obtenerPorId('s2'))?.activo).toBe(true);
    expect((await sistema.prestaciones.obtenerPorId('pr4'))?.activa).toBe(true);
  });

  test('Reactivar un recurso ya activo', async () => {
    const sistema = crearSistemaConfiguracion();
    const resultado = await sistema.configurarProfesionales.reactivar({ actor: ADMINISTRADOR, id: 'p1' });
    expect(resultado.activo).toBe(true);
    expect((await sistema.profesionales.obtenerPorId('p1'))?.activo).toBe(true);
  });

  test('Reactivar una prestación inexistente', async () => {
    const sistema = crearSistemaConfiguracion();
    const error = await rechazo(sistema.configurarPrestaciones.reactivar({ actor: ADMINISTRADOR, id: 'pr9' }));
    expect(error).toBeInstanceOf(RecursoNoEncontradoError);
    expect(error).toMatchObject({ tipo: 'prestacion', id: 'pr9' });
  });
});

// [[FIN]]
void [ReglaNegocioError, ODONTOLOGO, PACIENTE, LUNES, MARTES, local];
