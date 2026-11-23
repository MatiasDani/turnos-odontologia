/** Conjunto cerrado de rechazos al marcar un recordatorio `wa.me` como enviado (RN-26, DD-24). */
export type CodigoErrorMarcarRecordatorio = 'RECORDATORIO_NO_ENCONTRADO' | 'ESTADO_NO_ENVIABLE';

const MENSAJES: Readonly<Record<CodigoErrorMarcarRecordatorio, string>> = {
  RECORDATORIO_NO_ENCONTRADO: 'No existe el recordatorio indicado',
  ESTADO_NO_ENVIABLE: 'El recordatorio no está pendiente de envío',
};

/** Error tipado, sin datos del paciente, del turno ni del enlace. */
export class ErrorMarcarRecordatorio extends Error {
  readonly codigo: CodigoErrorMarcarRecordatorio;

  constructor(codigo: CodigoErrorMarcarRecordatorio) {
    super(MENSAJES[codigo]);
    this.name = 'ErrorMarcarRecordatorio';
    this.codigo = codigo;
  }
}
