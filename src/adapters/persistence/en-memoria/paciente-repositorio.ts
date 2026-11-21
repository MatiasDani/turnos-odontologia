import type { PacienteRepositorio } from '../../../application/puertos/repositorios.js';
import type { Paciente } from '../../../domain/paciente.js';

export class PacienteRepositorioEnMemoria implements PacienteRepositorio {
  private readonly pacientes: Paciente[];

  constructor(iniciales: readonly Paciente[] = []) {
    this.pacientes = [...iniciales];
  }

  obtenerPorDni(dni: string): Promise<Paciente | undefined> {
    return Promise.resolve(this.pacientes.find((p) => p.dni === dni));
  }

  guardar(paciente: Paciente): Promise<void> {
    const indice = this.pacientes.findIndex((p) => p.id === paciente.id);
    if (indice >= 0) this.pacientes[indice] = paciente;
    else this.pacientes.push(paciente);
    return Promise.resolve();
  }

  /** Solo para inspección en pruebas (no forma parte del puerto). */
  todos(): readonly Paciente[] {
    return [...this.pacientes];
  }
}
