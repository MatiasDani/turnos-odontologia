import type { ConsultarDisponibilidadParaReprogramar } from '../../application/consultar-disponibilidad-para-reprogramar.js';
import type { ConsultarDisponibilidadPublica } from '../../application/consultar-disponibilidad-publica.js';
import type { ConsultarGestionDesdeToken } from '../../application/consultar-gestion-desde-token.js';
import type { CancelarTurnoDesdeToken } from '../../application/cancelar-turno-desde-token.js';
import type { ConfirmarDesdeEnlace } from '../../application/confirmar-desde-enlace.js';
import type { ListarCatalogoPublico } from '../../application/listar-catalogo-publico.js';
import type { ListarProfesionalesPublicos } from '../../application/listar-profesionales-publicos.js';
import type { ReprogramarDesdeTokenPublica } from '../../application/reprogramar-desde-token-publica.js';
import type { ReservarOnlinePublica } from '../../application/reservar-online-publica.js';

/**
 * Casos de uso que consumen las rutas públicas (DD-29). `crearApp` los recibe ya construidos:
 * nunca conoce repositorios ni adaptadores concretos.
 */
export interface CasosDeUsoPublicos {
  readonly catalogo: Pick<ListarCatalogoPublico, 'ejecutar'>;
  readonly profesionales: Pick<ListarProfesionalesPublicos, 'ejecutar'>;
  readonly disponibilidad: Pick<ConsultarDisponibilidadPublica, 'ejecutar'>;
  readonly reservar: Pick<ReservarOnlinePublica, 'ejecutar'>;
  readonly gestion: Pick<ConsultarGestionDesdeToken, 'ejecutar'>;
  readonly confirmar: Pick<ConfirmarDesdeEnlace, 'ejecutar'>;
  readonly cancelar: Pick<CancelarTurnoDesdeToken, 'ejecutar'>;
  readonly disponibilidadParaReprogramar: Pick<ConsultarDisponibilidadParaReprogramar, 'ejecutar'>;
  readonly reprogramar: Pick<ReprogramarDesdeTokenPublica, 'ejecutar'>;
}
