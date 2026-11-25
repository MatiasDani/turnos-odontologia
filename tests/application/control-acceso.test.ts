import { describe, expect, test } from 'vitest';
import { AgendaDiaria } from '../../src/application/agenda-diaria.js';
import { BloquearHorario } from '../../src/application/bloquear-horario.js';
import type { Actor } from '../../src/domain/actor.js';
import { AccesoDenegadoError, RecursoNoEncontradoError } from '../../src/domain/errores.js';
import type { Turno } from '../../src/domain/turno.js';
import { actores } from '../fixtures/actores.js';
import { crearTurno, local, LUNES, MARTES } from '../fixtures/seed.js';
import { crearSistemaBloqueo, crearSistemaCancelacion, crearSistemaReprogramacion, rechazo } from '../fixtures/sistema.js';
import { agendarRecepcion, crearSistemaWaMe, waMeDe } from '../fixtures/sistema-wa-me.js';

/**
 * Escenarios de `specs/control-acceso/spec.md` (C-09). Contexto común: `ahora` lunes 10:00;
 * `t-hoy` lunes 09:00 (pa1, p1, s1), `t-base` martes 09:00 (pa1, p1, s1) y `t-otro` martes 11:00
 * (pa2, p2, s2), los tres `confirmado`.
 */
const AHORA = local(LUNES, '10:00');

const tHoy = (overrides: Partial<Turno> = {}): Turno =>
  crearTurno({ id: 't-hoy', inicio: local(LUNES, '09:00'), fin: local(LUNES, '09:30'), ...overrides });
const tBase = (overrides: Partial<Turno> = {}): Turno =>
  crearTurno({ id: 't-base', inicio: local(MARTES, '09:00'), fin: local(MARTES, '09:30'), ...overrides });
const tOtro = (): Turno =>
  crearTurno({
    id: 't-otro',
    pacienteId: 'pa2',
    profesionalId: 'p2',
    sillonId: 's2',
    inicio: local(MARTES, '11:00'),
    fin: local(MARTES, '11:30'),
  });

const odontologoP1 = actores.odontologo('p1');
const odontologoP2 = actores.odontologo('p2');
const pacienteDeTBase = actores.paciente('t-base');
const pacienteDeTOtro = actores.paciente('t-otro');

function sistemaCon(opciones: { turnos?: Turno[]; ahora?: Date } = {}) {
  const turnos = opciones.turnos ?? [tHoy(), tBase(), tOtro()];
  const ahora = opciones.ahora ?? AHORA;
  return {
    cancelacion: crearSistemaCancelacion({ turnos, ahora }),
    reprogramacion: crearSistemaReprogramacion({ turnos, ahora }),
  };
}

async function esperarDenegado(promesa: Promise<unknown>, rol: Actor['rol']): Promise<AccesoDenegadoError> {
  const error = await rechazo(promesa);
  expect(error).toBeInstanceOf(AccesoDenegadoError);
  expect(error).toMatchObject({ rol });
  return error as AccesoDenegadoError;
}

const altaMartes15 = (actor: Actor, profesionalId: string, sillonId: string) => ({
  actor,
  pacienteId: 'pa2',
  profesionalId,
  sillonId,
  prestacionId: 'pr1',
  inicio: local(MARTES, '15:00'),
});

describe('Alta de turnos por rol', () => {
  test('Recepción da un turno', async () => {
    const { cancelacion } = sistemaCon();
    const turno = await cancelacion.agendarTurno.ejecutar(altaMartes15(actores.recepcion, 'p2', 's2'));
    expect(turno).toMatchObject({ profesionalId: 'p2', sillonId: 's2', inicio: local(MARTES, '15:00') });
  });

  test('Odontólogo no da turnos', async () => {
    const { cancelacion } = sistemaCon();
    await esperarDenegado(cancelacion.agendarTurno.ejecutar(altaMartes15(odontologoP1, 'p1', 's1')), 'odontologo');
    expect(await cancelacion.turnos.listarTodos()).toHaveLength(3);
  });
});

