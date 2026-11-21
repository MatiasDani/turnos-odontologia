import { describe, expect, test } from 'vitest';
import { TokenYaEmitidoError } from '../../src/application/servicio-tokens.js';
import { ReglaNegocioError } from '../../src/domain/errores.js';
import type { Turno } from '../../src/domain/turno.js';
import { crearEntorno, crearTurno, LUNES, local } from '../fixtures/seed.js';
import {
  crearSistemaReserva,
  pedidoBase,
  rechazoPublico,
  reservar,
  type SistemaReserva,
} from '../fixtures/sistema.js';

describe('Reserva online exitosa', () => {
  test('Reserva exitosa nace reservado con origen online y token', async () => {
    const sistema = crearSistemaReserva();
    const respuesta = await reservar(sistema, pedidoBase());

    const turno = await sistema.turnos.obtenerPorId(respuesta.turnoId);
    expect(turno).toMatchObject({
      estado: 'reservado',
      origen: 'online',
      profesionalId: 'p1',
      sillonId: 's1',
      prestacionId: 'pr2',
      inicio: local(LUNES, '09:00'),
      fin: local(LUNES, '09:45'),
    });
    const paciente = await sistema.pacientes.obtenerPorDni('00000004');
    expect(paciente).toBeDefined();
    expect(turno?.pacienteId).toBe(paciente?.id);
    expect(paciente?.id).not.toMatch(/^pa[123]$/);
    expect(respuesta.turnoId).toBe(turno?.id);
    expect(respuesta.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  test('Filtro opcional por profesional', async () => {
    const sistema = crearSistemaReserva();
    const respuesta = await reservar(sistema, pedidoBase({ profesionalId: 'p2' }));
    await expect(sistema.turnos.obtenerPorId(respuesta.turnoId)).resolves.toMatchObject({
      profesionalId: 'p2',
      sillonId: 's1',
    });
  });
});

describe('Respuesta pública de la reserva', () => {
  test('Respuesta incluye profesional y prestación sin sillón', async () => {
    const sistema = crearSistemaReserva();
    const respuesta = await reservar(sistema, pedidoBase());

    expect(respuesta.inicio).toEqual(local(LUNES, '09:00'));
    expect(respuesta.fin).toEqual(local(LUNES, '09:45'));
    expect(respuesta.prestacion).toEqual({ nombre: 'Limpieza' });
    expect(respuesta.profesional).toEqual({ nombre: 'Ana', apellido: 'Ejemplo' });
    expect(Object.keys(respuesta).sort()).toEqual(
      ['fin', 'inicio', 'prestacion', 'profesional', 'token', 'turnoId'],
    );
    expect(JSON.stringify(respuesta)).not.toMatch(/sillon|pacienteId|"s1"/);
  });
});

describe('Validación estricta del pedido público', () => {
  test('Campo duracionMinutos rechazado', async () => {
    const sistema = crearSistemaReserva();
    const error = await rechazoPublico(reservar(sistema, pedidoBase({ duracionMinutos: 60 })));
    expect(error.codigo).toBe('DATOS_INVALIDOS');
    expect(error.campos).toEqual(['duracionMinutos']);
    expect(sistema.turnos.todos()).toEqual([]);
    expect(sistema.pacientes.todos()).toHaveLength(3);
    expect(sistema.tokens.todos()).toEqual([]);
  });

  test('Campos sillonId y rol rechazados', async () => {
    const sistema = crearSistemaReserva();
    const error = await rechazoPublico(
      reservar(sistema, pedidoBase({ sillonId: 's2', rol: 'administrador' })),
    );
    expect(error.codigo).toBe('DATOS_INVALIDOS');
    expect(error.campos).toEqual(['rol', 'sillonId']);
  });

  test('Campo desconocido dentro del paciente rechazado', async () => {
    const error = await rechazoPublico(reservar(crearSistemaReserva(), pedidoBase({}, { id: 'pa1' })));
    expect(error.codigo).toBe('DATOS_INVALIDOS');
    expect(error.campos).toEqual(['paciente.id']);
  });

  test('Inicio sin formato de fecha válido', async () => {
    const error = await rechazoPublico(
      reservar(crearSistemaReserva(), pedidoBase({ inicio: 'lunes 9 hs' })),
    );
    expect(error.codigo).toBe('DATOS_INVALIDOS');
    expect(error.campos).toEqual(['inicio']);
  });

  test('Pedido que no es un objeto', async () => {
    const error = await rechazoPublico(reservar(crearSistemaReserva(), null));
    expect(error.codigo).toBe('DATOS_INVALIDOS');
    expect(error.campos).toEqual(['pedido']);
  });
});

describe('Datos mínimos del paciente', () => {
  test('DNI con puntos se normaliza', async () => {
    const sistema = crearSistemaReserva();
    await reservar(sistema, pedidoBase({}, { dni: '00.000.004' }));
    await expect(sistema.pacientes.obtenerPorDni('00000004')).resolves.toBeDefined();
    expect(sistema.pacientes.todos().filter((p) => p.dni.includes('.'))).toEqual([]);
  });

  test('DNI inválido', async () => {
    for (const dni of ['123456', '123456789', '00A00004']) {
      const sistema = crearSistemaReserva();
      const error = await rechazoPublico(reservar(sistema, pedidoBase({}, { dni })));
      expect(error.codigo).toBe('DATOS_INVALIDOS');
      expect(error.campos).toEqual(['paciente.dni']);
      expect(sistema.turnos.todos()).toEqual([]);
    }
  });

  test('Teléfono se normaliza a dígitos', async () => {
    const sistema = crearSistemaReserva();
    await reservar(sistema, pedidoBase());
    await expect(sistema.pacientes.obtenerPorDni('00000004')).resolves.toMatchObject({
      telefono: '5491100000004',
    });
  });

  test('Teléfono inválido', async () => {
    for (const telefono of ['12345', '+1 555 000 0000', '11-ABCD-0004']) {
      const error = await rechazoPublico(reservar(crearSistemaReserva(), pedidoBase({}, { telefono })));
      expect(error.codigo).toBe('DATOS_INVALIDOS');
      expect(error.campos).toEqual(['paciente.telefono']);
    }
  });

  test('Consentimiento ausente', async () => {
    for (const consentimientoContacto of [undefined, false]) {
      const error = await rechazoPublico(
        reservar(crearSistemaReserva(), pedidoBase({}, { consentimientoContacto })),
      );
      expect(error.codigo).toBe('DATOS_INVALIDOS');
      expect(error.campos).toEqual(['paciente.consentimientoContacto']);
    }
  });

  test('Nombre vacío', async () => {
    const error = await rechazoPublico(reservar(crearSistemaReserva(), pedidoBase({}, { nombre: '   ' })));
    expect(error.campos).toEqual(['paciente.nombre']);
  });

  test('Apellido demasiado largo', async () => {
    const sistema = crearSistemaReserva();
    const error = await rechazoPublico(reservar(sistema, pedidoBase({}, { apellido: 'a'.repeat(81) })));
    expect(error.codigo).toBe('DATOS_INVALIDOS');
    expect(error.campos).toEqual(['paciente.apellido']);
    await expect(reservar(sistema, pedidoBase({}, { apellido: 'a'.repeat(80) }))).resolves.toBeDefined();
    await expect(sistema.pacientes.obtenerPorDni('00000004')).resolves.toMatchObject({
      apellido: 'a'.repeat(80),
    });
  });

  test('Email inválido', async () => {
    const error = await rechazoPublico(
      reservar(crearSistemaReserva(), pedidoBase({}, { email: 'paciente4@ejemplo' })),
    );
    expect(error.campos).toEqual(['paciente.email']);
  });

  test('Email ausente es válido', async () => {
    const sistema = crearSistemaReserva();
    await reservar(sistema, pedidoBase({}, { email: undefined }));
    const paciente = await sistema.pacientes.obtenerPorDni('00000004');
    expect(paciente).toBeDefined();
    expect(paciente && 'email' in paciente).toBe(false);
  });

  test('Varios campos inválidos se informan juntos', async () => {
    const error = await rechazoPublico(
      reservar(crearSistemaReserva(), pedidoBase({}, { dni: '1', telefono: '2' })),
    );
    expect(error.campos).toEqual(['paciente.dni', 'paciente.telefono']);
  });

  test('El caso de uso revalida los datos del paciente aunque no pasen por la frontera', async () => {
    const sistema = crearSistemaReserva();
    const error = await rechazoPublico(
      sistema.reservarOnline.ejecutar({
        prestacionId: 'pr2',
        inicio: local(LUNES, '09:00'),
        paciente: {
          dni: '123',
          nombre: 'Paciente',
          apellido: 'Ficticio 4',
          telefono: '2',
          consentimientoContacto: true,
        },
      }),
    );
    expect(error.codigo).toBe('DATOS_INVALIDOS');
    expect(error.campos).toEqual(['paciente.dni', 'paciente.telefono']);
    expect(sistema.turnos.todos()).toEqual([]);
  });

  test('El caso de uso guarda los datos normalizados aunque lleguen sin normalizar', async () => {
    const sistema = crearSistemaReserva();
    await sistema.reservarOnline.ejecutar({
      prestacionId: 'pr2',
      inicio: local(LUNES, '09:00'),
      paciente: {
        dni: '00.000.004',
        nombre: '  Paciente ',
        apellido: 'Ficticio 4',
        telefono: '+54 9 11 0000-0004',
        consentimientoContacto: true,
      },
    });
    await expect(sistema.pacientes.obtenerPorDni('00000004')).resolves.toMatchObject({
      nombre: 'Paciente',
      telefono: '5491100000004',
    });
  });
});

describe('No existe opción de forzar', () => {
  test('No existe opción de forzar', async () => {
    const sistema = crearSistemaReserva({
      turnos: [
        crearTurno({ id: 'tr-1', profesionalId: 'p1', sillonId: 's1', pacienteId: 'pa2' }),
        crearTurno({ id: 'tr-2', profesionalId: 'p2', sillonId: 's2', pacienteId: 'pa3' }),
      ],
    });
    const error = await rechazoPublico(reservar(sistema, pedidoBase({ forzar: true })));
    expect(error.codigo).toBe('DATOS_INVALIDOS');
    expect(error.campos).toEqual(['forzar']);
    expect(sistema.turnos.todos()).toHaveLength(2);
  });
});

describe('Sin reservas en el pasado', () => {
  test('Reserva en el pasado', async () => {
    const sistema = crearSistemaReserva({ ahora: local(LUNES, '10:07') });
    const error = await rechazoPublico(reservar(sistema, pedidoBase()));
    expect(error.codigo).toBe('RESERVA_EN_PASADO');
    expect(sistema.turnos.todos()).toEqual([]);
    await expect(sistema.pacientes.obtenerPorDni('00000004')).resolves.toBeUndefined();
  });

  test('Hueco que empieza justo ahora aceptado', async () => {
    const sistema = crearSistemaReserva({ ahora: local(LUNES, '09:00') });
    const respuesta = await reservar(sistema, pedidoBase());
    expect(respuesta.inicio).toEqual(local(LUNES, '09:00'));
    expect(respuesta.fin).toEqual(local(LUNES, '09:45'));
  });

  test('Un minuto antes de ahora se rechaza como pasado', async () => {
    const sistema = crearSistemaReserva({ ahora: local(LUNES, '09:01') });
    const error = await rechazoPublico(reservar(sistema, pedidoBase()));
    expect(error.codigo).toBe('RESERVA_EN_PASADO');
  });
});

describe('Prestación y profesional públicos válidos', () => {
  const seed = crearEntorno();

  test('Prestación inexistente', async () => {
    const sistema = crearSistemaReserva();
    const error = await rechazoPublico(reservar(sistema, pedidoBase({ prestacionId: 'pr-x' })));
    expect(error.codigo).toBe('PRESTACION_NO_DISPONIBLE');
    expect(sistema.turnos.todos()).toEqual([]);
  });

  test('Prestación inactiva', async () => {
    const sistema = crearSistemaReserva({
      prestaciones: seed.prestaciones.map((p) => (p.id === 'pr2' ? { ...p, activa: false } : p)),
    });
    const error = await rechazoPublico(reservar(sistema, pedidoBase()));
    expect(error.codigo).toBe('PRESTACION_NO_DISPONIBLE');
    expect(sistema.turnos.todos()).toEqual([]);
  });

  test('Profesional no habilitado elegido', async () => {
    const sistema = crearSistemaReserva({
      profesionales: seed.profesionales.map((p) =>
        p.id === 'p2' ? { ...p, prestacionIds: ['pr1', 'pr3', 'pr4'] } : p,
      ),
    });
    const error = await rechazoPublico(reservar(sistema, pedidoBase({ profesionalId: 'p2' })));
    expect(error.codigo).toBe('PROFESIONAL_NO_DISPONIBLE');
    expect(sistema.turnos.todos()).toEqual([]);
  });

  test('Profesional inexistente o inactivo elegido', async () => {
    const inexistente = await rechazoPublico(
      reservar(crearSistemaReserva(), pedidoBase({ profesionalId: 'p-x' })),
    );
    expect(inexistente.codigo).toBe('PROFESIONAL_NO_DISPONIBLE');

    const sistema = crearSistemaReserva({
      profesionales: seed.profesionales.map((p) => (p.id === 'p2' ? { ...p, activo: false } : p)),
    });
    const inactivo = await rechazoPublico(reservar(sistema, pedidoBase({ profesionalId: 'p2' })));
    expect(inactivo.codigo).toBe('PROFESIONAL_NO_DISPONIBLE');
  });
});

const MIERCOLES_15 = '2026-11-25T15:00:00-03:00';

describe('Mismas reglas de agenda que la recepción', () => {
  const seed = crearEntorno();
  const turnoDe = (id: string, profesionalId: string, sillonId: string, pacienteId: string) =>
    crearTurno({ id, profesionalId, sillonId, pacienteId });

  test('Profesionales ocupados rechazan el horario', async () => {
    const sistema = crearSistemaReserva({
      turnos: [turnoDe('tr-1', 'p1', 's1', 'pa2'), turnoDe('tr-2', 'p2', 's2', 'pa3')],
    });
    const error = await rechazoPublico(reservar(sistema, pedidoBase()));
    expect(error.codigo).toBe('HORARIO_NO_DISPONIBLE');
    expect(sistema.turnos.todos()).toHaveLength(2);
  });

  test('Sillón ocupado se salta en la asignación', async () => {
    const sistema = crearSistemaReserva({ turnos: [turnoDe('tr-1', 'p2', 's1', 'pa2')] });
    const respuesta = await reservar(sistema, pedidoBase());
    await expect(sistema.turnos.obtenerPorId(respuesta.turnoId)).resolves.toMatchObject({
      profesionalId: 'p1',
      sillonId: 's2',
    });
  });

  test('Bloqueo del profesional elegido', async () => {
    const sistema = crearSistemaReserva();
    const error = await rechazoPublico(
      reservar(sistema, pedidoBase({ prestacionId: 'pr1', inicio: MIERCOLES_15, profesionalId: 'p1' })),
    );
    expect(error.codigo).toBe('HORARIO_NO_DISPONIBLE');
    const respuesta = await reservar(sistema, pedidoBase({ prestacionId: 'pr1', inicio: MIERCOLES_15 }));
    await expect(sistema.turnos.obtenerPorId(respuesta.turnoId)).resolves.toMatchObject({
      profesionalId: 'p2',
      sillonId: 's1',
    });
  });

  test('Fuera del horario de atención', async () => {
    const error = await rechazoPublico(
      reservar(crearSistemaReserva(), pedidoBase({ inicio: '2026-11-28T10:00:00-03:00' })),
    );
    expect(error.codigo).toBe('HORARIO_NO_DISPONIBLE');
  });

  test('Turno que cruza el corte entre tramos', async () => {
    const error = await rechazoPublico(
      reservar(crearSistemaReserva(), pedidoBase({ inicio: '2026-11-23T12:30:00-03:00' })),
    );
    expect(error.codigo).toBe('HORARIO_NO_DISPONIBLE');
  });

  test('Sillón inactivo no se asigna', async () => {
    const sistema = crearSistemaReserva({
      sillones: seed.sillones.map((s) => (s.id === 's1' ? { ...s, activo: false } : s)),
    });
    const respuesta = await reservar(sistema, pedidoBase());
    await expect(sistema.turnos.obtenerPorId(respuesta.turnoId)).resolves.toMatchObject({
      profesionalId: 'p1',
      sillonId: 's2',
    });
  });

  test('Inicio no alineado al paso de la disponibilidad', async () => {
    const error = await rechazoPublico(
      reservar(crearSistemaReserva(), pedidoBase({ inicio: '2026-11-23T09:07:00-03:00' })),
    );
    expect(error.codigo).toBe('HORARIO_NO_DISPONIBLE');
  });

  test('Un error interno de la consulta se traduce a un error público sin propagarse', async () => {
    const consultar = {
      ejecutar: () =>
        Promise.reject(
          new ReglaNegocioError({ codigo: 'RN-18', turnoEnConflicto: crearTurno({ id: 'tr-9' }) }),
        ),
    };
    const sistema = crearSistemaReserva({ consultar });
    const error = await rechazoPublico(reservar(sistema, pedidoBase()));
    expect(error.codigo).toBe('HORARIO_NO_DISPONIBLE');
    expect(error.nuevaOferta).toEqual([]);
  });
});

describe('Nueva oferta ante horario no disponible', () => {
  test('Nueva oferta del día sin el horario ocupado', async () => {
    const sistema = crearSistemaReserva({
      turnos: [
        crearTurno({ id: 'tr-1', profesionalId: 'p1', sillonId: 's1', pacienteId: 'pa2' }),
        crearTurno({ id: 'tr-2', profesionalId: 'p2', sillonId: 's2', pacienteId: 'pa3' }),
      ],
    });
    const error = await rechazoPublico(reservar(sistema, pedidoBase()));
    const oferta = error.nuevaOferta ?? [];

    expect(oferta.length).toBeGreaterThan(0);
    const inicioDelDia = local(LUNES, '00:00').getTime();
    expect(oferta.every((o) => o.inicio.getTime() >= inicioDelDia)).toBe(true);
    expect(oferta.every((o) => o.inicio.getTime() < inicioDelDia + 24 * 60 * 60_000)).toBe(true);
    expect(oferta.map((o) => o.inicio.getTime())).not.toContain(local(LUNES, '09:00').getTime());
    expect(oferta[0]).toEqual({ inicio: local(LUNES, '10:00'), fin: local(LUNES, '10:45') });
    for (const o of oferta) expect(Object.keys(o).sort()).toEqual(['fin', 'inicio']);
  });

  test('La oferta respeta el filtro de profesional pedido y parte de ahora', async () => {
    const sistema = crearSistemaReserva({
      ahora: local(LUNES, '09:30'),
      turnos: [crearTurno({ id: 'tr-1', profesionalId: 'p1', sillonId: 's1', pacienteId: 'pa2' })],
    });
    const error = await rechazoPublico(
      reservar(sistema, pedidoBase({ profesionalId: 'p1', inicio: '2026-11-23T09:30:00-03:00' })),
    );
    const oferta = error.nuevaOferta ?? [];
    expect(oferta[0]).toEqual({ inicio: local(LUNES, '10:00'), fin: local(LUNES, '10:45') });
    expect(oferta.every((o) => o.inicio.getTime() >= local(LUNES, '09:30').getTime())).toBe(true);
  });

  test('Fuera del horario la oferta del día está vacía', async () => {
    const error = await rechazoPublico(
      reservar(crearSistemaReserva(), pedidoBase({ inicio: '2026-11-28T10:00:00-03:00' })),
    );
    expect(error.nuevaOferta).toEqual([]);
  });
});

describe('Solo profesionales habilitados reciben el turno', () => {
  const seed = crearEntorno();
  const huecoDe = (profesionalId: string, sillonId: string) => ({
    inicio: local(LUNES, '09:00'),
    fin: local(LUNES, '09:45'),
    profesionalId,
    sillonId,
  });
  const p1SinPr2 = seed.profesionales.map((p) => (p.id === 'p1' ? { ...p, prestacionIds: ['pr1'] } : p));

  test('Combo de profesional no habilitado se descarta', async () => {
    const consultar = { ejecutar: () => Promise.resolve([huecoDe('p1', 's1'), huecoDe('p2', 's2')]) };
    const sistema = crearSistemaReserva({ profesionales: p1SinPr2, consultar });
    const respuesta = await reservar(sistema, pedidoBase());
    await expect(sistema.turnos.obtenerPorId(respuesta.turnoId)).resolves.toMatchObject({
      profesionalId: 'p2',
      sillonId: 's2',
    });
  });

  test('Si todos los combos son de profesionales no habilitados se rechaza y la oferta no los incluye', async () => {
    const consultar = { ejecutar: () => Promise.resolve([huecoDe('p1', 's1')]) };
    const sistema = crearSistemaReserva({ profesionales: p1SinPr2, consultar });
    const error = await rechazoPublico(reservar(sistema, pedidoBase()));
    expect(error.codigo).toBe('HORARIO_NO_DISPONIBLE');
    expect(error.nuevaOferta).toEqual([]);
    expect(sistema.turnos.todos()).toEqual([]);
  });

  test('Un combo de otro horario devuelto por la fuente se ignora', async () => {
    const otro = { ...huecoDe('p2', 's2'), inicio: local(LUNES, '09:15'), fin: local(LUNES, '10:00') };
    const consultar = { ejecutar: () => Promise.resolve([otro]) };
    const sistema = crearSistemaReserva({ consultar });
    const error = await rechazoPublico(reservar(sistema, pedidoBase()));
    expect(error.codigo).toBe('HORARIO_NO_DISPONIBLE');
    expect(sistema.turnos.todos()).toEqual([]);
  });
});

describe('Carrera entre la consulta y el alta', () => {
  const recepcion = (id: string, profesionalId: string, sillonId: string) =>
    crearTurno({ id, profesionalId, sillonId, pacienteId: 'pa2' });

  test('Carrera con reintento exitoso en otro combo', async () => {
    const sistema = crearSistemaReserva();
    sistema.turnos.antesDeAgregar = (_candidato, intento) => {
      if (intento === 1) sistema.turnos.insertar(recepcion('tr-1', 'p1', 's1'));
    };
    const respuesta = await reservar(sistema, pedidoBase());
    await expect(sistema.turnos.obtenerPorId(respuesta.turnoId)).resolves.toMatchObject({
      profesionalId: 'p2',
      sillonId: 's2',
    });
    expect(respuesta.profesional).toEqual({ nombre: 'Bruno', apellido: 'Muestra' });
    expect(sistema.turnos.intentosDeAlta).toBe(2);
  });

  test('Carrera sin alternativa devuelve horario no disponible y nueva oferta', async () => {
    const sistema = crearSistemaReserva();
    sistema.turnos.antesDeAgregar = (_candidato, intento) => {
      if (intento === 1) {
        sistema.turnos.insertar(recepcion('tr-1', 'p1', 's1'));
        sistema.turnos.insertar(recepcion('tr-2', 'p2', 's2'));
      }
    };
    const error = await rechazoPublico(reservar(sistema, pedidoBase()));
    expect(error.codigo).toBe('HORARIO_NO_DISPONIBLE');
    expect(error.nuevaOferta?.[0]).toEqual({ inicio: local(LUNES, '10:00'), fin: local(LUNES, '10:45') });
    expect(sistema.turnos.todos().map((t) => t.id)).toEqual(['tr-1', 'tr-2']);
    await expect(sistema.pacientes.obtenerPorDni('00000004')).resolves.toBeUndefined();
    expect(sistema.tokens.todos()).toEqual([]);
    expect(sistema.turnos.intentosDeAlta).toBe(1);
  });

  test('Solo un reintento', async () => {
    const sistema = crearSistemaReserva();
    sistema.turnos.antesDeAgregar = (_candidato, intento) => {
      if (intento === 1) sistema.turnos.insertar(recepcion('tr-1', 'p1', 's1'));
      if (intento === 2) sistema.turnos.insertar(recepcion('tr-2', 'p2', 's2'));
    };
    const error = await rechazoPublico(reservar(sistema, pedidoBase()));
    expect(error.codigo).toBe('HORARIO_NO_DISPONIBLE');
    expect(error.nuevaOferta).toBeDefined();
    expect(sistema.turnos.intentosDeAlta).toBe(2);
    expect(sistema.turnos.todos().map((t) => t.id)).toEqual(['tr-1', 'tr-2']);
    await expect(sistema.pacientes.obtenerPorDni('00000004')).resolves.toBeUndefined();
    expect(sistema.tokens.todos()).toEqual([]);
  });

  test('Un rechazo del alta que no es solapamiento no se reintenta', async () => {
    let intentos = 0;
    const agendar = {
      ejecutar: () => {
        intentos += 1;
        return Promise.reject(new ReglaNegocioError({ codigo: 'RN-17' }));
      },
    };
    const sistema = crearSistemaReserva({ agendar });
    const error = await rechazoPublico(reservar(sistema, pedidoBase()));
    expect(error.codigo).toBe('HORARIO_NO_DISPONIBLE');
    expect(intentos).toBe(1);
    await expect(sistema.pacientes.obtenerPorDni('00000004')).resolves.toBeUndefined();
  });

  test('Un error inesperado del alta no se enmascara como error público', async () => {
    const agendar = { ejecutar: () => Promise.reject(new TypeError('fallo de infraestructura')) };
    const sistema = crearSistemaReserva({ agendar });
    await expect(reservar(sistema, pedidoBase())).rejects.toBeInstanceOf(TypeError);
    await expect(sistema.pacientes.obtenerPorDni('00000004')).resolves.toBeUndefined();
  });
});

describe('Paciente existente por DNI', () => {
  test('DNI existente se vincula sin modificar datos', async () => {
    const sistema = crearSistemaReserva();
    const respuesta = await reservar(
      sistema,
      pedidoBase({}, { dni: '00000001', nombre: 'Otro', apellido: 'Nombre', telefono: '+54 9 11 0000-9999' }),
    );
    await expect(sistema.turnos.obtenerPorId(respuesta.turnoId)).resolves.toMatchObject({
      pacienteId: 'pa1',
    });
    await expect(sistema.pacientes.obtenerPorDni('00000001')).resolves.toEqual({
      id: 'pa1',
      nombre: 'Carla',
      apellido: 'Prueba',
      dni: '00000001',
      telefono: '+54 9 11 0000-0001',
      consentimientoContacto: true,
    });
    expect(sistema.pacientes.todos()).toHaveLength(3);
  });

  test('Respuesta no revela si el DNI existía', async () => {
    const conExistente = await reservar(crearSistemaReserva(), pedidoBase({}, { dni: '00000001' }));
    const conNuevo = await reservar(crearSistemaReserva(), pedidoBase({}, { dni: '00000004' }));

    expect(Object.keys(conExistente).sort()).toEqual(Object.keys(conNuevo).sort());
    expect(Object.keys(conExistente.prestacion)).toEqual(Object.keys(conNuevo.prestacion));
    expect(Object.keys(conExistente.profesional)).toEqual(Object.keys(conNuevo.profesional));
    expect({ ...conExistente, turnoId: '', token: '' }).toEqual({ ...conNuevo, turnoId: '', token: '' });
    expect(conExistente.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(conNuevo.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe('Sin pacientes huérfanos', () => {
  const ocupados = [
    crearTurno({ id: 'tr-1', profesionalId: 'p1', sillonId: 's1', pacienteId: 'pa2' }),
    crearTurno({ id: 'tr-2', profesionalId: 'p2', sillonId: 's2', pacienteId: 'pa3' }),
  ];

  test('Reserva fallida no deja paciente huérfano', async () => {
    const casos: ReadonlyArray<{ sistema: SistemaReserva; pedido: unknown; codigo: string }> = [
      {
        sistema: crearSistemaReserva({ ahora: local(LUNES, '10:07') }),
        pedido: pedidoBase(),
        codigo: 'RESERVA_EN_PASADO',
      },
      {
        sistema: crearSistemaReserva(),
        pedido: pedidoBase({ prestacionId: 'pr-x' }),
        codigo: 'PRESTACION_NO_DISPONIBLE',
      },
      {
        sistema: crearSistemaReserva({ turnos: ocupados }),
        pedido: pedidoBase(),
        codigo: 'HORARIO_NO_DISPONIBLE',
      },
      {
        sistema: (() => {
          const s = crearSistemaReserva();
          s.turnos.antesDeAgregar = (_c, intento) => {
            if (intento === 1) for (const t of ocupados) s.turnos.insertar(t);
          };
          return s;
        })(),
        pedido: pedidoBase(),
        codigo: 'HORARIO_NO_DISPONIBLE',
      },
    ];
    for (const { sistema, pedido, codigo } of casos) {
      const error = await rechazoPublico(reservar(sistema, pedido));
      expect(error.codigo).toBe(codigo);
      await expect(sistema.pacientes.obtenerPorDni('00000004')).resolves.toBeUndefined();
      expect(sistema.pacientes.todos()).toHaveLength(3);
    }
  });
});

const PACIENTE_4 = {
  id: 'pa4',
  nombre: 'Paciente',
  apellido: 'Ficticio 4',
  dni: '00000004',
  telefono: '5491100000004',
  consentimientoContacto: true,
} as const;

/** Turno online de pa4 (DNI 00000004): p1/s1, `pr2`, de `hora` a 45 minutos después. */
function turnoOnlineDePa4(id: string, dia: string, hora: string, fin: string, overrides: Partial<Turno> = {}): Turno {
  return crearTurno({
    id,
    pacienteId: 'pa4',
    prestacionId: 'pr2',
    inicio: local(dia, hora),
    fin: local(dia, fin),
    duracionMinutos: 45,
    estado: 'reservado',
    origen: 'online',
    ...overrides,
  });
}

function conPa4(turnos: Turno[], ahora?: Date): SistemaReserva {
  return crearSistemaReserva({
    pacientes: [...crearEntorno().pacientes, PACIENTE_4],
    turnos,
    ...(ahora === undefined ? {} : { ahora }),
  });
}

describe('Tope de turnos online por DNI', () => {
  const pedido11 = pedidoBase({ inicio: '2026-11-23T11:00:00-03:00' });

  test('Tope de dos turnos online por DNI', async () => {
    const sistema = conPa4([
      turnoOnlineDePa4('tr-1', LUNES, '09:00', '09:45'),
      turnoOnlineDePa4('tr-2', LUNES, '10:00', '10:45'),
    ]);
    const error = await rechazoPublico(reservar(sistema, pedido11));
    expect(error.codigo).toBe('LIMITE_DE_TURNOS');
    expect(sistema.turnos.todos()).toHaveLength(2);
    expect(sistema.tokens.todos()).toEqual([]);
  });

  test('Turno cancelado no cuenta para el tope', async () => {
    const sistema = conPa4([
      turnoOnlineDePa4('tr-1', LUNES, '09:00', '09:45'),
      turnoOnlineDePa4('tr-2', LUNES, '10:00', '10:45', { estado: 'cancelado' }),
    ]);
    const respuesta = await reservar(sistema, pedido11);
    await expect(sistema.turnos.obtenerPorId(respuesta.turnoId)).resolves.toMatchObject({
      pacienteId: 'pa4',
      inicio: local(LUNES, '11:00'),
    });
  });

  test('Turnos de recepción y pasados no cuentan para el tope', async () => {
    const sistema = conPa4(
      [
        turnoOnlineDePa4('tr-1', LUNES, '09:00', '09:45'),
        turnoOnlineDePa4('tr-2', '2026-11-24', '09:00', '09:45', { estado: 'confirmado', origen: 'recepcion' }),
        turnoOnlineDePa4('tr-3', '2026-11-24', '10:00', '10:45', { estado: 'confirmado', origen: 'recepcion' }),
      ],
      local(LUNES, '10:30'),
    );
    const respuesta = await reservar(sistema, pedido11);
    expect(respuesta.inicio).toEqual(local(LUNES, '11:00'));
  });

  test('Dos turnos online ya iniciados no cuentan para el tope', async () => {
    const sistema = conPa4(
      [
        turnoOnlineDePa4('tr-1', LUNES, '09:00', '09:45'),
        turnoOnlineDePa4('tr-2', LUNES, '10:00', '10:45'),
      ],
      local(LUNES, '10:30'),
    );
    await expect(reservar(sistema, pedido11)).resolves.toBeDefined();
  });

  test('Un turno ausente tampoco cuenta para el tope', async () => {
    const sistema = conPa4([
      turnoOnlineDePa4('tr-1', LUNES, '09:00', '09:45'),
      turnoOnlineDePa4('tr-2', LUNES, '10:00', '10:45', { estado: 'ausente' }),
    ]);
    await expect(reservar(sistema, pedido11)).resolves.toBeDefined();
  });

  test('El tope es configurable', async () => {
    const sistema = crearSistemaReserva({
      pacientes: [...crearEntorno().pacientes, PACIENTE_4],
      turnos: [turnoOnlineDePa4('tr-1', LUNES, '09:00', '09:45')],
      topeTurnosOnline: 1,
    });
    const error = await rechazoPublico(reservar(sistema, pedido11));
    expect(error.codigo).toBe('LIMITE_DE_TURNOS');
  });

  test('El tope no cuenta los turnos de otros DNI', async () => {
    const sistema = crearSistemaReserva({
      turnos: [
        turnoOnlineDePa4('tr-1', LUNES, '09:00', '09:45', { pacienteId: 'pa2' }),
        turnoOnlineDePa4('tr-2', LUNES, '10:00', '10:45', { pacienteId: 'pa2' }),
      ],
    });
    await expect(reservar(sistema, pedido11)).resolves.toBeDefined();
  });
});

describe('Reserva duplicada', () => {
  test('Reserva duplicada no crea otro turno ni token', async () => {
    const sistema = crearSistemaReserva();
    const primera = await reservar(sistema, pedidoBase());
    const error = await rechazoPublico(reservar(sistema, pedidoBase()));
    expect(error.codigo).toBe('RESERVA_DUPLICADA');
    expect(sistema.turnos.todos()).toHaveLength(1);
    expect(sistema.tokens.todos()).toHaveLength(1);
    expect(JSON.stringify(error, Object.getOwnPropertyNames(error))).not.toContain(primera.token);
  });

  test('Duplicado de un turno cancelado no es duplicado', async () => {
    const sistema = crearSistemaReserva();
    const primera = await reservar(sistema, pedidoBase());
    sistema.turnos.cambiarEstado(primera.turnoId, 'cancelado');
    const segunda = await reservar(sistema, pedidoBase());
    expect(segunda.turnoId).not.toBe(primera.turnoId);
    expect(segunda.token).not.toBe(primera.token);
    await expect(sistema.turnos.obtenerPorId(segunda.turnoId)).resolves.toMatchObject({
      estado: 'reservado',
    });
  });

  test('Otra prestación en el mismo horario no es duplicado', async () => {
    const sistema = crearSistemaReserva();
    await reservar(sistema, pedidoBase());
    await expect(reservar(sistema, pedidoBase({ prestacionId: 'pr1' }))).resolves.toBeDefined();
  });
});

describe('Orden de los errores públicos', () => {
  test('Pasado prevalece sobre prestación inexistente', async () => {
    const sistema = crearSistemaReserva({ ahora: local(LUNES, '10:07') });
    const error = await rechazoPublico(reservar(sistema, pedidoBase({ prestacionId: 'pr-x' })));
    expect(error.codigo).toBe('RESERVA_EN_PASADO');
  });

  test('Duplicado prevalece sobre tope', async () => {
    const sistema = conPa4([
      turnoOnlineDePa4('tr-1', LUNES, '09:00', '09:45'),
      turnoOnlineDePa4('tr-2', LUNES, '10:00', '10:45'),
    ]);
    const error = await rechazoPublico(reservar(sistema, pedidoBase()));
    expect(error.codigo).toBe('RESERVA_DUPLICADA');
  });

  test('Datos inválidos prevalece sobre pasado', async () => {
    const sistema = crearSistemaReserva({ ahora: local(LUNES, '10:07') });
    const error = await rechazoPublico(reservar(sistema, pedidoBase({}, { dni: '1' })));
    expect(error.codigo).toBe('DATOS_INVALIDOS');
  });

  test('Prestación prevalece sobre profesional', async () => {
    const error = await rechazoPublico(
      reservar(crearSistemaReserva(), pedidoBase({ prestacionId: 'pr-x', profesionalId: 'p-x' })),
    );
    expect(error.codigo).toBe('PRESTACION_NO_DISPONIBLE');
  });

  test('Profesional prevalece sobre duplicado', async () => {
    const sistema = conPa4([turnoOnlineDePa4('tr-1', LUNES, '09:00', '09:45')]);
    const error = await rechazoPublico(reservar(sistema, pedidoBase({ profesionalId: 'p-x' })));
    expect(error.codigo).toBe('PROFESIONAL_NO_DISPONIBLE');
  });

  test('Tope prevalece sobre horario no disponible', async () => {
    const sistema = conPa4([
      turnoOnlineDePa4('tr-1', LUNES, '09:00', '09:45'),
      turnoOnlineDePa4('tr-2', LUNES, '10:00', '10:45'),
    ]);
    const error = await rechazoPublico(
      reservar(sistema, pedidoBase({ inicio: '2026-11-28T10:00:00-03:00' })),
    );
    expect(error.codigo).toBe('LIMITE_DE_TURNOS');
  });
});

/** Serialización de un error como la vería un cliente: propiedades propias y mensaje, sin la traza. */
function serializar(error: Error): string {
  return JSON.stringify({ ...error, name: error.name, message: error.message });
}

describe('Errores públicos sin datos de otros pacientes', () => {
  const prohibidos = [
    'pa1',
    'pa2',
    'tr-1',
    'tr-2',
    's1',
    's2',
    'turnoEnConflicto',
    'bloqueoEnConflicto',
    'sillon',
    'pacienteId',
  ];

  test('Error público sin datos de otros pacientes', async () => {
    const sistema = crearSistemaReserva({
      turnos: [
        crearTurno({ id: 'tr-1', profesionalId: 'p1', sillonId: 's1', pacienteId: 'pa1' }),
        crearTurno({ id: 'tr-2', profesionalId: 'p2', sillonId: 's2', pacienteId: 'pa2' }),
      ],
    });
    const error = await rechazoPublico(reservar(sistema, pedidoBase()));
    expect(error.codigo).toBe('HORARIO_NO_DISPONIBLE');
    const texto = serializar(error);
    for (const prohibido of prohibidos) expect(texto).not.toContain(prohibido);
    expect(error.cause).toBeUndefined();
  });

  test('La carrera sin alternativa tampoco filtra el turno en conflicto', async () => {
    const sistema = crearSistemaReserva();
    sistema.turnos.antesDeAgregar = (_candidato, intento) => {
      if (intento === 1) {
        sistema.turnos.insertar(
          crearTurno({ id: 'tr-1', profesionalId: 'p1', sillonId: 's1', pacienteId: 'pa1' }),
        );
        sistema.turnos.insertar(
          crearTurno({ id: 'tr-2', profesionalId: 'p2', sillonId: 's2', pacienteId: 'pa2' }),
        );
      }
    };
    const error = await rechazoPublico(reservar(sistema, pedidoBase()));
    const texto = serializar(error);
    for (const prohibido of prohibidos) expect(texto).not.toContain(prohibido);
  });

  test('Un bloqueo en conflicto tampoco se expone', async () => {
    const sistema = crearSistemaReserva();
    const error = await rechazoPublico(
      reservar(
        sistema,
        pedidoBase({ prestacionId: 'pr1', inicio: '2026-11-25T15:00:00-03:00', profesionalId: 'p1' }),
      ),
    );
    const texto = serializar(error);
    expect(texto).not.toContain('capacitación');
    expect(texto).not.toContain('bloqueo');
    expect(texto).not.toContain('b1');
  });
});

describe('Token de gestión de alta entropía', () => {
  test('Token único entre dos reservas', async () => {
    const sistema = crearSistemaReserva();
    const primera = await reservar(sistema, pedidoBase());
    const segunda = await reservar(
      sistema,
      pedidoBase({ inicio: '2026-11-23T10:00:00-03:00' }, { dni: '00000005' }),
    );
    expect(primera.token).not.toBe(segunda.token);
    expect(primera.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(segunda.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe('Solo se almacena el hash del token', () => {
  test('Solo se almacena el hash', async () => {
    const sistema = crearSistemaReserva();
    const respuesta = await reservar(sistema, pedidoBase());

    const registros = sistema.tokens.todos();
    expect(registros).toHaveLength(1);
    expect(registros[0]).toEqual({
      turnoId: respuesta.turnoId,
      hash: sistema.hasher.sha256(respuesta.token),
      creadoEn: sistema.reloj.ahora(),
    });
    expect(registros[0]?.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(registros)).not.toContain(respuesta.token);
    expect(JSON.stringify(sistema.turnos.todos())).not.toContain(respuesta.token);
    expect(JSON.stringify(sistema.pacientes.todos())).not.toContain(respuesta.token);
  });
});

describe('Resolución del token de gestión', () => {
  test('Resolver token devuelve su turno', async () => {
    const sistema = crearSistemaReserva();
    const respuesta = await reservar(sistema, pedidoBase());
    await expect(sistema.servicioTokens.resolver(respuesta.token)).resolves.toBe(respuesta.turnoId);
  });

  test('Token ajeno o inválido no resuelve', async () => {
    const sistema = crearSistemaReserva();
    const { token } = await reservar(sistema, pedidoBase());
    const alterado = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;
    for (const candidato of ['x'.repeat(43), '', alterado]) {
      await expect(sistema.servicioTokens.resolver(candidato)).resolves.toBeUndefined();
    }
  });

  test('Token vencido o de turno cancelado no resuelve', async () => {
    const sistema = crearSistemaReserva();
    const { token, turnoId } = await reservar(sistema, pedidoBase());

    sistema.reloj.fijar(local(LUNES, '09:44'));
    await expect(sistema.servicioTokens.resolver(token)).resolves.toBe(turnoId);
    sistema.reloj.fijar(local(LUNES, '09:45'));
    await expect(sistema.servicioTokens.resolver(token)).resolves.toBeUndefined();

    sistema.reloj.fijar(local(LUNES, '09:44'));
    sistema.turnos.cambiarEstado(turnoId, 'cancelado');
    await expect(sistema.servicioTokens.resolver(token)).resolves.toBeUndefined();
  });
});

describe('Rotación del token de gestión', () => {
  test('Token rotado invalida el anterior', async () => {
    const sistema = crearSistemaReserva();
    const { token: t1, turnoId } = await reservar(sistema, pedidoBase());
    const t2 = await sistema.servicioTokens.rotar(turnoId);
    await expect(sistema.servicioTokens.resolver(t2)).resolves.toBe(turnoId);
    await expect(sistema.servicioTokens.resolver(t1)).resolves.toBeUndefined();
    expect(t1).not.toBe(t2);
  });

  test('Un solo token vigente por turno', async () => {
    const sistema = crearSistemaReserva();
    const { token, turnoId } = await reservar(sistema, pedidoBase());
    await expect(sistema.servicioTokens.emitir(turnoId)).rejects.toBeInstanceOf(TokenYaEmitidoError);
    await expect(sistema.servicioTokens.resolver(token)).resolves.toBe(turnoId);
    expect(sistema.tokens.todos()).toHaveLength(1);
  });
});
