import { describe, expect, test } from 'vitest';
import type { Rol } from '../../../src/domain/actor.js';
import { AccesoDenegadoError } from '../../../src/domain/errores.js';
import { ACCIONES, type Accion } from '../../../src/domain/permisos/acciones.js';
import { autorizar, autorizarSobre } from '../../../src/domain/permisos/autorizar.js';
import { MATRIZ, type Permiso } from '../../../src/domain/permisos/matriz.js';
import { actorDeRol, actores } from '../../fixtures/actores.js';

/** Tabla del design de C-09 (D3), copiada a mano para que el test no dependa de la implementación. */
const ESPERADO: Readonly<Record<Accion, Readonly<Record<Rol, Permiso>>>> = {
  'turno.agendar': { administrador: 'si', recepcion: 'si', odontologo: 'no', paciente: 'si' },
  'turno.cancelar': { administrador: 'si', recepcion: 'si', odontologo: 'no', paciente: 'propio' },
  'turno.reprogramar': { administrador: 'si', recepcion: 'si', odontologo: 'no', paciente: 'propio' },
  'turno.confirmar': { administrador: 'si', recepcion: 'si', odontologo: 'no', paciente: 'propio' },
  'turno.cerrar': { administrador: 'si', recepcion: 'si', odontologo: 'propio', paciente: 'no' },
  'disponibilidad.consultar': { administrador: 'si', recepcion: 'si', odontologo: 'si', paciente: 'si' },
  'agenda.ver': { administrador: 'si', recepcion: 'si', odontologo: 'propio', paciente: 'no' },
  'bloqueo.crear': { administrador: 'si', recepcion: 'si', odontologo: 'propio', paciente: 'no' },
  'bloqueo.liberar': { administrador: 'si', recepcion: 'si', odontologo: 'propio', paciente: 'no' },
  'configuracion.modificar': { administrador: 'si', recepcion: 'no', odontologo: 'no', paciente: 'no' },
  'recordatorio.listar': { administrador: 'si', recepcion: 'si', odontologo: 'no', paciente: 'no' },
  'recordatorio.marcarEnviado': { administrador: 'no', recepcion: 'si', odontologo: 'no', paciente: 'no' },
  'usuario.gestionar': { administrador: 'si', recepcion: 'no', odontologo: 'no', paciente: 'no' },
  'paciente.buscar': { administrador: 'si', recepcion: 'si', odontologo: 'no', paciente: 'no' },
  'paciente.crear': { administrador: 'si', recepcion: 'si', odontologo: 'no', paciente: 'no' },
};

const ROLES: readonly Rol[] = ['administrador', 'recepcion', 'odontologo', 'paciente'];

describe('Matriz rol x acción (design D3)', () => {
  test('lista las acciones del design (13 de C-09 y 2 de C-15)', () => {
    expect([...ACCIONES].sort()).toEqual(Object.keys(ESPERADO).sort());
  });

  test.each(ACCIONES.flatMap((accion) => ROLES.map((rol) => [accion, rol] as const)))(
    '%s para %s coincide con la tabla',
    (accion, rol) => {
      expect(MATRIZ[accion][rol]).toBe(ESPERADO[accion][rol]);
    },
  );
});

describe('autorizar', () => {
  test.each(ACCIONES.flatMap((accion) => ROLES.map((rol) => [accion, rol] as const)))(
    '%s para %s: rechaza solo las celdas "no"',
    (accion, rol) => {
      const ejecutar = (): void => autorizar(actorDeRol(rol), accion);
      if (ESPERADO[accion][rol] === 'no') expect(ejecutar).toThrow(AccesoDenegadoError);
      else expect(ejecutar).not.toThrow();
    },
  );

  test('el rechazo indica el rol y la acción, sin código RN', () => {
    let error: unknown;
    try {
      autorizar(actores.odontologo('p1'), 'turno.cancelar');
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(AccesoDenegadoError);
    expect(error).toMatchObject({ rol: 'odontologo', operacion: 'turno.cancelar' });
    expect(error).not.toHaveProperty('codigo');
  });
});

describe('autorizarSobre', () => {
  test('el odontólogo pasa sobre un recurso de su profesional', () => {
    expect(() => autorizarSobre(actores.odontologo('p1'), 'turno.cerrar', { profesionalId: 'p1' })).not.toThrow();
  });

  test('el odontólogo no pasa sobre un recurso de otro profesional', () => {
    expect(() => autorizarSobre(actores.odontologo('p2'), 'turno.cerrar', { profesionalId: 'p1' })).toThrow(
      AccesoDenegadoError,
    );
  });

  test('el odontólogo no pasa sobre un recurso sin profesional', () => {
    expect(() => autorizarSobre(actores.odontologo('p1'), 'bloqueo.crear', {})).toThrow(AccesoDenegadoError);
  });

  test('el paciente pasa sobre el turno de su token', () => {
    expect(() => autorizarSobre(actores.paciente('t-base'), 'turno.cancelar', { turnoId: 't-base' })).not.toThrow();
  });

  test('el paciente no pasa sobre otro turno', () => {
    expect(() => autorizarSobre(actores.paciente('t-otro'), 'turno.cancelar', { turnoId: 't-base' })).toThrow(
      AccesoDenegadoError,
    );
  });

  test('el paciente sin turno no pasa sobre una acción "propio"', () => {
    expect(() => autorizarSobre(actores.paciente(), 'turno.reprogramar', { turnoId: 't-base' })).toThrow(
      AccesoDenegadoError,
    );
  });

  test('las celdas "si" no miran el recurso', () => {
    expect(() => autorizarSobre(actores.recepcion, 'turno.cancelar', { profesionalId: 'p9', turnoId: 't-x' })).not.toThrow();
    expect(() => autorizarSobre(actores.paciente(), 'turno.agendar', {})).not.toThrow();
  });

  test('las celdas "no" se rechazan también sobre un recurso', () => {
    expect(() => autorizarSobre(actores.odontologo('p1'), 'turno.cancelar', { profesionalId: 'p1' })).toThrow(
      AccesoDenegadoError,
    );
  });

  test('el mensaje no contiene datos del recurso', () => {
    let mensaje = '';
    try {
      autorizarSobre(actores.paciente('t-otro'), 'turno.cancelar', { turnoId: 't-base', profesionalId: 'p1' });
    } catch (e) {
      mensaje = e instanceof Error ? e.message : '';
    }
    expect(mensaje).toContain('paciente');
    expect(mensaje).not.toContain('t-base');
    expect(mensaje).not.toContain('p1');
  });
});
