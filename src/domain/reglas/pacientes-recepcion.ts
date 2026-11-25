/** RN-34: largo mínimo del texto de búsqueda de pacientes y tope de resultados. */
export const BUSQUEDA_MINIMA = 3;
export const RESULTADOS_MAXIMOS = 10;

const SOLO_DIGITOS = /^\d+$/;

/** Minúsculas, sin tildes (NFD) y sin espacios en los extremos ni repetidos. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export interface Busqueda {
  readonly texto: string;
  /** `true` si el texto son solo dígitos: busca por prefijo de DNI. */
  readonly porDni: boolean;
}

/** RN-34: `null` si el texto tiene menos de 3 caracteres sin contar los espacios de los extremos. */
export function normalizarBusqueda(texto: string): Busqueda | null {
  const normalizado = normalizarTexto(texto);
  if (normalizado.length < BUSQUEDA_MINIMA) return null;
  return { texto: normalizado, porDni: SOLO_DIGITOS.test(normalizado) };
}

/** RN-34: prefijo de DNI, o contenido en "nombre apellido" / "apellido nombre". */
export function coincidePaciente(
  paciente: { readonly nombre: string; readonly apellido: string; readonly dni: string },
  busqueda: Busqueda,
): boolean {
  if (busqueda.porDni) return paciente.dni.startsWith(busqueda.texto);
  const nombre = normalizarTexto(paciente.nombre);
  const apellido = normalizarTexto(paciente.apellido);
  return `${nombre} ${apellido}`.includes(busqueda.texto) || `${apellido} ${nombre}`.includes(busqueda.texto);
}
