import { describe, expect, test, vi } from 'vitest';
import { ErrorEnlacePublico } from '../../src/application/errores-enlace-publico.js';
import { ErrorGestionTurnoPublica } from '../../src/application/errores-gestion-turno-publica.js';
import { CAMPOS_REPROGRAMAR_DESDE_TOKEN } from '../../src/application/reprogramar-desde-token-input.js';
import { crearTurno, LUNES, MARTES, local } from '../fixtures/seed.js';
import { rechazo } from '../fixtures/sistema.js';
import { DOMINGO } from '../fixtures/sistema-recordatorios.js';
import {
  barrido,
  crearSistemaGestion,
  tokenDelBarrido,
  type SistemaGestion,
} from '../fixtures/sistema-gestion.js';
import { actores } from '../fixtures/actores.js';

const TURNO_ID = 't-base';

async function sistemaConToken(sistema = crearSistemaGestion()): Promise<{ sistema: SistemaGestion; token: string }> {
  return { sistema, token: await sistema.servicioTokens.emitir(TURNO_ID) };
}

function turnoAjeno() {
  return crearTurno({
    id: 't-ajeno',
    pacienteId: 'pa2',
    prestacionId: 'pr1',
    inicio: local(MARTES, '10:00'),
    fin: local(MARTES, '10:30'),
    duracionMinutos: 30,
  });
}

describe('Resolución previa del token', () => {
  test('Token nunca emitido', async () => {
    const sistema = crearSistemaGestion();
    const operaciones = [
      sistema.consultarDesdeToken.ejecutar({ token: 'token-inexistente' }),
      sistema.cancelarDesdeToken.ejecutar({ token: 'token-inexistente' }),
      sistema.reprogramarDesdeToken.ejecutar({ token: 'token-inexistente', inicio: local(MARTES, '10:00') }),
    ];
    for (const operacion of operaciones) {
      await expect(rechazo(operacion)).resolves.toBeInstanceOf(ErrorEnlacePublico);
    }
    await expect(sistema.turnos.obtenerPorId(TURNO_ID)).resolves.toMatchObject({ estado: 'confirmado' });
    await expect(sistema.tokens.obtenerPorTurno(TURNO_ID)).resolves.toBeUndefined();
  });

  test('Token rotado por un recordatorio', async () => {
    const { sistema, token: t1 } = await sistemaConToken();
    await barrido(sistema);
    const t2 = tokenDelBarrido(sistema);
    expect(t2).not.toBe(t1);
    sistema.reloj.fijar(local(DOMINGO, '08:00'));

    await expect(rechazo(sistema.consultarDesdeToken.ejecutar({ token: t1 }))).resolves.toBeInstanceOf(
      ErrorEnlacePublico,
    );
    await expect(sistema.consultarDesdeToken.ejecutar({ token: t2 })).resolves.toMatchObject({ turnoId: TURNO_ID });
  });

  test('Token vencido por el fin del turno', async () => {
    const { sistema, token } = await sistemaConToken();
    sistema.reloj.fijar(local(LUNES, '09:30'));
    await expect(rechazo(sistema.consultarDesdeToken.ejecutar({ token }))).resolves.toBeInstanceOf(ErrorEnlacePublico);

    sistema.reloj.fijar(local(LUNES, '09:29'));
    await expect(sistema.consultarDesdeToken.ejecutar({ token })).resolves.toMatchObject({ turnoId: TURNO_ID });
  });

  test('Token de un turno cancelado', async () => {
    const { sistema, token } = await sistemaConToken();
    await sistema.cancelarTurno.ejecutar({ turnoId: TURNO_ID, actor: actores.recepcion });
    await expect(rechazo(sistema.consultarDesdeToken.ejecutar({ token }))).resolves.toBeInstanceOf(ErrorEnlacePublico);
  });
});

