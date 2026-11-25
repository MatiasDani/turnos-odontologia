// Datos de demostración 100 % ficticios (knowledge-base/04_modelo_de_datos.md). Nunca datos reales.
import type { DatosIniciales } from '../../../composicion.js';
import type { HorarioAtencion } from '../../../domain/horario-atencion.js';
import type { Paciente } from '../../../domain/paciente.js';
import { fechaLocal, sumarDias } from '../../../domain/reglas/horizonte-reserva.js';
import { deHoraLocal } from '../../../domain/tiempo.js';
import type { EstadoTurno, Turno } from '../../../domain/turno.js';

const ZONA = 'America/Argentina/Buenos_Aires';

/** "Paciente Ficticio 1" a "Paciente Ficticio 6" (C-15, design D6). Nunca datos reales (RN-D-01). */
function pacientesDemo(): Paciente[] {
  return Array.from({ length: 6 }, (_, i) => ({
    id: `pd${i + 1}`,
    nombre: 'Paciente',
    apellido: `Ficticio ${i + 1}`,
    dni: `3000000${i + 1}`,
    telefono: `11 0000 000${i + 1}`,
    consentimientoContacto: true,
  }));
}

/** Próximos `n` días hábiles (lunes a viernes) desde el día local de `ahora`, incluido si es hábil. */
function diasHabiles(ahora: Date, n: number): string[] {
  const dias: string[] = [];
  for (let fecha = fechaLocal(ahora, ZONA); dias.length < n; fecha = sumarDias(fecha, 1)) {
    const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay();
    if (dia >= 1 && dia <= 5) dias.push(fecha);
  }
  return dias;
}

/** Turnos de demo en los próximos días hábiles, sin solaparse y dentro del horario (design D6). */
function turnosDemo(ahora: Date): Turno[] {
  const [d1, d2, d3] = diasHabiles(ahora, 3) as [string, string, string];
  const plan: [string, string, string, string, string, number, EstadoTurno][] = [
    // [día, hora, paciente, profesional, sillón, prestación: minutos, estado]
    [d1, '09:00', 'pd1', 'p1', 's1', 30, 'confirmado'],
    [d1, '09:30', 'pd2', 'p1', 's1', 90, 'confirmado'],
    [d1, '10:00', 'pd3', 'p2', 's2', 45, 'reservado'],
    [d1, '15:00', 'pd4', 'p2', 's1', 60, 'confirmado'],
    [d2, '09:00', 'pd5', 'p1', 's2', 30, 'reservado'],
    [d2, '11:00', 'pd6', 'p2', 's1', 45, 'confirmado'],
    [d3, '16:00', 'pd1', 'p1', 's1', 30, 'confirmado'],
    [d3, '17:00', 'pd2', 'p2', 's2', 60, 'confirmado'],
  ];
  const prestacionPorMinutos: Record<number, string> = { 30: 'pr1', 45: 'pr2', 60: 'pr3', 90: 'pr4' };
  return plan.map(([dia, hora, pacienteId, profesionalId, sillonId, minutos, estado], i) => {
    const [h, m] = hora.split(':').map(Number) as [number, number];
    const inicio = deHoraLocal(dia, h * 60 + m, ZONA);
    return {
      id: `td${i + 1}`,
      pacienteId,
      profesionalId,
      sillonId,
      prestacionId: prestacionPorMinutos[minutos] ?? 'pr1',
      inicio,
      fin: new Date(inicio.getTime() + minutos * 60_000),
      duracionMinutos: minutos,
      estado,
      origen: estado === 'reservado' ? 'online' : 'recepcion',
    };
  });
}

/**
 * Consultorio demo de Buenos Aires. Sin `ahora`, sin pacientes ni turnos (los crea quien reserva);
 * con `ahora` (C-15), suma pacientes y turnos ficticios para que la agenda de recepción tenga datos.
 */
export function crearDatosDemo(ahora?: Date): DatosIniciales {
  const horarios: HorarioAtencion[] = [];
  for (let dia = 1; dia <= 5; dia++) {
    horarios.push(
      { id: `h${dia}m`, consultorioId: 'c1', diaSemana: dia, desde: '09:00', hasta: '13:00' },
      { id: `h${dia}t`, consultorioId: 'c1', diaSemana: dia, desde: '15:00', hasta: '19:00' },
    );
  }
  const todas = ['pr1', 'pr2', 'pr3', 'pr4'];
  return {
    consultorio: {
      id: 'c1',
      nombre: 'Consultorio Odontológico Demo',
      zonaHoraria: 'America/Argentina/Buenos_Aires',
      telefonoContacto: '+54 9 11 0000-0000',
      email: 'contacto@demo.test',
    },
    profesionales: [
      { id: 'p1', consultorioId: 'c1', nombre: 'Ana', apellido: 'Ejemplo', matricula: '0001', activo: true, prestacionIds: todas },
      { id: 'p2', consultorioId: 'c1', nombre: 'Bruno', apellido: 'Muestra', matricula: '0002', activo: true, prestacionIds: todas },
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
    pacientes: ahora === undefined ? [] : pacientesDemo(),
    horarios,
    bloqueos: [],
    turnos: ahora === undefined ? [] : turnosDemo(ahora),
  };
}
