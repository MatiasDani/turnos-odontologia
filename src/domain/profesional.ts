export interface Profesional {
  readonly id: string;
  readonly consultorioId: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly matricula?: string;
  readonly activo: boolean;
  readonly prestacionIds: readonly string[];
}
