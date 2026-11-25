import { esFechaLocalValida } from '../../domain/reglas/horizonte-reserva.js';
import { esObjetoPlano, parsearInicio } from './pedido-reserva.js';
import type { Resultado } from './validadores.js';

/**
 * Validadores puros de la frontera de `/interno/*` (C-15, design D4): reciben `unknown` y devuelven
 * el valor tipado o la lista de campos inválidos (`DATOS_INVALIDOS`). Las reglas de negocio las
 * aplican los casos de uso.
 */

type Objeto = Record<string, unknown>;

const esTexto = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

function texto(origen: Objeto, campo: string, campos: string[]): string | undefined {
  const v = origen[campo];
  if (esTexto(v)) return v;
  campos.push(campo);
  return undefined;
}

function textoOpcional(origen: Objeto, campo: string, campos: string[]): string | undefined {
  const v = origen[campo];
  if (v === undefined || v === '') return undefined;
  if (esTexto(v)) return v;
  campos.push(campo);
  return undefined;
}

function instante(origen: Objeto, campo: string, campos: string[]): Date | undefined {
  const v = parsearInicio(origen[campo]);
  if (v === undefined) campos.push(campo);
  return v;
}

function aObjeto(valor: unknown): Objeto | undefined {
  return esObjetoPlano(valor) ? (valor as Objeto) : undefined;
}

/** La query de Fastify no es un objeto plano (tiene su propio prototipo): basta con que sea objeto. */
function aQuery(valor: unknown): Objeto {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? (valor as Objeto) : {};
}

export interface ConsultaAgendaHttp {
  readonly fecha: string;
  readonly vista: 'dia' | 'semana';
  readonly profesionalId?: string;
  readonly sillonId?: string;
}

export function validarConsultaAgenda(query: unknown): Resultado<ConsultaAgendaHttp> {
  const q = aQuery(query);
  const campos: string[] = [];
  const fecha = q['fecha'];
  if (typeof fecha !== 'string' || !esFechaLocalValida(fecha)) campos.push('fecha');
  const vista = q['vista'] ?? 'dia';
  if (vista !== 'dia' && vista !== 'semana') campos.push('vista');
  const profesionalId = textoOpcional(q, 'profesionalId', campos);
  const sillonId = textoOpcional(q, 'sillonId', campos);
  if (campos.length > 0 || typeof fecha !== 'string' || (vista !== 'dia' && vista !== 'semana')) return { ok: false, campos };
  return {
    ok: true,
    valor: { fecha, vista, ...(profesionalId === undefined ? {} : { profesionalId }), ...(sillonId === undefined ? {} : { sillonId }) },
  };
}

export interface ConsultaDisponibilidadInternaHttp {
  readonly prestacionId: string;
  readonly fecha: string;
  readonly profesionalId?: string;
}

export function validarConsultaDisponibilidadInterna(query: unknown): Resultado<ConsultaDisponibilidadInternaHttp> {
  const q = aQuery(query);
  const campos: string[] = [];
  const prestacionId = texto(q, 'prestacionId', campos);
  const fecha = q['fecha'];
  if (typeof fecha !== 'string' || !esFechaLocalValida(fecha)) campos.push('fecha');
  const profesionalId = textoOpcional(q, 'profesionalId', campos);
  if (campos.length > 0 || prestacionId === undefined || typeof fecha !== 'string') return { ok: false, campos };
  return { ok: true, valor: { prestacionId, fecha, ...(profesionalId === undefined ? {} : { profesionalId }) } };
}

export function validarTextoBusqueda(query: unknown): Resultado<string> {
  const q = aQuery(query);
  const t = q['texto'];
  return typeof t === 'string' ? { ok: true, valor: t } : { ok: false, campos: ['texto'] };
}

export interface NuevoTurnoHttp {
  readonly pacienteId: string;
  readonly profesionalId: string;
  readonly sillonId: string;
  readonly prestacionId: string;
  readonly inicio: Date;
  readonly duracionMinutos?: number;
}

