import { describe, expect, test } from 'vitest';
import { CredencialesInvalidasError, SesionInvalidaError } from '../../src/application/errores-autenticacion.js';
import { AccesoDenegadoError, ConfiguracionInvalidaError, RecursoNoEncontradoError } from '../../src/domain/errores.js';
import { actores } from '../fixtures/actores.js';
import { local, LUNES } from '../fixtures/seed.js';
import { CLAVE_FICTICIA, crearSistemaAutenticacion, SECRETO_FICTICIO, type SistemaAutenticacion } from '../fixtures/sistema-autenticacion.js';
import { rechazo } from '../fixtures/sistema.js';
import { EmisorSesionJose } from '../../src/adapters/crypto/emisor-sesion-jose.js';

/** Escenarios de `specs/autenticacion-usuarios/spec.md` (C-09), salvo las rutas HTTP. */
const admin = actores.administrador;
const CLAVE_02 = 'clave-ficticia-02';

async function esperarInvalida(promesa: Promise<unknown>, campo: string): Promise<ConfiguracionInvalidaError> {
  const error = await rechazo(promesa);
  expect(error).toBeInstanceOf(ConfiguracionInvalidaError);
  expect(error).toMatchObject({ campo });
  return error as ConfiguracionInvalidaError;
}

const cantidad = async (s: SistemaAutenticacion) => (await s.usuarios.listarPorConsultorio('c1')).length;

describe('Usuarios internos con rol interno', () => {
  test('El administrador crea un usuario de recepción', async () => {
    const s = await crearSistemaAutenticacion();
    const creado = await s.gestionar.crear({ actor: admin, email: 'recepcion2@demo.test', rol: 'recepcion', clave: CLAVE_02 });
    expect(creado).toMatchObject({ email: 'recepcion2@demo.test', rol: 'recepcion', activo: true });
    await expect(s.usuarios.obtenerPorId(creado.id)).resolves.toMatchObject({ rol: 'recepcion', activo: true });
  });

  test('No se crean usuarios con rol paciente', async () => {
    const s = await crearSistemaAutenticacion();
    await esperarInvalida(s.gestionar.crear({ actor: admin, email: 'paciente@demo.test', rol: 'paciente', clave: CLAVE_02 }), 'rol');
    expect(await cantidad(s)).toBe(3);
  });
});

describe('Profesional vinculado solo al odontólogo', () => {
  test('Odontólogo vinculado a su profesional', async () => {
    const s = await crearSistemaAutenticacion();
    const creado = await s.gestionar.crear({
      actor: admin,
      email: 'odontologo2@demo.test',
      rol: 'odontologo',
      profesionalId: 'p2',
      clave: CLAVE_02,
    });
    expect(creado).toMatchObject({ rol: 'odontologo', profesionalId: 'p2' });
  });

  test('Odontólogo sin profesional rechazado', async () => {
    const s = await crearSistemaAutenticacion();
    await esperarInvalida(
      s.gestionar.crear({ actor: admin, email: 'odontologo2@demo.test', rol: 'odontologo', clave: CLAVE_02 }),
      'profesionalId',
    );
  });

  test('Recepción con profesional rechazada', async () => {
    const s = await crearSistemaAutenticacion();
    await esperarInvalida(
      s.gestionar.crear({ actor: admin, email: 'recepcion2@demo.test', rol: 'recepcion', profesionalId: 'p1', clave: CLAVE_02 }),
      'profesionalId',
    );
  });

  test('Profesional inexistente', async () => {
    const s = await crearSistemaAutenticacion();
    const error = await rechazo(
      s.gestionar.crear({ actor: admin, email: 'odontologo2@demo.test', rol: 'odontologo', profesionalId: 'p-inexistente', clave: CLAVE_02 }),
    );
    expect(error).toBeInstanceOf(RecursoNoEncontradoError);
    expect(error).toMatchObject({ tipo: 'profesional', id: 'p-inexistente' });
    expect(await cantidad(s)).toBe(3);
  });
});

describe('E-mail único y normalizado', () => {
  test('E-mail normalizado al guardarse', async () => {
    const s = await crearSistemaAutenticacion();
    const creado = await s.gestionar.crear({ actor: admin, email: '  Recepcion2@Demo.TEST ', rol: 'recepcion', clave: CLAVE_02 });
    expect(creado.email).toBe('recepcion2@demo.test');
  });

  test('E-mail repetido con otras mayúsculas', async () => {
    const s = await crearSistemaAutenticacion();
    await esperarInvalida(s.gestionar.crear({ actor: admin, email: 'RECEPCION@demo.test', rol: 'recepcion', clave: CLAVE_02 }), 'email');
    expect(await cantidad(s)).toBe(3);
  });

  test('E-mail sin dominio rechazado', async () => {
    const s = await crearSistemaAutenticacion();
    await esperarInvalida(s.gestionar.crear({ actor: admin, email: 'recepcion2', rol: 'recepcion', clave: CLAVE_02 }), 'email');
  });
});

