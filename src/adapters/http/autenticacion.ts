import type { FastifyInstance, FastifyRequest } from 'fastify';
import { ErrorReservaPublica } from '../../application/errores-reserva-publica.js';
import { SesionInvalidaError } from '../../application/errores-autenticacion.js';
import type { IniciarSesion, SesionIniciada } from '../../application/iniciar-sesion.js';
import type { ResolverSesion } from '../../application/resolver-sesion.js';
import type { ActorInterno } from '../../domain/actor.js';
import type { UsuarioPublico } from '../../domain/usuario.js';
import { validarPedidoLogin } from './validadores.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Actor de la sesión, puesto por `crearExigirSesion` (C-09, DD-37). */
    actor: ActorInterno | null;
  }
}

/** Casos de uso que consumen las rutas de autenticación (C-09, design D9). */
export interface CasosDeUsoAutenticacion {
  readonly iniciarSesion: Pick<IniciarSesion, 'ejecutar'>;
  readonly resolverSesion: Pick<ResolverSesion, 'ejecutar'>;
}

const BEARER = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;

function tokenDeCabecera(valor: string | undefined): string {
  const coincidencia = BEARER.exec(valor?.trim() ?? '');
  if (coincidencia?.[1] === undefined) throw new SesionInvalidaError();
  return coincidencia[1];
}

/**
 * `preHandler` de las rutas internas (C-15 lo aplica con `opciones.rutas`): exige
 * `Authorization: Bearer <token>`, resuelve la sesión y deja el actor en `request.actor`.
 * Cualquier falla responde 401 `SESION_INVALIDA`.
 */
export function crearExigirSesion(resolver: Pick<ResolverSesion, 'ejecutar'>) {
  return async (request: FastifyRequest): Promise<void> => {
    const { actor } = await resolver.ejecutar(tokenDeCabecera(request.headers.authorization));
    request.actor = actor;
  };
}

/** Actor de una ruta protegida con `crearExigirSesion`; si falta, la sesión no es válida. */
export function actorDe(request: FastifyRequest): ActorInterno {
  if (request.actor === null) throw new SesionInvalidaError();
  return request.actor;
}

function usuarioJson(usuario: Omit<UsuarioPublico, 'activo' | 'consultorioId'>) {
  return {
    id: usuario.id,
    email: usuario.email,
    rol: usuario.rol,
    ...(usuario.profesionalId === undefined ? {} : { profesionalId: usuario.profesionalId }),
  };
}

function sesionJson(sesion: SesionIniciada) {
  return { token: sesion.token, usuario: { ...usuarioJson(sesion.usuario), venceEn: sesion.usuario.venceEn.toISOString() } };
}

/** `POST /auth/login` y `GET /auth/sesion` (C-09, DD-37). Sin cookies: el token va en la respuesta. */
export function rutasAutenticacion(casos: CasosDeUsoAutenticacion) {
  const exigirSesion = crearExigirSesion(casos.resolverSesion);
  return (app: FastifyInstance, _opts: unknown, hecho: (error?: Error) => void): void => {
    app.post('/auth/login', async (request, reply) => {
      const pedido = validarPedidoLogin(request.body);
      if (!pedido.ok) throw new ErrorReservaPublica('DATOS_INVALIDOS', { campos: pedido.campos });
      const sesion = await casos.iniciarSesion.ejecutar(pedido.valor);
      return reply.header('cache-control', 'no-store').send(sesionJson(sesion));
    });

    app.get('/auth/sesion', { preHandler: exigirSesion }, async (request, reply) => {
      const { usuario } = await casos.resolverSesion.ejecutar(tokenDeCabecera(request.headers.authorization));
      return reply.header('cache-control', 'no-store').send({ usuario: usuarioJson(usuario) });
    });

    hecho();
  };
}
