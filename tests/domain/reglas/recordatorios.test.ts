import { describe, expect, test } from 'vitest';
import {
  calcularProgramadoPara,
  debeProgramarse,
  armarMensajeRecordatorio,
  evaluarEnvio,
} from '../../../src/domain/reglas/recordatorios.js';
import type { Paciente } from '../../../src/domain/paciente.js';
import type { Recordatorio } from '../../../src/domain/recordatorio.js';
import type { EstadoTurno, Turno } from '../../../src/domain/turno.js';
import { LUNES, local } from '../../fixtures/seed.js';

/** Paciente ficticio con e-mail y consentimiento. */
function paciente(cambios: Partial<Paciente> = {}): Paciente {
  return {
    id: 'pa1',
    nombre: 'Carla',
    apellido: 'Prueba',
    dni: '00000001',
    telefono: '+54 9 11 0000-0001',
    email: 'carla.prueba@demo.test',
    consentimientoContacto: true,
    ...cambios,
  };
}

/** Turno base del spec: confirmado, pa1, p1, s1, pr1, lunes 09:00-09:30. */
function turnoBase(estado: EstadoTurno = 'confirmado'): Turno {
  return {
    id: 't-base',
    pacienteId: 'pa1',
    profesionalId: 'p1',
    sillonId: 's1',
    prestacionId: 'pr1',
    inicio: local(LUNES, '09:00'),
    fin: local(LUNES, '09:30'),
    duracionMinutos: 30,
    estado,
    origen: 'recepcion',
  };
}

const SABADO = '2026-11-21';
const DOMINGO = '2026-11-22';

describe('calcularProgramadoPara(inicio, horasAntes) (RN-25)', () => {
  test.each([
    ['24 h antes del lunes 09:00 es el domingo 09:00', 24, local(DOMINGO, '09:00')],
    ['48 h antes del lunes 09:00 es el sábado 09:00', 48, local(SABADO, '09:00')],
    ['1 h antes del lunes 09:00 es el lunes 08:00', 1, local(LUNES, '08:00')],
  ])('%s', (_n, horas, esperado) => {
    expect(calcularProgramadoPara(local(LUNES, '09:00'), horas)).toEqual(esperado);
  });
});

describe('debeProgramarse(paciente) (RN-25, RN-D-02)', () => {
  test('con consentimiento y e-mail se programa', () => {
    expect(debeProgramarse(paciente())).toBe(true);
  });

  test.each<[string, Partial<Paciente>]>([
    ['sin consentimiento de contacto', { consentimientoContacto: false }],
    ['con e-mail vacío', { email: '' }],
  ])('%s no se programa', (_n, cambios) => {
    expect(debeProgramarse(paciente(cambios))).toBe(false);
  });

  test('sin e-mail no se programa', () => {
    const { email: _sinEmail, ...sinEmail } = paciente();
    expect(debeProgramarse(sinEmail)).toBe(false);
  });
});

describe('evaluarEnvio(recordatorio, turno, ahora) (RN-25)', () => {
  const pendiente: Recordatorio = {
    id: 'r-1',
    turnoId: 't-base',
    canal: 'email',
    programadoPara: local(DOMINGO, '09:00'),
    estado: 'pendiente',
  };

  test('antes de programadoPara espera', () => {
    const unMsAntes = new Date(local(DOMINGO, '09:00').getTime() - 1);
    expect(evaluarEnvio(pendiente, turnoBase(), unMsAntes)).toBe('esperar');
  });

  test.each<EstadoTurno>(['reservado', 'confirmado'])('turno %s en el instante programado se envía', (estado) => {
    expect(evaluarEnvio(pendiente, turnoBase(estado), local(DOMINGO, '09:00'))).toBe('enviar');
  });

  test('turno confirmado después de programadoPara y antes del inicio se envía', () => {
    expect(evaluarEnvio(pendiente, turnoBase(), local(LUNES, '08:59'))).toBe('enviar');
  });

  test.each<EstadoTurno>(['cancelado', 'ausente', 'atendido'])('turno %s se anula', (estado) => {
    expect(evaluarEnvio(pendiente, turnoBase(estado), local(DOMINGO, '09:00'))).toBe('anular');
  });

  test('turno inexistente se anula', () => {
    expect(evaluarEnvio(pendiente, undefined, local(DOMINGO, '09:00'))).toBe('anular');
  });

  test.each([
    ['en el inicio exacto (umbral inclusivo)', local(LUNES, '09:00')],
    ['después del inicio', local(LUNES, '09:10')],
  ])('turno ya iniciado %s se anula', (_n, ahora) => {
    expect(evaluarEnvio(pendiente, turnoBase(), ahora)).toBe('anular');
  });
});

describe('armarMensajeRecordatorio(datos) (RN-25, RN-14, RN-D-02)', () => {
  const TOKEN = 'abc-DEF_123';
  const base = {
    para: 'carla.prueba@demo.test',
    fechaHoraLocal: 'lunes 23/11/2026 09:00',
    prestacion: 'Consulta/control',
    profesional: 'Ana Ejemplo',
    consultorio: 'Consultorio Odontológico Demo',
    baseUrlPublica: 'http://localhost:3000',
    token: TOKEN,
  } as const;

  test('va al e-mail del paciente con los datos del turno', () => {
    const mensaje = armarMensajeRecordatorio({ ...base, estadoTurno: 'confirmado' });
    expect(mensaje.para).toBe('carla.prueba@demo.test');
    expect(mensaje.asunto).toContain('Consultorio Odontológico Demo');
    for (const dato of ['lunes 23/11/2026 09:00', 'Consulta/control', 'Ana Ejemplo', 'Consultorio Odontológico Demo']) {
      expect(mensaje.texto).toContain(dato);
    }
  });

  test('turno confirmado: solo el enlace de gestión', () => {
    const { texto } = armarMensajeRecordatorio({ ...base, estadoTurno: 'confirmado' });
    expect(texto).toContain(`http://localhost:3000/public/turnos/${TOKEN}`);
    expect(texto).not.toContain('/confirmar');
  });

  test('turno reservado: enlace de confirmación y de gestión', () => {
    const { texto } = armarMensajeRecordatorio({ ...base, estadoTurno: 'reservado' });
    expect(texto).toContain(`http://localhost:3000/public/turnos/${TOKEN}/confirmar`);
    expect(texto).toMatch(new RegExp(`http://localhost:3000/public/turnos/${TOKEN}(\s|$)`));
  });

  test('base con barra final no genera barra doble', () => {
    const { texto } = armarMensajeRecordatorio({ ...base, baseUrlPublica: 'https://turnos.demo.test/', estadoTurno: 'confirmado' });
    expect(texto).toContain(`https://turnos.demo.test/public/turnos/${TOKEN}`);
    expect(texto).not.toContain('test//public');
  });

  test('el token se codifica en el enlace', () => {
    const { texto } = armarMensajeRecordatorio({ ...base, token: 'a/b c', estadoTurno: 'confirmado' });
    expect(texto).toContain('/public/turnos/a%2Fb%20c');
  });
});
