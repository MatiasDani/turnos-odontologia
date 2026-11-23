import { describe, expect, expectTypeOf, test } from 'vitest';
import type { AgendarTurnoInput } from '../../src/application/agendar-turno.js';
import { crearTurno, LUNES, local, MIERCOLES, SABADO } from '../fixtures/seed.js';
import { RecursoNoEncontradoError, ReglaNegocioError } from '../../src/domain/errores.js';
import { crearEntorno } from '../fixtures/seed.js';
import { agendar, crearSistema } from '../fixtures/sistema.js';

describe('Ocupación conjunta de profesional y sillón', () => {
  test('Distinto profesional y sillón en el mismo horario', async () => {
    const sistema = crearSistema({ turnos: [crearTurno({ id: 'A' })] });
    const creado = await agendar(sistema, {
      profesionalId: 'p2',
      sillonId: 's2',
      prestacionId: 'pr3',
      hora: '09:00',
    });
    expect(creado.profesionalId).toBe('p2');
    const registrados = await sistema.turnos.listarPorRecursos('p1', 's1');
    const delOtro = await sistema.turnos.listarPorRecursos('p2', 's2');
    expect(registrados.map((t) => t.id)).toContain('A');
    expect(delOtro.map((t) => t.id)).toEqual([creado.id]);
  });

  test('El turno creado registra profesional, sillón y paciente', async () => {
    const sistema = crearSistema();
    const turno = await agendar(sistema, {
      pacienteId: 'pa1',
      profesionalId: 'p1',
      sillonId: 's1',
      prestacionId: 'pr2',
      hora: '09:00',
    });
    expect(turno).toMatchObject({
      profesionalId: 'p1',
      sillonId: 's1',
      prestacionId: 'pr2',
      pacienteId: 'pa1',
      inicio: local(LUNES, '09:00'),
      fin: local(LUNES, '09:45'),
    });
  });

  test('el turno creado queda registrado en el repositorio con id generado', async () => {
    const sistema = crearSistema();
    const turno = await agendar(sistema, { hora: '10:00' });
    expect(turno.id).toBe('t-1');
    expect(await sistema.turnos.listarPorRecursos('p1', 's1')).toEqual([turno]);
  });
});

describe('Sin solapamiento por profesional', () => {
  const A = crearTurno({
    id: 'A',
    inicio: local(LUNES, '09:00'),
    fin: local(LUNES, '09:45'),
    duracionMinutos: 45,
  });

  test('Contiguos del mismo profesional son válidos', async () => {
    const sistema = crearSistema({ turnos: [A] });
    const b = await agendar(sistema, { prestacionId: 'pr1', hora: '09:45', duracion: 30 });
    expect(b.fin).toEqual(local(LUNES, '10:15'));
  });

  test('Solapamiento parcial por profesional', async () => {
    const sistema = crearSistema({ turnos: [A] });
    await expect(
      agendar(sistema, { sillonId: 's2', prestacionId: 'pr1', hora: '09:44', duracion: 30 }),
    ).rejects.toMatchObject({ codigo: 'RN-02', turnoEnConflicto: A });
  });

  test('Contención total por profesional', async () => {
    const grande = crearTurno({ id: 'G', fin: local(LUNES, '10:30'), duracionMinutos: 90 });
    const sistema = crearSistema({ turnos: [grande] });
    await expect(
      agendar(sistema, { sillonId: 's2', prestacionId: 'pr1', hora: '09:30', duracion: 30 }),
    ).rejects.toMatchObject({ codigo: 'RN-02' });
  });

  test('Mismo profesional en otro sillón', async () => {
    const sistema = crearSistema({ turnos: [crearTurno()] });
    await expect(
      agendar(sistema, { sillonId: 's2', prestacionId: 'pr3', hora: '09:00' }),
    ).rejects.toMatchObject({ codigo: 'RN-02' });
  });
});

