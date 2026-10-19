import { TableroAnio, TableroKpiFila } from '../../interfaces/tablero-control.interface';
import {
  clasePuntoPerspectiva,
  claseTextoPerspectiva,
  etiquetaPeriodo,
  nombreSemaforo,
  resumenSemaforo,
  tonoPerspectiva,
  tonoSemaforo,
  ultimoValorDelKpi,
} from './tablero-control.reglas';

function makeAnio(overrides: Partial<TableroAnio> = {}): TableroAnio {
  return {
    anio: 2026,
    meta: 10,
    periodo: null,
    valor: 8,
    color: 'VERDE',
    ...overrides,
  };
}

function makeFila(overrides: Partial<TableroKpiFila> = {}): TableroKpiFila {
  return {
    kpiId: 1,
    codigo: 'KPI-001',
    nombre: 'Margen',
    formula: 'Utilidad / Ventas',
    unidadSimbolo: '%',
    frecuenciaNombre: 'Anual',
    objetivoCodigo: 'OE-001',
    objetivoNombre: 'Incrementar rentabilidad',
    responsable: 'Ana Torres',
    iniciativas: [],
    anios: [makeAnio()],
    ...overrides,
  };
}

describe('tablero control reglas', () => {
  describe('ultimoValorDelKpi', () => {
    it('returns null when there are no years', () => {
      expect(ultimoValorDelKpi(makeFila({ anios: [] }))).toBeNull();
    });

    it('returns null when every year has a null value', () => {
      expect(
        ultimoValorDelKpi(
          makeFila({
            anios: [makeAnio({ anio: 2026, valor: null }), makeAnio({ anio: 2027, valor: null })],
          }),
        ),
      ).toBeNull();
    });

    it('returns the latest year with a value when later years have no value', () => {
      const result = ultimoValorDelKpi(
        makeFila({
          anios: [
            makeAnio({ anio: 2026, valor: 4 }),
            makeAnio({ anio: 2027, valor: 7 }),
            makeAnio({ anio: 2028, valor: null }),
          ],
        }),
      );
      expect(result?.anio).toBe(2027);
      expect(result?.valor).toBe(7);
    });

    it('finds the latest value when years are unordered', () => {
      const result = ultimoValorDelKpi(
        makeFila({
          anios: [
            makeAnio({ anio: 2028, valor: 9 }),
            makeAnio({ anio: 2026, valor: 4 }),
            makeAnio({ anio: 2027, valor: 7 }),
          ],
        }),
      );
      expect(result?.anio).toBe(2028);
    });
  });

  describe('etiquetaPeriodo', () => {
    it.each([
      [null, ''],
      [{ codigo: 'A1', nombre: 'Anual' }, 'Anual'],
      [{ codigo: 'T4', nombre: 'Trimestre 4' }, 'al T4'],
      [{ codigo: 'B3', nombre: 'Bimestre 3' }, 'al B3'],
      [{ codigo: 'S2', nombre: 'Semestre 2' }, 'al S2'],
      [{ codigo: 'M12', nombre: 'Diciembre' }, 'al Diciembre'],
      [{ codigo: 'M1', nombre: 'Enero' }, 'al Enero'],
    ] as const)('formats %#', (periodo, expected) => {
      expect(etiquetaPeriodo(periodo)).toBe(expected);
    });
  });

  describe('resumenSemaforo', () => {
    it('returns zeroes for an empty list', () => {
      expect(resumenSemaforo([])).toEqual({
        total: 0,
        verde: 0,
        amarillo: 0,
        rojo: 0,
        sinDato: 0,
      });
    });

    it('counts all colors and KPIs without data or range', () => {
      const filas = [
        makeFila({ kpiId: 1, anios: [makeAnio({ color: 'VERDE' })] }),
        makeFila({ kpiId: 2, anios: [makeAnio({ color: 'AMARILLO' })] }),
        makeFila({ kpiId: 3, anios: [makeAnio({ color: 'ROJO' })] }),
        makeFila({ kpiId: 4, anios: [makeAnio({ valor: null, color: null })] }),
        makeFila({ kpiId: 5, anios: [makeAnio({ valor: 5, color: null })] }),
      ];
      expect(resumenSemaforo(filas)).toEqual({
        total: 5,
        verde: 1,
        amarillo: 1,
        rojo: 1,
        sinDato: 2,
      });
    });

    it('uses the color from the latest year with a value', () => {
      const fila = makeFila({
        anios: [
          makeAnio({ anio: 2026, valor: 4, color: 'ROJO' }),
          makeAnio({ anio: 2028, valor: null, color: null }),
          makeAnio({ anio: 2027, valor: 8, color: 'VERDE' }),
        ],
      });
      expect(resumenSemaforo([fila])).toEqual({
        total: 1,
        verde: 1,
        amarillo: 0,
        rojo: 0,
        sinDato: 0,
      });
    });
  });

  it.each([
    ['VERDE', 'success', 'Verde'],
    ['AMARILLO', 'warning', 'Amarillo'],
    ['ROJO', 'danger', 'Rojo'],
  ] as const)('maps semaphore color %s', (color, tone, name) => {
    expect(tonoSemaforo(color)).toBe(tone);
    expect(nombreSemaforo(color)).toBe(name);
  });

  it.each([
    [1, 'success'],
    [2, 'info'],
    [3, 'warning'],
    [4, 'neutral'],
  ] as const)('maps perspective order %s', (order, tone) => {
    expect(tonoPerspectiva(order)).toBe(tone);
  });

  it.each([
    [1, 'bg-success'],
    [2, 'bg-info'],
    [3, 'bg-warning'],
    [4, 'bg-muted-foreground'],
  ] as const)('maps perspective point class for order %s', (order, expected) => {
    expect(clasePuntoPerspectiva(order)).toBe(expected);
  });

  it.each([
    [1, 'text-[color-mix(in_srgb,var(--color-success)_70%,var(--color-foreground))]'],
    [2, 'text-[color-mix(in_srgb,var(--color-info)_70%,var(--color-foreground))]'],
    [3, 'text-[color-mix(in_srgb,var(--color-warning)_70%,var(--color-foreground))]'],
    [4, 'text-[color-mix(in_srgb,var(--color-muted-foreground)_70%,var(--color-foreground))]'],
  ] as const)('maps perspective text class for order %s', (order, expected) => {
    expect(claseTextoPerspectiva(order)).toBe(expected);
  });
});
