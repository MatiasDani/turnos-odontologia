// Datos de demostración 100 % ficticios (knowledge-base/04_modelo_de_datos.md). Nunca datos reales.
import type { DatosIniciales } from '../../../composicion.js';
import type { HorarioAtencion } from '../../../domain/horario-atencion.js';

/** Consultorio demo de Buenos Aires, sin pacientes ni turnos: los crea quien reserva. */
export function crearDatosDemo(): DatosIniciales {
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
    pacientes: [],
    horarios,
    bloqueos: [],
    turnos: [],
  };
}
