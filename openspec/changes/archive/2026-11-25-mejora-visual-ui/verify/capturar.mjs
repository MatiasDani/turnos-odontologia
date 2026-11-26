// Capturas de la implementación (Edge por Playwright, canal msedge) para compararlas con mockups/previews/b-*.png.
// Uso (desde la raíz del repo, con `npm run build` hecho): node openspec/changes/mejora-visual-ui/verify/capturar.mjs [puerto]
// Levanta dist/src/main.js con un JWT_SECRET y una clave de administrador aleatorios (nunca se imprimen),
// inicia sesión por el formulario y guarda los PNG en esta carpeta. Detiene el servidor que levantó.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(process.cwd(), 'package.json'));
const { chromium } = require('playwright');

const puerto = process.argv[2] ?? '3100';
const clave = randomBytes(18).toString('base64url');
const email = 'admin@demo.test';
const servidor = spawn(process.execPath, ['dist/src/main.js'], {
  env: {
    ...process.env,
    PORT: puerto,
    HOST: '127.0.0.1',
    BASE_URL_PUBLICA: `http://localhost:${puerto}`,
    JWT_SECRET: randomBytes(36).toString('base64url'),
    ADMIN_EMAIL_INICIAL: email,
    ADMIN_CLAVE_INICIAL: clave,
  },
  stdio: 'ignore',
});

const base = `http://127.0.0.1:${puerto}`;
async function esperar() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${base}/`)).ok) return;
    } catch {
      /* todavía no escucha */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('El servidor no levantó');
}

try {
  await esperar();
  const navegador = await chromium.launch({ channel: 'msedge' });
  const tamanos = [
    ['desktop', { width: 1440, height: 900 }],
    ['mobile', { width: 390, height: 844 }],
  ];
  for (const [sufijo, viewport] of tamanos) {
    const contexto = await navegador.newContext({ viewport, locale: 'es-AR', deviceScaleFactor: 1 });
    const page = await contexto.newPage();
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => m.type() === 'error' && !m.text().includes('Failed to load resource') && errores.push(m.text()));
    const medir = async (nombre) => {
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      console.log(`${nombre}-${sufijo}: scrollWidth=${sw} clientWidth=${cw}`);
    };
    await page.goto(`${base}/`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: join(aqui, `portada-${sufijo}.png`) });
    await medir('portada');

    await page.goto(`${base}/public/reservar`);
    await page.getByRole('heading', { name: '¿Qué necesitás?' }).waitFor();
    await page.screenshot({ path: join(aqui, `reserva-1-${sufijo}.png`) });
    await medir('reserva-1');
    await page.locator('label.choice').first().click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('heading', { name: 'Elegí día y horario' }).waitFor();
    await page.locator('.day:not([disabled])').first().click().catch(() => undefined);
    await page.waitForTimeout(700);
    await page.screenshot({ path: join(aqui, `reserva-2-${sufijo}.png`) });
    await medir('reserva-2');

    await page.goto(`${base}/recepcion/login`);
    await page.screenshot({ path: join(aqui, `login-${sufijo}.png`) });
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Clave').fill(clave);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL(/\/recepcion\?/);
    await page.locator('#agenda[aria-busy="false"]').waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(aqui, `recepcion-${sufijo}.png`) });
    await medir('recepcion');
    if (sufijo === 'mobile') await page.screenshot({ path: join(aqui, 'recepcion-mobile-completa.png'), fullPage: true });
    if (errores.length > 0) console.log(`errores de consola (${sufijo}):`, errores.slice(0, 3));
    await contexto.close();
  }
  await navegador.close();
} finally {
  servidor.kill();
}