describe('Sin solapamiento por sillón', () => {
  test('Mismo sillón con otro profesional', async () => {
    const A = crearTurno({ id: 'A' });
    const sistema = crearSistema({ turnos: [A] });
    await expect(
      agendar(sistema, { profesionalId: 'p2', prestacionId: 'pr1', hora: '09:30' }),
    ).rejects.toMatchObject({ codigo: 'RN-03', turnoEnConflicto: A });
  });

  test('Contiguos en el mismo sillón son válidos', async () => {
    const sistema = crearSistema({ turnos: [crearTurno()] });
    const turno = await agendar(sistema, { profesionalId: 'p2', prestacionId: 'pr1', hora: '10:00' });
    expect(turno.fin).toEqual(local(LUNES, '10:30'));
  });
});


describe('Solo los turnos activos ocupan recursos', () => {
  test('Turno cancelado no ocupa', async () => {
    const sistema = crearSistema({ turnos: [crearTurno({ estado: 'cancelado' })] });
    const turno = await agendar(sistema, { prestacionId: 'pr3', hora: '09:00' });
    expect(turno.estado).toBe('confirmado');
  });

  test('Turno ausente no ocupa', async () => {
    const sistema = crearSistema({ turnos: [crearTurno({ estado: 'ausente' })] });
    const turno = await agendar(sistema, { profesionalId: 'p2', prestacionId: 'pr1', hora: '09:30' });
    expect(turno.profesionalId).toBe('p2');
  });

  test('Turno atendido sigue ocupando', async () => {
    const sistema = crearSistema({ turnos: [crearTurno({ estado: 'atendido' })] });
    await expect(
      agendar(sistema, { sillonId: 's2', prestacionId: 'pr1', hora: '09:30' }),
    ).rejects.toMatchObject({ codigo: 'RN-02' });
  });
});

describe('Sin sobreturnos para ningún rol', () => {
  test('Administrador intenta forzar un solapamiento', async () => {
    const sistema = crearSistema({ turnos: [crearTurno()] });
    await expect(
      agendar(sistema, { rol: 'administrador', prestacionId: 'pr3', hora: '09:30' }),
    ).rejects.toMatchObject({ codigo: 'RN-02' });
  });

  test('La entrada no admite opción de forzar', () => {
    expectTypeOf<AgendarTurnoInput>().not.toHaveProperty('forzar');
    expectTypeOf<keyof AgendarTurnoInput>().toEqualTypeOf<
      'actor' | 'pacienteId' | 'profesionalId' | 'sillonId' | 'prestacionId' | 'inicio' | 'duracionMinutos'
    >();
  });
});

describe('Duración efectiva del turno', () => {
  test('Duración por defecto de la prestación', async () => {
    const turno = await agendar(crearSistema(), { prestacionId: 'pr1', hora: '09:00' });
    expect(turno.fin).toEqual(local(LUNES, '09:30'));
    expect(turno.duracionMinutos).toBe(30);
  });

  test('Duración ajustada por recepción', async () => {
    const turno = await agendar(crearSistema(), { rol: 'recepcion', prestacionId: 'pr1', hora: '09:00', duracion: 45 });
    expect(turno.fin).toEqual(local(LUNES, '09:45'));
    expect(turno.duracionMinutos).toBe(45);
  });

  test('Duración cero rechazada', async () => {
    await expect(agendar(crearSistema(), { hora: '09:00', duracion: 0 })).rejects.toMatchObject({ codigo: 'RN-06' });
  });

  test('Duración no múltiplo de 5 rechazada', async () => {
    await expect(agendar(crearSistema(), { hora: '09:00', duracion: 37 })).rejects.toMatchObject({ codigo: 'RN-06' });
  });

  test('Duración negativa o no entera rechazada', async () => {
    for (const duracion of [-5, 12.5]) {
      await expect(agendar(crearSistema(), { hora: '09:00', duracion })).rejects.toMatchObject({ codigo: 'RN-06' });
    }
  });

  test('La duración ajustada se valida contra solapamientos', async () => {
    const sistema = crearSistema({
      turnos: [crearTurno({ inicio: local(LUNES, '09:40'), fin: local(LUNES, '10:00'), duracionMinutos: 20 })],
    });
    await expect(
      agendar(sistema, { sillonId: 's2', prestacionId: 'pr1', hora: '09:00', duracion: 45 }),
    ).rejects.toMatchObject({ codigo: 'RN-02' });
  });
});

