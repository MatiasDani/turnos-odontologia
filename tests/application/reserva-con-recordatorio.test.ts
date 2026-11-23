import { describe, expect, test } from 'vitest';
import { reservarDesdePedido } from '../../src/adapters/http/pedido-reserva.js';
import { crearSistemaPublico } from '../fixtures/sistema-publico.js';
import { pedidoBase } from '../fixtures/sistema.js';

// Hallazgo de C-14: `ReservarOnline` guarda al paciente nuevo DESPUÉS del alta, así que programar el
// recordatorio dentro del alta (decorador de C-12) falla para un DNI nuevo. La composición lo programa
// al emitir el token, cuando el paciente ya existe.
describe('Reserva online con recordatorio (composición)', () => {
  test('un paciente nuevo con e-mail y consentimiento reserva y queda con un recordatorio pendiente', async () => {
    const s = await crearSistemaPublico();
    const r = await reservarDesdePedido(pedidoBase({ inicio: '2026-11-24T09:00:00-03:00' }), s.reservarOnline);
    const recordatorios = await s.repoRecordatorios.listarPorTurno(r.turnoId);
    expect(recordatorios).toHaveLength(1);
    expect(recordatorios[0]).toMatchObject({ canal: 'email', estado: 'pendiente' });
    await expect(s.servicioTokens.resolver(r.token)).resolves.toBe(r.turnoId);
  });

  test('un paciente nuevo sin e-mail reserva sin recordatorio', async () => {
    const s = await crearSistemaPublico();
    const r = await reservarDesdePedido(
      pedidoBase({ inicio: '2026-11-24T09:00:00-03:00' }, { email: undefined }),
      s.reservarOnline,
    );
    expect(await s.repoRecordatorios.listarPorTurno(r.turnoId)).toEqual([]);
  });
});
