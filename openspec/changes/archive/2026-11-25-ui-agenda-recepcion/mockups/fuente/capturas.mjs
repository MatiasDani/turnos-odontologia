import { chromium } from 'playwright';
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
const dir = resolve(process.argv[2]);
const browser = await chromium.launch();
const page = await browser.newPage({ locale: 'es-AR', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errores = [];
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
page.on('requestfailed', (r) => errores.push('FALLA ' + r.url()));
for (const f of readdirSync(dir).filter((x) => x.endsWith('.html'))) {
  await page.goto('file://' + join(dir, f));
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
  if (ancho > 1440) errores.push(`${f}: scroll horizontal ${ancho}px`);
  await page.screenshot({ path: join(dir, 'previews', f.replace('.html', '-desktop.png')) });
}
await browser.close();
console.log(errores.length ? errores.join('\n') : 'sin errores');
