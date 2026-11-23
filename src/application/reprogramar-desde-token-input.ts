/** Campos observables de la entrada pública (DD-23): sin `sillonId`, `duracionMinutos` ni `forzar`. */
export const CAMPOS_REPROGRAMAR_DESDE_TOKEN = [
  'token',
  'inicio',
  'profesionalId',
  'prestacionId',
] as const;

/**
 * Contrato de entrada de la reprogramación pública. El `turnoId` sale del token y el actor es
 * siempre paciente, así que ninguno de los dos se acepta del cliente (RN-04, RN-16, DD-18).
 */
export interface ReprogramarDesdeTokenInput {
  readonly token: string;
  readonly inicio: Date;
  readonly profesionalId?: string;
  readonly prestacionId?: string;
}
