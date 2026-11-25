import { describe, expect, test } from 'vitest';
import { type ErrorEnlacePublico, MENSAJE_ENLACE_INVALIDO } from '../../src/application/errores-enlace-publico.js';
import { ReglaNegocioError } from '../../src/domain/errores.js';
import { RecordatorioRepositorioQueFalla } from '../fixtures/recordatorio-repositorio-que-falla.js';
import { LUNES, local } from '../fixtures/seed.js';
import {
  agendarRecepcion,
  BASE_URL,
  barrido,
  crearSistemaRecordatorios,
  DOMINGO,
  EMAIL_PA1,
  rechazoEnlace,
  recordatoriosDe,
  reservarOnlinePa1,
  tokenDelMensaje,
} from '../fixtures/sistema-recordatorios.js';
import { actores } from '../fixtures/actores.js';

const SABADO_ANTERIOR = '2026-11-21';
const MARTES = '2026-11-24';

describe('Programación del recordatorio al dar de alta un turno', () => {
  test('Alta de recepción programa el recordatorio', async () => {
    const sistema = crearSistemaRecordatorios();
    const turno = await agendarRecepcion(sistema);
    const recordatorios = await recordatoriosDe(sistema, turno.id);
    expect(recordatorios).toHaveLength(1);
    expect(recordatorios[0]).toMatchObject({
      turnoId: turno.id,
      canal: 'email',
      estado: 'pendiente',
      programadoPara: local(DOMINGO, '09:00'),
    });
  });

  test('Reserva online programa el recordatorio', async () => {
    const sistema = crearSistemaRecordatorios();
    const reserva = await reservarOnlinePa1(sistema, '10:00');
    const recordatorios = await recordatoriosDe(sistema, reserva.turnoId);
    expect(recordatorios).toHaveLength(1);
    expect(recordatorios[0]).toMatchObject({
      canal: 'email',
      estado: 'pendiente',
      programadoPara: local(DOMINGO, '10:00'),
    });
  });

  test('Anticipación configurada', async () => {
    const sistema = crearSistemaRecordatorios({ horasAntes: 48 });
    const turno = await agendarRecepcion(sistema);
    const [recordatorio] = await recordatoriosDe(sistema, turno.id);
    expect(recordatorio).toMatchObject({ estado: 'pendiente', programadoPara: local(SABADO_ANTERIOR, '09:00') });
  });

  test('Alta rechazada no programa recordatorio', async () => {
    const sistema = crearSistemaRecordatorios();
    await agendarRecepcion(sistema);
    const rechazo = agendarRecepcion(sistema, { hora: '09:15' });
    await expect(rechazo).rejects.toBeInstanceOf(ReglaNegocioError);
    await expect(rechazo).rejects.toMatchObject({ codigo: 'RN-02' });
    expect(sistema.repoRecordatorios.todos()).toHaveLength(1);
  });
});

describe('Falla al programar no deshace el alta', () => {
  test('Falla al programar con el turno ya creado', async () => {
    const repo = new RecordatorioRepositorioQueFalla();
    repo.fallarAlGuardar(new Error('registro de recordatorios caído'));
    const sistema = crearSistemaRecordatorios({ recordatorios: repo });
    await expect(agendarRecepcion(sistema)).rejects.toThrow('registro de recordatorios caído');
    const creados = sistema.turnos.todos();
    expect(creados).toHaveLength(1);
    expect(creados[0]).toMatchObject({ estado: 'confirmado', inicio: local(LUNES, '09:00') });
  });
});

describe('Programación idempotente', () => {
  test('Programar dos veces no duplica', async () => {
    const sistema = crearSistemaRecordatorios();
    const turno = await agendarRecepcion(sistema);
    await sistema.recordatorios.programar(turno.id);
    const recordatorios = await recordatoriosDe(sistema, turno.id);
    expect(recordatorios).toHaveLength(1);
    expect(recordatorios[0]).toMatchObject({ estado: 'pendiente', programadoPara: local(DOMINGO, '09:00') });
  });

  test('Turno movido reprograma el recordatorio', async () => {
    const sistema = crearSistemaRecordatorios();
    const turno = await agendarRecepcion(sistema);
    sistema.turnos.moverTurno(turno.id, local(MARTES, '10:00'));
    await sistema.recordatorios.programar(turno.id);
    const pendientes = (await recordatoriosDe(sistema, turno.id)).filter((r) => r.estado === 'pendiente');
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0]?.programadoPara).toEqual(local(LUNES, '10:00'));
    expect(await recordatoriosDe(sistema, turno.id)).toHaveLength(1);
  });

  test('Programar un turno con recordatorio ya enviado', async () => {
    const sistema = crearSistemaRecordatorios();
    const turno = await agendarRecepcion(sistema);
    const [original] = await recordatoriosDe(sistema, turno.id);
    if (original === undefined) throw new Error('falta el recordatorio original');
    const enviado = { ...original, estado: 'enviado' as const, enviadoEn: local(DOMINGO, '09:00') };
    await sistema.repoRecordatorios.guardar(enviado);
    await sistema.recordatorios.programar(turno.id);
    const recordatorios = await recordatoriosDe(sistema, turno.id);
    expect(recordatorios).toHaveLength(2);
    expect(recordatorios.find((r) => r.id === original.id)).toEqual(enviado);
    expect(recordatorios.find((r) => r.id !== original.id)).toMatchObject({
      estado: 'pendiente',
      programadoPara: local(DOMINGO, '09:00'),
    });
  });
});

