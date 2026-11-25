import { expect, test } from 'vitest';
import { AccesoDenegadoError } from '../../src/domain/errores.js';
import { componerNucleo } from '../../src/composicion.js';
import { crearEntorno, crearTurno, LUNES, local, MARTES } from '../fixtures/seed.js';
import { actores } from '../fixtures/actores.js';

test('La semana agrupa por fecha local y conserva los estados sin ocupación', async () => {
  const domingo = '2026-11-29';
  const lunesSiguiente = '2026-11-30';
  const datos = crearEntorno({
    turnos: [
      crearTurno({ id: 'confirmado' }),
      crearTurno({ id: 'cancelado', estado: 'cancelado' }),
      crearTurno({ id: 'ausente', estado: 'ausente', inicio: local(MARTES, '09:00'), fin: local(MARTES, '10:00') }),
      crearTurno({ id: 'otra-semana', inicio: local(lunesSiguiente, '09:00'), fin: local(lunesSiguiente, '10:00') }),
    ],
    bloqueos: [{
      id: 'bloqueo-nocturno',
      profesionalId: 'p1',
      inicio: local(domingo, '23:30'),
      fin: local(lunesSiguiente, '00:00'),
    }],
  });
  const { agendaDiaria, agendaSemanal } = componerNucleo({
    datos,
    reloj: { ahora: () => local(LUNES, '08:00') },
  });
  const actor = actores.recepcion;

  const semana = await agendaSemanal.ejecutar({ actor, fecha: MARTES });

  expect(semana.map((dia) => dia.fecha)).toEqual([
    LUNES, MARTES, '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', domingo,
  ]);
  expect(semana.map((dia) => dia.turnos.map(({ id, estado, ocupa }) => ({ id, estado, ocupa })))).toEqual([
    [{ id: 'confirmado', estado: 'confirmado', ocupa: true }, { id: 'cancelado', estado: 'cancelado', ocupa: false }],
    [{ id: 'ausente', estado: 'ausente', ocupa: false }],
    [], [], [], [], [],
  ]);
  expect(semana[6]?.bloqueos.map(({ id }) => id)).toEqual(['bloqueo-nocturno']);
  const otroDia = await agendaDiaria.ejecutar({ actor, fecha: lunesSiguiente });
  expect(otroDia.bloqueos).toEqual([]);
});

test('La agenda semanal aplica los filtros y el permiso del odontólogo', async () => {
  const datos = crearEntorno({
    turnos: [
      crearTurno({ id: 'propio-s1' }),
      crearTurno({ id: 'propio-s2', sillonId: 's2' }),
      crearTurno({ id: 'ajeno-s2', profesionalId: 'p2', sillonId: 's2' }),
    ],
  });
  const { agendaSemanal } = componerNucleo({ datos, reloj: { ahora: () => local(LUNES, '08:00') } });
  const actor = actores.odontologo('p1');

  const semana = await agendaSemanal.ejecutar({ actor, fecha: LUNES, sillonId: 's2' });

  expect(semana.flatMap((dia) => dia.turnos.map(({ id }) => id))).toEqual(['propio-s2']);
  await expect(agendaSemanal.ejecutar({ actor, fecha: LUNES, profesionalId: 'p2' }))
    .rejects.toBeInstanceOf(AccesoDenegadoError);
});
