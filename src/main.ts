import { ConfiguracionInvalidaError } from './adapters/config/configuracion-entorno.js';
import { leerConfiguracionServidor } from './adapters/config/configuracion-servidor.js';
import { crearApp } from './adapters/http/app.js';
import { crearDatosDemo } from './adapters/persistence/en-memoria/seed-demo.js';
import { RelojSistema } from './adapters/reloj/reloj-sistema.js';
import { componerSistema } from './composicion.js';

/** Punto de entrada (D11): repos en memoria con el seed demo ficticio y el reloj del sistema. */
async function iniciar(): Promise<void> {
  const config = leerConfiguracionServidor(process.env);
  const sistema = componerSistema({ reloj: new RelojSistema(), datos: crearDatosDemo() });
  const app = crearApp(sistema.casos, { log: { level: config.nivelDeLog } });
  const cerrar = (): void => {
    void app.close().then(() => process.exit(0));
  };
  process.on('SIGINT', cerrar);
  process.on('SIGTERM', cerrar);
  await app.listen({ port: config.puerto, host: config.host });
  app.log.info(`Reserva pública en ${config.baseUrlPublica}/public/reservar`);
}

iniciar().catch((error: unknown) => {
  if (error instanceof ConfiguracionInvalidaError) process.stderr.write(`${error.message}\n`);
  else process.stderr.write(`No se pudo iniciar el servidor: ${error instanceof Error ? error.message : 'error desconocido'}\n`);
  process.exit(1);
});