describe('Sin consentimiento o sin e-mail no hay recordatorio', () => {
  test('Paciente sin consentimiento de contacto', async () => {
    const sistema = crearSistemaRecordatorios();
    const turno = await agendarRecepcion(sistema, { pacienteId: 'pa3', hora: '10:00' });
    expect(turno.estado).toBe('confirmado');
    await expect(recordatoriosDe(sistema, turno.id)).resolves.toEqual([]);
  });

  test('Paciente sin e-mail', async () => {
    const sistema = crearSistemaRecordatorios();
    const turno = await agendarRecepcion(sistema, { pacienteId: 'pa2', hora: '10:00' });
    expect(turno.estado).toBe('confirmado');
    await expect(recordatoriosDe(sistema, turno.id)).resolves.toEqual([]);
  });
});

describe('La cancelación anula el recordatorio pendiente', () => {
  test('Cancelar el turno anula el pendiente', async () => {
    const sistema = crearSistemaRecordatorios();
    const turno = await agendarRecepcion(sistema);
    await sistema.cancelarTurno.ejecutar({ turnoId: turno.id, actor: actores.recepcion });
    const recordatorios = await recordatoriosDe(sistema, turno.id);
    expect(recordatorios.map((r) => r.estado)).toEqual(['cancelado']);
    await barrido(sistema, DOMINGO, '09:00');
    expect(sistema.notificador.enviados).toEqual([]);
  });

  test('Cancelar no cambia un recordatorio ya enviado', async () => {
    const sistema = crearSistemaRecordatorios();
    const turno = await agendarRecepcion(sistema);
    const [original] = await recordatoriosDe(sistema, turno.id);
    if (original === undefined) throw new Error('falta el recordatorio original');
    const enviado = { ...original, estado: 'enviado' as const, enviadoEn: local(DOMINGO, '09:00') };
    await sistema.repoRecordatorios.guardar(enviado);
    await sistema.cancelarTurno.ejecutar({ turnoId: turno.id, actor: actores.recepcion });
    await expect(recordatoriosDe(sistema, turno.id)).resolves.toEqual([enviado]);
  });
});

describe('Envío de los recordatorios vencidos', () => {
  test('Antes de la hora programada no se envía', async () => {
    const sistema = crearSistemaRecordatorios();
    const turno = await agendarRecepcion(sistema);
    await barrido(sistema, DOMINGO, '08:59');
    expect(sistema.notificador.enviados).toEqual([]);
    expect((await recordatoriosDe(sistema, turno.id)).map((r) => r.estado)).toEqual(['pendiente']);
  });

  test('En la hora programada se envía', async () => {
    const sistema = crearSistemaRecordatorios();
    const turno = await agendarRecepcion(sistema);
    await barrido(sistema, DOMINGO, '09:00');
    expect(sistema.notificador.enviados.map((m) => m.para)).toEqual([EMAIL_PA1]);
    const [recordatorio] = await recordatoriosDe(sistema, turno.id);
    expect(recordatorio).toMatchObject({ estado: 'enviado', enviadoEn: local(DOMINGO, '09:00') });
  });

  test('Turno con menos anticipación sale en el primer barrido', async () => {
    const sistema = crearSistemaRecordatorios({ ahora: local(DOMINGO, '10:00') });
    const turno = await agendarRecepcion(sistema, { hora: '09:30' });
    await barrido(sistema, DOMINGO, '10:00');
    expect(sistema.notificador.enviados).toHaveLength(1);
    expect((await recordatoriosDe(sistema, turno.id)).map((r) => r.estado)).toEqual(['enviado']);
  });

  test('Un recordatorio enviado no se reenvía', async () => {
    const sistema = crearSistemaRecordatorios();
    await agendarRecepcion(sistema);
    await barrido(sistema, DOMINGO, '09:00');
    await barrido(sistema, DOMINGO, '12:00');
    expect(sistema.notificador.enviados).toHaveLength(1);
  });
});