describe('Consulta del propio turno', () => {
  test('Paciente consulta su turno online', async () => {
    const { sistema, token } = await sistemaConToken();
    const respuesta = await sistema.consultarDesdeToken.ejecutar({ token });
    expect(respuesta).toEqual({
      turnoId: TURNO_ID,
      inicio: local(LUNES, '09:00'),
      fin: local(LUNES, '09:30'),
      prestacion: { nombre: 'Consulta/control' },
      profesional: { nombre: 'Ana', apellido: 'Ejemplo' },
    });
    expect(Object.keys(respuesta).sort()).toEqual(['fin', 'inicio', 'prestacion', 'profesional', 'turnoId']);
  });

  test('Token del primer recordatorio de un turno interno', async () => {
    const sistema = crearSistemaGestion();
    await barrido(sistema);
    sistema.reloj.fijar(local(DOMINGO, '08:00'));
    await expect(sistema.consultarDesdeToken.ejecutar({ token: tokenDelBarrido(sistema) })).resolves.toEqual({
      turnoId: TURNO_ID,
      inicio: local(LUNES, '09:00'),
      fin: local(LUNES, '09:30'),
      prestacion: { nombre: 'Consulta/control' },
      profesional: { nombre: 'Ana', apellido: 'Ejemplo' },
    });
  });
});

describe('Cancelación con anticipación suficiente', () => {
  test('Paciente cancela con 25 horas de anticipación', async () => {
    const { sistema, token } = await sistemaConToken();
    const respuesta = await sistema.cancelarDesdeToken.ejecutar({ token });
    expect(respuesta.turnoId).toBe(TURNO_ID);
    expect(Object.keys(respuesta).sort()).toEqual(['fin', 'inicio', 'prestacion', 'profesional', 'turnoId']);
    await expect(sistema.turnos.obtenerPorId(TURNO_ID)).resolves.toMatchObject({
      estado: 'cancelado',
      canceladoPor: 'paciente',
    });
  });

  test('Umbral exacto de 24 horas', async () => {
    const { sistema, token } = await sistemaConToken(crearSistemaGestion({ ahora: local(DOMINGO, '09:00') }));
    await expect(sistema.cancelarDesdeToken.ejecutar({ token })).resolves.toMatchObject({ turnoId: TURNO_ID });
    await expect(sistema.turnos.obtenerPorId(TURNO_ID)).resolves.toMatchObject({ estado: 'cancelado' });
  });

  test('El horario queda libre al cancelar', async () => {
    const { sistema, token } = await sistemaConToken();
    await sistema.cancelarDesdeToken.ejecutar({ token });
    await expect(
      sistema.agendarTurno.ejecutar({
        actor: actores.recepcion,
        pacienteId: 'pa2',
        profesionalId: 'p1',
        sillonId: 's1',
        prestacionId: 'pr1',
        inicio: local(LUNES, '09:00'),
      }),
    ).resolves.toMatchObject({ profesionalId: 'p1', sillonId: 's1', inicio: local(LUNES, '09:00') });
  });

  test('El recordatorio pendiente se anula', async () => {
    const { sistema, token } = await sistemaConToken();
    await sistema.cancelarDesdeToken.ejecutar({ token });
    await expect(sistema.repoRecordatorios.listarPorTurno(TURNO_ID)).resolves.toMatchObject([
      { estado: 'cancelado' },
    ]);
  });
});

