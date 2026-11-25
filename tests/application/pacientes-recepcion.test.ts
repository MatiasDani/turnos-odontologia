import { describe, expect, test } from 'vitest';
import { PacienteRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/paciente-repositorio.js';
import { AltaRapidaPaciente } from '../../src/application/alta-rapida-paciente.js';
import { BuscarPacientes } from '../../src/application/buscar-pacientes.js';
import type { Actor } from '../../src/domain/actor.js';
import { AccesoDenegadoError, ConfiguracionInvalidaError, ConsultaInvalidaError, ReglaNegocioError } from '../../src/domain/errores.js';
import type { Paciente } from '../../src/domain/paciente.js';
import { actores } from '../fixtures/actores.js';
import { crearEntorno } from '../fixtures/seed.js';
import { GeneradorIdConPrefijo, rechazo } from '../fixtures/sistema.js';

/** Escenarios de `specs/pacientes-recepcion/spec.md` y "Pacientes por rol" de `specs/control-acceso` (C-15). */
function sistema(extra: Paciente[] = []) {
  const pacientes = new PacienteRepositorioEnMemoria([...crearEntorno().pacientes, ...extra]);
  return {
    pacientes,
    buscar: new BuscarPacientes({ pacientes }),
    alta: new AltaRapidaPaciente({ pacientes, ids: new GeneradorIdConPrefijo('pa-nuevo-') }),
  };
}
const buscar = (texto: string, actor: Actor = actores.recepcion) => sistema().buscar.ejecutar({ actor, texto });
const ids = (r: { pacientes: readonly { id: string }[] }) => r.pacientes.map((p) => p.id);
const nuevo = { dni: '30000009', nombre: 'Paciente', apellido: 'Ficticio 9', telefono: '11 0000 0009', consentimientoContacto: true };

describe('Búsqueda de pacientes', () => {
  test('Búsqueda por prefijo de DNI', async () => {
    expect(ids(await buscar('0000000'))).toEqual(['pa2', 'pa1', 'pa3']);
  });

  test('Búsqueda por apellido sin tildes ni mayúsculas', async () => {
    expect(ids(await buscar('MODELO'))).toEqual(['pa2']);
  });

  test('Búsqueda por parte del nombre', async () => {
    expect(ids(await buscar('carl'))).toEqual(['pa1']);
  });

  test('Búsqueda sin resultados', async () => {
    expect(await buscar('Inexistente')).toEqual({ pacientes: [], hayMas: false });
  });

  test('ordena por apellido y nombre', async () => {
    const r = await buscar('0000000');
    expect(r.pacientes.map((p) => p.apellido)).toEqual(['Modelo', 'Prueba', 'Simulada']);
  });
});

describe('Texto de búsqueda mínimo', () => {
  test('Búsqueda de dos caracteres', async () => {
    const error = await rechazo(buscar(' ca '));
    expect(error).toBeInstanceOf(ConsultaInvalidaError);
    expect(error).toMatchObject({ campo: 'texto' });
  });
});

describe('Resultado de búsqueda con mínimo dato', () => {
  test('Campos del resultado', async () => {
    const [carla] = (await buscar('Prueba')).pacientes;
    expect(Object.keys(carla ?? {}).sort()).toEqual(['apellido', 'dni', 'id', 'nombre', 'telefono']);
  });
});

describe('Tope de resultados', () => {
  test('Más de 10 coincidencias', async () => {
    const muchos: Paciente[] = Array.from({ length: 12 }, (_, i) => ({
      id: `pf-${i + 1}`,
      nombre: 'Paciente',
      apellido: `Ficticio ${String(i + 1).padStart(2, '0')}`,
      dni: `400000${String(i + 10)}`,
      telefono: '+54 9 11 0000-0000',
      consentimientoContacto: true,
    }));
    const r = await sistema(muchos).buscar.ejecutar({ actor: actores.recepcion, texto: 'Ficticio' });
    expect(r.pacientes).toHaveLength(10);
    expect(r.hayMas).toBe(true);
  });
});

describe('Alta rápida de paciente', () => {
  test('Alta de un paciente nuevo', async () => {
    const s = sistema();
    const creado = await s.alta.ejecutar({ actor: actores.recepcion, datos: nuevo });
    expect(creado).toEqual({ id: 'pa-nuevo-1', nombre: 'Paciente', apellido: 'Ficticio 9', dni: '30000009', telefono: '1100000009' });
    const r = await s.buscar.ejecutar({ actor: actores.recepcion, texto: '30000009' });
    expect(ids(r)).toEqual(['pa-nuevo-1']);
  });

  test('Alta con datos inválidos', async () => {
    const s = sistema();
    const error = await rechazo(s.alta.ejecutar({ actor: actores.recepcion, datos: { ...nuevo, dni: '123', nombre: '', consentimientoContacto: false } }));
    expect(error).toBeInstanceOf(ConfiguracionInvalidaError);
    expect((error as ConfiguracionInvalidaError & { campos: string[] }).campos).toEqual(['dni', 'nombre', 'consentimientoContacto']);
    expect(await s.pacientes.listar()).toHaveLength(3);
  });

  test('guarda el e-mail opcional y el consentimiento, que la búsqueda no devuelve', async () => {
    const s = sistema();
    await s.alta.ejecutar({ actor: actores.recepcion, datos: { ...nuevo, email: 'paciente9@ejemplo.test' } });
    await expect(s.pacientes.obtenerPorDni('30000009')).resolves.toMatchObject({ email: 'paciente9@ejemplo.test', consentimientoContacto: true });
  });
});

describe('DNI único en el alta rápida', () => {
  test('Alta con un DNI existente', async () => {
    const s = sistema();
    const error = await rechazo(
      s.alta.ejecutar({ actor: actores.recepcion, datos: { ...nuevo, dni: '00000001', nombre: 'Otra', apellido: 'Persona', telefono: '11 0000 0099' } }),
    );
    expect(error).toBeInstanceOf(ReglaNegocioError);
    expect(error).toMatchObject({ codigo: 'RN-35', pacienteExistente: { id: 'pa1', nombre: 'Carla', apellido: 'Prueba' } });
    await expect(s.pacientes.obtenerPorId('pa1')).resolves.toMatchObject({ nombre: 'Carla', apellido: 'Prueba' });
  });
});

describe('Pacientes solo para recepción y administrador', () => {
  test('Odontólogo no busca pacientes', async () => {
    const error = await rechazo(buscar('Prueba', actores.odontologo('p1')));
    expect(error).toBeInstanceOf(AccesoDenegadoError);
    expect(error).toMatchObject({ rol: 'odontologo' });
  });

  test('Paciente no da de alta pacientes', async () => {
    const error = await rechazo(sistema().alta.ejecutar({ actor: actores.paciente(), datos: nuevo }));
    expect(error).toBeInstanceOf(AccesoDenegadoError);
    expect(error).toMatchObject({ rol: 'paciente' });
  });

  test('el acceso se evalúa antes que el texto', async () => {
    await expect(rechazo(buscar('a', actores.odontologo('p1')))).resolves.toBeInstanceOf(AccesoDenegadoError);
  });
});

describe('Pacientes por rol', () => {
  test('Recepción busca pacientes', async () => {
    expect(ids(await buscar('Prueba'))).toEqual(['pa1']);
  });

  test('Odontólogo no da de alta pacientes', async () => {
    const error = await rechazo(sistema().alta.ejecutar({ actor: actores.odontologo('p1'), datos: nuevo }));
    expect(error).toBeInstanceOf(AccesoDenegadoError);
    expect(error).toMatchObject({ rol: 'odontologo' });
  });

  test('el administrador también busca', async () => {
    expect(ids(await buscar('Prueba', actores.administrador))).toEqual(['pa1']);
  });
});
