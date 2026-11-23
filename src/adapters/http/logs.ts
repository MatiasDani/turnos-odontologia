/** Segmento que reemplaza al token en los logs (RN-21, RN-D-02). */
export const TOKEN_REDACTADO = '[redactado]';

const RUTA_CON_TOKEN = /^(\/public\/turnos\/)[^/?#]+/;

/**
 * Ruta registrable de una URL: sin query string (puede traer datos del paciente) y con el token de
 * `/public/turnos/:token` reemplazado por `[redactado]`.
 */
export function redactarUrl(url: string): string {
  const ruta = url.split(/[?#]/, 1)[0] ?? '';
  return ruta.replace(RUTA_CON_TOKEN, `$1${TOKEN_REDACTADO}`);
}

/**
 * Serializadores de pino (D9): del pedido solo método y ruta redactada; de la respuesta solo el
 * estado. Nunca cabeceras, cookies ni cuerpos.
 */
export const serializadoresDeLog = {
  req(pedido: { method: string; url: string }): { method: string; url: string } {
    return { method: pedido.method, url: redactarUrl(pedido.url) };
  },
  res(respuesta: { statusCode: number }): { statusCode: number } {
    return { statusCode: respuesta.statusCode };
  },
  err(error: Error): { type: string; message: string; stack: string } {
    return { type: error.name, message: error.message, stack: error.stack ?? '' };
  },
};
