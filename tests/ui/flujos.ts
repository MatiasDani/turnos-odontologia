// Pasos reutilizables de la UI del paciente (selectores por rol y nombre accesible).
import type { Page } from 'playwright';

export const DATOS_FICTICIOS: Readonly<Record<'dni' | 'nombre' | 'apellido' | 'telefono' | 'email', string>> = {
  dni: '30000001',
  nombre: 'Paciente',
  apellido: 'Ficticio 1',
  telefono: '1100000000',
  email: 'paciente1@ejemplo.test',
};

export async function abrirReserva(page: Page, url: string): Promise<void> {
  await page.goto(`${url}/public/reservar`);
  await page.getByRole('heading', { name: '¿Qué necesitás?' }).waitFor();
}

export async function elegirPrestacion(page: Page, nombre: string): Promise<void> {
  await page.locator('label.choice', { hasText: nombre }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('heading', { name: 'Elegí día y horario' }).waitFor();
}

export async function elegirDia(page: Page, nombre: string): Promise<void> {
  await page.getByRole('radio', { name: nombre, exact: true }).click();
}

export async function elegirHorario(page: Page, hora: string): Promise<void> {
  const boton = page.getByRole('button', { name: hora, exact: true });
  await boton.waitFor();
  await boton.click();
}

export async function continuarADatos(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('heading', { name: 'Completá tus datos' }).waitFor();
}

export async function completarDatos(page: Page, datos: Partial<Record<keyof typeof DATOS_FICTICIOS, string>> = {}, consentimiento = true): Promise<void> {
  const d = { ...DATOS_FICTICIOS, ...datos };
  await page.getByLabel('DNI', { exact: true }).fill(d.dni);
  await page.getByLabel('Nombre', { exact: true }).fill(d.nombre);
  await page.getByLabel('Apellido', { exact: true }).fill(d.apellido);
  await page.getByLabel('Teléfono', { exact: true }).fill(d.telefono);
  await page.getByLabel(/^E-mail/).fill(d.email);
  if (consentimiento) await page.getByLabel(/Acepto que el consultorio/).check();
}

/** Reserva hasta la pantalla de datos: prestación, lunes 23 y 11:00. */
export async function llegarADatos(page: Page, url: string, prestacion = 'Consulta/control'): Promise<void> {
  await abrirReserva(page, url);
  await elegirPrestacion(page, prestacion);
  await elegirDia(page, 'lunes 23 de noviembre');
  await elegirHorario(page, '11:00');
  await continuarADatos(page);
}

export async function reservarLunesOnce(page: Page, url: string): Promise<void> {
  await llegarADatos(page, url);
  await completarDatos(page);
  await page.getByRole('button', { name: 'Confirmar turno' }).click();
  await page.getByRole('heading', { name: 'Turno reservado' }).waitFor();
}

/** Espera a que aparezca un texto visible (insensible a mayúsculas). */
export async function verTexto(page: Page, texto: string | RegExp): Promise<void> {
  await page.getByText(texto).first().waitFor({ state: 'visible' });
}

export async function textoDeLaPagina(page: Page): Promise<string> {
  return page.locator('body').innerText();
}
