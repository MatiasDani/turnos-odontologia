/** Puerto de hash para no almacenar secretos en claro (RN-21). */
export interface Hasher {
  /** SHA-256 en hexadecimal minúsculas. */
  sha256(texto: string): string;
}
