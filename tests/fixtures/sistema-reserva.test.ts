import { describe, expect, test } from 'vitest';
import { crearSistemaReserva, pedidoBase, TurnoRepositorioDePrueba } from './sistema.js';
import { AHORA_POR_DEFECTO } from './sistema.js';
import { crearTurno, LUNES, local } from './seed.js';

describe('crearSistemaReserva', () => {
  test('por defecto: reloj en AHORA_POR_DEFECTO, seed de pacientes y agenda vacía', async () => {
    const s = crearSistemaReserva();
    expect(s.reloj.ahora()).toEqual(AHORA_POR_DEFECTO);
    await expect(s.pacientes.obtenerPorDni('00000001')).resolves.toMatchObject({ id: 'pa1' });
    expect(s.turnos.todos()).toEqual([]);
  });

  test('ahora y los overrides del entorno se aplican', async () => {
    const ahora = local(LUNES, '10:07');
    const turno = crearTurno({ id: 'tr-1' });
    const s = crearSistemaReserva({ ahora, turnos: [turno], pacientes: [] });
    expect(s.reloj.ahora()).toEqual(ahora);
    expect(s.turnos.todos()).toEqual([turno]);
    await expect(s.pacientes.obtenerPorDni('00000001')).resolves.toBeUndefined();
  });

  test('la consulta real ve los turnos del entorno y el servicio de tokens emite sobre ellos', async () => {
    const s = crearSistemaReserva({ turnos: [crearTurno({ id: 'tr-1' })] });
    const token = await s.servicioTokens.emitir('tr-1');
    await expect(s.servicioTokens.resolver(token)).resolves.toBe('tr-1');
    expect(s.tokens.todos()).toHaveLength(1);
  });
});

describe('pedidoBase', () => {
  test('es el pedido base del spec, como unknown', () => {
    expect(pedidoBase()).toEqual({
      prestacionId: 'pr2',
      inicio: '2026-11-23T09:00:00-03:00',
      paciente: {
        dni: '00000004',
        nombre: 'Paciente',
        apellido: 'Ficticio 4',
        telefono: '+54 9 11 0000-0004',
        email: 'paciente4@ejemplo.test',
        consentimientoContacto: true,
      },
    });
  });

  test('los cambios de primer nivel y del paciente se mezclan sin mutar el base', () => {
    const p = pedidoBase({ profesionalId: 'p2' }, { dni: '1' }) as { profesionalId: string; paciente: { dni: string } };
    expect(p.profesionalId).toBe('p2');
    expect(p.paciente.dni).toBe('1');
    expect((pedidoBase() as { paciente: { dni: string } }).paciente.dni).toBe('00000004');
  });

  test('un valor undefined quita la clave', () => {
    const p = pedidoBase({ prestacionId: undefined }, { email: undefined }) as Record<string, unknown>;
    expect('prestacionId' in p).toBe(false);
    expect('email' in (p['paciente'] as object)).toBe(false);
  });
});

describe('TurnoRepositorioDePrueba', () => {
  test('cambiarEstado cambia el estado del turno', async () => {
    const repo = new TurnoRepositorioDePrueba([crearTurno({ id: 'tr-1' })]);
    repo.cambiarEstado('tr-1', 'cancelado');
    await expect(repo.obtenerPorId('tr-1')).resolves.toMatchObject({ estado: 'cancelado' });
  });

  test('antesDeAgregar corre antes de cada alta con el número de intento y puede ocupar la agenda', async () => {
    const repo = new TurnoRepositorioDePrueba();
    const intentos: number[] = [];
    repo.antesDeAgregar = (_candidato, intento) => {
      intentos.push(intento);
      repo.insertar(crearTurno({ id: `tr-${intento}`, profesionalId: 'p9', sillonId: 's9' }));
    };
    await repo.agregarSiDisponible(crearTurno({ id: 'n1', profesionalId: 'p1', sillonId: 's1' }), () => null);
    await repo.agregarSiDisponible(crearTurno({ id: 'n2', profesionalId: 'p2', sillonId: 's2' }), () => null);
    expect(intentos).toEqual([1, 2]);
    expect(repo.intentosDeAlta).toBe(2);
    expect(repo.todos().map((t) => t.id)).toEqual(['tr-1', 'n1', 'tr-2', 'n2']);
  });

  test('el turno insertado por el gancho es visible para la validación del alta', async () => {
    const repo = new TurnoRepositorioDePrueba();
    repo.antesDeAgregar = () => repo.insertar(crearTurno({ id: 'tr-1' }));
    let vistos: readonly string[] = [];
    await repo.agregarSiDisponible(crearTurno({ id: 'n1' }), (ts) => {
      vistos = ts.map((t) => t.id);
      return null;
    });
    expect(vistos).toEqual(['tr-1']);
  });
});
