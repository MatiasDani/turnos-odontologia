// Cableado del sistema público (C-14) sobre el seed ficticio y un reloj fijo (solo tests).
import { RecordatorioRepositorioEnMemoria } from '../../src/adapters/persistence/en-memoria/recordatorio-repositorio.js';
import { componerSistema, type SistemaCompuesto } from '../../src/composicion.js';
import type { Turno } from '../../src/domain/turno.js';
import { RelojFijo } from './reloj-fijo.js';
import { crearEntorno, type Entorno, local } from './seed.js';
import { AHORA_POR_DEFECTO, GeneradorIdConPrefijo, turnoBaseCancelacion } from './sistema.js';
import { TurnoRepositorioDePrueba } from './turno-repositorio-de-prueba.js';

export const ID_TURNO_BASE = 't-base';

export type OpcionesSistemaPublico = Partial<Entorno> & {
  /** Instante del reloj fijo; por defecto el domingo 2026-11-22 08:00 local. */
  readonly ahora?: Date;
  /** Sin turno base (agenda vacía salvo `turnos`). */
  readonly sinTurnoBase?: boolean;
  /** Repositorio de recordatorios a usar (p. ej. uno que falla); por defecto en memoria. */
  readonly repoRecordatorios?: RecordatorioRepositorioEnMemoria;
};

export interface SistemaPublico extends SistemaCompuesto {
  readonly datos: Entorno;
  readonly reloj: RelojFijo;
  readonly turnos: TurnoRepositorioDePrueba;
  /** Token vigente del turno base (`t-base`), o `undefined` con `sinTurnoBase`. */
  readonly token: string | undefined;
}

/** Turno base `reservado` con Ana Ejemplo, Consulta/control, lunes 23 10:00-10:30 (contexto común del spec). */
export function turnoBasePublico(overrides: Partial<Turno> = {}): Turno {
  return turnoBaseCancelacion({
    id: ID_TURNO_BASE,
    estado: 'reservado',
    origen: 'online',
    inicio: local('2026-11-23', '10:00'),
    fin: local('2026-11-23', '10:30'),
    ...overrides,
  });
}

/** Sistema público con el turno base y su token emitido. */
export async function crearSistemaPublico(opciones: OpcionesSistemaPublico = {}): Promise<SistemaPublico> {
  const { ahora, sinTurnoBase, repoRecordatorios, ...overrides } = opciones;
  const datos = crearEntorno({ turnos: sinTurnoBase === true ? [] : [turnoBasePublico()], ...overrides });
  const reloj = new RelojFijo(ahora ?? AHORA_POR_DEFECTO);
  const turnos = new TurnoRepositorioDePrueba(datos.turnos);
  const nucleo = componerSistema({
    reloj,
    datos,
    turnos,
    ids: new GeneradorIdConPrefijo('pn-'),
    ...(repoRecordatorios === undefined ? {} : { repoRecordatorios }),
  });
  const token = sinTurnoBase === true ? undefined : await nucleo.servicioTokens.emitir(ID_TURNO_BASE);
  return { ...nucleo, datos, reloj, turnos, token };
}
