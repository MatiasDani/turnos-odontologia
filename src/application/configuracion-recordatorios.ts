/**
 * Configuración de los recordatorios (DD-21). La lee del entorno el adaptador de configuración;
 * la aplicación solo recibe valores ya validados.
 */
export interface ConfiguracionRecordatorios {
  /** Anticipación del recordatorio en horas (`RECORDATORIO_HORAS_ANTES`, 24 por defecto, SU-07). */
  readonly horasAntes: number;
  /** Base de los enlaces públicos (`BASE_URL_PUBLICA`). */
  readonly baseUrlPublica: string;
}
