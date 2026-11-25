import { expect, test } from 'vitest';
import { AgendaDiaria } from '../../src/application/agenda-diaria.js';
import { AccesoDenegadoError } from '../../src/domain/errores.js';
import { crearTurno, LUNES, local, MARTES } from '../fixtures/seed.js';
import { crearSistemaBloqueo } from '../fixtures/sistema.js';

test('Recepción consulta la agenda de un día', async () => {
  // 1. Preparo los datos ficticios.
  const turnoLunes = crearTurno({ id: 'turno-lunes' });

  const turnoMartes = crearTurno({
    id: 'turno-martes',
    inicio: local(MARTES, '10:00'),
    fin: local(MARTES, '11:00'),
  });

  const bloqueoLunes = {
    id: 'bloqueo-lunes',
    profesionalId: 'p1',
    inicio: local(LUNES, '11:00'),
    fin: local(LUNES, '12:00'),
  };

  const sistema = crearSistemaBloqueo({
    turnos: [turnoLunes, turnoMartes],
    bloqueos: [bloqueoLunes],
  });

  // 2. Consulto la agenda del lunes como recepción.
  const agenda = new AgendaDiaria({
    turnos: sistema.turnos,
    bloqueos: sistema.bloqueos,
  });

  const resultado = await agenda.ejecutar({
    actor: { rol: 'recepcion' },
    fecha: LUNES,
  });

  // 3. Compruebo qué devolvió.
  expect(resultado.turnos.map((turno) => turno.id)).toEqual(['turno-lunes']);
  expect(resultado.bloqueos.map((bloqueo) => bloqueo.id)).toEqual(['bloqueo-lunes']);
});

test('El odontólogo consulta solo su propia agenda', async () => {
  const bloqueoPropio = {
    id: 'bloqueo-propio',
    profesionalId: 'p1',
    inicio: local(LUNES, '11:00'),
    fin: local(LUNES, '12:00'),
  };
  const sistema = crearSistemaBloqueo({
    turnos: [
      crearTurno({ id: 'turno-propio', profesionalId: 'p1' }),
      crearTurno({ id: 'turno-ajeno', profesionalId: 'p2', sillonId: 's2' }),
    ],
    bloqueos: [
      bloqueoPropio,
      { ...bloqueoPropio, id: 'bloqueo-ajeno', profesionalId: 'p2' },
    ],
  });
  const agenda = new AgendaDiaria({
    turnos: sistema.turnos,
    bloqueos: sistema.bloqueos,
  });

  const resultado = await agenda.ejecutar({
    actor: { rol: 'odontologo', profesionalId: 'p1' },
    fecha: LUNES,
  });

  expect(resultado.turnos.map((turno) => turno.id)).toEqual(['turno-propio']);
  expect(resultado.bloqueos.map((bloqueo) => bloqueo.id)).toEqual(['bloqueo-propio']);
});

test.each(['recepcion', 'administrador'] as const)(
  '%s consulta la agenda de ambos profesionales',
  async (rol) => {
    const bloqueoP1 = {
      id: 'bloqueo-p1',
      profesionalId: 'p1',
      inicio: local(LUNES, '11:00'),
      fin: local(LUNES, '12:00'),
    };
    const sistema = crearSistemaBloqueo({
      turnos: [
        crearTurno({ id: 'turno-p1', profesionalId: 'p1' }),
        crearTurno({ id: 'turno-p2', profesionalId: 'p2', sillonId: 's2', pacienteId: 'pa2' }),
      ],
      bloqueos: [
        bloqueoP1,
        { ...bloqueoP1, id: 'bloqueo-p2', profesionalId: 'p2' },
      ],
    });
    const agenda = new AgendaDiaria({
      turnos: sistema.turnos,
      bloqueos: sistema.bloqueos,
    });

    const resultado = await agenda.ejecutar({ actor: { rol }, fecha: LUNES });

    expect(resultado.turnos.map((turno) => turno.id).sort()).toEqual(['turno-p1', 'turno-p2']);
    expect(resultado.bloqueos.map((bloqueo) => bloqueo.id).sort()).toEqual(['bloqueo-p1', 'bloqueo-p2']);
  },
);

test.each([
  [{ profesionalId: 'p1' }, ['turno-p1-s1', 'turno-p1-s2'], ['bloqueo-p1', 'bloqueo-p1-s2']],
  [{ sillonId: 's2' }, ['turno-p1-s2', 'turno-p2-s2'], ['bloqueo-p1-s2', 'bloqueo-s2']],
  [{ profesionalId: 'p1', sillonId: 's2' }, ['turno-p1-s2'], ['bloqueo-p1-s2']],
] as const)('Filtra la agenda diaria por %j', async (filtros, idsTurnos, idsBloqueos) => {
  const intervalo = { inicio: local(LUNES, '11:00'), fin: local(LUNES, '12:00') };
  const sistema = crearSistemaBloqueo({
    turnos: [
      crearTurno({ id: 'turno-p1-s1' }),
      crearTurno({ id: 'turno-p1-s2', sillonId: 's2', inicio: local(LUNES, '10:00'), fin: local(LUNES, '11:00') }),
      crearTurno({ id: 'turno-p2-s2', profesionalId: 'p2', sillonId: 's2', pacienteId: 'pa2' }),
    ],
    bloqueos: [
      { ...intervalo, id: 'bloqueo-p1', profesionalId: 'p1' },
      { ...intervalo, id: 'bloqueo-p1-s2', profesionalId: 'p1', sillonId: 's2' },
      { id: 'bloqueo-s2', sillonId: 's2', inicio: local(LUNES, '12:00'), fin: local(LUNES, '13:00') },
    ],
  });
  const agenda = new AgendaDiaria({ turnos: sistema.turnos, bloqueos: sistema.bloqueos });

  const resultado = await agenda.ejecutar({ actor: { rol: 'recepcion' }, fecha: LUNES, ...filtros });

  expect(resultado.turnos.map((turno) => turno.id).sort()).toEqual(idsTurnos);
  expect(resultado.bloqueos.map((bloqueo) => bloqueo.id).sort()).toEqual(idsBloqueos);
});

test('El odontólogo no puede filtrar por otro profesional', async () => {
  const sistema = crearSistemaBloqueo();
  const agenda = new AgendaDiaria({ turnos: sistema.turnos, bloqueos: sistema.bloqueos });

  await expect(agenda.ejecutar({
    actor: { rol: 'odontologo', profesionalId: 'p1' },
    fecha: LUNES,
    profesionalId: 'p2',
  })).rejects.toBeInstanceOf(AccesoDenegadoError);
});
