import { esFechaLocalValida } from '../../domain/reglas/horizonte-reserva.js';
import { esObjetoPlano, parsearInicio } from './pedido-reserva.js';

export type Resultado<T> =
  | { readonly ok: true; readonly valor: T }
  | { readonly ok: false; readonly campos: readonly string[] };

function esTextoNoVacio(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length > 0;
}

/** La query de Fastify tiene un prototipo propio (no es un objeto plano): solo se lee por clave. */
function valorDe(origen: unknown, clave: string): unknown {
  if (typeof origen !== 'object' || origen === null || Array.isArray(origen)) return undefined;
  return (origen as Readonly<Record<string, unknown>>)[clave];
}

export interface ConsultaDisponibilidadHttp {
  readonly prestacionId: string;
  readonly fecha: string;
  readonly profesionalId?: string;
}

/**
 * Frontera pura de `GET /public/disponibilidad` (design D2): forma y tipos de la query sobre
 * `unknown`. Las claves desconocidas se ignoran (la query puede traer parámetros de caché).
 */
export function validarConsultaDisponibilidad(query: unknown): Resultado<ConsultaDisponibilidadHttp> {
  const campos: string[] = [];
  const prestacionId = valorDe(query, 'prestacionId');
  const fecha = valorDe(query, 'fecha');
  const profesionalId = valorDe(query, 'profesionalId');
  if (!esTextoNoVacio(prestacionId)) campos.push('prestacionId');
  if (!esTextoNoVacio(fecha) || !esFechaLocalValida(fecha)) campos.push('fecha');
  if (profesionalId !== undefined && !esTextoNoVacio(profesionalId)) campos.push('profesionalId');
  if (campos.length > 0 || !esTextoNoVacio(prestacionId) || !esTextoNoVacio(fecha)) return { ok: false, campos };
  return { ok: true, valor: { prestacionId, fecha, ...(esTextoNoVacio(profesionalId) ? { profesionalId } : {}) } };
}

/** Frontera de `GET /public/turnos/:token/disponibilidad?fecha`. */
export function validarFechaConsulta(query: unknown): Resultado<{ readonly fecha: string }> {
  const fecha = valorDe(query, 'fecha');
  if (!esTextoNoVacio(fecha) || !esFechaLocalValida(fecha)) return { ok: false, campos: ['fecha'] };
  return { ok: true, valor: { fecha } };
}

/** Frontera de `POST /public/turnos/:token/reprogramar`: solo `inicio` (D7). */
export function validarPedidoReprogramacion(cuerpo: unknown): Resultado<{ readonly inicio: Date }> {
  if (!esObjetoPlano(cuerpo)) return { ok: false, campos: ['pedido'] };
  const campos: string[] = [];
  const inicio = parsearInicio(cuerpo['inicio']);
  if (inicio === undefined) campos.push('inicio');
  campos.push(...Object.keys(cuerpo).filter((clave) => clave !== 'inicio').sort());
  if (campos.length > 0 || inicio === undefined) return { ok: false, campos };
  return { ok: true, valor: { inicio } };
}

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** Forma del token (base64url de 32 bytes): se comprueba antes de tocar repositorios. */
export function esTokenConForma(token: string): boolean {
  return TOKEN.test(token);
}

/** Cuerpo de `POST /auth/login` (C-09): objeto con `email` y `clave` de texto no vacío. */
export function validarPedidoLogin(cuerpo: unknown): Resultado<{ readonly email: string; readonly clave: string }> {
  if (!esObjetoPlano(cuerpo)) return { ok: false, campos: ['pedido'] };
  const email = cuerpo['email'];
  const clave = cuerpo['clave'];
  const campos: string[] = [];
  if (!esTextoNoVacio(email)) campos.push('email');
  if (typeof clave !== 'string' || clave === '') campos.push('clave');
  if (campos.length > 0 || typeof email !== 'string' || typeof clave !== 'string') return { ok: false, campos };
  return { ok: true, valor: { email, clave } };
}
