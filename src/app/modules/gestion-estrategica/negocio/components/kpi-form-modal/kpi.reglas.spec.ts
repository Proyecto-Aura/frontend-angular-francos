import { MetaAnual, MetaAnualForm, Periodo } from '../../interfaces/kpi.interface';
import {
  calcularCumplimiento,
  calcularSemaforo,
  formatearValor,
  opcionesPeriodoAnio,
  textoOperador,
  validarFilasMetas,
} from './kpi.reglas';

function makeFila(overrides: Partial<MetaAnualForm> = {}): MetaAnualForm {
  return { anio: 2026, meta: '100', operador: '>=', valorAmarillo: '80', ...overrides };
}

function makeMeta(overrides: Partial<MetaAnual> = {}): MetaAnual {
  return {
    anio: 2026,
    meta: 100,
    operador: '>=',
    valorAmarillo: 80,
    operadorAmarillo: '>=',
    ...overrides,
  };
}

describe('kpi rules', () => {
  describe('validarFilasMetas', () => {
    it.each([
      ['empty goal', { meta: '' }, 'La meta es obligatoria y debe ser numérica.'],
      ['non-numeric goal', { meta: 'abc' }, 'La meta es obligatoria y debe ser numérica.'],
      [
        'empty yellow value',
        { valorAmarillo: '' },
        'El valor amarillo es obligatorio y debe ser numérico.',
      ],
      [
        'non-numeric yellow value',
        { valorAmarillo: 'abc' },
        'El valor amarillo es obligatorio y debe ser numérico.',
      ],
    ])('marks the year for an %s', (_case, overrides, message) => {
      const result = validarFilasMetas([makeFila(overrides)]);

      expect(result.porAnio[2026]).toContain(message);
    });

    it('returns a general error when annual operators differ', () => {
      const result = validarFilasMetas([
        makeFila(),
        makeFila({ anio: 2027, operador: '<=', meta: '50', valorAmarillo: '60' }),
      ]);

      expect(result.general).toBe('El operador debe ser el mismo en todos los años.');
    });

    it.each([
      ['>=', '101'],
      ['<=', '99'],
    ] as const)('rejects a yellow value more demanding than green for %s', (operador, amarillo) => {
      const result = validarFilasMetas([makeFila({ operador, valorAmarillo: amarillo })]);

      expect(result.porAnio[2026]).toContain('El Amarillo no puede ser más exigente que el Verde.');
    });

    it('returns no errors for valid rows', () => {
      expect(validarFilasMetas([makeFila(), makeFila({ anio: 2027, meta: '120' })])).toEqual({
        porAnio: {},
        general: null,
      });
    });
  });

  it.each([
    [makeMeta(), 100, 'VERDE'],
    [makeMeta(), 90, 'AMARILLO'],
    [makeMeta(), 70, 'ROJO'],
    [
      makeMeta({ meta: 20, operador: '<=', valorAmarillo: 30, operadorAmarillo: '<=' }),
      20,
      'VERDE',
    ],
    [
      makeMeta({ meta: 20, operador: '<=', valorAmarillo: 30, operadorAmarillo: '<=' }),
      25,
      'AMARILLO',
    ],
    [makeMeta({ meta: 20, operador: '<=', valorAmarillo: 30, operadorAmarillo: '<=' }), 40, 'ROJO'],
  ] as const)('calculates the traffic light for both operators', (meta, valor, expected) => {
    expect(calcularSemaforo(valor, meta)).toBe(expected);
  });

  it('calculates compliance and returns null for a zero goal', () => {
    expect(calcularCumplimiento(75, 100)).toBe(75);
    expect(calcularCumplimiento(10, 0)).toBeNull();
  });

  it('formats values according to their unit', () => {
    expect(formatearValor(1200, 'S/')).toBe('S/ 1,200');
    expect(formatearValor(18, '%')).toBe('18 %');
    expect(formatearValor(60, 'puntos')).toBe('60 puntos');
  });

  it('renders human-readable operators', () => {
    expect(textoOperador('>=')).toBe('≥');
    expect(textoOperador('<=')).toBe('≤');
  });

  it('builds plan-year options with periods sorted by number', () => {
    const periodos: Periodo[] = [
      { id: 2, codigo: 'T2', nombre: 'Trimestre 2', numero: 2, mesFin: 6 },
      { id: 1, codigo: 'T1', nombre: 'Trimestre 1', numero: 1, mesFin: 3 },
    ];

    expect(opcionesPeriodoAnio([2026, 2027], periodos)).toEqual([
      { anio: 2026, periodoId: 1, etiqueta: 'Trimestre 1 2026' },
      { anio: 2026, periodoId: 2, etiqueta: 'Trimestre 2 2026' },
      { anio: 2027, periodoId: 1, etiqueta: 'Trimestre 1 2027' },
      { anio: 2027, periodoId: 2, etiqueta: 'Trimestre 2 2027' },
    ]);
  });
});
