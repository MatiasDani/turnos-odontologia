// Seed 100 % ficticio (knowledge-base/04_modelo_de_datos.md). Nunca cargar datos reales.
import type { BloqueoHorario } from '../../src/domain/bloqueo-horario.js';
import type { Consultorio } from '../../src/domain/consultorio.js';
import type { HorarioAtencion } from '../../src/domain/horario-atencion.js';
import type { Paciente } from '../../src/domain/paciente.js';
import type { Prestacion } from '../../src/domain/prestacion.js';
import type { Profesional } from '../../src/domain/profesional.js';
import type { Sillon } from '../../src/domain/sillon.js';
import type { Turno } from '../../src/domain/turno.js';

/** 'YYYY-MM-DD' + 'HH:mm' locales (Buenos Aires, -03:00) → instante `Date`. */
export function local(fecha: string, hhmm: string): Date {
  return new Date(`${fecha}T${hhmm}:00-03:00`);
}

export const LUNES = '2026-11-23';
export const MIERCOLES = '2026-11-25';
export const SABADO = '2026-11-28';

export interface Entorno {
  consultorio: Consultorio;
  profesionales: Profesional[];
  sillones: Sillon[];
  prestaciones: Prestacion[];
  pacientes: Paciente[];
  horarios: HorarioAtencion[];
  bloqueos: BloqueoHorario[];
  turnos: Turno[];
}

function seed(): Entorno {
  const horarios: HorarioAtencion[] = [];
  for (let dia = 1; dia <= 5; dia++) {
    horarios.push(
      { id: `h${dia}m`, consultorioId: 'c1', diaSemana: dia, desde: '09:00', hasta: '13:00' },
      { id: `h${dia}t`, consultorioId: 'c1', diaSemana: dia, desde: '15:00', hasta: '19:00' },
    );
  }
  return {
    consultorio: {
      id: 'c1',
      nombre: 'Consultorio Odontológico Demo',
      zonaHoraria: 'America/Argentina/Buenos_Aires',
      telefonoContacto: '+54 9 11 0000-0000',
      email: 'contacto@demo.test',
    },
    profesionales: [
      { id: 'p1', consultorioId: 'c1', nombre: 'Ana', apellido: 'Ejemplo', matricula: '0001', activo: true, prestacionIds: ['pr1', 'pr2', 'pr3', 'pr4'] },
      { id: 'p2', consultorioId: 'c1', nombre: 'Bruno', apellido: 'Muestra', matricula: '0002', activo: true, prestacionIds: ['pr1', 'pr2', 'pr3', 'pr4'] },
    ],
    sillones: [
      { id: 's1', consultorioId: 'c1', nombre: 'Sillón 1', activo: true },
      { id: 's2', consultorioId: 'c1', nombre: 'Sillón 2', activo: true },
    ],
    prestaciones: [
      { id: 'pr1', consultorioId: 'c1', nombre: 'Consulta/control', duracionMinutos: 30, activa: true },
      { id: 'pr2', consultorioId: 'c1', nombre: 'Limpieza', duracionMinutos: 45, activa: true },
      { id: 'pr3', consultorioId: 'c1', nombre: 'Extracción simple', duracionMinutos: 60, activa: true },
      { id: 'pr4', consultorioId: 'c1', nombre: 'Endodoncia', duracionMinutos: 90, activa: true },
    ],
    pacientes: [
      { id: 'pa1', nombre: 'Carla', apellido: 'Prueba', dni: '00000001', telefono: '+54 9 11 0000-0001', consentimientoContacto: true },
      { id: 'pa2', nombre: 'Diego', apellido: 'Modelo', dni: '00000002', telefono: '+54 9 11 0000-0002', consentimientoContacto: true },
      { id: 'pa3', nombre: 'Eva', apellido: 'Simulada', dni: '00000003', telefono: '+54 9 11 0000-0003', consentimientoContacto: true },
    ],
    horarios,
    bloqueos: [
      { id: 'b1', profesionalId: 'p1', inicio: local(MIERCOLES, '15:00'), fin: local(MIERCOLES, '17:00'), motivo: 'capacitación' },
    ],
    turnos: [],
  };
}

/** Entorno de datos con el seed; `overrides` reemplaza colecciones completas. Los repos en memoria se suman en la sección 5. */
export function crearEntorno(overrides: Partial<Entorno> = {}): Entorno {
  return { ...seed(), ...overrides };
}

/** Turno ficticio activo de p1 en s1, lunes 09:00-10:00; overrides ajusta cualquier campo. */
export function crearTurno(overrides: Partial<Turno> = {}): Turno {
  return {
    id: 't-base',
    pacienteId: 'pa1',
    profesionalId: 'p1',
    sillonId: 's1',
    prestacionId: 'pr3',
    inicio: local(LUNES, '09:00'),
    fin: local(LUNES, '10:00'),
    duracionMinutos: 60,
    estado: 'confirmado',
    origen: 'recepcion',
    ...overrides,
  };
}
