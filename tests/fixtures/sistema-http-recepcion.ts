// Cableado HTTP de C-15: app Fastify real con /auth (C-09), /public (C-14) y /interno (C-15). Solo tests.
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { HasherClavesScrypt } from '../../src/adapters/crypto/hasher-claves-scrypt.js';
import { crearApp } from '../../src/adapters/http/app.js';
import { rutasRecepcion } from '../../src/adapters/http/rutas-recepcion.js';
import { UsuarioRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/usuario-repositorio.js';
import { componerAutenticacion, componerRecepcion, componerSistema } from '../../src/composicion.js';
import type { BloqueoHorario } from '../../src/domain/bloqueo-horario.js';
import type { Turno } from '../../src/domain/turno.js';
import type { Usuario } from '../../src/domain/usuario.js';
import { RelojFijo } from './reloj-fijo.js';
import { crearEntorno, crearTurno, local, LUNES, MARTES } from './seed.js';
import { CLAVE_FICTICIA, SECRETO_FICTICIO } from './sistema-autenticacion.js';
import { GeneradorIdConPrefijo } from './sistema.js';

/** `t-base`: `confirmado`, `pa1` con `p1`, `s1`, `pr1`, el martes de 09:00 a 09:30 (contexto de `api-interna`). */
export const tBaseRecepcion = (overrides: Partial<Turno> = {}): Turno =>
  crearTurno({ id: 't-base', prestacionId: 'pr1', duracionMinutos: 30, inicio: local(MARTES, '09:00'), fin: local(MARTES, '09:30'), ...overrides });

export interface OpcionesSistemaHttpRecepcion {
  readonly ahora?: Date;
  readonly turnos?: Turno[];
  readonly bloqueos?: BloqueoHorario[];
}

export type Pedido = (url: string, cuerpo?: unknown) => Promise<LightMyRequestResponse>;

export interface SistemaHttpRecepcion {
  readonly app: FastifyInstance;
  readonly reloj: RelojFijo;
  readonly nucleo: ReturnType<typeof componerSistema>;
  readonly lineasDeLog: string[];
  /** Token de una sesión vigente del usuario (`u-rec`, `u-admin` o `u-odo1`). */
  tokenDe(usuario: 'u-rec' | 'u-admin' | 'u-odo1'): Promise<string>;
  /** Pedidos con la sesión del usuario indicado (por defecto `u-rec`). */
  como(usuario?: 'u-rec' | 'u-admin' | 'u-odo1'): Promise<{ get: Pedido; post: Pedido }>;
  sinSesion: { get: Pedido };
  cerrar(): Promise<void>;
}

const EMAILS = { 'u-rec': 'recepcion@demo.test', 'u-admin': 'admin@demo.test', 'u-odo1': 'odontologo1@demo.test' } as const;

/** Sistema completo de recepción con reloj fijo (por defecto lunes 10:00) y usuarios ficticios de C-09. */
export async function crearSistemaHttpRecepcion(opciones: OpcionesSistemaHttpRecepcion = {}): Promise<SistemaHttpRecepcion> {
  const datos = crearEntorno({ turnos: opciones.turnos ?? [tBaseRecepcion()], bloqueos: opciones.bloqueos ?? [] });
  const reloj = new RelojFijo(opciones.ahora ?? local(LUNES, '10:00'));
  const nucleo = componerSistema({ reloj, datos, ids: new GeneradorIdConPrefijo('id-') });
  const hash = await new HasherClavesScrypt({ costo: 2 ** 10 }).hashear(CLAVE_FICTICIA);
  const base = { consultorioId: 'c1', hashClave: hash, activo: true } as const;
  const usuarios: Usuario[] = [
    { ...base, id: 'u-admin', email: EMAILS['u-admin'], rol: 'administrador' },
    { ...base, id: 'u-rec', email: EMAILS['u-rec'], rol: 'recepcion' },
    { ...base, id: 'u-odo1', email: EMAILS['u-odo1'], rol: 'odontologo', profesionalId: 'p1' },
  ];
  const autenticacion = componerAutenticacion({
    reloj,
    jwtSecret: SECRETO_FICTICIO,
    consultorioId: 'c1',
    profesionales: nucleo.repos.profesionales,
    usuarios: new UsuarioRepositorioEnMemoria(usuarios),
    costoHash: 2 ** 10,
  });
  const recepcion = componerRecepcion(nucleo, { resolverSesion: autenticacion.casos.resolverSesion, consultorioId: 'c1' });
  const lineasDeLog: string[] = [];
  const app = crearApp(nucleo.casos, {
    log: { level: 'info', stream: { write: (linea) => void lineasDeLog.push(linea) } },
    autenticacion: autenticacion.casos,
    rutas: [rutasRecepcion(recepcion)],
  });
  await app.ready();

  const pedido = (cabeceras: Record<string, string>) => ({
    get: (url: string) => app.inject({ method: 'GET', url, headers: cabeceras }),
    post: (url: string, cuerpo?: unknown) =>
      app.inject({
        method: 'POST',
        url,
        headers: cuerpo === undefined ? cabeceras : { 'content-type': 'application/json', ...cabeceras },
        ...(cuerpo === undefined ? {} : { payload: JSON.stringify(cuerpo) }),
      }),
  });
  const tokenDe = async (usuario: keyof typeof EMAILS): Promise<string> =>
    (await autenticacion.casos.iniciarSesion.ejecutar({ email: EMAILS[usuario], clave: CLAVE_FICTICIA })).token;

  return {
    app,
    reloj,
    nucleo,
    lineasDeLog,
    tokenDe,
    como: async (usuario = 'u-rec') => pedido({ authorization: `Bearer ${await tokenDe(usuario)}` }),
    sinSesion: { get: pedido({}).get },
    cerrar: () => app.close(),
  };
}