describe('Cancelación con menos de 24 horas', () => {
  test('23 horas y 59 minutos', async () => {
    const { sistema, token } = await sistemaConToken(crearSistemaGestion({ ahora: local(DOMINGO, '09:01') }));
    const error = await rechazo(sistema.cancelarDesdeToken.ejecutar({ token }));
    expect(error).toBeInstanceOf(ErrorGestionTurnoPublica);
    expect(error).toMatchObject({ codigo: 'CONTACTAR_CONSULTORIO' });
    await expect(sistema.turnos.obtenerPorId(TURNO_ID)).resolves.toMatchObject({ estado: 'confirmado' });
    await expect(sistema.repoRecordatorios.listarPorTurno(TURNO_ID)).resolves.toMatchObject([
      { estado: 'pendiente' },
    ]);
  });

  test('El mensaje no revela el código de dominio', async () => {
    const { sistema, token } = await sistemaConToken(crearSistemaGestion({ ahora: local(DOMINGO, '09:01') }));
    const error = (await rechazo(sistema.cancelarDesdeToken.ejecutar({ token }))) as Error;
    const serializado = JSON.stringify(error);
    expect(error.message).toContain('contactá al consultorio');
    expect(serializado).not.toMatch(/RN-08|t-base|pa1|s1|p1/);
  });
});

describe('Reprogramación con anticipación suficiente', () => {
  test('Paciente mueve su turno a un hueco libre', async () => {
    const { sistema, token } = await sistemaConToken();
    const respuesta = await sistema.reprogramarDesdeToken.ejecutar({ token, inicio: local(MARTES, '10:00') });
    expect(respuesta).toMatchObject({
      turnoId: TURNO_ID,
      inicio: local(MARTES, '10:00'),
      fin: local(MARTES, '10:30'),
      prestacion: { nombre: 'Consulta/control' },
      profesional: { nombre: 'Ana', apellido: 'Ejemplo' },
    });
    await expect(sistema.turnos.obtenerPorId(TURNO_ID)).resolves.toMatchObject({
      id: TURNO_ID,
      pacienteId: 'pa1',
      estado: 'confirmado',
      origen: 'recepcion',
      inicio: local(MARTES, '10:00'),
    });
  });

  test('Solapamiento rechazado sin mover el turno', async () => {
    const { sistema, token } = await sistemaConToken(crearSistemaGestion({ turnos: [crearTurno(), turnoAjeno()] }));
    const error = await rechazo(sistema.reprogramarDesdeToken.ejecutar({ token, inicio: local(MARTES, '10:00') }));
    expect(error).toBeInstanceOf(ErrorGestionTurnoPublica);
    expect(error).toMatchObject({ codigo: 'HORARIO_NO_DISPONIBLE' });
    await expect(sistema.turnos.obtenerPorId(TURNO_ID)).resolves.toMatchObject({
      inicio: local(LUNES, '09:00'),
      profesionalId: 'p1',
      sillonId: 's1',
    });
  });

  test('El recordatorio se mueve con el turno', async () => {
    const { sistema, token } = await sistemaConToken();
    await sistema.reprogramarDesdeToken.ejecutar({ token, inicio: local(MARTES, '10:00') });
    await expect(sistema.repoRecordatorios.listarPorTurno(TURNO_ID)).resolves.toMatchObject([
      { estado: 'pendiente', programadoPara: local(LUNES, '10:00') },
    ]);
  });

  test('Reprogramar no rota el token y usa el nuevo fin', async () => {
    const { sistema, token } = await sistemaConToken();
    const antes = await sistema.tokens.obtenerPorTurno(TURNO_ID);
    await sistema.reprogramarDesdeToken.ejecutar({ token, inicio: local(LUNES, '10:00') });
    const despues = await sistema.tokens.obtenerPorTurno(TURNO_ID);
    expect(despues?.hash).toBe(antes?.hash);

    sistema.reloj.fijar(local(LUNES, '09:45'));
    await expect(sistema.consultarDesdeToken.ejecutar({ token })).resolves.toMatchObject({
      inicio: local(LUNES, '10:00'),
      fin: local(LUNES, '10:30'),
    });
  });
});

