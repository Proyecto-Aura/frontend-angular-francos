import { IniciativaDto } from '../../negocio/interfaces/iniciativa-dto.interface';
import {
  TableroKpiDto,
  TableroValorAnualDto,
} from '../../negocio/interfaces/tablero-control-dto.interface';
import { TableroControlTiDto } from '../interfaces/tablero-control-ti-dto.interface';
import { toTableroControlTi } from './tablero-control-ti.mapper';

function makeIniciativaDto(overrides: Partial<IniciativaDto> = {}): IniciativaDto {
  return {
    id: 30,
    codigo: 'INI-001',
    nombre: 'Reducir costos',
    descripcion: null,
    responsable: 'Luis Pérez',
    fecha_inicio: '2026-01-01',
    fecha_fin: '2027-12-31',
    presupuesto: 1000,
    motivo_cancelacion: null,
    estado: true,
    estado_iniciativa: { id: 1, codigo: 'EN_PROCESO', nombre: 'En proceso' },
    objetivo: {
      id: 20,
      nombre: 'Incrementar rentabilidad',
      perspectiva: { id: 1, nombre: 'Financiera' },
    },
    ...overrides,
  };
}

function makeValor(overrides: Partial<TableroValorAnualDto> = {}): TableroValorAnualDto {
  return {
    anio: 2026,
    meta: 20,
    periodo: { id: 2, codigo: 'S2', nombre: 'Semestre 2' },
    valor: 18,
    semaforo_color: 'AMARILLO',
    ...overrides,
  };
}

function makeKpi(overrides: Partial<TableroKpiDto> = {}): TableroKpiDto {
  return {
    id: 10,
    codigo: 'KPI-001',
    nombre: 'Margen',
    formula: 'Utilidad / Ventas',
    unidad_medida: { nombre: 'Porcentaje', simbolo: '%' },
    frecuencia: { nombre: 'Semestral' },
    valores_por_anio: [makeValor()],
    ...overrides,
  };
}

function makeDto(): TableroControlTiDto {
  return {
    plan: {
      id: 5,
      codigo: 'PE-0005',
      nombre: 'Plan institucional',
      anio_inicio: 2026,
      anio_fin: 2028,
      estado_plan: { codigo: 'ACTIVO', nombre: 'Activo' },
    },
    perspectivas: [
      {
        id: 1,
        nombre: 'Financiera',
        objetivos: [
          {
            id: 20,
            codigo: 'OE-001',
            nombre: 'Incrementar rentabilidad',
            oe_negocio_id: 100,
            oe_negocio: {
              id: 100,
              codigo: 'OE-NEG-001',
              nombre: 'Mejorar rentabilidad del negocio',
            },
            responsable: 'Ana Torres',
            iniciativas: [makeIniciativaDto()],
            kpis: [makeKpi()],
          },
        ],
      },
      { id: 2, nombre: 'Cliente', objetivos: [] },
    ],
  };
}