export function validarNuevoTurno(cuerpo: unknown): Resultado<NuevoTurnoHttp> {
  const c = aObjeto(cuerpo);
  if (c === undefined) return { ok: false, campos: ['pedido'] };
  const campos: string[] = [];
  const pacienteId = texto(c, 'pacienteId', campos);
  const profesionalId = texto(c, 'profesionalId', campos);
  const sillonId = texto(c, 'sillonId', campos);
  const prestacionId = texto(c, 'prestacionId', campos);
  const inicio = instante(c, 'inicio', campos);
  const duracion = c['duracionMinutos'];
  if (duracion !== undefined && !Number.isInteger(duracion)) campos.push('duracionMinutos');
  if (campos.length > 0 || !pacienteId || !profesionalId || !sillonId || !prestacionId || !inicio) return { ok: false, campos };
  return {
    ok: true,
    valor: { pacienteId, profesionalId, sillonId, prestacionId, inicio, ...(typeof duracion === 'number' ? { duracionMinutos: duracion } : {}) },
  };
}

export interface ReprogramacionHttp {
  readonly inicio: Date;
  readonly profesionalId?: string;
  readonly sillonId?: string;
}

export function validarReprogramacion(cuerpo: unknown): Resultado<ReprogramacionHttp> {
  const c = aObjeto(cuerpo);
  if (c === undefined) return { ok: false, campos: ['pedido'] };
  const campos: string[] = [];
  const inicio = instante(c, 'inicio', campos);
  const profesionalId = textoOpcional(c, 'profesionalId', campos);
  const sillonId = textoOpcional(c, 'sillonId', campos);
  if (campos.length > 0 || !inicio) return { ok: false, campos };
  return {
    ok: true,
    valor: { inicio, ...(profesionalId === undefined ? {} : { profesionalId }), ...(sillonId === undefined ? {} : { sillonId }) },
  };
}

export interface BloqueoHttp {
  readonly profesionalId?: string;
  readonly sillonId?: string;
  readonly inicio: Date;
  readonly fin: Date;
  readonly motivo?: string;
}

export function validarBloqueo(cuerpo: unknown): Resultado<BloqueoHttp> {
  const c = aObjeto(cuerpo);
  if (c === undefined) return { ok: false, campos: ['pedido'] };
  const campos: string[] = [];
  const profesionalId = textoOpcional(c, 'profesionalId', campos);
  const sillonId = textoOpcional(c, 'sillonId', campos);
  if (profesionalId === undefined && sillonId === undefined && campos.length === 0) campos.push('recurso');
  const inicio = instante(c, 'inicio', campos);
  const fin = instante(c, 'fin', campos);
  const motivo = textoOpcional(c, 'motivo', campos);
  if (campos.length > 0 || !inicio || !fin) return { ok: false, campos: campos.includes('recurso') ? ['recurso'] : campos };
  return {
    ok: true,
    valor: {
      ...(profesionalId === undefined ? {} : { profesionalId }),
      ...(sillonId === undefined ? {} : { sillonId }),
      inicio,
      fin,
      ...(motivo === undefined ? {} : { motivo }),
    },
  };
}

export interface AltaPacienteHttp {
  readonly dni: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly telefono: string;
  readonly email?: string;
  readonly consentimientoContacto: boolean;
}

/** Solo tipos: el contenido lo valida `validarDatosPacienteOnline` en el caso de uso (DD-17). */
export function validarAltaPaciente(cuerpo: unknown): Resultado<AltaPacienteHttp> {
  const c = aObjeto(cuerpo);
  if (c === undefined) return { ok: false, campos: ['pedido'] };
  const campos: string[] = [];
  for (const campo of ['dni', 'nombre', 'apellido', 'telefono']) if (typeof c[campo] !== 'string') campos.push(campo);
  if (c['email'] !== undefined && typeof c['email'] !== 'string') campos.push('email');
  if (typeof c['consentimientoContacto'] !== 'boolean') campos.push('consentimientoContacto');
  if (campos.length > 0) return { ok: false, campos };
  const email = c['email'];
  return {
    ok: true,
    valor: {
      dni: c['dni'] as string,
      nombre: c['nombre'] as string,
      apellido: c['apellido'] as string,
      telefono: c['telefono'] as string,
      ...(typeof email === 'string' && email !== '' ? { email } : {}),
      consentimientoContacto: c['consentimientoContacto'] as boolean,
    },
  };
}
