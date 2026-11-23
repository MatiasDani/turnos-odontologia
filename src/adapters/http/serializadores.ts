import type { CatalogoPublico } from '../../application/listar-catalogo-publico.js';
import type { ProfesionalPublico } from '../../application/listar-profesionales-publicos.js';
import type { DisponibilidadPublica } from '../../application/consultar-disponibilidad-publica.js';
import type { VistaGestionTurno } from '../../application/consultar-gestion-desde-token.js';
import type { ReservaOnlineConfirmada } from '../../application/reservar-online-input.js';
import type { TurnoPublico } from '../../application/turno-publico.js';

const iso = (fecha: Date): string => fecha.toISOString();

/** Cada serializador copia solo los campos públicos (DD-18): nunca `turnoId`, sillón ni paciente. */
export const aCatalogoJson = (c: CatalogoPublico) => ({
  consultorio: c.consultorio,
  diasReservables: c.diasReservables,
  prestaciones: c.prestaciones,
});

export const aProfesionalesJson = (lista: readonly ProfesionalPublico[]) => ({ profesionales: lista });

export const aDisponibilidadJson = (d: DisponibilidadPublica) => ({
  fecha: d.fecha,
  zonaHoraria: d.zonaHoraria,
  horarios: d.horarios.map((h) => ({ inicio: iso(h.inicio), fin: iso(h.fin) })),
});

export const aReservaJson = (r: ReservaOnlineConfirmada) => ({
  inicio: iso(r.inicio),
  fin: iso(r.fin),
  prestacion: { nombre: r.prestacion.nombre },
  profesional: { nombre: r.profesional.nombre, apellido: r.profesional.apellido },
  token: r.token,
});

export const aGestionJson = (v: VistaGestionTurno) => ({
  inicio: iso(v.inicio),
  fin: iso(v.fin),
  prestacion: { nombre: v.prestacion.nombre },
  profesional: { nombre: v.profesional.nombre, apellido: v.profesional.apellido },
  asistenciaConfirmada: v.asistenciaConfirmada,
  gestionOnline: v.gestionOnline,
  consultorio: v.consultorio,
  diasReservables: v.diasReservables,
});

export const aTurnoJson = (t: TurnoPublico) => ({
  inicio: iso(t.inicio),
  fin: iso(t.fin),
  prestacion: { nombre: t.prestacion.nombre },
  profesional: { nombre: t.profesional.nombre, apellido: t.profesional.apellido },
});

export const aConfirmacionJson = (inicio: Date, fin: Date) => ({
  asistenciaConfirmada: true,
  inicio: iso(inicio),
  fin: iso(fin),
});
