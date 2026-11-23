import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ErrorEnlacePublico } from '../../application/errores-enlace-publico.js';
import { ErrorReservaPublica } from '../../application/errores-reserva-publica.js';
import type { CasosDeUsoPublicos } from './casos-de-uso.js';
import { ESQUEMAS } from './esquemas.js';
import { leerEstatico, leerPagina } from './estaticos.js';
import { validarPedidoReserva } from './pedido-reserva.js';
import {
  aCatalogoJson,
  aConfirmacionJson,
  aDisponibilidadJson,
  aGestionJson,
  aProfesionalesJson,
  aReservaJson,
  aTurnoJson,
} from './serializadores.js';
import {
  esTokenConForma,
  validarConsultaDisponibilidad,
  validarFechaConsulta,
  validarPedidoReprogramacion,
  type Resultado,
} from './validadores.js';

export interface OpcionesRutasPublicas {
  /** Raíz del proyecto, de donde se leen la UI y el design system. */
  readonly raiz: string;
}

function validado<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new ErrorReservaPublica('DATOS_INVALIDOS', { campos: resultado.campos });
  return resultado.valor;
}

/** Token de la ruta; uno con forma inválida es `ENLACE_INVALIDO` sin consultar repositorios (D4). */
function tokenDe(request: FastifyRequest): string {
  const { token } = request.params as { token: string };
  if (!esTokenConForma(token)) throw new ErrorEnlacePublico();
  return token;
}

function quiereJson(request: FastifyRequest): boolean {
  const acepta = String(request.headers.accept ?? '');
  return acepta.includes('application/json') && !acepta.includes('text/html');
}

async function enviarPagina(reply: FastifyReply, raiz: string, pagina: 'reserva.html' | 'gestion.html'): Promise<void> {
  const html = await leerPagina(raiz, pagina);
  await reply.header('cache-control', 'no-store').type('text/html; charset=utf-8').send(html);
}

/**
 * Rutas públicas del paciente (DD-29): páginas, catálogo, disponibilidad, reserva y gestión por token.
 * Ningún `GET` cambia el estado de un turno.
 */
export function rutasPublicasPaciente(casos: CasosDeUsoPublicos, opciones: OpcionesRutasPublicas) {
  return (app: FastifyInstance, _opts: unknown, hecho: (error?: Error) => void): void => {
    const { raiz } = opciones;

    // Páginas y estáticos
    app.get('/public/reservar', async (_request, reply) => enviarPagina(reply, raiz, 'reserva.html'));
    app.get('/public/assets/:archivo', async (request, reply) => {
      const { archivo } = request.params as { archivo: string };
      const estatico = await leerEstatico(raiz, 'web', archivo);
      if (estatico === undefined) return reply.callNotFound();
      return reply.header('cache-control', 'no-cache').type(estatico.tipo).send(estatico.contenido);
    });
    app.get('/public/design-system/*', async (request, reply) => {
      const { '*': archivo } = request.params as { '*': string };
      const estatico = await leerEstatico(raiz, 'design-system', archivo);
      if (estatico === undefined) return reply.callNotFound();
      return reply.header('cache-control', 'no-cache').type(estatico.tipo).send(estatico.contenido);
    });

    // Catálogo y disponibilidad
    app.get('/public/prestaciones', { schema: { response: { 200: ESQUEMAS.catalogo } } }, async () =>
      aCatalogoJson(await casos.catalogo.ejecutar()),
    );
    app.get(
      '/public/prestaciones/:prestacionId/profesionales',
      { schema: { response: { 200: ESQUEMAS.profesionales } } },
      async (request) => {
        const { prestacionId } = request.params as { prestacionId: string };
        return aProfesionalesJson(await casos.profesionales.ejecutar(prestacionId));
      },
    );
    app.get('/public/disponibilidad', { schema: { response: { 200: ESQUEMAS.disponibilidad } } }, async (request) =>
      aDisponibilidadJson(await casos.disponibilidad.ejecutar(validado(validarConsultaDisponibilidad(request.query)))),
    );

    // Reserva
    app.post('/public/reservas', { schema: { response: { 201: ESQUEMAS.reserva } } }, async (request, reply) => {
      const pedido = validado(
        (() => {
          const r = validarPedidoReserva(request.body);
          return r.ok ? ({ ok: true, valor: r.valor } as const) : ({ ok: false, campos: r.campos } as const);
        })(),
      );
      const reserva = await casos.reservar.ejecutar(pedido);
      return reply.code(201).send(aReservaJson(reserva));
    });

    // Gestión por token: página (navegación) o JSON (Accept), siempre `Vary: Accept`
    app.get('/public/turnos/:token', { schema: { response: { 200: ESQUEMAS.gestion } } }, async (request, reply) => {
      void reply.header('vary', 'Accept');
      if (!quiereJson(request)) return enviarPagina(reply, raiz, 'gestion.html');
      return aGestionJson(await casos.gestion.ejecutar({ token: tokenDe(request) }));
    });
    app.get('/public/turnos/:token/confirmar', async (_request, reply) => {
      void reply.header('vary', 'Accept');
      return enviarPagina(reply, raiz, 'gestion.html');
    });
    app.post('/public/turnos/:token/confirmar', { schema: { response: { 200: ESQUEMAS.confirmacion } } }, async (request) => {
      const r = await casos.confirmar.ejecutar({ token: tokenDe(request) });
      return aConfirmacionJson(r.inicio, r.fin);
    });
    app.post('/public/turnos/:token/cancelar', { schema: { response: { 200: ESQUEMAS.turnoCancelado } } }, async (request) => ({
      ...aTurnoJson(await casos.cancelar.ejecutar({ token: tokenDe(request) })),
      estado: 'cancelado',
    }));
    app.get(
      '/public/turnos/:token/disponibilidad',
      { schema: { response: { 200: ESQUEMAS.disponibilidad } } },
      async (request) => {
        const token = tokenDe(request);
        const { fecha } = validado(validarFechaConsulta(request.query));
        return aDisponibilidadJson(await casos.disponibilidadParaReprogramar.ejecutar({ token, fecha }));
      },
    );
    app.post('/public/turnos/:token/reprogramar', { schema: { response: { 200: ESQUEMAS.turno } } }, async (request) => {
      const token = tokenDe(request);
      const { inicio } = validado(validarPedidoReprogramacion(request.body));
      return aTurnoJson(await casos.reprogramar.ejecutar({ token, inicio }));
    });

    hecho();
  };
}
