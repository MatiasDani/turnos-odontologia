import { describe, expect, test } from 'vitest';
import type { Rol } from '../../../src/domain/actor.js';
import { validarAlta, type EntradaValidacion } from '../../../src/domain/reglas/validar-alta.js';
import { crearEntorno, crearTurno, LUNES, local, MIERCOLES, SABADO } from '../../fixtures/seed.js';

const e = crearEntorno();
const base = (rol: Rol = 'recepcion'): EntradaValidacion => ({
  actor: { rol },
  profesional: e.profesionales[0]!,
  sillon: e.sillones[0]!,
  prestacion: e.prestaciones[0]!, // pr1 30 min
  zonaHoraria: e.consultorio.zonaHoraria,
  horarios: e.horarios,
  bloqueos: e.bloqueos,
  turnos: [],
  inicio: local(LUNES, '09:00'),
});
const codigo = (entrada: EntradaValidacion) => {
  const r = validarAlta(entrada);
  return r.ok ? 'OK' : r.violacion.codigo;
};

describe('validarAlta: resultado válido', () => {
  test('devuelve duración por defecto y fin calculado', () => {
    const r = validarAlta(base());
    expect(r).toEqual({
      ok: true,
      duracionMinutos: 30,
      intervalo: { inicio: local(LUNES, '09:00'), fin: local(LUNES, '09:30') },
    });
  });

  test('con duración ajustada, fin = inicio + duración', () => {
    const r = validarAlta({ ...base(), duracionMinutos: 45 });
    expect(r.ok && r.intervalo.fin).toEqual(local(LUNES, '09:45'));
  });
});

describe('validarAlta: orden fijo RN-18 → RN-16 → RN-06 → RN-07/RN-17 → bloqueos → RN-02 → RN-03', () => {
  test('Recurso inactivo prevalece sobre solapamiento', () => {
    const entrada: EntradaValidacion = {
      ...base(),
      sillon: { ...e.sillones[0]!, activo: false },
      turnos: [crearTurno()],
    };
    expect(codigo(entrada)).toBe('RN-18');
  });

  test('RN-18 prevalece sobre RN-16, RN-06 y RN-07', () => {
    const entrada: EntradaValidacion = {
      ...base('paciente'),
      profesional: { ...e.profesionales[0]!, activo: false },
      duracionMinutos: 45,
      inicio: local(SABADO, '10:00'),
    };
    expect(codigo(entrada)).toBe('RN-18');
  });

  test('RN-16 prevalece sobre RN-07', () => {
    expect(codigo({ ...base('paciente'), duracionMinutos: 45, inicio: local(LUNES, '08:30') })).toBe('RN-16');
  });

  test('RN-06 prevalece sobre RN-07', () => {
    expect(codigo({ ...base(), duracionMinutos: 37, inicio: local(LUNES, '08:30') })).toBe('RN-06');
  });

  test('RN-17 prevalece sobre RN-02', () => {
    const turno = crearTurno({ inicio: local(LUNES, '12:30'), fin: local(LUNES, '13:30') });
    expect(codigo({ ...base(), inicio: local(LUNES, '12:45'), turnos: [turno] })).toBe('RN-17');
  });

  test('RN-07 por horario prevalece sobre el bloqueo', () => {
    const bloqueo = { id: 'b-x', profesionalId: 'p1', inicio: local(LUNES, '08:00'), fin: local(LUNES, '09:00') };
    const r = validarAlta({ ...base(), inicio: local(LUNES, '08:30'), bloqueos: [bloqueo] });
    expect(!r.ok && r.violacion).toEqual({ codigo: 'RN-07' });
  });

  test('bloqueo (RN-07) prevalece sobre RN-02', () => {
    const turno = crearTurno({ inicio: local(MIERCOLES, '15:30'), fin: local(MIERCOLES, '16:30') });
    const r = validarAlta({ ...base(), inicio: local(MIERCOLES, '15:30'), turnos: [turno] });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.violacion.recursoBloqueado).toBe('profesional');
  });

  test('Profesional prevalece sobre sillón', () => {
    const sillon = crearTurno({ id: 'S', profesionalId: 'p2', sillonId: 's1' });
    const prof = crearTurno({ id: 'P', profesionalId: 'p1', sillonId: 's2' });
    const r = validarAlta({ ...base(), turnos: [sillon, prof] });
    expect(!r.ok && r.violacion).toEqual({ codigo: 'RN-02', turnoEnConflicto: prof });
  });

  test('Mismo sillón con otro profesional → RN-03', () => {
    const turno = crearTurno({ profesionalId: 'p2' });
    expect(codigo({ ...base(), turnos: [turno] })).toBe('RN-03');
  });

  test('La duración ajustada se valida contra solapamientos', () => {
    const turno = crearTurno({ inicio: local(LUNES, '09:40'), fin: local(LUNES, '10:00') });
    expect(codigo({ ...base(), duracionMinutos: 45, turnos: [turno] })).toBe('RN-02');
  });

  test.each<Rol>(['recepcion', 'odontologo', 'administrador'])(
    'el rol %s no altera el resultado de RN-02 (sin sobreturnos, RN-04)',
    (rol) => {
      expect(codigo({ ...base(rol), turnos: [crearTurno()] })).toBe('RN-02');
    },
  );
});
