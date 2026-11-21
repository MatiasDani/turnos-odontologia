/** Conjunto cerrado de códigos de rechazo de la ruta pública (design D9). */
export const CODIGOS_RESERVA_PUBLICA = [
  'DATOS_INVALIDOS',
  'RESERVA_EN_PASADO',
  'PRESTACION_NO_DISPONIBLE',
  'PROFESIONAL_NO_DISPONIBLE',
  'RESERVA_DUPLICADA',
  'LIMITE_DE_TURNOS',
  'HORARIO_NO_DISPONIBLE',
] as const;

export type CodigoReservaPublica = (typeof CODIGOS_RESERVA_PUBLICA)[number];

/** Horario ofrecido al paciente: solo inicio y fin, sin profesional ni sillón. */
export interface HorarioOfrecido {
  readonly inicio: Date;
  readonly fin: Date;
}

const MENSAJES: Readonly<Record<CodigoReservaPublica, string>> = {
  DATOS_INVALIDOS: 'Los datos enviados no son válidos.',
  RESERVA_EN_PASADO: 'No se puede reservar un turno en el pasado.',
  PRESTACION_NO_DISPONIBLE: 'La prestación elegida no está disponible.',
  PROFESIONAL_NO_DISPONIBLE: 'El profesional elegido no está disponible para esta prestación.',
  RESERVA_DUPLICADA: 'Ya existe una reserva para esta prestación y este horario.',
  LIMITE_DE_TURNOS: 'Se alcanzó el máximo de turnos online permitidos.',
  HORARIO_NO_DISPONIBLE: 'El horario elegido ya no está disponible.',
};

export interface DetalleErrorReservaPublica {
  /** Solo con `DATOS_INVALIDOS`. */
  readonly campos?: readonly string[];
  /** Solo con `HORARIO_NO_DISPONIBLE`. */
  readonly nuevaOferta?: readonly HorarioOfrecido[];
}

/**
 * Único error de la ruta pública. Mensaje genérico fijo por código; nunca recibe el error interno
 * de origen, turnos o bloqueos en conflicto (RN-22, RN-D-02).
 */
export class ErrorReservaPublica extends Error {
  readonly codigo: CodigoReservaPublica;
  declare readonly campos?: readonly string[];
  declare readonly nuevaOferta?: readonly HorarioOfrecido[];

  constructor(codigo: CodigoReservaPublica, detalle: DetalleErrorReservaPublica = {}) {
    super(MENSAJES[codigo]);
    this.name = 'ErrorReservaPublica';
    this.codigo = codigo;
    if (codigo === 'DATOS_INVALIDOS' && detalle.campos !== undefined) this.campos = [...detalle.campos];
    if (codigo === 'HORARIO_NO_DISPONIBLE' && detalle.nuevaOferta !== undefined) {
      this.nuevaOferta = [...detalle.nuevaOferta];
    }
  }
}