describe('Ajuste de duración solo por personal del consultorio', () => {
  test('Paciente informa duración distinta', async () => {
    await expect(
      agendar(crearSistema(), { rol: 'paciente', prestacionId: 'pr1', hora: '09:00', duracion: 45 }),
    ).rejects.toMatchObject({ codigo: 'RN-16' });
  });

  test('Odontólogo ajusta la duración', async () => {
    const turno = await agendar(crearSistema(), { rol: 'odontologo', prestacionId: 'pr2', hora: '09:00', duracion: 60 });
    expect(turno.fin).toEqual(local(LUNES, '10:00'));
    expect(turno.duracionMinutos).toBe(60);
  });
});

describe('Horario de atención en la zona del consultorio', () => {
  const rechazaConRN07 = (s: Parameters<typeof agendar>[1]) =>
    expect(agendar(crearSistema(), s)).rejects.toMatchObject({ codigo: 'RN-07' });

  test('Turno de 60 min que excede el cierre', () => rechazaConRN07({ prestacionId: 'pr3', hora: '18:30' }));
  test('Turno antes de la apertura', () => rechazaConRN07({ prestacionId: 'pr1', hora: '08:30' }));
  test('Turno que empieza en el corte del mediodía', () => rechazaConRN07({ prestacionId: 'pr1', hora: '13:30' }));
  test('Turno en fin de semana', () => rechazaConRN07({ dia: SABADO, prestacionId: 'pr1', hora: '10:00' }));

  test('Instante UTC convertido a hora local', async () => {
    const turno = await crearSistema().agendarTurno.ejecutar({
      actor: { rol: 'recepcion' },
      pacienteId: 'pa1',
      profesionalId: 'p1',
      sillonId: 's1',
      prestacionId: 'pr1',
      inicio: new Date('2026-11-23T12:00:00Z'),
    });
    expect(turno.fin).toEqual(new Date('2026-11-23T12:30:00Z'));
  });

  test('Instante UTC fuera de horario local', async () => {
    await expect(
      crearSistema().agendarTurno.ejecutar({
        actor: { rol: 'recepcion' },
        pacienteId: 'pa1',
        profesionalId: 'p1',
        sillonId: 's1',
        prestacionId: 'pr1',
        inicio: new Date('2026-11-23T11:30:00Z'),
      }),
    ).rejects.toMatchObject({ codigo: 'RN-07' });
  });
});

describe('Turno en un único tramo de atención', () => {
  test('Termina justo al cierre del tramo', async () => {
    const turno = await agendar(crearSistema(), { prestacionId: 'pr1', hora: '12:30' });
    expect(turno.fin).toEqual(local(LUNES, '13:00'));
  });

  test('Cruza el corte entre tramos', async () => {
    await expect(agendar(crearSistema(), { prestacionId: 'pr1', hora: '12:45' })).rejects.toMatchObject({
      codigo: 'RN-17',
    });
  });
});

describe('Bloqueos de profesional y de sillón', () => {
  test('Turno sobre bloqueo del profesional', async () => {
    const sistema = crearSistema();
    await expect(
      agendar(sistema, { dia: MIERCOLES, prestacionId: 'pr1', hora: '15:30' }),
    ).rejects.toMatchObject({
      codigo: 'RN-07',
      recursoBloqueado: 'profesional',
      bloqueoEnConflicto: sistema.datos.bloqueos[0],
    });
  });

  test('Turno contiguo al fin del bloqueo', async () => {
    const turno = await agendar(crearSistema(), { dia: MIERCOLES, prestacionId: 'pr1', hora: '17:00' });
    expect(turno.inicio).toEqual(local(MIERCOLES, '17:00'));
  });

  test('Bloqueo de un profesional no afecta a otro', async () => {
    const turno = await agendar(crearSistema(), { profesionalId: 'p2', dia: MIERCOLES, prestacionId: 'pr1', hora: '15:30' });
    expect(turno.profesionalId).toBe('p2');
  });

  test('Turno sobre bloqueo de sillón', async () => {
    const bloqueoSillon = { id: 'b-s1', sillonId: 's1', inicio: local(LUNES, '10:00'), fin: local(LUNES, '11:00') };
    const sistema = crearSistema({ bloqueos: [bloqueoSillon] });
    await expect(
      agendar(sistema, { profesionalId: 'p2', prestacionId: 'pr1', hora: '10:00' }),
    ).rejects.toMatchObject({ codigo: 'RN-07', recursoBloqueado: 'sillon', bloqueoEnConflicto: bloqueoSillon });
  });
});

