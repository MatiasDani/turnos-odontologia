import type { TokenGestionRepositorio } from '../../../application/puertos/repositorios.js';
import type { TokenGestion } from '../../../domain/token-gestion.js';

export class TokenGestionRepositorioEnMemoria implements TokenGestionRepositorio {
  private readonly tokens: TokenGestion[] = [];

  guardar(token: TokenGestion): Promise<void> {
    if (this.tokens.some((t) => t.hash === token.hash)) {
      return Promise.reject(new Error('Ya existe un token de gestión con ese hash'));
    }
    this.tokens.push(token);
    return Promise.resolve();
  }

  obtenerPorHash(hash: string): Promise<TokenGestion | undefined> {
    return Promise.resolve(this.tokens.find((t) => t.hash === hash));
  }

  obtenerPorTurno(turnoId: string): Promise<TokenGestion | undefined> {
    return Promise.resolve(this.tokens.find((t) => t.turnoId === turnoId && t.invalidadoEn === undefined));
  }

  invalidar(turnoId: string, en: Date): Promise<void> {
    this.tokens.forEach((t, i) => {
      if (t.turnoId === turnoId && t.invalidadoEn === undefined) this.tokens[i] = { ...t, invalidadoEn: en };
    });
    return Promise.resolve();
  }

  /** Solo para inspección en pruebas (no forma parte del puerto). */
  todos(): readonly TokenGestion[] {
    return [...this.tokens];
  }
}
