import { describe, expect, test } from 'vitest';
import { ConsultarDisponibilidadParaReprogramar } from '../../src/application/consultar-disponibilidad-para-reprogramar.js';
import { ConsultarGestionDesdeToken } from '../../src/application/consultar-gestion-desde-token.js';
import { ErrorEnlacePublico } from '../../src/application/errores-enlace-publico.js';
import { ErrorGestionTurnoPublica } from '../../src/application/errores-gestion-turno-publica.js';
import { ErrorReservaPublica } from '../../src/application/errores-reserva-publica.js';
import { ReprogramarDesdeTokenPublica } from '../../src/application/reprogramar-desde-token-publica.js';
import { local } from '../fixtures/seed.js';
import { crearSistemaPublico, ID_TURNO_BASE, turnoBasePublico, type OpcionesSistemaPublico } from '../fixtures/sistema-publico.js';
import { rechazo } from '../fixtures/sistema.js';

async function gestion(opciones: OpcionesSistemaPublico = {}) {
  const s = await crearSistemaPublico(opciones);
  const token = s.token ?? '';
  const consultar = new ConsultarGestionDesdeToken({
    resolver: s.resolver,
    prestaciones: s.repos.prestaciones,
    consultorios: s.repos.consultorios,
    reloj: s.reloj,
  });
  const disponibilidad = new ConsultarDisponibilidadParaReprogramar({
    resolver: s.resolver,
    consultar: s.consultarDisponibilidad,
    prestaciones: s.repos.prestaciones,
    profesionales: s.repos.profesionales,
    consultorios: s.repos.consultorios,
    reloj: s.reloj,
  });
  const reprogramar = new ReprogramarDesdeTokenPublica({
    reprogramar: s.reprogramarDesdeToken,
    resolver: s.resolver,
    prestaciones: s.repos.prestaciones,
    consultorios: s.repos.consultorios,
    reloj: s.reloj,
  });
  return { s, token, consultar, disponibilidad, reprogramar };
}

describe('ConsultarGestionDesdeToken (vista D6)', () => {
  test('devuelve el turno, el contacto y los días reservables sin ids ni token', async () => {
    const { consultar, token } = await gestion();
    const v = await consultar.ejecutar({ token });
    expect(v).toEqual({
      inicio: local('2026-11-23', '10:00'),
      fin: local('2026-11-23', '10:30'),
      prestacion: { nombre: 'Consulta/control' },
      profesional: { nombre: 'Ana', apellido: 'Ejemplo' },
      asistenciaConfirmada: false,
      gestionOnline: true,
      consultorio: {
        nombre: 'Consultorio Odontológico Demo',
        telefono: '+54 9 11 0000-0000',
        email: 'contacto@demo.test',
        zonaHoraria: 'America/Argentina/Buenos_Aires',
      },
      diasReservables: { desde: '2026-11-22', hasta: '2026-12-22' },
    });
    expect(JSON.stringify(v)).not.toContain(token);
  });

  test('gestionOnline cambia exactamente en las 24 horas (umbral inclusivo)', async () => {
    const { s, consultar, token } = await gestion();
    s.reloj.fijar(local('2026-11-22', '10:00'));
    expect((await consultar.ejecutar({ token })).gestionOnline).toBe(true);
    s.reloj.fijar(local('2026-11-22', '10:01'));
    expect((await consultar.ejecutar({ token })).gestionOnline).toBe(false);
  });

  test('asistenciaConfirmada es verdadero para un turno confirmado', async () => {
    const { consultar, token, s } = await gestion();
    s.turnos.cambiarEstado(ID_TURNO_BASE, 'confirmado');
    expect((await consultar.ejecutar({ token })).asistenciaConfirmada).toBe(true);
  });

  test('un turno atendido o ausente, un token desconocido y uno cancelado dan ENLACE_INVALIDO', async () => {
    const { consultar, token, s } = await gestion();
    expect(await rechazo(consultar.ejecutar({ token: 'x'.repeat(43) }))).toBeInstanceOf(ErrorEnlacePublico);
    s.turnos.cambiarEstado(ID_TURNO_BASE, 'atendido');
    expect(await rechazo(consultar.ejecutar({ token }))).toBeInstanceOf(ErrorEnlacePublico);
    s.turnos.cambiarEstado(ID_TURNO_BASE, 'cancelado');
    expect(await rechazo(consultar.ejecutar({ token }))).toBeInstanceOf(ErrorEnlacePublico);
  });
});