describe('Reprogramación con menos de 24 horas', () => {
  test('23 horas y 59 minutos con un horario libre', async () => {
    const { sistema, token } = await sistemaConToken(crearSistemaGestion({ ahora: local(DOMINGO, '09:01') }));
    const error = await rechazo(sistema.reprogramarDesdeToken.ejecutar({ token, inicio: local(MARTES, '10:00') }));
    expect(error).toMatchObject({ codigo: 'CONTACTAR_CONSULTORIO' });
    await expect(sistema.turnos.obtenerPorId(TURNO_ID)).resolves.toMatchObject({
      inicio: local(LUNES, '09:00'),
      fin: local(LUNES, '09:30'),
    });
    await expect(sistema.repoRecordatorios.listarPorTurno(TURNO_ID)).resolves.toMatchObject([
      { estado: 'pendiente', programadoPara: local(DOMINGO, '09:00') },
    ]);
  });
});

describe('Errores públicos sin filtrado de datos', () => {
  test('Rechazo por solapamiento sin datos ajenos', async () => {
    const { sistema, token } = await sistemaConToken(crearSistemaGestion({ turnos: [crearTurno(), turnoAjeno()] }));
    const error = (await rechazo(
      sistema.reprogramarDesdeToken.ejecutar({ token, inicio: local(MARTES, '10:00') }),
    )) as Error;
    const serializado = JSON.stringify(error);
    expect(serializado).not.toMatch(/t-ajeno|pa2|s1|p1|RN-02|turnoEnConflicto/);
  });

  test('Rechazo por token inválido sin motivo', async () => {
    const sistema = crearSistemaGestion();
    const error = (await rechazo(sistema.consultarDesdeToken.ejecutar({ token: 'token-inexistente' }))) as Error;
    expect(error).toMatchObject({ codigo: 'ENLACE_INVALIDO' });
    expect(error.message).toBe('El enlace no es válido o ya no está vigente.');
    expect(JSON.stringify(error)).not.toMatch(/cancelad|vencid|rotad|t-base/);
  });
});

describe('Orden de evaluación de los rechazos', () => {
  function sistemaCortoYOcupado(): SistemaGestion {
    return crearSistemaGestion({
      ahora: local(DOMINGO, '09:01'),
      turnos: [crearTurno(), turnoAjeno()],
    });
  }

  test('Token inválido prevalece sobre la anticipación', async () => {
    const sistema = sistemaCortoYOcupado();
    const error = await rechazo(
      sistema.reprogramarDesdeToken.ejecutar({ token: 'token-inexistente', inicio: local(MARTES, '10:00') }),
    );
    expect(error).toBeInstanceOf(ErrorEnlacePublico);
  });

  test('Anticipación prevalece sobre el solapamiento', async () => {
    const { sistema, token } = await sistemaConToken(sistemaCortoYOcupado());
    const error = await rechazo(sistema.reprogramarDesdeToken.ejecutar({ token, inicio: local(MARTES, '10:00') }));
    expect(error).toMatchObject({ codigo: 'CONTACTAR_CONSULTORIO' });
  });
});

describe('Entrada pública sin campos de privilegio', () => {
  test('Un `inicio` inválido se rechaza en la frontera', async () => {
    const { sistema, token } = await sistemaConToken();
    const delegado = vi.spyOn(sistema.reprogramarTurno, 'ejecutar');
    try {
      const error = await rechazo(sistema.reprogramarDesdeToken.ejecutar({ token, inicio: new Date('no-es-fecha') }));
      expect(error).toMatchObject({ codigo: 'DATOS_INVALIDOS' });
      expect(delegado).not.toHaveBeenCalled();
    } finally {
      delegado.mockRestore();
    }
  });

  test('Sin campos para forzar ni elegir sillón', () => {
    expect(CAMPOS_REPROGRAMAR_DESDE_TOKEN).toEqual(['token', 'inicio', 'profesionalId', 'prestacionId']);
    expect(CAMPOS_REPROGRAMAR_DESDE_TOKEN).not.toContain('forzar');
    expect(CAMPOS_REPROGRAMAR_DESDE_TOKEN).not.toContain('sillonId');
  });
});