describe('El barrido revalida el turno antes de enviar', () => {
  test('Pendiente de un turno cancelado sin anular', async () => {
    const sistema = crearSistemaRecordatorios({ fallarAnulacion: true });
    const turno = await agendarRecepcion(sistema);
    await expect(
      sistema.cancelarTurno.ejecutar({ turnoId: turno.id, actor: actores.recepcion }),
    ).rejects.toThrow('anulación de recordatorios caída');
    expect((await recordatoriosDe(sistema, turno.id)).map((r) => r.estado)).toEqual(['pendiente']);
    await barrido(sistema, DOMINGO, '09:00');
    expect(sistema.notificador.enviados).toEqual([]);
    expect((await recordatoriosDe(sistema, turno.id)).map((r) => r.estado)).toEqual(['cancelado']);
  });

  test('Turno ya iniciado', async () => {
    const sistema = crearSistemaRecordatorios();
    const turno = await agendarRecepcion(sistema);
    await barrido(sistema, LUNES, '09:00');
    expect(sistema.notificador.enviados).toEqual([]);
    expect((await recordatoriosDe(sistema, turno.id)).map((r) => r.estado)).toEqual(['cancelado']);
  });
});

describe('Cada envío rota el token de gestión', () => {
  test('El token de la reserva deja de valer al enviar', async () => {
    const sistema = crearSistemaRecordatorios();
    const reserva = await reservarOnlinePa1(sistema, '10:00');
    const t1 = reserva.token;
    await expect(sistema.servicioTokens.resolver(t1)).resolves.toBe(reserva.turnoId);
    await barrido(sistema, DOMINGO, '10:00');
    const [mensaje] = sistema.notificador.enviados;
    if (mensaje === undefined) throw new Error('no se envió el recordatorio');
    const t2 = tokenDelMensaje(mensaje.texto);
    expect(t2).not.toBe(t1);
    await expect(sistema.servicioTokens.resolver(t1)).resolves.toBeUndefined();
    await expect(sistema.servicioTokens.resolver(t2)).resolves.toBe(reserva.turnoId);
  });

  test('Turno interno recibe token en el primer envío', async () => {
    const sistema = crearSistemaRecordatorios();
    const turno = await agendarRecepcion(sistema);
    await barrido(sistema, DOMINGO, '09:00');
    const [mensaje] = sistema.notificador.enviados;
    if (mensaje === undefined) throw new Error('no se envió el recordatorio');
    await expect(sistema.servicioTokens.resolver(tokenDelMensaje(mensaje.texto))).resolves.toBe(turno.id);
  });
});

/** Envía el recordatorio del turno base y devuelve el único mensaje. */
async function enviarTurnoBase(): Promise<{ sistema: ReturnType<typeof crearSistemaRecordatorios>; turnoId: string; texto: string; asunto: string; para: string }> {
  const sistema = crearSistemaRecordatorios();
  const turno = await agendarRecepcion(sistema);
  await barrido(sistema, DOMINGO, '09:00');
  const [mensaje] = sistema.notificador.enviados;
  if (mensaje === undefined) throw new Error('no se envió el recordatorio');
  return { sistema, turnoId: turno.id, ...mensaje };
}

describe('Contenido mínimo del mensaje', () => {
  test('Mensaje con los datos del turno', async () => {
    const { para, texto, asunto } = await enviarTurnoBase();
    expect(para).toBe(EMAIL_PA1);
    for (const dato of ['lunes 23/11/2026 09:00', 'Consulta/control', 'Ana Ejemplo', 'Consultorio Odontológico Demo']) {
      expect(texto).toContain(dato);
    }
    expect(asunto).toContain('Consultorio Odontológico Demo');
    expect(texto).toMatch(/http:\/\/localhost:3000\/public\/turnos\/\S+/);
  });

  test('Mensaje sin datos sensibles', async () => {
    const { texto, asunto } = await enviarTurnoBase();
    for (const prohibido of ['00000001', '+54 9 11 0000-0001', '5491100000001', 'Sillón', 'Diego', 'Eva']) {
      expect(texto).not.toContain(prohibido);
      expect(asunto).not.toContain(prohibido);
    }
  });
});

