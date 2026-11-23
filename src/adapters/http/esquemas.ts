// Esquemas de respuesta de los 200/201 (D2): `fast-json-stringify` descarta todo campo no declarado,
// defensa en profundidad de DD-18 (nunca `turnoId`, `sillonId` ni `pacienteId`).
const texto = { type: 'string' } as const;
const objeto = <P extends Record<string, unknown>>(properties: P) =>
  ({ type: 'object', additionalProperties: false, properties }) as const;

const horario = objeto({ inicio: texto, fin: texto });
const persona = objeto({ nombre: texto, apellido: texto });
const prestacionNombre = objeto({ nombre: texto });
const diasReservables = objeto({ desde: texto, hasta: texto });
const turno = { inicio: texto, fin: texto, prestacion: prestacionNombre, profesional: persona } as const;

export const ESQUEMAS = {
  catalogo: objeto({
    consultorio: objeto({ nombre: texto, zonaHoraria: texto }),
    diasReservables,
    prestaciones: {
      type: 'array',
      items: objeto({ id: texto, nombre: texto, duracionMinutos: { type: 'integer' } }),
    },
  }),
  profesionales: objeto({ profesionales: { type: 'array', items: objeto({ id: texto, nombre: texto, apellido: texto }) } }),
  disponibilidad: objeto({ fecha: texto, zonaHoraria: texto, horarios: { type: 'array', items: horario } }),
  reserva: objeto({ ...turno, token: texto }),
  gestion: objeto({
    ...turno,
    asistenciaConfirmada: { type: 'boolean' },
    gestionOnline: { type: 'boolean' },
    consultorio: objeto({ nombre: texto, telefono: texto, email: texto, zonaHoraria: texto }),
    diasReservables,
  }),
  confirmacion: objeto({ asistenciaConfirmada: { type: 'boolean' }, inicio: texto, fin: texto }),
  turno: objeto(turno),
  turnoCancelado: objeto({ ...turno, estado: texto }),
} as const;
