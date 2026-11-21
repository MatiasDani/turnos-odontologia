import { validarDatosPacienteOnline } from '../../domain/datos-paciente-online.js';
import type { ReservarOnlineInput } from '../../application/reservar-online-input.js';

export type ResultadoPedidoReserva =
  | { readonly ok: true; readonly valor: ReservarOnlineInput }
  | { readonly ok: false; readonly campos: readonly string[] };

const CLAVES_PEDIDO = ['prestacionId', 'inicio', 'profesionalId', 'paciente'] as const;
const CLAVES_PACIENTE = ['dni', 'nombre', 'apellido', 'telefono', 'email', 'consentimientoContacto'] as const;
const INICIO_ISO =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-](\d{2}):(\d{2}))$/;

type Objeto = Readonly<Record<string, unknown>>;

function esObjetoPlano(valor: unknown): valor is Objeto {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return false;
  const prototipo: unknown = Object.getPrototypeOf(valor);
  return prototipo === Object.prototype || prototipo === null;
}

function esTextoNoVacio(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length > 0;
}

/** `inicio` ISO 8601 con zona obligatoria y componentes reales (V8 acepta 30 de febrero o 24:00). */
function parsearInicio(valor: unknown): Date | undefined {
  if (typeof valor !== 'string') return undefined;
  const m = INICIO_ISO.exec(valor);
  if (m === null) return undefined;
  const [anio, mes, dia, hora, minuto] = [m[1], m[2], m[3], m[4], m[5]].map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  const segundo = m[6] === undefined ? 0 : Number(m[6]);
  const calendario = new Date(Date.UTC(anio, mes - 1, dia));
  const fechaReal =
    calendario.getUTCFullYear() === anio && calendario.getUTCMonth() === mes - 1 && calendario.getUTCDate() === dia;
  const horaReal = hora <= 23 && minuto <= 59 && segundo <= 59;
  const zonaReal = m[8] === undefined || (Number(m[8]) <= 23 && Number(m[9]) <= 59);
  if (!fechaReal || !horaReal || !zonaReal) return undefined;
  const instante = new Date(valor);
  return Number.isNaN(instante.getTime()) ? undefined : instante;
}

function textoOVacio(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

/**
 * Frontera pura del pedido público (design D2): valida forma, tipos, formato y claves desconocidas
 * sobre `unknown`, sin I/O. Informa todos los campos inválidos: primero los conocidos en orden y
 * luego los desconocidos en orden alfabético.
 */
export function validarPedidoReserva(cuerpo: unknown): ResultadoPedidoReserva {
  if (!esObjetoPlano(cuerpo)) return { ok: false, campos: ['pedido'] };

  const campos: string[] = [];
  const desconocidos = Object.keys(cuerpo)
    .filter((clave) => !(CLAVES_PEDIDO as readonly string[]).includes(clave));

  if (!esTextoNoVacio(cuerpo['prestacionId'])) campos.push('prestacionId');
  const inicio = parsearInicio(cuerpo['inicio']);
  if (inicio === undefined) campos.push('inicio');
  const profesionalId = cuerpo['profesionalId'];
  if (profesionalId !== undefined && !esTextoNoVacio(profesionalId)) campos.push('profesionalId');

  const crudo = cuerpo['paciente'];
  let datosPaciente: ReturnType<typeof validarDatosPacienteOnline> | undefined;
  if (!esObjetoPlano(crudo)) {
    campos.push('paciente');
  } else {
    for (const clave of Object.keys(crudo)) {
      if (!(CLAVES_PACIENTE as readonly string[]).includes(clave)) desconocidos.push(`paciente.${clave}`);
    }
    // Un campo con tipo equivocado se reemplaza por un valor que la regla de formato rechaza.
    const email = crudo['email'];
    datosPaciente = validarDatosPacienteOnline({
      dni: textoOVacio(crudo['dni']),
      nombre: textoOVacio(crudo['nombre']),
      apellido: textoOVacio(crudo['apellido']),
      telefono: textoOVacio(crudo['telefono']),
      ...(email === undefined ? {} : { email: textoOVacio(email) }),
      consentimientoContacto: crudo['consentimientoContacto'] === true,
    });
    if (!datosPaciente.ok) campos.push(...datosPaciente.campos);
  }

  campos.push(...desconocidos.sort());
  if (
    campos.length > 0 ||
    inicio === undefined ||
    datosPaciente === undefined ||
    !datosPaciente.ok ||
    !esTextoNoVacio(cuerpo['prestacionId'])
  ) {
    return { ok: false, campos };
  }
  return {
    ok: true,
    valor: {
      prestacionId: cuerpo['prestacionId'],
      inicio,
      ...(esTextoNoVacio(profesionalId) ? { profesionalId } : {}),
      paciente: datosPaciente.datos,
    },
  };
}
