import {
  Cumplimiento,
  SeguimientoKpi,
  SeguimientoPunto,
} from '../../interfaces/seguimiento-kpis.interface';
import {
  claseCumplimiento,
  conteosCumplimiento,
  descripcionMeta,
  descripcionUltimoValor,
  etiquetaEjeX,
  etiquetaPeriodoCompleta,
  formatearEjeY,
  textoPorcentaje,
} from './tablero-graficos.reglas';

function makeCumplimiento(overrides: Partial<Cumplimiento> = {}): Cumplimiento {
  return {
    porcentaje: 85,
    evaluados: 6,
    total: 10,
    verde: 3,
    amarillo: 2,
    rojo: 1,
    sinDato: 4,
    ...overrides,
  };
}

function makePunto(overrides: Partial<SeguimientoPunto> = {}): SeguimientoPunto {
  return {
    anio: 2026,
    periodoCodigo: 'T2',
    periodoNombre: 'Trimestre 2',
    valor: 8,
    meta: 10,
    color: 'VERDE',
    ...overrides,
  };
}

function makeKpi(overrides: Partial<SeguimientoKpi> = {}): SeguimientoKpi {
  return {
    kpiId: 10,
    codigo: 'KPI-001',
    nombre: 'Margen',
    frecuenciaNombre: 'Semestral',
    unidadSimbolo: '%',
    operador: '>=',
    avancePct: 80,
    ultimoValor: {
      anio: 2026,
      periodoCodigo: 'S2',
      periodoNombre: 'Semestre 2',
      valor: 8,
      color: 'VERDE',
    },
    metaUltimoAnio: 10,
    serie: [makePunto()],
    ...overrides,
  };
}

describe('tablero graficos reglas', () => {
  it.each([
    [null, 'bg-muted-foreground'],
    [100, 'bg-success'],
    [95, 'bg-success'],
    [94, 'bg-warning'],
    [80, 'bg-warning'],
    [79, 'bg-destructive'],
    [0, 'bg-destructive'],
  ] as const)('maps compliance %s to %s', (percentage, expected) => {
    expect(claseCumplimiento(percentage)).toBe(expected);
  });

  it.each([
    [null, '—'],
    [87, '87%'],
    [86.6, '87%'],
    [0, '0%'],
  ] as const)('formats percentage %s', (value, expected) => {
    expect(textoPorcentaje(value)).toBe(expected);
  });

  it('returns all compliance counts in display order, including zeroes', () => {
    expect(
      conteosCumplimiento(makeCumplimiento({ verde: 0, amarillo: 2, rojo: 0, sinDato: 4 })),
    ).toEqual([
      { etiqueta: 'verde', clase: 'bg-success', n: 0 },
      { etiqueta: 'amarillo', clase: 'bg-warning', n: 2 },
      { etiqueta: 'rojo', clase: 'bg-destructive', n: 0 },
      { etiqueta: 'sin dato', clase: 'bg-muted-foreground', n: 4 },
    ]);
  });

  it.each([
    ['A1', 'Anual', 'Año 2026'],
    ['T2', 'Trimestre 2', 'T2 2026'],
    ['B3', 'Bimestre 3', 'B3 2026'],
    ['S1', 'Semestre 1', 'S1 2026'],
    ['M9', 'Septiembre', 'Septiembre 2026'],
  ])('formats complete period %s', (code, name, expected) => {
    expect(etiquetaPeriodoCompleta(makePunto({ periodoCodigo: code, periodoNombre: name }))).toBe(
      expected,
    );
  });

  it.each([
    [makePunto({ periodoCodigo: 'A1', periodoNombre: 'Anual' }), true, true, true, ['2026']],
    [makePunto({ periodoCodigo: 'T2' }), true, true, false, ['T2', '2026']],
    [makePunto({ periodoCodigo: 'B3' }), false, true, false, ['B3']],
    [makePunto({ periodoCodigo: 'S1' }), false, true, false, ['S1']],
    [
      makePunto({ periodoCodigo: 'M1', periodoNombre: 'Enero' }),
      true,
      true,
      false,
      ['Ene', '2026'],
    ],
    [makePunto(), true, false, false, ['2026']],
    [makePunto(), false, false, false, ['']],
  ] as const)('builds axis label %#', (punto, firstOfYear, showPeriods, annual, expected) => {
    expect(etiquetaEjeX(punto, firstOfYear, showPeriods, annual)).toEqual(expected);
  });

  it.each([
    [12_000, 'S/', 'S/ 12k'],
    [12_000, '%', '12k%'],
    [12_000, 'und', '12k'],
    [1_200_000, '', '1.2M'],
    [12.34, '', '12.3'],
    [0, '', '0'],
    [12_000, ' S/ ', 'S/ 12k'],
    [25, ' % ', '25%'],
  ])('formats Y axis value %s with symbol %j', (value, symbol, expected) => {
    expect(formatearEjeY(value, symbol)).toBe(expected);
  });

  it('describes a KPI without a latest value', () => {
    expect(descripcionUltimoValor(makeKpi({ ultimoValor: null }))).toEqual({
      etiqueta: 'Último valor',
      valor: '—',
    });
  });

  it('describes and formats a KPI latest value', () => {
    expect(descripcionUltimoValor(makeKpi())).toEqual({
      etiqueta: 'Último · S2 2026',
      valor: '8 %',
    });
  });

  it.each([
    [null, null, { etiqueta: 'Meta', valor: '—' }],
    [makeKpi().ultimoValor, 10, { etiqueta: 'Meta 2026', valor: '10 %' }],
    [makeKpi().ultimoValor, null, { etiqueta: 'Meta 2026', valor: '—' }],
  ] as const)('describes KPI meta %#', (latest, meta, expected) => {
    expect(descripcionMeta(makeKpi({ ultimoValor: latest, metaUltimoAnio: meta }))).toEqual(
      expected,
    );
  });
});
