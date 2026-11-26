// Capturas de los mockups con Microsoft Edge (Playwright, canal msedge) y viewport exacto.
// Uso (desde la raíz del repo): node openspec/changes/mejora-visual-ui/mockups/src/render.mjs [v1|v2]
// v1: mockups originales → previews/v1/. v2: direcciones minimalistas a-*/b-* → previews/. Sin argumento: ambos.
// Se usa Playwright porque Edge headless con --window-size no baja de ~500 px de ancho de layout.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const mockups = join(aqui, '..');
const require = createRequire(join(process.cwd(), 'package.json'));
const { chromium } = require('playwright');

const modo = process.argv[2] ?? 'todos';
const capturas = [];
if (modo !== 'v2') {
  for (const p of ['portada', 'recepcion-agenda', 'recepcion-agenda-movil', 'reserva-paso-1']) {
    capturas.push([p, { width: 390, height: 844 }, `v1/${p}-mobile`], [p, { width: 1440, height: 900 }, `v1/${p}-desktop`]);
  }
  capturas.push(
    ['recepcion-agenda', { width: 1024, height: 768 }, 'v1/recepcion-agenda-1024'],
    ['recepcion-agenda-movil', { width: 390, height: 844 }, 'v1/recepcion-agenda-movil-completa', true],
    ['portada', { width: 390, height: 844 }, 'v1/portada-mobile-completa', true],
  );
}
if (modo !== 'v1') {
  for (const d of ['a', 'b']) {
    for (const p of ['portada', 'reserva-1', 'reserva-2', 'recepcion']) {
      capturas.push([`${d}-${p}`, { width: 390, height: 844 }, `${d}-${p}-mobile`], [`${d}-${p}`, { width: 1440, height: 900 }, `${d}-${p}-desktop`]);
    }
    capturas.push([`${d}-recepcion`, { width: 390, height: 844 }, `${d}-recepcion-mobile-completa`, true]);
  }
}

const navegador = await chromium.launch({ channel: 'msedge' });
for (const [pagina, viewport, nombre, completa = false] of capturas) {
  const page = await navegador.newPage({ viewport });
  await page.goto(pathToFileURL(join(mockups, `${pagina}.html`)).href);
  const ancho = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  await page.screenshot({ path: join(mockups, 'previews', `${nombre}.png`), fullPage: completa });
  console.log(nombre, `scrollWidth=${ancho[0]} clientWidth=${ancho[1]}`, ancho[0] > ancho[1] ? 'DESBORDA' : 'ok');
  await page.close();
}
await navegador.close();
