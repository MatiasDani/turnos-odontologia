import { describe, expect, test } from 'vitest';
import { reservarDesdePedido } from '../../src/adapters/http/pedido-reserva.js';
import { crearSistemaPublico } from '../fixtures/sistema-publico.js';
import { pedidoBase } from '../fixtures/sistema.js';

// Hallazgo de C-14: `ReservarOnline` guarda al paciente nuevo DESPUÉS del alta, así que programar el
// recordatorio dentro del alta (decorador de C-12) falla para un DNI nuevo. Desde DD-32, `ReservarOnline`
// recibe el puerto `recordatorios` y lo programa con el paciente ya guardado y antes de emitir el token.
describe('Reserva online con recordatorio (composición)', () => {
  test('un paciente nuevo con e-mail y consentimiento reserva y queda con un recordatorio pendiente', async () => {
    const s = await crearSistemaPublico();
    const r = await reservarDesdePedido(pedidoBase({ inicio: '2026-11-24T09:00:00-03:00' }), s.reservarOnline);
    const recordatorios = await s.repoRecordatorios.listarPorTurno(r.turnoId);
    const email = recordatorios.filter((x) => x.canal === 'email');
    expect(email).toHaveLength(1);
    expect(email[0]).toMatchObject({ canal: 'email', estado: 'pendiente' });
    // Desde C-15 la composición cablea el canal wa.me de C-13 (spec recordatorio-wa-me).
    expect(recordatorios.filter((x) => x.canal === 'wa_me')).toHaveLength(1);
    await expect(s.servicioTokens.resolver(r.token)).resolves.toBe(r.turnoId);
  });

  test('un paciente nuevo sin e-mail reserva sin recordatorio por e-mail', async () => {
    const s = await crearSistemaPublico();
    const r = await reservarDesdePedido(
      pedidoBase({ inicio: '2026-11-24T09:00:00-03:00' }, { email: undefined }),
      s.reservarOnline,
    );
    const recordatorios = await s.repoRecordatorios.listarPorTurno(r.turnoId);
    expect(recordatorios.filter((x) => x.canal === 'email')).toEqual([]);
    expect(recordatorios.map((x) => x.canal)).toEqual(['wa_me']);
  });
});
