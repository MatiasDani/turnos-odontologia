import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AltaRapidaPaciente } from '../../application/alta-rapida-paciente.js';
import type { BloquearHorario } from '../../application/bloquear-horario.js';
import type { BuscarPacientes, ResumenPaciente } from '../../application/buscar-pacientes.js';
import type { CancelarTurno } from '../../application/cancelar-turno.js';
import type { ConfirmarTurno } from '../../application/confirmar-turno.js';
import type { DisponibilidadInterna } from '../../application/disponibilidad-interna.js';
import { ErrorReservaPublica } from '../../application/errores-reserva-publica.js';
import type { LiberarBloqueo } from '../../application/liberar-bloqueo.js';
import type { ListarCatalogoInterno } from '../../application/listar-catalogo-interno.js';
import type { ListarRecordatoriosPendientesWaMe } from '../../application/listar-recordatorios-wa-me-pendientes.js';
import type { MarcarAtendido } from '../../application/marcar-atendido.js';
import type { MarcarAusente } from '../../application/marcar-ausente.js';
import type { MarcarRecordatorioEnviado } from '../../application/marcar-recordatorio-enviado.js';
import type { TurnoRepositorio } from '../../application/puertos/repositorios.js';
import type { ReprogramarTurno } from '../../application/reprogramar-turno.js';
import type { ResolverSesion } from '../../application/resolver-sesion.js';
import type { VistaAgenda } from '../../application/vista-agenda.js';
import type { AgendarTurno } from '../../application/agendar-turno.js';
import { ReglaNegocioError } from '../../domain/errores.js';
import type { Turno } from '../../domain/turno.js';
import { actorDe, crearExigirSesion } from './autenticacion.js';
import { encontrarRaizDelProyecto, leerEstatico, leerPagina } from './estaticos.js';
import { MENSAJES_RN } from './errores-http.js';
import type { Resultado } from './validadores.js';
import {
  validarAltaPaciente,
  validarBloqueo,
  validarConsultaAgenda,
  validarConsultaDisponibilidadInterna,
  validarNuevoTurno,
  validarReprogramacion,
  validarTextoBusqueda,
} from './validadores-internos.js';

/** Casos de uso que consume la API interna de recepción (C-15, DD-41). Ninguno se modifica. */
export interface CasosDeUsoRecepcion {
  readonly resolverSesion: Pick<ResolverSesion, 'ejecutar'>;
  readonly vista: Pick<VistaAgenda, 'diaria' | 'semanal' | 'turno' | 'bloqueo'>;
  readonly catalogo: Pick<ListarCatalogoInterno, 'ejecutar'>;
  readonly disponibilidad: Pick<DisponibilidadInterna, 'ejecutar'>;
  readonly buscarPacientes: Pick<BuscarPacientes, 'ejecutar'>;
  readonly resumenPaciente: Pick<ResumenPaciente, 'ejecutar'>;
  readonly altaPaciente: Pick<AltaRapidaPaciente, 'ejecutar'>;
  /** `AgendarTurnoConRecordatorio`: el alta interna programa su recordatorio (Flujo 1). */
  readonly agendar: Pick<AgendarTurno, 'ejecutar'>;
  readonly cancelar: Pick<CancelarTurno, 'ejecutar'>;
  readonly confirmar: Pick<ConfirmarTurno, 'ejecutar'>;
  readonly atendido: Pick<MarcarAtendido, 'ejecutar'>;
  readonly ausente: Pick<MarcarAusente, 'ejecutar'>;
  readonly reprogramar: Pick<ReprogramarTurno, 'ejecutar'>;
  readonly bloquear: Pick<BloquearHorario, 'ejecutar'>;
  readonly liberar: Pick<LiberarBloqueo, 'ejecutar'>;
  readonly listarWaMe: Pick<ListarRecordatoriosPendientesWaMe, 'ejecutar'>;
  readonly marcarEnviado: Pick<MarcarRecordatorioEnviado, 'ejecutar'>;
  readonly turnos: Pick<TurnoRepositorio, 'obtenerPorId'>;
}

function validado<T>(resultado: Resultado<T>): T {
  if (!resultado.ok) throw new ErrorReservaPublica('DATOS_INVALIDOS', { campos: resultado.campos });
  return resultado.valor;
}

const idDe = (request: FastifyRequest): string => (request.params as { id: string }).id;

const sinCache = (reply: FastifyReply): FastifyReply => reply.header('cache-control', 'no-store');

/**
 * API interna `/interno/*` (C-15, DD-41): todas las rutas exigen la sesión de C-09 y leen el actor
 * con `actorDe`; los permisos los decide cada caso de uso. Fechas e instantes viajan en ISO UTC.
 */
