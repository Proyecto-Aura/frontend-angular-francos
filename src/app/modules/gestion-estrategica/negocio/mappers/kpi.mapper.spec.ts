import {
  FrecuenciaMedicionDto,
  KpiDto,
  KpiResumenDto,
  KpiValorDto,
  PeriodoDto,
  UnidadMedidaKpiDto,
} from '../interfaces/kpi-dto.interface';
import { KpiForm } from '../interfaces/kpi.interface';
import {
  toActualizarKpiRequest,
  toCrearKpiRequest,
  toFrecuencia,
  toKpi,
  toKpiResumen,
  toKpisDeResumen,
  toKpiValor,
  toPeriodo,
  toUnidadMedida,
} from './kpi.mapper';

function makeKpiDto(overrides: Partial<KpiDto> = {}): KpiDto {
  return {
    id: 10,
    codigo: 'PE-0001-KPI-N-001',
    nombre: 'Margen operativo',
    formula: 'Utilidad / Ventas',
    estado: true,
    objetivo: {
      id: 20,
      nombre: 'Incrementar rentabilidad',
      perspectiva: { id: 1, nombre: 'Financiera' },
    },
    frecuencia: { id: 2, nombre: 'Trimestral' },
    unidad_medida: { id: 3, nombre: 'Porcentaje', simbolo: '%' },
    meta_final: 30,
    metas_por_anio: [
      {
        anio: 2026,
        meta: 25,
        semaforo: {
          verde: { operador: '>=', valor_referencia: 25, color_hex: '#0f0' },
          amarillo: { operador: '>=', valor_referencia: 20, color_hex: '#ff0' },
          rojo: { operador: '<', valor_referencia: 20, color_hex: '#f00' },
        },
      },
    ],
    ...overrides,
  };
}

function makeValorDto(overrides: Partial<KpiValorDto> = {}): KpiValorDto {
  return {
    id: 30,
    anio: 2026,
    periodo: { id: 4, codigo: 'T1', nombre: 'Trimestre 1' },
    valor: 24,
    semaforo: { color: 'AMARILLO', color_hex: '#ff0' },
    ...overrides,
  };
}

function makeForm(): KpiForm {
  return {
    nombre: '  Margen operativo  ',
    formula: '  Utilidad / Ventas  ',
    objetivoId: 21,
    frecuenciaId: 2,
    unidadId: 3,
    metas: [
      { anio: 2026, meta: '25.5', operador: '>=', valorAmarillo: '20.5' },
      { anio: 2027, meta: '20', operador: '<=', valorAmarillo: '25' },
    ],
  };
}

describe('kpi mapper', () => {
  it('maps a KPI with numeric ids, annual goals and domain defaults', () => {
    expect(toKpi(makeKpiDto())).toEqual(
      expect.objectContaining({
        id: 10,
        objetivoId: 20,
        perspectivaId: 1,
        frecuenciaId: 2,
        unidadId: 3,
        objetivoResponsable: '',
        ultimoValor: null,
        metas: [
          {
            anio: 2026,
            meta: 25,
            operador: '>=',
            valorAmarillo: 20,
            operadorAmarillo: '>=',
          },
        ],
      }),
    );
  });

  it('maps a KPI summary including responsible person and latest value', () => {
    const dto: KpiResumenDto = {
      ...makeKpiDto(),
      objetivo: { ...makeKpiDto().objetivo, responsable: 'Ana Torres' },
      ultimo_valor: makeValorDto(),
    };

    expect(toKpiResumen(dto)).toEqual(
      expect.objectContaining({
        objetivoResponsable: 'Ana Torres',
        ultimoValor: expect.objectContaining({ periodoId: 4, color: 'AMARILLO' }),
      }),
    );
    expect(toKpisDeResumen([dto])).toHaveLength(1);
  });

  it('maps a KPI value', () => {
    expect(toKpiValor(makeValorDto())).toEqual({
      id: 30,
      anio: 2026,
      periodoId: 4,
      periodoNombre: 'Trimestre 1',
      valor: 24,
      color: 'AMARILLO',
    });
  });

  it('maps KPI catalogs', () => {
    const frecuencia: FrecuenciaMedicionDto = {
      id: 1,
      nombre: 'Mensual',
      periodos_por_anio: 12,
      orden: 1,
    };
    const periodo: PeriodoDto = {
      id: 2,
      codigo: 'M02',
      nombre: 'Febrero',
      numero: 2,
      mes_fin: 2,
    };
    const unidad: UnidadMedidaKpiDto = {
      id: 3,
      nombre: 'Porcentaje',
      simbolo: '%',
      decimales: 2,
    };

    expect(toFrecuencia(frecuencia)).toEqual({
      id: 1,
      nombre: 'Mensual',
      periodosPorAnio: 12,
      orden: 1,
    });
    expect(toPeriodo(periodo)).toEqual({
      id: 2,
      codigo: 'M02',
      nombre: 'Febrero',
      numero: 2,
      mesFin: 2,
    });
    expect(toUnidadMedida(unidad)).toEqual(unidad);
  });

  it('maps create requests with trimmed text, numbers and matching yellow operators', () => {
    expect(toCrearKpiRequest(makeForm())).toEqual({
      objetivo_estrategico_id: 21,
      nombre: 'Margen operativo',
      formula: 'Utilidad / Ventas',
      frecuencia_id: 2,
      unidad_medida_id: 3,
      metas_por_anio: [
        {
          anio: 2026,
          meta: 25.5,
          operador_verde: '>=',
          operador_amarillo: '>=',
          valor_amarillo: 20.5,
        },
        {
          anio: 2027,
          meta: 20,
          operador_verde: '<=',
          operador_amarillo: '<=',
          valor_amarillo: 25,
        },
      ],
    });
  });

  it('maps update requests with the objective id and every annual goal', () => {
    const result = toActualizarKpiRequest(makeForm());

    expect(result.objetivo_estrategico_id).toBe(21);
    expect(result.metas_por_anio).toHaveLength(2);
    expect(result.metas_por_anio.map(({ anio }) => anio)).toEqual([2026, 2027]);
  });
});
