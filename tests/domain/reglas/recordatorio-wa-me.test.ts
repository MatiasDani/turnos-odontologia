import { describe, expect, test } from 'vitest';
import { ErrorMarcarRecordatorio } from '../../../src/domain/errores-recordatorio.js';
import type { Paciente } from '../../../src/domain/paciente.js';
import type { Recordatorio } from '../../../src/domain/recordatorio.js';
import { armarEnlaceWaMe, marcarEnviado } from '../../../src/domain/reglas/recordatorio-wa-me.js';
import { debeProgramarseWaMe } from '../../../src/domain/reglas/recordatorios.js';
import { local } from '../../fixtures/seed.js';

const pacienteBase: Paciente = {
  id: 'pa1',
  nombre: 'Carla',
  apellido: 'Prueba',
  dni: '00000001',
  telefono: '+54 9 11 0000-0001',
  email: 'carla.prueba@demo.test',
  consentimientoContacto: true,
};

const recordatorioBase: Recordatorio = {
  id: 'rec-wa-1',
  turnoId: 'tu-1',
  canal: 'wa_me',
  programadoPara: local('2026-11-22', '09:00'),
  estado: 'pendiente',
  enlaceWaMe: 'https://wa.me/5491100000001?text=hola',
};

describe('Elegibilidad del wa.me', () => {
  test('Sin consentimiento no se genera el wa.me', () => {
    expect(debeProgramarseWaMe({ ...pacienteBase, consentimientoContacto: false })).toBe(false);
  });

  test('Sin e-mail sí se genera el wa.me', () => {
    const { email: _email, ...sinEmail } = pacienteBase;
    expect(debeProgramarseWaMe(sinEmail)).toBe(true);
  });

  test('Prefijo de otro país se rechaza', () => {
    expect(debeProgramarseWaMe({ ...pacienteBase, telefono: '+34 600 000 000' })).toBe(false);
  });

  test('Teléfono con longitud fuera de rango se rechaza', () => {
    expect(debeProgramarseWaMe({ ...pacienteBase, telefono: '5491100000000000' })).toBe(false);
  });
});

describe('URL wa.me codificada y mensaje mínimo', () => {
  test('URL con teléfono normalizado y mensaje codificado', () => {
    const enlace = armarEnlaceWaMe({
      telefono: '5491100000001',
      fechaHoraLocal: 'lunes 23/11/2026 09:00',
      prestacion: 'Consulta/control',
      profesional: 'Ana Ejemplo',
      consultorio: 'Consultorio Odontológico Demo',
    });
    expect(enlace).toMatch(/^https:\/\/wa\.me\/5491100000001\?text=/);
    expect(enlace.split('?text=')[1]).not.toMatch(/[+\-\s]/);
  });

  test('Mensaje con fecha, hora, prestación, profesional y consultorio', () => {
    const enlace = armarEnlaceWaMe({
      telefono: '5491100000001',
      fechaHoraLocal: 'lunes 23/11/2026 09:00',
      prestacion: 'Consulta/control',
      profesional: 'Ana Ejemplo',
      consultorio: 'Consultorio Odontológico Demo',
    });
    const mensaje = decodeURIComponent(enlace.split('?text=')[1] ?? '');
    expect(mensaje).toContain('lunes 23/11/2026 09:00');
    expect(mensaje).toContain('Consulta/control');
    expect(mensaje).toContain('Ana Ejemplo');
    expect(mensaje).toContain('Consultorio Odontológico Demo');
  });

  test('Caracteres especiales se codifican', () => {
    const enlace = armarEnlaceWaMe({
      telefono: '5491100000001',
      fechaHoraLocal: 'lunes 23/11/2026 09:00',
      prestacion: 'Limpieza / control odontológico',
      profesional: 'Ana Ejemplo',
      consultorio: 'Consultorio Odontológico Demo',
    });
    const texto = enlace.split('?text=')[1] ?? '';
    expect(texto).not.toContain(' ');
    expect(texto).not.toContain('/');
    expect(decodeURIComponent(texto)).toContain('Limpieza / control odontológico');
  });

  test('Mensaje sin token ni enlace de gestión', () => {
    const enlace = armarEnlaceWaMe({
      telefono: '5491100000001',
      fechaHoraLocal: 'lunes 23/11/2026 09:00',
      prestacion: 'Consulta/control',
      profesional: 'Ana Ejemplo',
      consultorio: 'Consultorio Odontológico Demo',
    });
    expect(decodeURIComponent(enlace)).not.toContain('/public/turnos/');
    expect(decodeURIComponent(enlace)).not.toContain('token');
  });
});

describe('Transición de envío del wa.me', () => {
  test('Segunda llamada no cambia el recordatorio', () => {
    const enviado = { ...recordatorioBase, estado: 'enviado' as const, enviadoEn: local('2026-11-22', '12:00') };
    expect(marcarEnviado(enviado, local('2026-11-22', '13:00'))).toBe(enviado);
  });

  test('Recordatorio cancelado se rechaza', () => {
    const cancelado = { ...recordatorioBase, estado: 'cancelado' as const };
    expect(() => marcarEnviado(cancelado, local('2026-11-22', '12:00'))).toThrow(ErrorMarcarRecordatorio);
    expect(() => marcarEnviado(cancelado, local('2026-11-22', '12:00'))).toThrowError(
      expect.objectContaining({ codigo: 'ESTADO_NO_ENVIABLE' }),
    );
  });

  test('Recordatorio fallido se rechaza', () => {
    const fallido = { ...recordatorioBase, estado: 'fallido' as const, motivoFallo: 'sin datos' };
    expect(() => marcarEnviado(fallido, local('2026-11-22', '12:00'))).toThrow(ErrorMarcarRecordatorio);
  });
});
