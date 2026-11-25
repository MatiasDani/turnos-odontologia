import { describe, expect, test } from 'vitest';
import { UsuarioRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/usuario-repositorio.js';
import type { Usuario } from '../../src/domain/usuario.js';

const recepcion: Usuario = {
  id: 'u-rec',
  consultorioId: 'c1',
  email: 'recepcion@demo.test',
  hashClave: 'scrypt$1024$8$1$ficticio$ficticio',
  rol: 'recepcion',
  activo: true,
};
const odontologo: Usuario = { ...recepcion, id: 'u-odo1', email: 'odontologo1@demo.test', rol: 'odontologo', profesionalId: 'p1' };

describe('UsuarioRepositorioEnMemoria', () => {
  test('un usuario guardado se lee por id y por e-mail', async () => {
    const repo = new UsuarioRepositorioEnMemoria();
    await repo.guardar(recepcion);
    await expect(repo.obtenerPorId('u-rec')).resolves.toEqual(recepcion);
    await expect(repo.obtenerPorEmail('recepcion@demo.test')).resolves.toEqual(recepcion);
  });

  test('id o e-mail inexistentes devuelven undefined', async () => {
    const repo = new UsuarioRepositorioEnMemoria([recepcion]);
    await expect(repo.obtenerPorId('u-nadie')).resolves.toBeUndefined();
    await expect(repo.obtenerPorEmail('nadie@demo.test')).resolves.toBeUndefined();
  });

  test('guardar con un id existente reemplaza el usuario', async () => {
    const repo = new UsuarioRepositorioEnMemoria([recepcion, odontologo]);
    await repo.guardar({ ...recepcion, activo: false });
    await expect(repo.obtenerPorId('u-rec')).resolves.toMatchObject({ activo: false });
    await expect(repo.listarPorConsultorio('c1')).resolves.toHaveLength(2);
  });

  test('lista solo los usuarios del consultorio', async () => {
    const repo = new UsuarioRepositorioEnMemoria([recepcion, { ...odontologo, consultorioId: 'c2' }]);
    await expect(repo.listarPorConsultorio('c1')).resolves.toEqual([recepcion]);
  });

  test('modificar el arreglo del constructor no altera el repositorio', async () => {
    const iniciales = [recepcion];
    const repo = new UsuarioRepositorioEnMemoria(iniciales);
    iniciales.push(odontologo);
    await expect(repo.listarPorConsultorio('c1')).resolves.toHaveLength(1);
  });
});
