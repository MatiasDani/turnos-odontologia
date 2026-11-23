/** Conjunto cerrado de códigos de rechazo de la gestión pública del turno (DD-23). */
export const CODIGOS_GESTION_TURNO_PUBLICA = [
  'CONTACTAR_CONSULTORIO',
  'HORARIO_NO_DISPONIBLE',
  'DATOS_INVALIDOS',
] as const;

export type CodigoGestionTurnoPublica = (typeof CODIGOS_GESTION_TURNO_PUBLICA)[number];

const MENSAJES: Readonly<Record<CodigoGestionTurnoPublica, string>> = {
  CONTACTAR_CONSULTORIO: 'Para cancelar o reprogramar con menos de 24 h, contactá al consultorio.',
  HORARIO_NO_DISPONIBLE: 'El horario elegido ya no está disponible.',
  DATOS_INVALIDOS: 'Los datos enviados no son válidos.',
};

/**
 * Error de la ruta pública de gestión. Mensaje fijo por código; nunca recibe el error de dominio
 * de origen, códigos RN, ids, sillones, estados ni tokens (RN-22, RN-D-02, DD-18, DD-23).
 */
export class ErrorGestionTurnoPublica extends Error {
  readonly codigo: CodigoGestionTurnoPublica;

  constructor(codigo: CodigoGestionTurnoPublica) {
    super(MENSAJES[codigo]);
    this.name = 'ErrorGestionTurnoPublica';
    this.codigo = codigo;
  }
}
