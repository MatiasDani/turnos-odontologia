import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Archivos de la UI servidos desde `src/adapters/http/web/` (lista blanca, DD-29). */
export const ARCHIVOS_WEB: readonly string[] = [
  'paciente.css',
  'api.js',
  'formato.js',
  'dialogo.js',
  'reserva.js',
  'gestion.js',
];

/** Archivos del design system servidos tal cual, sin modificarlos (DD-30). */
export const ARCHIVOS_DESIGN_SYSTEM: readonly string[] = ['tokens.css', 'brand.js', 'assets/logo.svg'];

const TIPOS: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
};

/** Raíz del proyecto: el primer directorio con `package.json` hacia arriba (sirve en `src/` y `dist/`). */
export function encontrarRaizDelProyecto(desde: string = fileURLToPath(import.meta.url)): string {
  let dir = dirname(desde);
  while (!existsSync(join(dir, 'package.json'))) {
    const padre = dirname(dir);
    if (padre === dir) throw new Error('No se encontró la raíz del proyecto');
    dir = padre;
  }
  return dir;
}

export interface ArchivoEstatico {
  readonly contenido: Buffer;
  readonly tipo: string;
}

function tipoDe(nombre: string): string {
  const punto = nombre.lastIndexOf('.');
  return TIPOS[punto < 0 ? '' : nombre.slice(punto)] ?? 'application/octet-stream';
}

/** Lee un archivo solo si está en la lista blanca; cualquier otro nombre devuelve `undefined`. */
export async function leerEstatico(
  raiz: string,
  carpeta: 'web' | 'design-system',
  nombre: string,
): Promise<ArchivoEstatico | undefined> {
  const permitidos = carpeta === 'web' ? ARCHIVOS_WEB : ARCHIVOS_DESIGN_SYSTEM;
  if (!permitidos.includes(nombre)) return undefined;
  const ruta = carpeta === 'web' ? join(raiz, 'src', 'adapters', 'http', 'web', nombre) : join(raiz, 'design-system', nombre);
  try {
    return { contenido: await readFile(ruta), tipo: tipoDe(nombre) };
  } catch {
    return undefined;
  }
}

/** Páginas HTML de la UI (`reserva.html` y `gestion.html`). */
export async function leerPagina(raiz: string, pagina: 'reserva.html' | 'gestion.html'): Promise<Buffer> {
  return readFile(join(raiz, 'src', 'adapters', 'http', 'web', pagina));
}
