import {
  CumplimientoDto,
  SeguimientoKpiDto,
  SeguimientoKpisDto,
  SeguimientoPuntoDto,
} from '../interfaces/seguimiento-kpis-dto.interface';
import { toSeguimientoKpis } from './seguimiento-kpis.mapper';

function makeCumplimientoDto(overrides: Partial<CumplimientoDto> = {}): CumplimientoDto {
  return {
    porcentaje_promedio: 85,
    kpis_evaluados: 3,
    total_kpis: 5,
    kpis_verde: 1,
    kpis_amarillo: 1,
    kpis_rojo: 1,
    kpis_sin_dato: 2,
    ...overrides,
  };
}

function makePuntoDto(overrides: Partial<SeguimientoPuntoDto> = {}): SeguimientoPuntoDto {
  return {
    anio: 2026,
    periodo: { id: 2, codigo: 'S2', nombre: 'Semestre 2', numero: 2 },
    valor: 8,
    meta: 10,
    semaforo_color: 'VERDE',
    ...overrides,
  };
}

function makeKpiDto(overrides: Partial<SeguimientoKpiDto> = {}): SeguimientoKpiDto {
  return {
    id: 10,
    codigo: 'KPI-001',
    nombre: 'Margen',
    formula: 'Utilidad / Ventas',
    unidad_medida: { nombre: 'Porcentaje', simbolo: '%' },
    frecuencia: { nombre: 'Semestral' },
    operador: '>=',
    ultimo_valor: {
      anio: 2026,
      periodo: { id: 2, codigo: 'S2', nombre: 'Semestre 2' },
      valor: 8,
      semaforo_color: 'VERDE',
    },
    avance_pct: 80,
    metas_anuales: [
      { anio: 2026, meta: 10 },
      { anio: 2027, meta: 12 },
    ],
    serie: [makePuntoDto()],
    ...overrides,
  };
}

function makeDto(): SeguimientoKpisDto {
  return {
    plan: { id: 5, codigo: 'PE-0005', nombre: 'Plan institucional' },
    cumplimiento_general: makeCumplimientoDto(),
    perspectivas: [
      {
        id: 1,
        nombre: 'Financiera',
        cumplimiento: makeCumplimientoDto({ porcentaje_promedio: 90 }),
        objetivos: [
          {
            id: 20,
            codigo: 'OE-001',
            nombre: 'Incrementar rentabilidad',
            responsable: 'Ana Torres',
            kpis: [makeKpiDto()],
          },
        ],
      },
      {
        id: 2,
        nombre: 'Cliente',
        cumplimiento: makeCumplimientoDto({ porcentaje_promedio: null }),
        objetivos: [],
      },
    ],
  };
}