describe('Política de clave', () => {
  test('Clave de 10 caracteres aceptada', async () => {
    const s = await crearSistemaAutenticacion();
    await expect(s.gestionar.crear({ actor: admin, email: 'recepcion2@demo.test', rol: 'recepcion', clave: 'abcdefghij' })).resolves.toMatchObject({
      email: 'recepcion2@demo.test',
    });
  });

  test('Clave de 9 caracteres rechazada', async () => {
    const s = await crearSistemaAutenticacion();
    await esperarInvalida(s.gestionar.crear({ actor: admin, email: 'recepcion2@demo.test', rol: 'recepcion', clave: 'abcdefghi' }), 'clave');
  });

  test('Clave de 129 caracteres rechazada', async () => {
    const s = await crearSistemaAutenticacion();
    await esperarInvalida(s.gestionar.crear({ actor: admin, email: 'recepcion2@demo.test', rol: 'recepcion', clave: 'a'.repeat(129) }), 'clave');
  });
});

describe('La clave nunca se guarda ni se expone en claro', () => {
  test('Lo guardado no contiene la clave', async () => {
    const s = await crearSistemaAutenticacion();
    const creado = await s.gestionar.crear({ actor: admin, email: 'recepcion2@demo.test', rol: 'recepcion', clave: CLAVE_02 });
    const guardado = await s.usuarios.obtenerPorId(creado.id);
    expect(JSON.stringify(guardado)).not.toContain(CLAVE_02);
    expect(JSON.stringify(creado)).not.toContain(CLAVE_02);
    expect(creado).not.toHaveProperty('hashClave');
  });

  test('Misma clave, hashes distintos', async () => {
    const s = await crearSistemaAutenticacion();
    const a = await s.gestionar.crear({ actor: admin, email: 'recepcion2@demo.test', rol: 'recepcion', clave: CLAVE_02 });
    const b = await s.gestionar.crear({ actor: admin, email: 'recepcion3@demo.test', rol: 'recepcion', clave: CLAVE_02 });
    const [hashA, hashB] = await Promise.all([s.usuarios.obtenerPorId(a.id), s.usuarios.obtenerPorId(b.id)]);
    expect(hashA?.hashClave).not.toBe(hashB?.hashClave);
  });

  test('El rechazo no repite la clave', async () => {
    const s = await crearSistemaAutenticacion();
    const error = await esperarInvalida(
      s.gestionar.crear({ actor: admin, email: 'recepcion2@demo.test', rol: 'recepcion', clave: 'abcdefghi' }),
      'clave',
    );
    expect(error.message).not.toContain('abcdefghi');
  });
});

describe('Solo el administrador gestiona usuarios', () => {
  test('Recepción no puede crear usuarios', async () => {
    const s = await crearSistemaAutenticacion();
    const error = await rechazo(s.gestionar.crear({ actor: actores.recepcion, email: 'recepcion2@demo.test', rol: 'recepcion', clave: CLAVE_02 }));
    expect(error).toBeInstanceOf(AccesoDenegadoError);
    expect(error).toMatchObject({ rol: 'recepcion' });
    expect(await cantidad(s)).toBe(3);
  });

  test('Odontólogo no puede restablecer claves', async () => {
    const s = await crearSistemaAutenticacion();
    const error = await rechazo(s.gestionar.restablecerClave({ actor: actores.odontologo('p1'), usuarioId: 'u-rec', clave: 'clave-ficticia-09' }));
    expect(error).toBeInstanceOf(AccesoDenegadoError);
    expect(error).toMatchObject({ rol: 'odontologo' });
  });

  test('El acceso se evalúa antes que los datos', async () => {
    const s = await crearSistemaAutenticacion();
    const error = await rechazo(s.gestionar.crear({ actor: actores.recepcion, email: 'recepcion2', rol: 'paciente', clave: 'abc' }));
    expect(error).toBeInstanceOf(AccesoDenegadoError);
  });
});