describe('tablero control TI mapper', () => {
  it('maps plan data and derives perspective order from its position', () => {
    const result = toTableroControlTi(makeDto());
    expect(result).toMatchObject({
      planId: 5,
      planNombre: 'Plan institucional',
      anioInicio: 2026,
      anioFin: 2028,
    });
    expect(result.perspectivas.map(({ orden }) => orden)).toEqual([1, 2]);
  });

  it('flattens KPIs from multiple objectives and keeps objective data and initiatives', () => {
    const dto = makeDto();
    dto.perspectivas[0].objetivos.push({
      id: 21,
      codigo: 'OE-002',
      nombre: 'Mejorar ingresos',
      oe_negocio_id: 101,
      oe_negocio: { id: 101, codigo: 'OE-NEG-002', nombre: 'Aumentar ingresos del negocio' },
      responsable: 'Mario Díaz',
      iniciativas: [],
      kpis: [makeKpi({ id: 11, codigo: 'KPI-002', nombre: 'Ingresos' })],
    });
    const result = toTableroControlTi(dto).perspectivas[0].kpis;
    expect(result.map(({ codigo }) => codigo)).toEqual(['KPI-001', 'KPI-002']);
    expect(result[0]).toMatchObject({
      objetivoCodigo: 'OE-001',
      objetivoNombre: 'Incrementar rentabilidad',
      responsable: 'Ana Torres',
      iniciativas: [
        expect.objectContaining({
          id: 30,
          nombre: 'Reducir costos',
          estadoCodigo: 'EN_PROCESO',
          fechaInicio: '2026-01-01',
        }),
      ],
    });
    expect(result[1]).toMatchObject({
      objetivoCodigo: 'OE-002',
      objetivoNombre: 'Mejorar ingresos',
      responsable: 'Mario Díaz',
    });
  });

  it('returns no rows for perspectives without objectives or without KPIs', () => {
    const dto = makeDto();
    dto.perspectivas.push({
      id: 3,
      nombre: 'Procesos',
      objetivos: [
        {
          id: 22,
          codigo: 'OE-003',
          nombre: 'Optimizar procesos',
          oe_negocio_id: null,
          oe_negocio: null,
          responsable: 'Eva Ruiz',
          iniciativas: [makeIniciativaDto({ id: 31 })],
          kpis: [],
        },
      ],
    });
    expect(
      toTableroControlTi(dto)
        .perspectivas.slice(1)
        .map(({ kpis }) => kpis),
    ).toEqual([[], []]);
  });

  it.each([
    ['%', '%'],
    ['', 'Porcentaje'],
    ['   ', 'Porcentaje'],
  ])('maps unit symbol %j to %j', (symbol, expected) => {
    const dto = makeDto();
    dto.perspectivas[0].objetivos[0].kpis[0].unidad_medida.simbolo = symbol;
    expect(toTableroControlTi(dto).perspectivas[0].kpis[0].unidadSimbolo).toBe(expected);
  });

  it('maps annual values, strips the period id and preserves null period', () => {
    const dto = makeDto();
    dto.perspectivas[0].objetivos[0].kpis[0].valores_por_anio = [
      makeValor(),
      makeValor({ anio: 2027, meta: null, periodo: null, valor: null, semaforo_color: null }),
    ];
    expect(toTableroControlTi(dto).perspectivas[0].kpis[0].anios).toEqual([
      {
        anio: 2026,
        meta: 20,
        periodo: { codigo: 'S2', nombre: 'Semestre 2' },
        valor: 18,
        color: 'AMARILLO',
      },
      { anio: 2027, meta: null, periodo: null, valor: null, color: null },
    ]);
  });

  it.each(['VERDE', 'AMARILLO', 'ROJO'] as const)('preserves valid color %s', (color) => {
    const dto = makeDto();
    dto.perspectivas[0].objetivos[0].kpis[0].valores_por_anio = [
      makeValor({ semaforo_color: color }),
    ];
    expect(toTableroControlTi(dto).perspectivas[0].kpis[0].anios[0].color).toBe(color);
  });

  it.each(['AZUL', null])('maps unsupported color %s to null', (color) => {
    const dto = makeDto();
    dto.perspectivas[0].objetivos[0].kpis[0].valores_por_anio = [
      makeValor({ semaforo_color: color }),
    ];
    expect(toTableroControlTi(dto).perspectivas[0].kpis[0].anios[0].color).toBeNull();
  });

  it('maps an omitted backend period to null', () => {
    const dto = makeDto();
    const valor = makeValor();
    delete (valor as Partial<TableroValorAnualDto>).periodo;
    dto.perspectivas[0].objetivos[0].kpis[0].valores_por_anio = [valor];
    expect(toTableroControlTi(dto).perspectivas[0].kpis[0].anios[0].periodo).toBeNull();
  });

  it('maps the linked business objective to its id, code and name', () => {
    const result = toTableroControlTi(makeDto()).perspectivas[0].kpis[0];
    expect(result.oeNegocio).toEqual({
      id: 100,
      codigo: 'OE-NEG-001',
      nombre: 'Mejorar rentabilidad del negocio',
    });
  });

  it('preserves a null business objective', () => {
    const dto = makeDto();
    dto.perspectivas[0].objetivos[0].oe_negocio_id = null;
    dto.perspectivas[0].objetivos[0].oe_negocio = null;
    expect(toTableroControlTi(dto).perspectivas[0].kpis[0].oeNegocio).toBeNull();
  });

  it('keeps the same business objective data for two KPIs of one objective', () => {
    const dto = makeDto();
    dto.perspectivas[0].objetivos[0].kpis.push(makeKpi({ id: 11, codigo: 'KPI-002' }));
    const rows = toTableroControlTi(dto).perspectivas[0].kpis;
    expect(rows).toHaveLength(2);
    expect(rows.map(({ oeNegocio }) => oeNegocio)).toEqual([
      { id: 100, codigo: 'OE-NEG-001', nombre: 'Mejorar rentabilidad del negocio' },
      { id: 100, codigo: 'OE-NEG-001', nombre: 'Mejorar rentabilidad del negocio' },
    ]);
  });

  it('keeps distinct business objectives on rows from different TI objectives', () => {
    const dto = makeDto();
    dto.perspectivas[0].objetivos.push({
      id: 21,
      codigo: 'OE-TI-002',
      nombre: 'Mejorar servicios digitales',
      responsable: 'Mario Díaz',
      iniciativas: [],
      kpis: [makeKpi({ id: 11, codigo: 'KPI-002' })],
      oe_negocio_id: 101,
      oe_negocio: { id: 101, codigo: 'OE-NEG-002', nombre: 'Aumentar ingresos del negocio' },
    });
    const rows = toTableroControlTi(dto).perspectivas[0].kpis;
    expect(rows.map(({ oeNegocio }) => oeNegocio)).toEqual([
      { id: 100, codigo: 'OE-NEG-001', nombre: 'Mejorar rentabilidad del negocio' },
      { id: 101, codigo: 'OE-NEG-002', nombre: 'Aumentar ingresos del negocio' },
    ]);
  });
});
