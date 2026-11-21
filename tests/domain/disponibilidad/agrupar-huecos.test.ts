import { describe, expect, test } from 'vitest';
import { agruparPorHorario } from '../../../src/domain/disponibilidad/agrupar-huecos.js';
import type { Hueco } from '../../../src/domain/disponibilidad/hueco.js';
import { LUNES, local } from '../../fixtures/seed.js';

const hueco = (ini: string, fin: string, profesionalId: string, sillonId: string): Hueco => ({
  inicio: local(LUNES, ini),
  fin: local(LUNES, fin),
  profesionalId,
  sillonId,
});

describe('agruparPorHorario', () => {
  test('agrupa por inicio+fin preservando el orden de las opciones', () => {
    const grupos = agruparPorHorario([
      hueco('09:00', '09:30', 'p1', 's1'),
      hueco('09:00', '09:30', 'p1', 's2'),
      hueco('09:00', '09:30', 'p2', 's1'),
      hueco('09:15', '09:45', 'p1', 's1'),
      hueco('09:15', '09:45', 'p2', 's2'),
    ]);
    expect(grupos).toEqual([
      {
        inicio: local(LUNES, '09:00'),
        fin: local(LUNES, '09:30'),
        opciones: [
          { profesionalId: 'p1', sillonId: 's1' },
          { profesionalId: 'p1', sillonId: 's2' },
          { profesionalId: 'p2', sillonId: 's1' },
        ],
      },
      {
        inicio: local(LUNES, '09:15'),
        fin: local(LUNES, '09:45'),
        opciones: [
          { profesionalId: 'p1', sillonId: 's1' },
          { profesionalId: 'p2', sillonId: 's2' },
        ],
      },
    ]);
  });

  test('mismo inicio con distinto fin forma grupos distintos', () => {
    const grupos = agruparPorHorario([
      hueco('09:00', '09:30', 'p1', 's1'),
      hueco('09:00', '09:45', 'p2', 's2'),
    ]);
    expect(grupos).toHaveLength(2);
    expect(grupos.map((g) => g.opciones.length)).toEqual([1, 1]);
  });

  test('lista vacía → vacía', () => {
    expect(agruparPorHorario([])).toEqual([]);
  });

  test('no muta la entrada', () => {
    const entrada = [hueco('09:00', '09:30', 'p1', 's1'), hueco('09:00', '09:30', 'p2', 's1')];
    const copia = structuredClone(entrada);
    agruparPorHorario(entrada);
    expect(entrada).toEqual(copia);
  });
});
