// Cableado HTTP de C-09: app Fastify real con las rutas /auth y una ruta interna de prueba.
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { crearApp } from '../../src/adapters/http/app.js';
import { actorDe, crearExigirSesion } from '../../src/adapters/http/autenticacion.js';
import { autorizar } from '../../src/domain/permisos/autorizar.js';
import { crearSistemaAutenticacion, type SistemaAutenticacion } from './sistema-autenticacion.js';
import { crearSistemaPublico } from './sistema-publico.js';

export interface SistemaHttpAutenticacion {
  readonly app: FastifyInstance;
  readonly auth: SistemaAutenticacion;
  readonly lineasDeLog: string[];
  get(url: string, cabeceras?: Record<string, string>): Promise<LightMyRequestResponse>;
  post(url: string, cuerpo?: unknown, cabeceras?: Record<string, string>): Promise<LightMyRequestResponse>;
  /** Token de una sesión vigente del e-mail indicado (clave ficticia del fixture). */
  tokenDe(email: string): Promise<string>;
  cerrar(): Promise<void>;
}

/** Ruta interna de prueba que exige sesión y la acción `usuario.gestionar` (solo administrador). */
export const RUTA_SOLO_ADMIN = '/interno/prueba-solo-admin';

export async function crearSistemaHttpAutenticacion(): Promise<SistemaHttpAutenticacion> {
  const publico = await crearSistemaPublico();
  const auth = await crearSistemaAutenticacion();
  const casosAuth = { iniciarSesion: auth.iniciarSesion, resolverSesion: auth.resolverSesion };
  const exigirSesion = crearExigirSesion(casosAuth.resolverSesion);
  const lineasDeLog: string[] = [];
  const app = crearApp(publico.casos, {
    log: { level: 'info', stream: { write: (linea) => void lineasDeLog.push(linea) } },
    autenticacion: casosAuth,
    rutas: [
      (instancia, _opciones, hecho) => {
        instancia.get(RUTA_SOLO_ADMIN, { preHandler: exigirSesion }, async (request) => {
          autorizar(actorDe(request), 'usuario.gestionar');
          return { ok: true };
        });
        hecho();
      },
    ],
  });
  await app.ready();
  const post: SistemaHttpAutenticacion['post'] = (url, cuerpo, cabeceras = {}) =>
    app.inject({
      method: 'POST',
      url,
      headers: cuerpo === undefined ? cabeceras : { 'content-type': 'application/json', ...cabeceras },
      ...(cuerpo === undefined ? {} : { payload: JSON.stringify(cuerpo) }),
    });
  return {
    app,
    auth,
    lineasDeLog,
    get: (url, cabeceras = {}) => app.inject({ method: 'GET', url, headers: cabeceras }),
    post,
    tokenDe: async (email) => (await post('/auth/login', { email, clave: 'clave-ficticia-01' })).json<{ token: string }>().token,
    cerrar: () => app.close(),
  };
}
