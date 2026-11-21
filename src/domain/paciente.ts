/** Solo datos ficticios en el repositorio (Ley 25.326). */
export interface Paciente {
  readonly id: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly dni: string;
  readonly telefono: string;
  readonly email?: string;
  readonly consentimientoContacto: boolean;
}