export function rutasRecepcion(casos: CasosDeUsoRecepcion, opciones: { readonly raiz?: string } = {}) {
  const exigirSesion = crearExigirSesion(casos.resolverSesion);
  const raiz = opciones.raiz ?? encontrarRaizDelProyecto();
  return (app: FastifyInstance, _opts: unknown, hecho: (error?: Error) => void): void => {
    // Páginas estáticas sin datos (la sesión la verifica la API) y estáticos en lista blanca (DD-38).
    const pagina = (archivo: 'recepcion/login.html' | 'recepcion/agenda.html') => async (_r: FastifyRequest, reply: FastifyReply) =>
      sinCache(reply).type('text/html; charset=utf-8').send(await leerPagina(raiz, archivo));
    app.get('/recepcion', pagina('recepcion/agenda.html'));
    app.get('/recepcion/login', pagina('recepcion/login.html'));
    app.get('/recepcion/assets/:archivo', async (request, reply) => {
      const { archivo } = request.params as { archivo: string };
      const estatico = await leerEstatico(raiz, 'recepcion', archivo);
      if (estatico === undefined) return reply.callNotFound();
      return reply.header('cache-control', 'no-cache').type(estatico.tipo).send(estatico.contenido);
    });

    app.register(
      (interno, _o, listo) => {
        interno.addHook('preHandler', exigirSesion);
        interno.addHook('onSend', async (_request, reply) => {
          sinCache(reply);
        });

        interno.get('/catalogo', async (request) => {
          const actor = actorDe(request);
          const catalogo = await casos.catalogo.ejecutar({ actor });
          return { ...catalogo, usuario: { rol: actor.rol, ...(actor.rol === 'odontologo' ? { profesionalId: actor.profesionalId } : {}) } };
        });

        interno.get('/agenda', async (request) => {
          const actor = actorDe(request);
          const { vista, ...filtros } = validado(validarConsultaAgenda(request.query));
          return vista === 'dia' ? casos.vista.diaria({ actor, ...filtros }) : casos.vista.semanal({ actor, ...filtros });
        });

        interno.get('/disponibilidad', async (request) => {
          const consulta = validado(validarConsultaDisponibilidadInterna(request.query));
          return { horarios: await casos.disponibilidad.ejecutar({ actor: actorDe(request), ...consulta }) };
        });

        interno.get('/pacientes', async (request) => {
          const texto = validado(validarTextoBusqueda(request.query));
          return casos.buscarPacientes.ejecutar({ actor: actorDe(request), texto });
        });

        interno.get('/pacientes/:id', async (request) => casos.resumenPaciente.ejecutar({ actor: actorDe(request), pacienteId: idDe(request) }));

        interno.post('/pacientes', async (request, reply) => {
          const datos = validado(validarAltaPaciente(request.body));
          return reply.code(201).send(await casos.altaPaciente.ejecutar({ actor: actorDe(request), datos }));
        });

        interno.post('/turnos', async (request, reply) => {
          const pedido = validado(validarNuevoTurno(request.body));
          const turno = await casos.agendar.ejecutar({ actor: actorDe(request), ...pedido });
          return reply.code(201).send(await casos.vista.turno(turno));
        });

        const accionSobreTurno = (ruta: string, ejecutar: (actor: ReturnType<typeof actorDe>, turnoId: string) => Promise<Turno>) =>
          interno.post(`/turnos/:id/${ruta}`, async (request) => casos.vista.turno(await ejecutar(actorDe(request), idDe(request))));
        accionSobreTurno('cancelar', (actor, turnoId) => casos.cancelar.ejecutar({ actor, turnoId }));
        accionSobreTurno('confirmar', (actor, turnoId) => casos.confirmar.ejecutar({ actor, turnoId }));
        accionSobreTurno('atendido', (actor, turnoId) => casos.atendido.ejecutar({ actor, turnoId }));
        accionSobreTurno('ausente', (actor, turnoId) => casos.ausente.ejecutar({ actor, turnoId }));

        interno.post('/turnos/:id/reprogramar', async (request) => {
          const pedido = validado(validarReprogramacion(request.body));
          return casos.vista.turno(await casos.reprogramar.ejecutar({ actor: actorDe(request), turnoId: idDe(request), ...pedido }));
        });

        interno.post('/bloqueos', async (request, reply) => {
          const pedido = validado(validarBloqueo(request.body));
          try {
            const bloqueo = await casos.bloquear.ejecutar({ actor: actorDe(request), ...pedido });
            return await reply.code(201).send(await casos.vista.bloqueo(bloqueo));
          } catch (error) {
            // RN-31: la recepción necesita saber qué turnos impiden el bloqueo (con nombres).
            if (error instanceof ReglaNegocioError && error.codigo === 'RN-31') {
              const turnos = await Promise.all((error.turnosEnConflicto ?? []).map((t) => casos.vista.turno(t)));
              return reply.code(409).send({ error: { codigo: 'RN-31', mensaje: MENSAJES_RN['RN-31'], turnos } });
            }
            throw error;
          }
        });

        interno.post('/bloqueos/:id/liberar', async (request) => {
          await casos.liberar.ejecutar({ actor: actorDe(request), bloqueoId: idDe(request) });
          return { liberado: true };
        });

        interno.get('/recordatorios/wa-me', async (request) => {
          const pendientes = await casos.listarWaMe.ejecutar({ actor: actorDe(request) });
          const recordatorios = await Promise.all(
            pendientes.map(async (r) => {
              const turno = await casos.turnos.obtenerPorId(r.turnoId);
              return { ...r, turno: turno === undefined ? null : await casos.vista.turno(turno) };
            }),
          );
          return { recordatorios };
        });

        interno.post('/recordatorios/:id/enviado', async (request) =>
          casos.marcarEnviado.ejecutar({ actor: actorDe(request), recordatorioId: idDe(request) }),
        );

        listo();
      },
      { prefix: '/interno' },
    );
    hecho();
  };
}