describe('Solo recursos activos', () => {
  const datos = crearEntorno();

  test('Profesional inactivo', async () => {
    const sistema = crearSistema({
      profesionales: datos.profesionales.map((p) => (p.id === 'p2' ? { ...p, activo: false } : p)),
    });
    await expect(agendar(sistema, { profesionalId: 'p2', hora: '09:00' })).rejects.toMatchObject({ codigo: 'RN-18' });
  });

  test('Sillón inactivo', async () => {
    const sistema = crearSistema({
      sillones: datos.sillones.map((s) => (s.id === 's2' ? { ...s, activo: false } : s)),
    });
    await expect(agendar(sistema, { sillonId: 's2', hora: '09:00' })).rejects.toMatchObject({ codigo: 'RN-18' });
  });

  test('Prestación inactiva', async () => {
    const sistema = crearSistema({
      prestaciones: datos.prestaciones.map((p) => (p.id === 'pr4' ? { ...p, activa: false } : p)),
    });
    await expect(agendar(sistema, { prestacionId: 'pr4', hora: '09:00' })).rejects.toMatchObject({ codigo: 'RN-18' });
  });
});

describe('Estado inicial según el origen', () => {
  test('Alta interna nace confirmado', async () => {
    const turno = await agendar(crearSistema(), { rol: 'recepcion', hora: '09:00' });
    expect(turno).toMatchObject({ estado: 'confirmado', origen: 'recepcion' });
  });

  test('Alta por paciente nace reservado', async () => {
    const turno = await agendar(crearSistema(), { rol: 'paciente', prestacionId: 'pr1', hora: '09:00' });
    expect(turno).toMatchObject({ estado: 'reservado', origen: 'online' });
  });

  test.each(['odontologo', 'administrador'] as const)('alta interna por %s nace confirmado', async (rol) => {
    const turno = await agendar(crearSistema(), { rol, hora: '09:00' });
    expect(turno).toMatchObject({ estado: 'confirmado', origen: 'recepcion' });
  });
});