describe('Enlace de confirmación según el estado del turno', () => {
  test('Turno reservado con enlace de confirmación', async () => {
    const sistema = crearSistemaRecordatorios();
    await reservarOnlinePa1(sistema, '10:00');
    await barrido(sistema, DOMINGO, '10:00');
    const [mensaje] = sistema.notificador.enviados;
    if (mensaje === undefined) throw new Error('no se envió el recordatorio');
    const token = tokenDelMensaje(mensaje.texto);
    expect(mensaje.texto).toContain(`${BASE_URL}/public/turnos/${token}/confirmar`);
    expect(mensaje.texto).toMatch(new RegExp(`/public/turnos/${token}$`, 'm'));
  });

  test('Turno confirmado sin enlace de confirmación', async () => {
    const { texto } = await enviarTurnoBase();
    expect(texto).not.toContain('/confirmar');
    expect(texto.match(/\/public\/turnos\//g)).toHaveLength(1);
  });
});

describe('El token nunca se guarda en el recordatorio', () => {
  test('Recordatorio enviado sin token', async () => {
    const { sistema, turnoId, texto } = await enviarTurnoBase();
    const token = tokenDelMensaje(texto);
    const guardado = JSON.stringify(await recordatoriosDe(sistema, turnoId));
    expect(guardado).toContain('"enviado"');
    expect(guardado).not.toContain(token);
    expect(guardado).not.toContain(sistema.hasher.sha256(token));
  });
});

describe('Registro del envío fallido', () => {
  test('Envío fallido queda registrado', async () => {
    const sistema = crearSistemaRecordatorios();
    const turno = await agendarRecepcion(sistema);
    sistema.notificador.fallarExponiendoElMensaje();
    const resumen = await barrido(sistema, DOMINGO, '09:00');
    expect(resumen).toEqual({ enviados: 0, fallidos: 1, anulados: 0 });
    const [recordatorio] = await recordatoriosDe(sistema, turno.id);
    expect(recordatorio?.estado).toBe('fallido');
    expect(recordatorio?.motivoFallo).toEqual(expect.any(String));
    expect(recordatorio?.motivoFallo).not.toContain(EMAIL_PA1);
    expect(recordatorio?.motivoFallo).not.toContain('/public/turnos/');
    expect(recordatorio?.enviadoEn).toBeUndefined();
  });

  test('Un fallido no se reintenta', async () => {
    const sistema = crearSistemaRecordatorios();
    const turno = await agendarRecepcion(sistema);
    sistema.notificador.fallarCon(new Error('servicio de e-mail caído'));
    await barrido(sistema, DOMINGO, '09:00');
    sistema.notificador.restablecer();
    await barrido(sistema, DOMINGO, '12:00');
    expect(sistema.notificador.enviados).toEqual([]);
    expect((await recordatoriosDe(sistema, turno.id)).map((r) => r.estado)).toEqual(['fallido']);
  });

  test('Un fallo no frena el resto del barrido', async () => {
    const sistema = crearSistemaRecordatorios();
    const primero = await agendarRecepcion(sistema, { hora: '09:00' });
    const segundo = await agendarRecepcion(sistema, { hora: '10:00' });
    sistema.notificador.fallarEnIntento(1, new Error('rechazo puntual'));
    const resumen = await barrido(sistema, DOMINGO, '10:00');
    expect(resumen).toEqual({ enviados: 1, fallidos: 1, anulados: 0 });
    expect((await recordatoriosDe(sistema, primero.id)).map((r) => r.estado)).toEqual(['fallido']);
    expect((await recordatoriosDe(sistema, segundo.id)).map((r) => r.estado)).toEqual(['enviado']);
  });
});

describe('Lista de recordatorios fallidos para la recepción', () => {
  test('Solo aparecen los fallidos', async () => {
    const sistema = crearSistemaRecordatorios();
    const fallido = await agendarRecepcion(sistema, { hora: '09:00' });
    await agendarRecepcion(sistema, { hora: '10:00' });
    await agendarRecepcion(sistema, { hora: '11:00' });
    sistema.notificador.fallarEnIntento(1, new Error('rechazo puntual'));
    await barrido(sistema, DOMINGO, '10:00');
    const lista = await sistema.listarFallidos.ejecutar();
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({
      turnoId: fallido.id,
      estado: 'fallido',
      programadoPara: local(DOMINGO, '09:00'),
      motivoFallo: expect.any(String),
    });
  });
});

/** Reserva online de pa1 el lunes a las 10:00 y envío de su recordatorio el domingo a las 10:00. */
async function reservaConRecordatorio(): Promise<{
  sistema: ReturnType<typeof crearSistemaRecordatorios>;
  turnoId: string;
  tokenReserva: string;
  tokenRecordatorio: string;
}> {
  const sistema = crearSistemaRecordatorios();
  const reserva = await reservarOnlinePa1(sistema, '10:00');
  await barrido(sistema, DOMINGO, '10:00');
  const [mensaje] = sistema.notificador.enviados;
  if (mensaje === undefined) throw new Error('no se envió el recordatorio');
  return { sistema, turnoId: reserva.turnoId, tokenReserva: reserva.token, tokenRecordatorio: tokenDelMensaje(mensaje.texto) };
}

describe('Confirmación de asistencia desde el enlace', () => {
  test('Paciente confirma un turno reservado', async () => {
    const { sistema, turnoId, tokenRecordatorio } = await reservaConRecordatorio();
    const respuesta = await sistema.confirmarDesdeEnlace.ejecutar({ token: tokenRecordatorio });
    expect(respuesta).toEqual({ estado: 'confirmado', inicio: local(LUNES, '10:00'), fin: local(LUNES, '10:30') });
    await expect(sistema.turnos.obtenerPorId(turnoId)).resolves.toMatchObject({ estado: 'confirmado' });
  });

  test('Confirmar dos veces no es un error', async () => {
    const { sistema, turnoId, tokenRecordatorio } = await reservaConRecordatorio();
    const primera = await sistema.confirmarDesdeEnlace.ejecutar({ token: tokenRecordatorio });
    const segunda = await sistema.confirmarDesdeEnlace.ejecutar({ token: tokenRecordatorio });
    expect(primera.estado).toBe('confirmado');
    expect(segunda).toEqual(primera);
    await expect(sistema.turnos.obtenerPorId(turnoId)).resolves.toMatchObject({ estado: 'confirmado' });
  });
});

/** El error público no lleva más que su código y su mensaje fijo. */
function esperarErrorGenerico(error: ErrorEnlacePublico): void {
  expect(error.codigo).toBe('ENLACE_INVALIDO');
  expect(error.message).toBe(MENSAJE_ENLACE_INVALIDO);
  expect(error.cause).toBeUndefined();
  expect(Object.keys(error).sort()).toEqual(['codigo', 'name']);
}

describe('Enlace inválido sin revelar datos', () => {
  test('Token inexistente', async () => {
    const sistema = crearSistemaRecordatorios();
    esperarErrorGenerico(await rechazoEnlace(sistema.confirmarDesdeEnlace.ejecutar({ token: 'token-que-nunca-se-emitio' })));
  });

  test('Token reemplazado por la rotación', async () => {
    const { sistema, turnoId, tokenReserva } = await reservaConRecordatorio();
    esperarErrorGenerico(await rechazoEnlace(sistema.confirmarDesdeEnlace.ejecutar({ token: tokenReserva })));
    await expect(sistema.turnos.obtenerPorId(turnoId)).resolves.toMatchObject({ estado: 'reservado' });
  });

  test('Turno cancelado', async () => {
    const { sistema, turnoId, tokenRecordatorio } = await reservaConRecordatorio();
    await sistema.cancelarTurno.ejecutar({ turnoId, actor: actores.recepcion });
    esperarErrorGenerico(await rechazoEnlace(sistema.confirmarDesdeEnlace.ejecutar({ token: tokenRecordatorio })));
  });

  test('Turno ya atendido', async () => {
    const { sistema, turnoId, tokenRecordatorio } = await reservaConRecordatorio();
    sistema.turnos.cambiarEstado(turnoId, 'atendido');
    sistema.reloj.fijar(local(LUNES, '10:10'));
    const error = await rechazoEnlace(sistema.confirmarDesdeEnlace.ejecutar({ token: tokenRecordatorio }));
    esperarErrorGenerico(error);
    expect(JSON.stringify({ ...error, mensaje: error.message })).not.toContain('atendido');
  });
});

describe('ConfirmarDesdeEnlace: casos de borde (design D8)', () => {
  test('dos confirmaciones concurrentes del mismo enlace terminan ambas en éxito', async () => {
    const { sistema, turnoId, tokenRecordatorio } = await reservaConRecordatorio();
    const resultados = await Promise.allSettled([
      sistema.confirmarDesdeEnlace.ejecutar({ token: tokenRecordatorio }),
      sistema.confirmarDesdeEnlace.ejecutar({ token: tokenRecordatorio }),
    ]);
    expect(resultados.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled']);
    await expect(sistema.turnos.obtenerPorId(turnoId)).resolves.toMatchObject({ estado: 'confirmado' });
  });
});
