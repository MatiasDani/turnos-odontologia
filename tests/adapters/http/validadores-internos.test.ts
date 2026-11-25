import { describe, expect, test } from 'vitest';
import {
  validarAltaPaciente,
  validarBloqueo,
  validarConsultaAgenda,
  validarConsultaDisponibilidadInterna,
  validarNuevoTurno,
  validarReprogramacion,
  validarTextoBusqueda,
} from '../../../src/adapters/http/validadores-internos.js';

const INICIO = '2026-11-24T18:00:00.000Z';

describe('validarConsultaAgenda', () => {
  test('día válido con filtros opcionales', () => {
    expect(validarConsultaAgenda({ fecha: '2026-11-24', vista: 'dia', sillonId: 's1' })).toEqual({
      ok: true,
      valor: { fecha: '2026-11-24', vista: 'dia', sillonId: 's1' },
    });
  });

  test('vista por defecto: día', () => {
    expect(validarConsultaAgenda({ fecha: '2026-11-24' })).toMatchObject({ ok: true, valor: { vista: 'dia' } });
  });

  test.each([{ fecha: '24/11/2026' }, { fecha: '2026-02-30' }, {}])('fecha inválida %j', (q) => {
    expect(validarConsultaAgenda(q)).toEqual({ ok: false, campos: ['fecha'] });
  });

  test('vista desconocida', () => {
    expect(validarConsultaAgenda({ fecha: '2026-11-24', vista: 'mes' })).toEqual({ ok: false, campos: ['vista'] });
  });
});

describe('validarNuevoTurno', () => {
  const base = { pacienteId: 'pa2', profesionalId: 'p2', sillonId: 's2', prestacionId: 'pr1', inicio: INICIO };

  test('turno válido, con duración opcional', () => {
    expect(validarNuevoTurno({ ...base, duracionMinutos: 45 })).toEqual({
      ok: true,
      valor: { ...base, inicio: new Date(INICIO), duracionMinutos: 45 },
    });
  });

  test('inicio sin formato', () => {
    expect(validarNuevoTurno({ ...base, inicio: 'mañana' })).toEqual({ ok: false, campos: ['inicio'] });
  });

  test('lista todos los campos faltantes', () => {
    expect(validarNuevoTurno({})).toEqual({ ok: false, campos: ['pacienteId', 'profesionalId', 'sillonId', 'prestacionId', 'inicio'] });
  });

  test('duración no entera', () => {
    expect(validarNuevoTurno({ ...base, duracionMinutos: '30' })).toEqual({ ok: false, campos: ['duracionMinutos'] });
  });

  test('cuerpo que no es objeto', () => {
    expect(validarNuevoTurno('texto')).toEqual({ ok: false, campos: ['pedido'] });
  });
});

describe('validarReprogramacion', () => {
  test('solo inicio', () => {
    expect(validarReprogramacion({ inicio: INICIO })).toEqual({ ok: true, valor: { inicio: new Date(INICIO) } });
  });

  test('con profesional y sillón', () => {
    expect(validarReprogramacion({ inicio: INICIO, profesionalId: 'p2', sillonId: 's2' })).toMatchObject({ ok: true, valor: { profesionalId: 'p2', sillonId: 's2' } });
  });

  test('sin inicio', () => {
    expect(validarReprogramacion({ profesionalId: 'p2' })).toEqual({ ok: false, campos: ['inicio'] });
  });
});

describe('validarBloqueo', () => {
  test('bloqueo de profesional con motivo', () => {
    expect(validarBloqueo({ profesionalId: 'p2', inicio: INICIO, fin: '2026-11-24T19:00:00.000Z', motivo: 'Capacitación' })).toMatchObject({
      ok: true,
      valor: { profesionalId: 'p2', motivo: 'Capacitación' },
    });
  });

  test('sin recurso', () => {
    expect(validarBloqueo({ inicio: INICIO, fin: INICIO })).toEqual({ ok: false, campos: ['recurso'] });
  });
});

describe('validarAltaPaciente y validarTextoBusqueda', () => {
  test('alta con tipos correctos (la validación de contenido es del caso de uso)', () => {
    const datos = { dni: '30000009', nombre: 'Paciente', apellido: 'Ficticio 9', telefono: '11 0000 0009', consentimientoContacto: true };
    expect(validarAltaPaciente(datos)).toEqual({ ok: true, valor: datos });
  });

  test('alta con consentimiento que no es booleano', () => {
    expect(validarAltaPaciente({ dni: '1', nombre: 'a', apellido: 'b', telefono: '1', consentimientoContacto: 'si' })).toEqual({ ok: false, campos: ['consentimientoContacto'] });
  });

  test('texto de búsqueda presente', () => {
    expect(validarTextoBusqueda({ texto: 'Prueba' })).toEqual({ ok: true, valor: 'Prueba' });
    expect(validarTextoBusqueda({})).toEqual({ ok: false, campos: ['texto'] });
  });

  test('disponibilidad interna', () => {
    expect(validarConsultaDisponibilidadInterna({ prestacionId: 'pr1', fecha: '2026-11-24', profesionalId: 'p1' })).toEqual({
      ok: true,
      valor: { prestacionId: 'pr1', fecha: '2026-11-24', profesionalId: 'p1' },
    });
    expect(validarConsultaDisponibilidadInterna({ fecha: 'x' })).toEqual({ ok: false, campos: ['prestacionId', 'fecha'] });
  });
});
