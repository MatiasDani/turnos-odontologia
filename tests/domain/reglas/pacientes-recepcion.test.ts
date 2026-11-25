import { describe, expect, test } from 'vitest';
import { coincidePaciente, normalizarBusqueda, normalizarTexto } from '../../../src/domain/reglas/pacientes-recepcion.js';

const carla = { nombre: 'Carla', apellido: 'Prueba', dni: '00000001' };
const eva = { nombre: 'Eva', apellido: 'Simulada', dni: '00000003' };
const nunez = { nombre: 'Ñandú', apellido: 'Núñez', dni: '30000009' };

describe('normalizarTexto', () => {
  test('pasa a minúsculas y quita tildes, conservando la ñ como n', () => {
    expect(normalizarTexto('  Núñez ÁÉÍÓÚ ')).toBe('nunez aeiou');
  });
});

describe('normalizarBusqueda (RN-34)', () => {
  test.each(['', 'ca', ' ca ', '  1 '])('%j tiene menos de 3 caracteres y es null', (texto) => {
    expect(normalizarBusqueda(texto)).toBeNull();
  });

  test('3 caracteres alcanzan', () => {
    expect(normalizarBusqueda(' Car ')).toEqual({ texto: 'car', porDni: false });
  });

  test('solo dígitos busca por DNI', () => {
    expect(normalizarBusqueda('0000000')).toEqual({ texto: '0000000', porDni: true });
  });
});

describe('coincidePaciente', () => {
  test('prefijo de DNI', () => {
    const b = normalizarBusqueda('000')!;
    expect(coincidePaciente(carla, b)).toBe(true);
    expect(coincidePaciente(nunez, b)).toBe(false);
  });

  test('el DNI se compara por prefijo, no por contenido', () => {
    expect(coincidePaciente(carla, normalizarBusqueda('0001')!)).toBe(false);
  });

  test('apellido sin tildes ni mayúsculas', () => {
    expect(coincidePaciente(eva, normalizarBusqueda('SIMULADA')!)).toBe(true);
    expect(coincidePaciente(nunez, normalizarBusqueda('nunez')!)).toBe(true);
  });

  test('parte del nombre', () => {
    expect(coincidePaciente(carla, normalizarBusqueda('carl')!)).toBe(true);
    expect(coincidePaciente(eva, normalizarBusqueda('carl')!)).toBe(false);
  });

  test('nombre y apellido juntos', () => {
    expect(coincidePaciente(carla, normalizarBusqueda('carla prue')!)).toBe(true);
  });
});