describe('Desactivación y reactivación de usuarios', () => {
  test('Desactivar un usuario de recepción', async () => {
    const s = await crearSistemaAutenticacion();
    await expect(s.gestionar.desactivar({ actor: admin, usuarioId: 'u-rec' })).resolves.toMatchObject({ activo: false });
    await expect(s.usuarios.obtenerPorId('u-rec')).resolves.toMatchObject({ activo: false, email: 'recepcion@demo.test' });
  });

  test('Reactivar un usuario', async () => {
    const s = await crearSistemaAutenticacion();
    await s.gestionar.desactivar({ actor: admin, usuarioId: 'u-rec' });
    await expect(s.gestionar.reactivar({ actor: admin, usuarioId: 'u-rec' })).resolves.toMatchObject({ activo: true });
  });

  test('No se desactiva al último administrador activo', async () => {
    const s = await crearSistemaAutenticacion();
    await esperarInvalida(s.gestionar.desactivar({ actor: admin, usuarioId: 'u-admin' }), 'usuarioId');
    await expect(s.usuarios.obtenerPorId('u-admin')).resolves.toMatchObject({ activo: true });
  });

  test('con otro administrador activo sí se puede desactivar', async () => {
    const s = await crearSistemaAutenticacion();
    await s.gestionar.crear({ actor: admin, email: 'admin2@demo.test', rol: 'administrador', clave: CLAVE_02 });
    await expect(s.gestionar.desactivar({ actor: admin, usuarioId: 'u-admin' })).resolves.toMatchObject({ activo: false });
  });
});

describe('Restablecimiento de clave por el administrador', () => {
  const conClaveNueva = async () => {
    const s = await crearSistemaAutenticacion();
    await s.gestionar.restablecerClave({ actor: admin, usuarioId: 'u-rec', clave: 'clave-ficticia-09' });
    return s;
  };

  test('La clave anterior deja de servir', async () => {
    const s = await conClaveNueva();
    await expect(rechazo(s.iniciarSesion.ejecutar({ email: 'recepcion@demo.test', clave: CLAVE_FICTICIA }))).resolves.toBeInstanceOf(
      CredencialesInvalidasError,
    );
  });

  test('La clave nueva sirve', async () => {
    const s = await conClaveNueva();
    const sesion = await s.iniciarSesion.ejecutar({ email: 'recepcion@demo.test', clave: 'clave-ficticia-09' });
    expect(sesion.usuario.rol).toBe('recepcion');
  });

  test('la clave nueva respeta la política', async () => {
    const s = await crearSistemaAutenticacion();
    await esperarInvalida(s.gestionar.restablecerClave({ actor: admin, usuarioId: 'u-rec', clave: 'corta' }), 'clave');
  });
});

describe('Administrador inicial', () => {
  const datos = { email: 'admin-inicial@demo.test', clave: 'clave-ficticia-inicial' };

  test('Primer arranque crea el administrador', async () => {
    const s = await crearSistemaAutenticacion({ sinUsuarios: true });
    await expect(s.adminInicial.ejecutar(datos)).resolves.toBe(true);
    await expect(s.usuarios.obtenerPorEmail('admin-inicial@demo.test')).resolves.toMatchObject({ rol: 'administrador', activo: true });
    const sesion = await s.iniciarSesion.ejecutar(datos);
    expect(sesion.usuario.rol).toBe('administrador');
  });

  test('Con usuarios existentes no crea nada', async () => {
    const s = await crearSistemaAutenticacion();
    await expect(s.adminInicial.ejecutar(datos)).resolves.toBe(false);
    await expect(s.usuarios.obtenerPorEmail('admin-inicial@demo.test')).resolves.toBeUndefined();
  });

  test('sin datos no crea nada', async () => {
    const s = await crearSistemaAutenticacion({ sinUsuarios: true });
    await expect(s.adminInicial.ejecutar(undefined)).resolves.toBe(false);
    expect(await cantidad(s)).toBe(0);
  });

  test('la clave inicial respeta la política', async () => {
    const s = await crearSistemaAutenticacion({ sinUsuarios: true });
    await esperarInvalida(s.adminInicial.ejecutar({ email: 'admin-inicial@demo.test', clave: 'corta' }), 'clave');
  });
});

describe('Inicio de sesión', () => {
  test('Recepción inicia sesión', async () => {
    const s = await crearSistemaAutenticacion();
    const sesion = await s.iniciarSesion.ejecutar({ email: 'recepcion@demo.test', clave: CLAVE_FICTICIA });
    expect(sesion.token).toEqual(expect.any(String));
    expect(sesion.usuario).toMatchObject({ id: 'u-rec', email: 'recepcion@demo.test', rol: 'recepcion' });
    expect(sesion.usuario).not.toHaveProperty('hashClave');
    expect(sesion.usuario.venceEn).toEqual(local(LUNES, '18:00'));
  });

  test('Odontólogo inicia sesión con su profesional', async () => {
    const s = await crearSistemaAutenticacion();
    const sesion = await s.iniciarSesion.ejecutar({ email: ' Odontologo1@Demo.test ', clave: CLAVE_FICTICIA });
    expect(sesion.usuario).toMatchObject({ id: 'u-odo1', rol: 'odontologo', profesionalId: 'p1' });
  });
});

