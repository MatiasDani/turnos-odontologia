import { jwtVerify, SignJWT } from 'jose';
import type { EmisorSesion, SesionEmitida } from '../../application/puertos/usuarios.js';

/** RN-33: la sesión vence 8 h después de iniciada. */
export const DURACION_SESION_MS = 8 * 60 * 60 * 1000;
const EMISOR = 'turnos-odontologia';
const ALGORITMO = 'HS256';

const aSegundos = (instante: Date): number => Math.floor(instante.getTime() / 1000);

/**
 * Sesión con JWT HS256 firmado con `JWT_SECRET` (DD-37). El token solo lleva `sub`, `iat`, `exp`,
 * `iss` y `aud`; la hora sale del `Reloj` que recibe cada llamada, nunca del sistema.
 */
export class EmisorSesionJose implements EmisorSesion {
  private readonly clave: Uint8Array;

  constructor(secreto: string) {
    if (secreto.length < 32) throw new RangeError('El secreto de sesión debe tener 32 caracteres o más');
    this.clave = new TextEncoder().encode(secreto);
  }

  async emitir(usuarioId: string, ahora: Date): Promise<SesionEmitida> {
    const venceEn = new Date(ahora.getTime() + DURACION_SESION_MS);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: ALGORITMO, typ: 'JWT' })
      .setSubject(usuarioId)
      .setIssuer(EMISOR)
      .setAudience(EMISOR)
      .setIssuedAt(aSegundos(ahora))
      .setExpirationTime(aSegundos(venceEn))
      .sign(this.clave);
    return { token, venceEn };
  }

  async verificar(token: string, ahora: Date): Promise<string | null> {
    try {
      const { payload } = await jwtVerify(token, this.clave, {
        algorithms: [ALGORITMO],
        issuer: EMISOR,
        audience: EMISOR,
        currentDate: ahora,
        clockTolerance: 0,
        requiredClaims: ['sub', 'exp', 'iat'],
      });
      return typeof payload.sub === 'string' && payload.sub !== '' ? payload.sub : null;
    } catch {
      return null;
    }
  }
}
