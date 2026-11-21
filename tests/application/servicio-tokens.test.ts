import { describe, expect, test } from 'vitest';
import { HasherSha256 } from '../../src/adapters/crypto/hasher-sha256.js';
import { TokenGestionRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/token-gestion-repositorio.js';
import { ServicioTokens, TokenYaEmitidoError } from '../../src/application/servicio-tokens.js';
import type { GeneradorToken } from '../../src/application/puertos/generador-token.js';
import { RecursoNoEncontradoError } from '../../src/domain/errores.js';
import { crearTurno, LUNES, local } from '../fixtures/seed.js';
import { RelojFijo } from '../fixtures/reloj-fijo.js';
import { TurnoRepositorioDePrueba } from '../fixtures/turno-repositorio-de-prueba.js';

/** Genera tokens ficticios deterministas: token-ficticio-1, token-ficticio-2, ... */
class GeneradorTokenSecuencial implements GeneradorToken {
  private contador = 0;
  generar(): string {
    this.contador += 1;
    return `token-ficticio-${this.contador}`;
  }
}

function crearServicio(turnos = [crearTurno({ id: 't-1' })], ahora = local(LUNES, '08:00')) {
  const repoTurnos = new TurnoRepositorioDePrueba(turnos);
  const repoTokens = new TokenGestionRepositorioEnMemoria();
  const reloj = new RelojFijo(ahora);
  const hasher = new HasherSha256();
  const servicio = new ServicioTokens({
    generador: new GeneradorTokenSecuencial(),
    hasher,
    tokens: repoTokens,
    turnos: repoTurnos,
    reloj,
  });
  return { servicio, repoTurnos, repoTokens, reloj, hasher };
}

describe('ServicioTokens.emitir', () => {
  test('guarda solo {turnoId, hash, creadoEn} y devuelve el token en claro', async () => {
    const { servicio, repoTokens, hasher } = crearServicio();
    const token = await servicio.emitir('t-1');
    expect(token).toBe('token-ficticio-1');
    expect(repoTokens.todos()).toEqual([
      { turnoId: 't-1', hash: hasher.sha256('token-ficticio-1'), creadoEn: local(LUNES, '08:00') },
    ]);
    expect(JSON.stringify(repoTokens.todos())).not.toContain('token-ficticio-1');
  });

  test('creadoEn toma la hora del reloj en el momento de emitir', async () => {
    const { servicio, repoTokens, reloj } = crearServicio();
    reloj.fijar(local(LUNES, '08:15'));
    await servicio.emitir('t-1');
    expect(repoTokens.todos()[0]?.creadoEn).toEqual(local(LUNES, '08:15'));
  });

  test('turnos distintos reciben tokens distintos', async () => {
    const { servicio } = crearServicio([
      crearTurno({ id: 't-1' }),
      crearTurno({ id: 't-2', profesionalId: 'p2', sillonId: 's2' }),
    ]);
    const a = await servicio.emitir('t-1');
    const b = await servicio.emitir('t-2');
    expect(a).not.toBe(b);
  });

  test('un turno inexistente se rechaza y no guarda nada', async () => {
    const { servicio, repoTokens } = crearServicio();
    await expect(servicio.emitir('t-9')).rejects.toBeInstanceOf(RecursoNoEncontradoError);
    expect(repoTokens.todos()).toEqual([]);
  });

  test('un segundo emitir con token vigente se rechaza con TokenYaEmitidoError y no guarda otro', async () => {
    const { servicio, repoTokens } = crearServicio();
    await servicio.emitir('t-1');
    const error = await servicio.emitir('t-1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TokenYaEmitidoError);
    expect((error as Error).message).not.toContain('token-ficticio');
    expect(repoTokens.todos()).toHaveLength(1);
  });
});

const TURNO_09_A_0945 = crearTurno({
  id: 't-1',
  inicio: local(LUNES, '09:00'),
  fin: local(LUNES, '09:45'),
  duracionMinutos: 45,
});

describe('ServicioTokens.resolver', () => {
  test('el token propio resuelve al turnoId de su turno', async () => {
    const { servicio } = crearServicio([
      TURNO_09_A_0945,
      crearTurno({ id: 't-2', profesionalId: 'p2', sillonId: 's2' }),
    ]);
    const token1 = await servicio.emitir('t-1');
    const token2 = await servicio.emitir('t-2');
    await expect(servicio.resolver(token1)).resolves.toBe('t-1');
    await expect(servicio.resolver(token2)).resolves.toBe('t-2');
  });

  test('un token inventado no resuelve', async () => {
    const { servicio } = crearServicio();
    await servicio.emitir('t-1');
    await expect(servicio.resolver('x'.repeat(43))).resolves.toBeUndefined();
  });

  test('una cadena vacía no resuelve', async () => {
    const { servicio } = crearServicio();
    await servicio.emitir('t-1');
    await expect(servicio.resolver('')).resolves.toBeUndefined();
  });

  test('el token con un carácter cambiado no resuelve', async () => {
    const { servicio } = crearServicio();
    const token = await servicio.emitir('t-1');
    const alterado = `${token.slice(0, -1)}${token.endsWith('X') ? 'Y' : 'X'}`;
    await expect(servicio.resolver(alterado)).resolves.toBeUndefined();
    await expect(servicio.resolver(token)).resolves.toBe('t-1');
  });

  test('con ahora 09:44 resuelve y con ahora 09:45 (fin exclusivo) no', async () => {
    const { servicio, reloj } = crearServicio([TURNO_09_A_0945], local(LUNES, '08:00'));
    const token = await servicio.emitir('t-1');
    reloj.fijar(local(LUNES, '09:44'));
    await expect(servicio.resolver(token)).resolves.toBe('t-1');
    reloj.fijar(local(LUNES, '09:45'));
    await expect(servicio.resolver(token)).resolves.toBeUndefined();
    reloj.fijar(local(LUNES, '11:00'));
    await expect(servicio.resolver(token)).resolves.toBeUndefined();
  });

  test('un turno cancelado después de emitir el token no resuelve', async () => {
    const { servicio, repoTurnos } = crearServicio([TURNO_09_A_0945]);
    const token = await servicio.emitir('t-1');
    await expect(servicio.resolver(token)).resolves.toBe('t-1');
    repoTurnos.cambiarEstado('t-1', 'cancelado');
    await expect(servicio.resolver(token)).resolves.toBeUndefined();
  });

  test('un token invalidado no resuelve', async () => {
    const { servicio, repoTokens } = crearServicio([TURNO_09_A_0945]);
    const token = await servicio.emitir('t-1');
    await repoTokens.invalidar('t-1', local(LUNES, '08:30'));
    await expect(servicio.resolver(token)).resolves.toBeUndefined();
  });
});

describe('ServicioTokens.rotar', () => {
  test('el token nuevo resuelve, el anterior no y son distintos', async () => {
    const { servicio } = crearServicio([TURNO_09_A_0945]);
    const t1 = await servicio.emitir('t-1');
    const t2 = await servicio.rotar('t-1');
    expect(t2).not.toBe(t1);
    await expect(servicio.resolver(t2)).resolves.toBe('t-1');
    await expect(servicio.resolver(t1)).resolves.toBeUndefined();
  });

  test('rotar un turno sin token previo emite uno que resuelve', async () => {
    const { servicio } = crearServicio([TURNO_09_A_0945]);
    const token = await servicio.rotar('t-1');
    await expect(servicio.resolver(token)).resolves.toBe('t-1');
  });

  test('rotar dos veces deja solo el último vigente', async () => {
    const { servicio, repoTokens } = crearServicio([TURNO_09_A_0945]);
    const t1 = await servicio.emitir('t-1');
    const t2 = await servicio.rotar('t-1');
    const t3 = await servicio.rotar('t-1');
    await expect(servicio.resolver(t1)).resolves.toBeUndefined();
    await expect(servicio.resolver(t2)).resolves.toBeUndefined();
    await expect(servicio.resolver(t3)).resolves.toBe('t-1');
    expect(repoTokens.todos().filter((r) => r.invalidadoEn === undefined)).toHaveLength(1);
  });

  test('el token anterior queda invalidado a la hora del reloj y se conservan solo hashes', async () => {
    const { servicio, repoTokens, reloj, hasher } = crearServicio([TURNO_09_A_0945]);
    const t1 = await servicio.emitir('t-1');
    reloj.fijar(local(LUNES, '08:30'));
    const t2 = await servicio.rotar('t-1');
    expect(repoTokens.todos()).toEqual([
      {
        turnoId: 't-1',
        hash: hasher.sha256(t1),
        creadoEn: local(LUNES, '08:00'),
        invalidadoEn: local(LUNES, '08:30'),
      },
      { turnoId: 't-1', hash: hasher.sha256(t2), creadoEn: local(LUNES, '08:30') },
    ]);
  });

  test('rotar el token de un turno ajeno no toca el vigente de otro turno', async () => {
    const { servicio } = crearServicio([
      TURNO_09_A_0945,
      crearTurno({ id: 't-2', profesionalId: 'p2', sillonId: 's2' }),
    ]);
    const token1 = await servicio.emitir('t-1');
    await servicio.rotar('t-2');
    await expect(servicio.resolver(token1)).resolves.toBe('t-1');
  });

  test('rotar un turno inexistente se rechaza', async () => {
    const { servicio } = crearServicio();
    await expect(servicio.rotar('t-9')).rejects.toBeInstanceOf(RecursoNoEncontradoError);
  });
});
