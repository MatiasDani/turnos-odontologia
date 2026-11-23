// Cableado HTTP de C-14: la app Fastify real sobre el sistema público con reloj fijo (solo tests).
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { crearApp } from '../../src/adapters/http/app.js';
import { crearSistemaPublico, type OpcionesSistemaPublico, type SistemaPublico } from './sistema-publico.js';

export interface SistemaHttp {
  readonly app: FastifyInstance;
  readonly s: SistemaPublico;
  /** Token vigente del turno base. */
  readonly token: string;
  /** Líneas de log escritas por la app (JSON de pino). */
  readonly lineasDeLog: string[];
  get(url: string, cabeceras?: Record<string, string>): Promise<LightMyRequestResponse>;
  post(url: string, cuerpo?: unknown, cabeceras?: Record<string, string>): Promise<LightMyRequestResponse>;
  /** GET como lo haría `fetch` desde la UI. */
  json(url: string): Promise<LightMyRequestResponse>;
  cerrar(): Promise<void>;
}

export async function crearSistemaHttp(opciones: OpcionesSistemaPublico = {}): Promise<SistemaHttp> {
  const s = await crearSistemaPublico(opciones);
  const lineasDeLog: string[] = [];
  const app = crearApp(s.casos, { log: { level: 'info', stream: { write: (linea) => void lineasDeLog.push(linea) } } });
  await app.ready();
  return {
    app,
    s,
    token: s.token ?? '',
    lineasDeLog,
    get: (url, cabeceras = {}) => app.inject({ method: 'GET', url, headers: cabeceras }),
    post: (url, cuerpo, cabeceras = {}) =>
      app.inject({
        method: 'POST',
        url,
        headers: cuerpo === undefined ? cabeceras : { 'content-type': 'application/json', ...cabeceras },
        ...(cuerpo === undefined ? {} : { payload: JSON.stringify(cuerpo) }),
      }),
    json: (url) => app.inject({ method: 'GET', url, headers: { accept: 'application/json' } }),
    cerrar: () => app.close(),
  };
}

/** Cuerpo de reserva del spec: "Paciente Ficticio 1", DNI 30000001, `pr1`, lunes 11:00. */
export function cuerpoReserva(
  cambios: Readonly<Record<string, unknown>> = {},
  paciente: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = {
    prestacionId: 'pr1',
    inicio: '2026-11-23T11:00:00-03:00',
    paciente: {
      dni: '30000001',
      nombre: 'Paciente',
      apellido: 'Ficticio 1',
      telefono: '1100000000',
      email: 'paciente1@ejemplo.test',
      consentimientoContacto: true,
      ...paciente,
    },
    ...cambios,
  };
  return cuerpo;
}