describe('Cancelación y reprogramación por rol', () => {
  test('Odontólogo no cancela un turno de su profesional', async () => {
    const { cancelacion } = sistemaCon();
    await esperarDenegado(cancelacion.cancelarTurno.ejecutar({ turnoId: 't-base', actor: odontologoP1 }), 'odontologo');
    expect((await cancelacion.turnos.obtenerPorId('t-base'))?.estado).toBe('confirmado');
  });

  test('Odontólogo no reprograma un turno de su profesional', async () => {
    const { reprogramacion } = sistemaCon();
    await esperarDenegado(
      reprogramacion.reprogramarTurno.ejecutar({ turnoId: 't-base', actor: odontologoP1, inicio: local(MARTES, '10:00') }),
      'odontologo',
    );
    expect((await reprogramacion.turnos.obtenerPorId('t-base'))?.inicio).toEqual(local(MARTES, '09:00'));
  });

  test('Paciente cancela su propio turno', async () => {
    const { cancelacion } = sistemaCon({ ahora: local(LUNES, '08:00') });
    const turno = await cancelacion.cancelarTurno.ejecutar({ turnoId: 't-base', actor: pacienteDeTBase });
    expect(turno).toMatchObject({ estado: 'cancelado', canceladoPor: 'paciente' });
  });

  test('Paciente no cancela un turno ajeno', async () => {
    const { cancelacion } = sistemaCon();
    await esperarDenegado(cancelacion.cancelarTurno.ejecutar({ turnoId: 't-base', actor: pacienteDeTOtro }), 'paciente');
    expect((await cancelacion.turnos.obtenerPorId('t-base'))?.estado).toBe('confirmado');
  });

  test('Paciente no reprograma un turno ajeno', async () => {
    const { reprogramacion } = sistemaCon();
    await esperarDenegado(
      reprogramacion.reprogramarTurno.ejecutar({ turnoId: 't-base', actor: pacienteDeTOtro, inicio: local(MARTES, '10:00') }),
      'paciente',
    );
  });
});

describe('Confirmación por rol', () => {
  const conTBaseReservado = () => sistemaCon({ turnos: [tHoy(), tBase({ estado: 'reservado', origen: 'online' }), tOtro()] });

  test('Recepción confirma un turno reservado', async () => {
    const { cancelacion } = conTBaseReservado();
    const turno = await cancelacion.confirmarTurno.ejecutar({ turnoId: 't-base', actor: actores.recepcion });
    expect(turno.estado).toBe('confirmado');
  });

  test('Odontólogo no confirma turnos', async () => {
    const { cancelacion } = conTBaseReservado();
    await esperarDenegado(cancelacion.confirmarTurno.ejecutar({ turnoId: 't-base', actor: odontologoP1 }), 'odontologo');
    expect((await cancelacion.turnos.obtenerPorId('t-base'))?.estado).toBe('reservado');
  });

  test('Paciente no confirma un turno ajeno', async () => {
    const { cancelacion } = conTBaseReservado();
    await esperarDenegado(cancelacion.confirmarTurno.ejecutar({ turnoId: 't-base', actor: pacienteDeTOtro }), 'paciente');
  });
});

describe('Cierre del turno por rol', () => {
  test('Odontólogo marca atendido su turno', async () => {
    const { cancelacion } = sistemaCon();
    const turno = await cancelacion.marcarAtendido.ejecutar({ turnoId: 't-hoy', actor: odontologoP1 });
    expect(turno.estado).toBe('atendido');
  });

  test('Odontólogo no cierra el turno de otro profesional', async () => {
    const { cancelacion } = sistemaCon();
    await esperarDenegado(cancelacion.marcarAusente.ejecutar({ turnoId: 't-hoy', actor: odontologoP2 }), 'odontologo');
    expect((await cancelacion.turnos.obtenerPorId('t-hoy'))?.estado).toBe('confirmado');
  });

  test('Paciente no cierra turnos', async () => {
    const { cancelacion } = sistemaCon();
    await esperarDenegado(cancelacion.marcarAtendido.ejecutar({ turnoId: 't-base', actor: pacienteDeTBase }), 'paciente');
  });
});

describe('Consulta de disponibilidad por rol', () => {
  test('Odontólogo consulta disponibilidad', async () => {
    const { cancelacion } = sistemaCon();
    const huecos = await cancelacion.consultarDisponibilidad.ejecutar({
      actor: odontologoP1,
      prestacionId: 'pr1',
      rango: { desde: local(MARTES, '00:00'), hasta: local(MARTES, '23:59') },
      ahora: AHORA,
    });
    expect(huecos.length).toBeGreaterThan(0);
    expect(huecos.every((h) => h.inicio >= local(MARTES, '00:00') && h.inicio < local(MARTES, '23:59'))).toBe(true);
  });
});

