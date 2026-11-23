import { describe, expect, test } from 'vitest';
import { reservarDesdePedido } from '../../src/adapters/http/pedido-reserva.js';
import { ErrorReservaPublica } from '../../src/application/errores-reserva-publica.js';
import { ReservarOnlinePublica } from '../../src/application/reservar-online-publica.js';
import { crearSistemaPublico } from '../fixtures/sistema-publico.js';
import { pedidoBase, rechazoPublico } from '../fixtures/sistema.js';

async function sistema() {
  const s = await crearSistemaPublico();
  const caso = new ReservarOnlinePublica({
    reservar: s.reservarOnline,
    prestaciones: s.repos.prestaciones,
    consultorios: s.repos.consultorios,
    reloj: s.reloj,
  });
  return { s, caso };
}

describe('ReservarOnlinePublica (RN-30)', () => {
  test('dentro del horizonte delega en la reserva online', async () => {
    const { s, caso } = await sistema();
    const r = await reservarDesdePedido(pedidoBase({ inicio: '2026-12-22T09:00:00-03:00' }), caso);
    expect(r.inicio).toEqual(new Date('2026-12-22T09:00:00-03:00'));
    expect(s.turnos.todos()).toHaveLength(2);
  });

  test('fuera del horizonte: HORARIO_NO_DISPONIBLE con nuevaOferta vacía, sin turno ni paciente', async () => {
    const { s, caso } = await sistema();
    const error = await rechazoPublico(reservarDesdePedido(pedidoBase({ inicio: '2026-12-23T09:00:00-03:00' }), caso));
    expect(error).toMatchObject({ codigo: 'HORARIO_NO_DISPONIBLE', nuevaOferta: [] });
    expect(s.turnos.todos()).toHaveLength(1);
    await expect(s.pacientes.obtenerPorDni('00000004')).resolves.toBeUndefined();
  });

  test('triangulación: un año adelante también se rechaza y el token no se emite', async () => {
    const { s, caso } = await sistema();
    const error = await rechazoPublico(reservarDesdePedido(pedidoBase({ inicio: '2027-11-22T09:00:00-03:00' }), caso));
    expect(error.codigo).toBe('HORARIO_NO_DISPONIBLE');
    expect(s.turnos.todos()).toHaveLength(1);
  });

  test('un horario pasado conserva el código de C-10: RESERVA_EN_PASADO', async () => {
    const { caso } = await sistema();
    const error = await rechazoPublico(reservarDesdePedido(pedidoBase({ inicio: '2026-11-21T09:00:00-03:00' }), caso));
    expect(error.codigo).toBe('RESERVA_EN_PASADO');
  });

  test('datos inválidos fuera del horizonte se informan como DATOS_INVALIDOS (orden de C-10)', async () => {
    const { caso } = await sistema();
    const error = await rechazoPublico(
      caso.ejecutar({
        prestacionId: 'pr2',
        inicio: new Date('2026-12-23T09:00:00-03:00'),
        paciente: { dni: '1', nombre: 'Paciente', apellido: 'Ficticio 4', telefono: '1100000004', consentimientoContacto: true },
      }),
    );
    expect(error).toBeInstanceOf(ErrorReservaPublica);
    expect(error).toMatchObject({ codigo: 'DATOS_INVALIDOS', campos: ['paciente.dni'] });
  });

  test('una prestación inexistente fuera del horizonte conserva PRESTACION_NO_DISPONIBLE', async () => {
    const { caso } = await sistema();
    const error = await rechazoPublico(
      reservarDesdePedido(pedidoBase({ prestacionId: 'xx', inicio: '2026-12-23T09:00:00-03:00' }), caso),
    );
    expect(error.codigo).toBe('PRESTACION_NO_DISPONIBLE');
  });
});
