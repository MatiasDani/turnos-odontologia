/**
 * Regla pura compartida de normalización de teléfono argentino (DD-24, RN-26). La usan la reserva
 * online de C-10 y el armado del enlace `wa.me` de C-13, sin duplicar el formato.
 */
const SEPARADORES_TELEFONO = /[\s\-.()]/g;
const TELEFONO = /^\d{10,13}$/;

/** Quita separadores, admite prefijo `+54` y devuelve solo dígitos (10 a 13). */
export function normalizarTelefonoArgentino(telefono: string): string | undefined {
  const sinSeparadores = telefono.replace(SEPARADORES_TELEFONO, '');
  const digitos = sinSeparadores.startsWith('+') ? sinSeparadores.slice(1) : sinSeparadores;
  if (sinSeparadores.startsWith('+') && !sinSeparadores.startsWith('+54')) return undefined;
  return TELEFONO.test(digitos) ? digitos : undefined;
}