describe('Bloqueos y agenda conservan sus permisos', () => {
  const crearCasos = () => {
    const sistema = crearSistemaBloqueo({ turnos: [tHoy(), tBase(), tOtro()] });
    return {
      sistema,
      bloquear: new BloquearHorario({ bloqueos: sistema.bloqueos, turnos: sistema.turnos, generadorId: sistema.generadorId }),
      agenda: new AgendaDiaria({ turnos: sistema.turnos, bloqueos: sistema.bloqueos }),
    };
  };
  const bloqueoMartes15 = (actor: Actor, profesionalId: string) => ({
    actor,
    profesionalId,
    inicio: local(MARTES, '15:00'),
    fin: local(MARTES, '16:00'),
  });

  test('Odontólogo bloquea su propia agenda', async () => {
    const { bloquear } = crearCasos();
    const bloqueo = await bloquear.ejecutar(bloqueoMartes15(odontologoP1, 'p1'));
    expect(bloqueo).toMatchObject({ profesionalId: 'p1', inicio: local(MARTES, '15:00') });
  });

  test('Odontólogo no bloquea otro profesional', async () => {
    const { bloquear } = crearCasos();
    await esperarDenegado(bloquear.ejecutar(bloqueoMartes15(odontologoP1, 'p2')), 'odontologo');
  });

  test('Odontólogo no ve la agenda de otro profesional', async () => {
    const { agenda } = crearCasos();
    await esperarDenegado(agenda.ejecutar({ actor: odontologoP1, fecha: MARTES, profesionalId: 'p2' }), 'odontologo');
  });

  test('Paciente no ve la agenda', async () => {
    const { agenda } = crearCasos();
    await esperarDenegado(agenda.ejecutar({ actor: pacienteDeTBase, fecha: MARTES }), 'paciente');
  });
});

describe('Recordatorios por rol', () => {
  test('Recepción lista los wa.me pendientes', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema);
    const lista = await sistema.listarPendientesWaMe.ejecutar({ actor: actores.recepcion });
    expect(lista.map((r) => r.turnoId)).toContain(turno.id);
  });

  test('Odontólogo no lista recordatorios', async () => {
    const sistema = crearSistemaWaMe();
    await esperarDenegado(sistema.listarFallidos.ejecutar({ actor: odontologoP1 }), 'odontologo');
  });

  test('Administrador no marca enviado', async () => {
    const sistema = crearSistemaWaMe();
    const turno = await agendarRecepcion(sistema);
    const [waMe] = await waMeDe(sistema, turno.id);
    if (waMe === undefined) throw new Error('falta el wa.me');
    await esperarDenegado(
      sistema.marcarEnviado.ejecutar({ actor: actores.administrador, recordatorioId: waMe.id }),
      'administrador',
    );
    const [despues] = await waMeDe(sistema, turno.id);
    expect(despues?.estado).toBe('pendiente');
  });
});

describe('El acceso se evalúa antes que las reglas de negocio', () => {
  test('Rol sin la acción no revela si el turno existe', async () => {
    const { cancelacion } = sistemaCon();
    await esperarDenegado(cancelacion.cancelarTurno.ejecutar({ turnoId: 't-inexistente', actor: odontologoP1 }), 'odontologo');
  });

  test('El alcance propio prevalece sobre el estado', async () => {
    const { cancelacion } = sistemaCon({ turnos: [tHoy({ estado: 'cancelado' }), tBase(), tOtro()] });
    await esperarDenegado(cancelacion.marcarAtendido.ejecutar({ turnoId: 't-hoy', actor: odontologoP2 }), 'odontologo');
  });

  test('El alcance propio prevalece sobre la anticipación', async () => {
    const { cancelacion } = sistemaCon({ ahora: local(MARTES, '08:00') });
    await esperarDenegado(cancelacion.cancelarTurno.ejecutar({ turnoId: 't-base', actor: pacienteDeTOtro }), 'paciente');
  });

  test('Rol habilitado y turno inexistente', async () => {
    const { cancelacion } = sistemaCon();
    const error = await rechazo(cancelacion.cancelarTurno.ejecutar({ turnoId: 't-inexistente', actor: actores.recepcion }));
    expect(error).toBeInstanceOf(RecursoNoEncontradoError);
    expect(error).not.toHaveProperty('codigo');
  });
});

describe('Error de acceso denegado', () => {
  test('El rechazo no expone datos del turno', async () => {
    const { cancelacion } = sistemaCon();
    const error = await esperarDenegado(
      cancelacion.cancelarTurno.ejecutar({ turnoId: 't-base', actor: pacienteDeTOtro }),
      'paciente',
    );
    expect(error.operacion).toBe('turno.cancelar');
    expect(error.message).not.toMatch(/pa1|p1|09:00|t-base/);
    expect(error).not.toHaveProperty('codigo');
  });
});