describe('Errores tipados con orden de evaluación fijo', () => {
  test('Recurso inactivo prevalece sobre solapamiento', async () => {
    const datos = crearEntorno();
    const sistema = crearSistema({
      turnos: [crearTurno()],
      sillones: datos.sillones.map((s) => (s.id === 's1' ? { ...s, activo: false } : s)),
    });
    await expect(agendar(sistema, { prestacionId: 'pr3', hora: '09:00' })).rejects.toMatchObject({ codigo: 'RN-18' });
  });

  test('Profesional prevalece sobre sillón', async () => {
    const sistema = crearSistema({ turnos: [crearTurno()] });
    await expect(agendar(sistema, { prestacionId: 'pr1', hora: '09:15' })).rejects.toMatchObject({ codigo: 'RN-02' });
  });

  test('el rechazo es una ReglaNegocioError con código y turno en conflicto', async () => {
    const A = crearTurno({ id: 'A' });
    const error = await agendar(crearSistema({ turnos: [A] }), { hora: '09:15' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ReglaNegocioError);
    expect(error).toMatchObject({ codigo: 'RN-02', turnoEnConflicto: A });
  });

  test('Recurso inexistente', async () => {
    const error = await agendar(crearSistema(), { profesionalId: 'p9', hora: '09:00' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RecursoNoEncontradoError);
    expect(error).not.toBeInstanceOf(ReglaNegocioError);
    expect(error).toMatchObject({ tipo: 'profesional', id: 'p9' });
  });

  test.each([
    ['sillon', { sillonId: 's9' }],
    ['prestacion', { prestacionId: 'pr9' }],
  ] as const)('recurso inexistente: %s', async (tipo, parcial) => {
    await expect(agendar(crearSistema(), { ...parcial, hora: '09:00' })).rejects.toMatchObject({ tipo });
  });
});

describe('Validación y persistencia atómicas', () => {
  test('Dos altas simultáneas al mismo horario', async () => {
    const sistema = crearSistema();
    const resultados = await Promise.allSettled([
      agendar(sistema, { sillonId: 's1', prestacionId: 'pr3', hora: '09:00' }),
      agendar(sistema, { sillonId: 's2', prestacionId: 'pr3', hora: '09:00' }),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rechazadas = resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rechazadas).toHaveLength(1);
    expect(rechazadas[0]?.reason).toMatchObject({ codigo: 'RN-02' });
    expect(await sistema.turnos.listarPorRecursos('p1', 's1')).toHaveLength(1);
    expect(await sistema.turnos.listarPorRecursos('p1', 's2')).toHaveLength(1);
  });

  test('cinco altas simultáneas sobre el mismo profesional crean exactamente una', async () => {
    const sistema = crearSistema();
    const resultados = await Promise.allSettled(
      Array.from({ length: 5 }, () => agendar(sistema, { prestacionId: 'pr3', hora: '09:00' })),
    );
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await sistema.turnos.listarPorRecursos('p1', 's1')).toHaveLength(1);
  });

  test('Un rechazo no persiste nada', async () => {
    const original = crearTurno({ id: 'A' });
    const sistema = crearSistema({ turnos: [original] });
    await expect(
      agendar(sistema, { sillonId: 's2', prestacionId: 'pr1', hora: '09:30' }),
    ).rejects.toMatchObject({ codigo: 'RN-02' });
    expect(await sistema.turnos.listarPorRecursos('p1', 's2')).toEqual([original]);
    expect(await sistema.turnos.listarPorRecursos('p1', 's1')).toEqual([original]);
  });
});

describe('Horario propio del profesional por día', () => {
  const propio = (id: string, desde: string, hasta: string) => ({
    id,
    consultorioId: 'c1',
    profesionalId: 'p2',
    diaSemana: 1,
    desde,
    hasta,
  });
  const conTramoPropio = (...tramos: ReturnType<typeof propio>[]) =>
    crearSistema({ horarios: [...crearEntorno().horarios, ...tramos] });
  const sistemaBase = () => conTramoPropio(propio('hp1', '14:00', '18:00'));

  test('Turno dentro del horario propio del profesional', async () => {
    const turno = await agendar(sistemaBase(), { profesionalId: 'p2', hora: '14:00' });
    expect(turno).toMatchObject({ inicio: local(LUNES, '14:00'), fin: local(LUNES, '14:30') });
  });

  test('El horario del consultorio no aplica el día con horario propio', async () => {
    const error = await agendar(sistemaBase(), { profesionalId: 'p2', hora: '09:00' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ReglaNegocioError);
    expect(error).toMatchObject({ codigo: 'RN-07' });
  });

  test('Día sin horario propio usa el del consultorio', async () => {
    const turno = await agendar(sistemaBase(), { profesionalId: 'p2', dia: '2026-11-24', hora: '09:00' });
    expect(turno).toMatchObject({ inicio: local('2026-11-24', '09:00'), fin: local('2026-11-24', '09:30') });
  });

  test('El horario propio de otro profesional no cambia la agenda', async () => {
    const sistema = sistemaBase();
    const manana = await agendar(sistema, { profesionalId: 'p1', hora: '09:00' });
    expect(manana.inicio).toEqual(local(LUNES, '09:00'));
    const tarde = await agendar(sistema, { profesionalId: 'p1', sillonId: 's2', hora: '14:00' }).catch(
      (e: unknown) => e,
    );
    expect(tarde).toBeInstanceOf(ReglaNegocioError);
    expect(tarde).toMatchObject({ codigo: 'RN-07' });
  });

  test('Turno que excede el último tramo propio del día', async () => {
    const error = await agendar(sistemaBase(), { profesionalId: 'p2', prestacionId: 'pr3', hora: '17:30' }).catch(
      (e: unknown) => e,
    );
    expect(error).toMatchObject({ codigo: 'RN-07' });
  });

  test('Turno que cruza el corte entre tramos propios', async () => {
    const sistema = conTramoPropio(propio('hp2', '08:00', '10:00'), propio('hp3', '16:00', '18:00'));
    const error = await agendar(sistema, { profesionalId: 'p2', hora: '09:45' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ReglaNegocioError);
    expect(error).toMatchObject({ codigo: 'RN-17' });
  });
});
