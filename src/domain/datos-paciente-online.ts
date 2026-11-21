/** Datos del paciente que llegan por la ruta pública (DD-17). Reglas puras de formato y normalización. */
export interface DatosPacienteOnline {
  readonly dni: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly telefono: string;
  readonly email?: string;
  readonly consentimientoContacto: boolean;
}

export type ResultadoDatosPacienteOnline =
  | { readonly ok: true; readonly datos: DatosPacienteOnline }
  | { readonly ok: false; readonly campos: readonly string[] };

const LARGO_MAXIMO_NOMBRE = 80;
const DNI = /^\d{7,8}$/;
const SEPARADORES_TELEFONO = /[\s\-.()]/g;
const TELEFONO = /^\d{10,13}$/;
const LARGO_MAXIMO_EMAIL = 254;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizarDni(dni: string): string | undefined {
  const sinPuntos = dni.replaceAll('.', '');
  return DNI.test(sinPuntos) ? sinPuntos : undefined;
}

function normalizarNombre(texto: string): string | undefined {
  const recortado = texto.trim();
  return recortado.length >= 1 && recortado.length <= LARGO_MAXIMO_NOMBRE ? recortado : undefined;
}

/** Quita separadores, admite prefijo `+54` y devuelve solo dígitos (10 a 13). */
function normalizarTelefono(telefono: string): string | undefined {
  let digitos = telefono.replace(SEPARADORES_TELEFONO, '');
  if (digitos.startsWith('+')) {
    if (!digitos.startsWith('+54')) return undefined;
    digitos = digitos.slice(1);
  }
  return TELEFONO.test(digitos) ? digitos : undefined;
}

function normalizarEmail(email: string): string | undefined {
  const recortado = email.trim();
  return recortado.length <= LARGO_MAXIMO_EMAIL && EMAIL.test(recortado) ? recortado : undefined;
}

export function validarDatosPacienteOnline(datos: DatosPacienteOnline): ResultadoDatosPacienteOnline {
  const campos: string[] = [];
  const dni = normalizarDni(datos.dni);
  if (dni === undefined) campos.push('paciente.dni');
  const nombre = normalizarNombre(datos.nombre);
  if (nombre === undefined) campos.push('paciente.nombre');
  const apellido = normalizarNombre(datos.apellido);
  if (apellido === undefined) campos.push('paciente.apellido');
  const telefono = normalizarTelefono(datos.telefono);
  if (telefono === undefined) campos.push('paciente.telefono');
  const email = datos.email === undefined ? undefined : normalizarEmail(datos.email);
  if (datos.email !== undefined && email === undefined) campos.push('paciente.email');
  if (datos.consentimientoContacto !== true) campos.push('paciente.consentimientoContacto');
  if (campos.length > 0 || dni === undefined || nombre === undefined || apellido === undefined || telefono === undefined) {
    return { ok: false, campos };
  }
  const normalizados: DatosPacienteOnline = {
    dni,
    nombre,
    apellido,
    telefono,
    ...(email !== undefined ? { email } : {}),
    consentimientoContacto: true,
  };
  return { ok: true, datos: normalizados };
}