describe('seguimiento KPIs mapper', () => {
  it('maps plan and complete compliance data, preserving null percentages', () => {
    const result = toSeguimientoKpis(makeDto());
    expect(result.planId).toBe(5);
    expect(result.planNombre).toBe('Plan institucional');
    expect(result.cumplimientoGeneral).toEqual({
      porcentaje: 85,
      evaluados: 3,
      total: 5,
      verde: 1,
      amarillo: 1,
      rojo: 1,
      sinDato: 2,
    });
    expect(result.perspectivas[0].cumplimiento.porcentaje).toBe(90);
    expect(result.perspectivas[1].cumplimiento.porcentaje).toBeNull();
  });

  it('derives perspective order from position and keeps empty perspectives', () => {
    const result = toSeguimientoKpis(makeDto());
    expect(result.perspectivas.map(({ orden }) => orden)).toEqual([1, 2]);
    expect(result.perspectivas[1].kpis).toEqual([]);
  });

  it('flattens KPIs from multiple objectives in backend order', () => {
    const dto = makeDto();
    dto.perspectivas[0].objetivos.push({
      id: 21,
      codigo: 'OE-002',
      nombre: 'Aumentar ingresos',
      responsable: 'Mario Díaz',
      kpis: [makeKpiDto({ id: 11, codigo: 'KPI-002', nombre: 'Ingresos' })],
    });
    const kpis = toSeguimientoKpis(dto).perspectivas[0].kpis;
    expect(kpis.map(({ codigo }) => codigo)).toEqual(['KPI-001', 'KPI-002']);
  });

  it.each([
    ['%', '%'],
    ['', 'Porcentaje'],
    ['   ', 'Porcentaje'],
  ])('maps unit symbol %j to %j', (symbol, expected) => {
    const dto = makeDto();
    dto.perspectivas[0].objetivos[0].kpis[0].unidad_medida.simbolo = symbol;
    expect(toSeguimientoKpis(dto).perspectivas[0].kpis[0].unidadSimbolo).toBe(expected);
  });

  it('preserves operator and nullable progress', () => {
    const dto = makeDto();
    dto.perspectivas[0].objetivos[0].kpis[0] = makeKpiDto({
      operador: '<=',
      avance_pct: null,
    });
    expect(toSeguimientoKpis(dto).perspectivas[0].kpis[0]).toMatchObject({
      operador: '<=',
      avancePct: null,
    });
  });

  it('maps latest value and finds its annual target', () => {
    expect(toSeguimientoKpis(makeDto()).perspectivas[0].kpis[0]).toMatchObject({
      ultimoValor: {
        anio: 2026,
        periodoCodigo: 'S2',
        periodoNombre: 'Semestre 2',
        valor: 8,
        color: 'VERDE',
      },
      metaUltimoAnio: 10,
    });
  });

  it('maps unknown latest color to null', () => {
    const dto = makeDto();
    dto.perspectivas[0].objetivos[0].kpis[0].ultimo_valor!.semaforo_color = 'AZUL';
    expect(toSeguimientoKpis(dto).perspectivas[0].kpis[0].ultimoValor?.color).toBeNull();
  });

  it.each([
    [null, [{ anio: 2026, meta: 10 }]],
    [
      {
        anio: 2028,
        periodo: { id: 1, codigo: 'A1', nombre: 'Anual' },
        valor: 9,
        semaforo_color: null,
      },
      [{ anio: 2026, meta: 10 }],
    ],
  ] as const)('returns null latest target when it cannot match %#', (latest, targets) => {
    const dto = makeDto();
    dto.perspectivas[0].objetivos[0].kpis[0] = makeKpiDto({
      ultimo_valor: latest,
      metas_anuales: [...targets],
    });
    const kpi = toSeguimientoKpis(dto).perspectivas[0].kpis[0];
    expect(kpi.metaUltimoAnio).toBeNull();
    if (latest === null) expect(kpi.ultimoValor).toBeNull();
  });

  it('maps the series in order and preserves null values', () => {
    const dto = makeDto();
    dto.perspectivas[0].objetivos[0].kpis[0].serie = [
      makePuntoDto({ semaforo_color: 'AMARILLO' }),
      makePuntoDto({
        anio: 2027,
        periodo: { id: 1, codigo: 'A1', nombre: 'Anual', numero: 1 },
        valor: null,
        meta: null,
        semaforo_color: null,
      }),
      makePuntoDto({
        anio: 2028,
        periodo: { id: 4, codigo: 'T4', nombre: 'Trimestre 4', numero: 4 },
        semaforo_color: 'DESCONOCIDO',
      }),
    ];
    expect(toSeguimientoKpis(dto).perspectivas[0].kpis[0].serie).toEqual([
      {
        anio: 2026,
        periodoCodigo: 'S2',
        periodoNombre: 'Semestre 2',
        valor: 8,
        meta: 10,
        color: 'AMARILLO',
      },
      {
        anio: 2027,
        periodoCodigo: 'A1',
        periodoNombre: 'Anual',
        valor: null,
        meta: null,
        color: null,
      },
      {
        anio: 2028,
        periodoCodigo: 'T4',
        periodoNombre: 'Trimestre 4',
        valor: 8,
        meta: 10,
        color: null,
      },
    ]);
  });
});
