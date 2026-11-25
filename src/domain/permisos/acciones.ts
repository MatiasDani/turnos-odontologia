/** Acciones sujetas a control de acceso (C-09, DD-33, design D3). Lista cerrada. */
export const ACCIONES = [
  'turno.agendar',
  'turno.cancelar',
  'turno.reprogramar',
  'turno.confirmar',
  'turno.cerrar',
  'disponibilidad.consultar',
  'agenda.ver',
  'bloqueo.crear',
  'bloqueo.liberar',
  'configuracion.modificar',
  'recordatorio.listar',
  'recordatorio.marcarEnviado',
  'usuario.gestionar',
] as const;

export type Accion = (typeof ACCIONES)[number];
