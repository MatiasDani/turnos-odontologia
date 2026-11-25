import { ConfiguracionInvalidaError } from './adapters/config/configuracion-entorno.js';
import { leerConfiguracionAutenticacion, leerConfiguracionServidor } from './adapters/config/configuracion-servidor.js';
import { crearApp } from './adapters/http/app.js';
import { rutasRecepcion } from './adapters/http/rutas-recepcion.js';
import { crearDatosDemo } from './adapters/persistence/en-memoria/seed-demo.js';
import { RelojSistema } from './adapters/reloj/reloj-sistema.js';
import { componerAutenticacion, componerRecepcion, componerSistema } from './composicion.js';
import { ConfiguracionInvalidaError as DatoInvalidoError } from './domain/errores.js';

/** Punto de entrada (D11): repos en memoria con el seed demo ficticio y el reloj del sistema. */
async function iniciar(): Promise<void> {
  const config = leerConfiguracionServidor(process.env);
  const configAuth = leerConfiguracionAutenticacion(process.env);
  const reloj = new RelojSistema();
  const datos = crearDatosDemo(reloj.ahora());
  const sistema = componerSistema({ reloj, datos });
  // Usuarios y sesión del personal (C-09): el administrador inicial se crea antes de escuchar.
  const autenticacion = componerAutenticacion({
    reloj,
    jwtSecret: configAuth.jwtSecret,
    consultorioId: datos.consultorio.id,
    profesionales: sistema.repos.profesionales,
  });
  await autenticacion.administradorInicial.ejecutar(configAuth.adminInicial);
  // Demo (C-15): los turnos del seed se cargan directo; se programan sus recordatorios como en un alta.
  for (const turno of datos.turnos) await sistema.recordatorios.programar(turno.id);
  // Interfaz y API interna de recepción (C-15).
  const recepcion = componerRecepcion(sistema, { resolverSesion: autenticacion.casos.resolverSesion, consultorioId: datos.consultorio.id });
  const app = crearApp(sistema.casos, {
    log: { level: config.nivelDeLog },
    autenticacion: autenticacion.casos,
    rutas: [rutasRecepcion(recepcion)],
  });
  const cerrar = (): void => {
    void app.close().then(() => process.exit(0));
  };
  process.on('SIGINT', cerrar);
  process.on('SIGTERM', cerrar);
  await app.listen({ port: config.puerto, host: config.host });
  app.log.info(`Reserva pública en ${config.baseUrlPublica}/public/reservar`);
  app.log.info(`Agenda de recepción en ${config.baseUrlPublica}/recepcion`);
}

iniciar().catch((error: unknown) => {
  if (error instanceof ConfiguracionInvalidaError) process.stderr.write(`${error.message}\n`);
  else if (error instanceof DatoInvalidoError) process.stderr.write(`Administrador inicial inválido (${error.campo}): ${error.motivo}\n`);
  else process.stderr.write(`No se pudo iniciar el servidor: ${error instanceof Error ? error.message : 'error desconocido'}\n`);
  process.exit(1);
});