describe('ConsultarDisponibilidadParaReprogramar (D7)', () => {
  test('ofrece solo horarios del mismo profesional y del mismo sillón, sin exponerlos', async () => {
    const { disponibilidad, token } = await gestion({
      turnos: [
        turnoBasePublico(),
        // p2 ocupa s2 el martes 09:00: no afecta a p1/s1.
        { ...turnoBasePublico({ id: 't-p2' }), profesionalId: 'p2', sillonId: 's2', inicio: local('2026-11-24', '09:00'), fin: local('2026-11-24', '09:30') },
      ],
    });
    const r = await disponibilidad.ejecutar({ token, fecha: '2026-11-24' });
    expect(r.horarios.map((h) => h.inicio.getTime())).toContain(local('2026-11-24', '09:00').getTime());
    for (const h of r.horarios) expect(Object.keys(h).sort()).toEqual(['fin', 'inicio']);
  });

  test('un horario donde p1 está libre pero su sillón s1 lo usa otro profesional no se ofrece', async () => {
    const { disponibilidad, token } = await gestion({
      turnos: [
        turnoBasePublico(),
        { ...turnoBasePublico({ id: 't-p2' }), profesionalId: 'p2', sillonId: 's1', inicio: local('2026-11-24', '09:00'), fin: local('2026-11-24', '09:30') },
      ],
    });
    const r = await disponibilidad.ejecutar({ token, fecha: '2026-11-24' });
    expect(r.horarios.map((h) => h.inicio.getTime())).not.toContain(local('2026-11-24', '09:00').getTime());
    expect(r.horarios.map((h) => h.inicio.getTime())).toContain(local('2026-11-24', '09:30').getTime());
  });

  test('con menos de 24 horas rechaza CONTACTAR_CONSULTORIO', async () => {
    const { disponibilidad, token } = await gestion({ ahora: local('2026-11-22', '10:01') });
    const error = await rechazo(disponibilidad.ejecutar({ token, fecha: '2026-11-24' }));
    expect(error).toBeInstanceOf(ErrorGestionTurnoPublica);
    expect(error).toMatchObject({ codigo: 'CONTACTAR_CONSULTORIO' });
  });

  test('fecha fuera del horizonte o inválida: DATOS_INVALIDOS en fecha', async () => {
    const { disponibilidad, token } = await gestion();
    for (const fecha of ['2026-12-23', '2026-02-30']) {
      const error = await rechazo(disponibilidad.ejecutar({ token, fecha }));
      expect(error).toBeInstanceOf(ErrorReservaPublica);
      expect(error).toMatchObject({ codigo: 'DATOS_INVALIDOS', campos: ['fecha'] });
    }
  });

  test('token inválido: ENLACE_INVALIDO antes que cualquier otra regla', async () => {
    const { disponibilidad } = await gestion();
    expect(await rechazo(disponibilidad.ejecutar({ token: 'x'.repeat(43), fecha: '2027-01-01' }))).toBeInstanceOf(
      ErrorEnlacePublico,
    );
  });
});

describe('ReprogramarDesdeTokenPublica (RN-30)', () => {
  test('dentro del horizonte delega y conserva el token', async () => {
    const { reprogramar, token, consultar } = await gestion();
    const r = await reprogramar.ejecutar({ token, inicio: local('2026-11-24', '09:00') });
    expect(r.inicio).toEqual(local('2026-11-24', '09:00'));
    expect((await consultar.ejecutar({ token })).inicio).toEqual(local('2026-11-24', '09:00'));
  });

  test('fuera del horizonte: HORARIO_NO_DISPONIBLE y el turno no cambia', async () => {
    const { reprogramar, token, s } = await gestion();
    const error = await rechazo(reprogramar.ejecutar({ token, inicio: local('2026-12-23', '09:00') }));
    expect(error).toMatchObject({ codigo: 'HORARIO_NO_DISPONIBLE' });
    expect(error).toBeInstanceOf(ErrorGestionTurnoPublica);
    await expect(s.turnos.obtenerPorId(ID_TURNO_BASE)).resolves.toMatchObject({ inicio: local('2026-11-23', '10:00') });
  });

  test('un inicio inválido conserva el rechazo DATOS_INVALIDOS de C-11', async () => {
    const { reprogramar, token } = await gestion();
    expect(await rechazo(reprogramar.ejecutar({ token, inicio: new Date('no es fecha') }))).toMatchObject({
      codigo: 'DATOS_INVALIDOS',
    });
  });

  test('el orden de rechazos es token, 24 horas y horizonte', async () => {
    const { reprogramar, token } = await gestion({ ahora: local('2026-11-22', '10:01') });
    expect(await rechazo(reprogramar.ejecutar({ token: 'x'.repeat(43), inicio: local('2026-12-23', '09:00') }))).toBeInstanceOf(
      ErrorEnlacePublico,
    );
    expect(await rechazo(reprogramar.ejecutar({ token, inicio: local('2026-12-23', '09:00') }))).toMatchObject({
      codigo: 'CONTACTAR_CONSULTORIO',
    });
  });
});
