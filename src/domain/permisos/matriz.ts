import type { Rol } from '../actor.js';
import type { Accion } from './acciones.js';

/**
 * `si`: el rol puede sobre cualquier recurso; `propio`: solo sobre los suyos (odontólogo: su
 * `profesionalId`; paciente: el `turnoId` de su token); `no`: nunca.
 */
export type Permiso = 'si' | 'propio' | 'no';

/** Matriz RBAC de `knowledge-base/03_actores_y_roles.md` (C-09, DD-33, DD-34). */
export const MATRIZ: Readonly<Record<Accion, Readonly<Record<Rol, Permiso>>>> = {
  'turno.agendar': { administrador: 'si', recepcion: 'si', odontologo: 'no', paciente: 'si' },
  'turno.cancelar': { administrador: 'si', recepcion: 'si', odontologo: 'no', paciente: 'propio' },
  'turno.reprogramar': { administrador: 'si', recepcion: 'si', odontologo: 'no', paciente: 'propio' },
  'turno.confirmar': { administrador: 'si', recepcion: 'si', odontologo: 'no', paciente: 'propio' },
  'turno.cerrar': { administrador: 'si', recepcion: 'si', odontologo: 'propio', paciente: 'no' },
  'disponibilidad.consultar': { administrador: 'si', recepcion: 'si', odontologo: 'si', paciente: 'si' },
  'agenda.ver': { administrador: 'si', recepcion: 'si', odontologo: 'propio', paciente: 'no' },
  'bloqueo.crear': { administrador: 'si', recepcion: 'si', odontologo: 'propio', paciente: 'no' },
  'bloqueo.liberar': { administrador: 'si', recepcion: 'si', odontologo: 'propio', paciente: 'no' },
  'configuracion.modificar': { administrador: 'si', recepcion: 'no', odontologo: 'no', paciente: 'no' },
  'recordatorio.listar': { administrador: 'si', recepcion: 'si', odontologo: 'no', paciente: 'no' },
  'recordatorio.marcarEnviado': { administrador: 'no', recepcion: 'si', odontologo: 'no', paciente: 'no' },
  'usuario.gestionar': { administrador: 'si', recepcion: 'no', odontologo: 'no', paciente: 'no' },
};
