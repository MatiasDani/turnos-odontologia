import { EmisorSesionJose } from '../../src/adapters/crypto/emisor-sesion-jose.js';
import { HasherClavesScrypt } from '../../src/adapters/crypto/hasher-claves-scrypt.js';
import { ProfesionalRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/catalogos.js';
import { UsuarioRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/usuario-repositorio.js';
import { CrearAdministradorInicial } from '../../src/application/crear-administrador-inicial.js';
import { GestionarUsuarios } from '../../src/application/gestionar-usuarios.js';
import { IniciarSesion } from '../../src/application/iniciar-sesion.js';
import { ResolverSesion } from '../../src/application/resolver-sesion.js';
import type { Usuario } from '../../src/domain/usuario.js';
import { RelojFijo } from './reloj-fijo.js';
import { crearEntorno, local, LUNES } from './seed.js';
import { GeneradorIdConPrefijo } from './sistema.js';

/** Clave ficticia de los usuarios del contexto del spec `autenticacion-usuarios`. */
export const CLAVE_FICTICIA = 'clave-ficticia-01';
/** Secreto ficticio de 32 caracteres, solo para tests (regla dura 9). */
export const SECRETO_FICTICIO = 'secreto-ficticio-de-tests-0123456';

export interface OpcionesSistemaAutenticacion {
  readonly ahora?: Date;
  /** Sin usuarios iniciales (primer arranque). */
  readonly sinUsuarios?: boolean;
}

/**
 * Cableado de usuarios y sesión (C-09) con hash scrypt de costo bajo. Usuarios activos:
 * `u-admin` (administrador), `u-rec` (recepción) y `u-odo1` (odontólogo de `p1`), todos con
 * `clave-ficticia-01`. `ahora`: lunes 10:00.
 */
export async function crearSistemaAutenticacion(opciones: OpcionesSistemaAutenticacion = {}) {
  const datos = crearEntorno();
  const reloj = new RelojFijo(opciones.ahora ?? local(LUNES, '10:00'));
  const hasher = new HasherClavesScrypt({ costo: 2 ** 10 });
  const hash = await hasher.hashear(CLAVE_FICTICIA);
  const base = { consultorioId: 'c1', hashClave: hash, activo: true } as const;
  const iniciales: Usuario[] = opciones.sinUsuarios
    ? []
    : [
        { ...base, id: 'u-admin', email: 'admin@demo.test', rol: 'administrador' },
        { ...base, id: 'u-rec', email: 'recepcion@demo.test', rol: 'recepcion' },
        { ...base, id: 'u-odo1', email: 'odontologo1@demo.test', rol: 'odontologo', profesionalId: 'p1' },
      ];
  const usuarios = new UsuarioRepositorioEnMemoria(iniciales);
  const profesionales = new ProfesionalRepositorioEnMemoria(datos.profesionales);
  const emisor = new EmisorSesionJose(SECRETO_FICTICIO);
  const ids = new GeneradorIdConPrefijo('u-nuevo');
  return {
    reloj,
    hasher,
    usuarios,
    emisor,
    gestionar: new GestionarUsuarios({ usuarios, profesionales, hasher, ids, consultorioId: 'c1' }),
    adminInicial: new CrearAdministradorInicial({ usuarios, hasher, ids, consultorioId: 'c1' }),
    iniciarSesion: new IniciarSesion({ usuarios, hasher, emisor, reloj }),
    resolverSesion: new ResolverSesion({ usuarios, emisor, reloj }),
  };
}

export type SistemaAutenticacion = Awaited<ReturnType<typeof crearSistemaAutenticacion>>;