describe('Falla de inicio de sesión genérica', () => {
  const fallo = async (s: SistemaAutenticacion, email: string, clave: string) =>
    rechazo(s.iniciarSesion.ejecutar({ email, clave })) as Promise<Error>;

  test('Clave incorrecta', async () => {
    const s = await crearSistemaAutenticacion();
    await expect(fallo(s, 'recepcion@demo.test', 'clave-incorrecta')).resolves.toBeInstanceOf(CredencialesInvalidasError);
  });

  test('E-mail inexistente', async () => {
    const s = await crearSistemaAutenticacion();
    const [inexistente, incorrecta] = await Promise.all([
      fallo(s, 'nadie@demo.test', CLAVE_FICTICIA),
      fallo(s, 'recepcion@demo.test', 'clave-incorrecta'),
    ]);
    expect(inexistente).toBeInstanceOf(CredencialesInvalidasError);
    expect(inexistente.message).toBe(incorrecta.message);
  });

  test('Usuario inactivo', async () => {
    const s = await crearSistemaAutenticacion();
    await s.gestionar.desactivar({ actor: admin, usuarioId: 'u-rec' });
    const [inactivo, incorrecta] = await Promise.all([
      fallo(s, 'recepcion@demo.test', CLAVE_FICTICIA),
      fallo(s, 'admin@demo.test', 'clave-incorrecta'),
    ]);
    expect(inactivo).toBeInstanceOf(CredencialesInvalidasError);
    expect(inactivo.message).toBe(incorrecta.message);
  });

  test('con un e-mail inexistente igual verifica un hash (design D8)', async () => {
    const s = await crearSistemaAutenticacion();
    let verificaciones = 0;
    const original = s.hasher.verificar.bind(s.hasher);
    s.hasher.verificar = (clave, hash) => {
      verificaciones += 1;
      return original(clave, hash);
    };
    await fallo(s, 'nadie@demo.test', CLAVE_FICTICIA);
    expect(verificaciones).toBe(1);
  });
});

describe('Vencimiento de la sesión', () => {
  test('Sesión válida un segundo antes de vencer', async () => {
    const s = await crearSistemaAutenticacion();
    const { token } = await s.iniciarSesion.ejecutar({ email: 'recepcion@demo.test', clave: CLAVE_FICTICIA });
    s.reloj.fijar(new Date(local(LUNES, '18:00').getTime() - 1000));
    await expect(s.resolverSesion.ejecutar(token)).resolves.toMatchObject({ actor: { rol: 'recepcion', usuarioId: 'u-rec' } });
  });

  test('Sesión vencida a las 8 h exactas', async () => {
    const s = await crearSistemaAutenticacion();
    const { token } = await s.iniciarSesion.ejecutar({ email: 'recepcion@demo.test', clave: CLAVE_FICTICIA });
    s.reloj.fijar(local(LUNES, '18:00'));
    await expect(rechazo(s.resolverSesion.ejecutar(token))).resolves.toBeInstanceOf(SesionInvalidaError);
  });
});

describe('Sesión resuelta con los datos actuales del usuario', () => {
  test('Usuario desactivado durante la sesión', async () => {
    const s = await crearSistemaAutenticacion();
    const { token } = await s.iniciarSesion.ejecutar({ email: 'recepcion@demo.test', clave: CLAVE_FICTICIA });
    s.reloj.fijar(local(LUNES, '10:30'));
    await s.gestionar.desactivar({ actor: admin, usuarioId: 'u-rec' });
    s.reloj.fijar(local(LUNES, '10:31'));
    await expect(rechazo(s.resolverSesion.ejecutar(token))).resolves.toBeInstanceOf(SesionInvalidaError);
  });

  test('Token alterado', async () => {
    const s = await crearSistemaAutenticacion();
    const { token } = await s.iniciarSesion.ejecutar({ email: 'recepcion@demo.test', clave: CLAVE_FICTICIA });
    const medio = Math.floor(token.length / 2);
    const alterado = token.slice(0, medio) + (token[medio] === 'A' ? 'B' : 'A') + token.slice(medio + 1);
    await expect(rechazo(s.resolverSesion.ejecutar(alterado))).resolves.toBeInstanceOf(SesionInvalidaError);
  });

  test('Token firmado con otro secreto', async () => {
    const s = await crearSistemaAutenticacion();
    const ajeno = await new EmisorSesionJose(`${SECRETO_FICTICIO}-distinto`).emitir('u-admin', s.reloj.ahora());
    await expect(rechazo(s.resolverSesion.ejecutar(ajeno.token))).resolves.toBeInstanceOf(SesionInvalidaError);
  });

  test('el actor del odontólogo trae su profesional guardado', async () => {
    const s = await crearSistemaAutenticacion();
    const { token } = await s.iniciarSesion.ejecutar({ email: 'odontologo1@demo.test', clave: CLAVE_FICTICIA });
    await expect(s.resolverSesion.ejecutar(token)).resolves.toMatchObject({
      actor: { rol: 'odontologo', usuarioId: 'u-odo1', profesionalId: 'p1' },
    });
  });
});
