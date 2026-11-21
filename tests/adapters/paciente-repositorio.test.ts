import { describe, expect, test } from 'vitest';
import { PacienteRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/paciente-repositorio.js';
import type { Paciente } from '../../src/domain/paciente.js';
import { crearEntorno } from '../fixtures/seed.js';

const pacienteFicticio4: Paciente = {
  id: 'pa4',
  nombre: 'Paciente',
  apellido: 'Ficticio 4',
  dni: '00000004',
  telefono: '5491100000004',
  consentimientoContacto: true,
};

describe('PacienteRepositorioEnMemoria', () => {
  test('un DNI inexistente devuelve undefined', async () => {
    const repo = new PacienteRepositorioEnMemoria();
    await expect(repo.obtenerPorDni('00000004')).resolves.toBeUndefined();
  });

  test('un paciente guardado se lee por su DNI', async () => {
    const repo = new PacienteRepositorioEnMemoria();
    await repo.guardar(pacienteFicticio4);
    await expect(repo.obtenerPorDni('00000004')).resolves.toEqual(pacienteFicticio4);
  });

  test('guardar un paciente no afecta la búsqueda de otro DNI', async () => {
    const repo = new PacienteRepositorioEnMemoria();
    await repo.guardar(pacienteFicticio4);
    await expect(repo.obtenerPorDni('00000005')).resolves.toBeUndefined();
  });

  test('los pacientes iniciales del seed se encuentran por DNI', async () => {
    const { pacientes } = crearEntorno();
    const repo = new PacienteRepositorioEnMemoria(pacientes);
    await expect(repo.obtenerPorDni('00000001')).resolves.toMatchObject({ id: 'pa1', nombre: 'Carla' });
    await expect(repo.obtenerPorDni('00000003')).resolves.toMatchObject({ id: 'pa3', nombre: 'Eva' });
  });

  test('guardar un paciente con el mismo id reemplaza el registro, no lo duplica', async () => {
    const repo = new PacienteRepositorioEnMemoria([pacienteFicticio4]);
    await repo.guardar({ ...pacienteFicticio4, telefono: '5491100000099' });
    await expect(repo.obtenerPorDni('00000004')).resolves.toMatchObject({ telefono: '5491100000099' });
    expect(repo.todos()).toHaveLength(1);
  });
});
