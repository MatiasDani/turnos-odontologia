import { decodeJwt, decodeProtectedHeader, SignJWT, UnsecuredJWT } from 'jose';
import { describe, expect, test } from 'vitest';
import { EmisorSesionJose } from '../../src/adapters/crypto/emisor-sesion-jose.js';
import { local, LUNES } from '../fixtures/seed.js';
import { SECRETO_FICTICIO } from '../fixtures/sistema-autenticacion.js';

const emisor = new EmisorSesionJose(SECRETO_FICTICIO);
const DIEZ = local(LUNES, '10:00');

describe('EmisorSesionJose (DD-37, RN-33)', () => {
  test('emite y verifica una sesión del usuario', async () => {
    const { token, venceEn } = await emisor.emitir('u-rec', DIEZ);
    expect(venceEn).toEqual(local(LUNES, '18:00'));
    await expect(emisor.verificar(token, DIEZ)).resolves.toBe('u-rec');
  });

  test('vence a las 8 h exactas: 17:59:59 válida, 18:00 vencida', async () => {
    const { token } = await emisor.emitir('u-rec', DIEZ);
    await expect(emisor.verificar(token, new Date(local(LUNES, '18:00').getTime() - 1000))).resolves.toBe('u-rec');
    await expect(emisor.verificar(token, local(LUNES, '18:00'))).resolves.toBeNull();
  });

  test('el payload solo trae sub, iat, exp, iss y aud, con HS256', async () => {
    const { token } = await emisor.emitir('u-odo1', DIEZ);
    expect(Object.keys(decodeJwt(token)).sort()).toEqual(['aud', 'exp', 'iat', 'iss', 'sub']);
    expect(decodeProtectedHeader(token).alg).toBe('HS256');
  });

  test('un token firmado con otro secreto devuelve null', async () => {
    const { token } = await new EmisorSesionJose(`${SECRETO_FICTICIO}-otro`).emitir('u-admin', DIEZ);
    await expect(emisor.verificar(token, DIEZ)).resolves.toBeNull();
  });

  test('un token alterado devuelve null', async () => {
    const { token } = await emisor.emitir('u-rec', DIEZ);
    const [h, p, f] = token.split('.') as [string, string, string];
    const payload = Buffer.from(JSON.stringify({ ...decodeJwt(token), sub: 'u-admin' })).toString('base64url');
    await expect(emisor.verificar(`${h}.${payload}.${f}`, DIEZ)).resolves.toBeNull();
    expect(p).not.toBe(payload);
  });

  test('alg none devuelve null', async () => {
    const sinFirma = new UnsecuredJWT({}).setSubject('u-admin').setIssuer('turnos-odontologia').setAudience('turnos-odontologia').setIssuedAt().setExpirationTime('8h').encode();
    await expect(emisor.verificar(sinFirma, new Date())).resolves.toBeNull();
  });

  test('sin el emisor esperado devuelve null', async () => {
    const otro = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u-admin')
      .setIssuer('otro-sistema')
      .setAudience('turnos-odontologia')
      .setIssuedAt(Math.floor(DIEZ.getTime() / 1000))
      .setExpirationTime(Math.floor(DIEZ.getTime() / 1000) + 3600)
      .sign(new TextEncoder().encode(SECRETO_FICTICIO));
    await expect(emisor.verificar(otro, DIEZ)).resolves.toBeNull();
  });

  test.each(['', 'texto-basura', 'a.b.c'])('%j devuelve null', async (token) => {
    await expect(emisor.verificar(token, DIEZ)).resolves.toBeNull();
  });

  test('rechaza un secreto de menos de 32 caracteres', () => {
    expect(() => new EmisorSesionJose('corto')).toThrow(RangeError);
  });
});
