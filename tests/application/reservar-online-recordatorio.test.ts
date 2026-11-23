import { describe, expect, test } from 'vitest';
import { crearTurno, LUNES, local } from '../fixtures/seed.js';
import { ErrorReservaPublica } from '../../src/application/errores-reserva-publica.js';
import { RecordatorioRepositorioQueFalla } from '../fixtures/recordatorio-repositorio-que-falla.js';
import { DOMINGO, crearSistemaRecordatorios, recordatoriosDe } from '../fixtures/sistema-recordatorios.js';
import { reservarDesdePedido } from '../../src/adapters/http/pedido-reserva.js';
import { pedidoBase, rechazoPublico } from '../fixtures/sistema.js';

describe('Recordatorio programado al reservar', () => {
  test('Reserva de un paciente nuevo programa el recordatorio', async () => {
    const sistema = crearSistemaRecordatorios();

    const respuesta = await reservarDesdePedido(pedidoBase(), sistema.reservarOnline);

    expect(respuesta.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const recordatorios = await recordatoriosDe(sistema, respuesta.turnoId);
    expect(recordatorios).toHaveLength(1);
    expect(recordatorios[0]).toMatchObject({
      canal: 'email',
      estado: 'pendiente',
      programadoPara: local(DOMINGO, '09:00'),
    });
    await expect(sistema.pacientes.obtenerPorDni('00000004')).resolves.toBeDefined();
  });

  test('Reserva de un paciente existente programa el recordatorio', async () => {
    const sistema = crearSistemaRecordatorios();

    const respuesta = await reservarDesdePedido(pedidoBase({}, { dni: '00000001' }), sistema.reservarOnline);

    await expect(sistema.turnos.obtenerPorId(respuesta.turnoId)).resolves.toMatchObject({ pacienteId: 'pa1' });
    const recordatorios = await recordatoriosDe(sistema, respuesta.turnoId);
    expect(recordatorios).toHaveLength(1);
    expect(recordatorios[0]).toMatchObject({
      canal: 'email',
      estado: 'pendiente',
      programadoPara: local(DOMINGO, '09:00'),
    });
  });

  test('Paciente nuevo sin e-mail reserva sin recordatorio por e-mail', async () => {
    const sistema = crearSistemaRecordatorios();

    const respuesta = await reservarDesdePedido(pedidoBase({}, { email: undefined }), sistema.reservarOnline);

    expect(respuesta.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const recordatorios = await recordatoriosDe(sistema, respuesta.turnoId);
    expect(recordatorios.filter((r) => r.canal === 'email')).toEqual([]);
  });

  test('Paciente existente sin consentimiento reserva sin recordatorios', async () => {
    const sistema = crearSistemaRecordatorios();

    const respuesta = await reservarDesdePedido(pedidoBase({}, { dni: '00000003' }), sistema.reservarOnline);

    expect(respuesta.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    await expect(sistema.turnos.obtenerPorId(respuesta.turnoId)).resolves.toMatchObject({ pacienteId: 'pa3' });
    expect(await recordatoriosDe(sistema, respuesta.turnoId)).toEqual([]);
  });

  test('Reserva de un paciente nuevo programa también el `wa.me`', async () => {
    const sistema = crearSistemaRecordatorios({ conWaMe: true });

    const respuesta = await reservarDesdePedido(pedidoBase(), sistema.reservarOnline);

    const recordatorios = await recordatoriosDe(sistema, respuesta.turnoId);
    const waMe = recordatorios.filter((r) => r.canal === 'wa_me');
    expect(waMe).toHaveLength(1);
    expect(waMe[0]).toMatchObject({ estado: 'pendiente', programadoPara: local(DOMINGO, '09:00') });
    expect(waMe[0]?.enlaceWaMe?.startsWith('https://wa.me/5491100000004?text=')).toBe(true);
    expect(recordatorios.filter((r) => r.canal === 'email' && r.estado === 'pendiente')).toHaveLength(1);
  });

  test('Reserva rechazada no programa recordatorios ni deja paciente huérfano', async () => {
    const sistema = crearSistemaRecordatorios({
      turnos: [
        crearTurno({ id: 'tr-1', profesionalId: 'p1', sillonId: 's1', pacienteId: 'pa2' }),
        crearTurno({ id: 'tr-2', profesionalId: 'p2', sillonId: 's2', pacienteId: 'pa3' }),
      ],
    });

    const error = await rechazoPublico(reservarDesdePedido(pedidoBase(), sistema.reservarOnline));

    expect(error.codigo).toBe('HORARIO_NO_DISPONIBLE');
    await expect(sistema.pacientes.obtenerPorDni('00000004')).resolves.toBeUndefined();
    expect(sistema.repoRecordatorios.todos()).toEqual([]);
  });
});

describe('Falla al programar el recordatorio de la reserva', () => {
  const ERROR_REGISTRO = new Error('registro de recordatorios caído');

  function sistemaConRegistroCaido() {
    const repo = new RecordatorioRepositorioQueFalla();
    repo.fallarAlGuardar(ERROR_REGISTRO);
    return crearSistemaRecordatorios({ recordatorios: repo });
  }

  test('Falla al programar no deshace la reserva', async () => {
    const sistema = sistemaConRegistroCaido();

    const error = await reservarDesdePedido(pedidoBase(), sistema.reservarOnline).then(
      () => undefined,
      (e: unknown) => e,
    );

    expect(error).toBe(ERROR_REGISTRO);
    expect(error).not.toBeInstanceOf(ErrorReservaPublica);
    const paciente = await sistema.pacientes.obtenerPorDni('00000004');
    expect(paciente).toBeDefined();
    const turnos = sistema.turnos.todos();
    expect(turnos).toHaveLength(1);
    expect(turnos[0]).toMatchObject({
      estado: 'reservado',
      origen: 'online',
      inicio: local(LUNES, '09:00'),
      fin: local(LUNES, '09:45'),
      pacienteId: paciente?.id,
    });
  });

  test('Falla al programar no emite token', async () => {
    const sistema = sistemaConRegistroCaido();

    await expect(reservarDesdePedido(pedidoBase(), sistema.reservarOnline)).rejects.toBe(ERROR_REGISTRO);

    const turno = sistema.turnos.todos()[0];
    expect(turno).toBeDefined();
    await expect(sistema.tokens.obtenerPorTurno(turno?.id ?? '')).resolves.toBeUndefined();
    expect(sistema.tokens.todos()).toEqual([]);
  });
});
