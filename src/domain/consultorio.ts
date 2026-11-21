export interface Consultorio {
  readonly id: string;
  readonly nombre: string;
  /** Zona horaria IANA (DD-09). */
  readonly zonaHoraria: string;
  readonly telefonoContacto: string;
  readonly email: string;
}
