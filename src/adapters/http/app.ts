import Fastify, { type FastifyInstance, type FastifyPluginCallback, type FastifyServerOptions } from 'fastify';
import { ErrorReservaPublica } from '../../application/errores-reserva-publica.js';
import type { CasosDeUsoPublicos } from './casos-de-uso.js';
import { MENSAJE_NO_ENCONTRADO, traducirError } from './errores-http.js';
import { encontrarRaizDelProyecto } from './estaticos.js';
import { serializadoresDeLog } from './logs.js';
import { rutasAutenticacion, type CasosDeUsoAutenticacion } from './autenticacion.js';
import { rutasPublicasPaciente } from './rutas-publicas-paciente.js';

/** Límite del cuerpo de un pedido (D2). */
export const LIMITE_CUERPO_BYTES = 16 * 1024;

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export interface OpcionesApp {
  /** Destino y nivel del log; por defecto desactivado. Los serializadores siempre redactan. */
  readonly log?: { readonly level?: string; readonly stream?: { write(linea: string): void } };
  /** Módulos de rutas adicionales (C-15 registrará `rutasRecepcion` acá, sin tocar las públicas). */
  readonly rutas?: readonly FastifyPluginCallback[];
  /** Raíz del proyecto para la UI y el design system; por defecto se detecta. */
  readonly raiz?: string;
  /** Login y sesión del personal (C-09): registra `/auth/login` y `/auth/sesion`. */
  readonly autenticacion?: CasosDeUsoAutenticacion;
}

function prefiereHtml(accept: string | undefined): boolean {
  const valor = accept ?? '';
  return valor.includes('text/html') && !valor.includes('application/json');
}

/**
 * Fábrica de la app HTTP (DD-29, D1): recibe casos de uso ya construidos, nunca repositorios.
 * Registra las rutas públicas del paciente y los módulos extra, el manejador único de errores y
 * las cabeceras de seguridad.
 */
export function crearApp(casos: CasosDeUsoPublicos, opciones: OpcionesApp = {}): FastifyInstance {
  const logger: FastifyServerOptions['logger'] =
    opciones.log === undefined
      ? false
      : {
          level: opciones.log.level ?? 'info',
          serializers: serializadoresDeLog,
          ...(opciones.log.stream === undefined ? {} : { stream: opciones.log.stream }),
        };
  const app: FastifyInstance = Fastify({ bodyLimit: LIMITE_CUERPO_BYTES, logger });

  // JSON propio: un cuerpo vacío es `undefined` y uno mal formado es `DATOS_INVALIDOS` (`pedido`).
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string', bodyLimit: LIMITE_CUERPO_BYTES }, (_request, cuerpo, hecho) => {
    if (cuerpo === '') return hecho(null, undefined);
    try {
      hecho(null, JSON.parse(cuerpo as string));
    } catch {
      hecho(new ErrorReservaPublica('DATOS_INVALIDOS', { campos: ['pedido'] }), undefined);
    }
  });

  app.addHook('onSend', async (request, reply) => {
    void reply.header('x-content-type-options', 'nosniff');
    void reply.header('referrer-policy', 'no-referrer');
    void reply.header('content-security-policy', CONTENT_SECURITY_POLICY);
    const tipo = String(reply.getHeader('content-type') ?? '');
    const esDatos = tipo.includes('application/json') || request.url.startsWith('/public/turnos/');
    if (esDatos && reply.getHeader('cache-control') === undefined) void reply.header('cache-control', 'no-store');
  });

  app.setErrorHandler((error, request, reply) => {
    const traducido = traducirError(error);
    if (traducido.inesperado) request.log.error({ err: error }, 'error inesperado');
    return reply.code(traducido.estado).type('application/json; charset=utf-8').send(traducido.cuerpo);
  });

  app.setNotFoundHandler((request, reply) => {
    if (prefiereHtml(request.headers.accept)) {
      return reply
        .code(404)
        .type('text/html; charset=utf-8')
        .send(`<!doctype html><html lang="es-AR"><meta charset="utf-8"><title>No encontrado</title><p>${MENSAJE_NO_ENCONTRADO}</p></html>`);
    }
    return reply.code(404).send({ error: { codigo: 'NO_ENCONTRADO', mensaje: MENSAJE_NO_ENCONTRADO } });
  });

  app.decorateRequest('actor', null);
  if (opciones.autenticacion !== undefined) void app.register(rutasAutenticacion(opciones.autenticacion));
  void app.register(rutasPublicasPaciente(casos, { raiz: opciones.raiz ?? encontrarRaizDelProyecto() }));
  for (const modulo of opciones.rutas ?? []) void app.register(modulo);
  return app;
}
