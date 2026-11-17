import { PlanEstrategicoDto } from '../../plan-estrategico/interfaces/plan-estrategico-dto.interface';
import { PerspectivaBscDto } from '../../negocio/interfaces/objetivo-estrategico-dto.interface';
import {
  ObjetivoEstrategicoTiDto,
  ResumenObjetivosTiPlanDto,
} from '../interfaces/objetivo-estrategico-ti-dto.interface';
import { ObjetivoEstrategicoTiForm } from '../interfaces/objetivo-estrategico-ti.interface';
import {
  toActualizarObjetivoTiRequest,
  toCrearObjetivoTiRequest,
  toObjetivoEstrategicoTi,
  toObjetivosTiDeResumen,
} from './objetivo-estrategico-ti.mapper';

function makePerspectivaDto(overrides: Partial<PerspectivaBscDto> = {}): PerspectivaBscDto {
  return {
    id: 1,
    nombre: 'Financiera',
    descripcion: 'Resultados financieros',
    orden: 1,
    ...overrides,
  };
}

function makeObjetivoTiDto(
  overrides: Partial<ObjetivoEstrategicoTiDto> = {},
): ObjetivoEstrategicoTiDto {
  return {
    id: 10,
    codigo: 'OETI-0010',
    plan_estrategico_id: 5,
    perspectiva_bsc_id: 1,
    responsable: 'Ana Torres',
    nombre: 'Modernizar la infraestructura',
    descripcion: null,
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    perspectiva_bsc: makePerspectivaDto(),
    estado_objetivo: { codigo: 'PENDIENTE', nombre: 'Pendiente' },
    relaciones_destino_ids: [20, 30],
    oe_negocio_id: 100,
    oe_negocio: { id: 100, codigo: 'OE-0100', nombre: 'Incrementar la rentabilidad' },
    ...overrides,
  };
}

function makePlanDto(): PlanEstrategicoDto {
  return {
    id: 5,
    codigo: 'PE-0005',
    nombre: 'Plan institucional',
    descripcion: null,
    anio_inicio: 2026,
    anio_fin: 2028,
    estado_plan_id: 1,
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    estado_plan: { codigo: 'BORRADOR', nombre: 'Borrador' },
  };
}

function makeForm(overrides: Partial<ObjetivoEstrategicoTiForm> = {}): ObjetivoEstrategicoTiForm {
  return {
    nombre: '  Modernizar la infraestructura  ',
    descripcion: '  Descripción del objetivo  ',
    responsable: '  Ana Torres  ',
    perspectivaId: 1,
    relacionesDestinoIds: [20, 30],
    oeNegocioId: 100,
    ...overrides,
  };
}

describe('objetivoEstrategicoTiMapper', () => {
  it('maps the base objective fields and the linked business objective', () => {
    expect(toObjetivoEstrategicoTi(makeObjetivoTiDto())).toEqual({
      id: 10,
      codigo: 'OETI-0010',
      planId: 5,
      nombre: 'Modernizar la infraestructura',
      descripcion: null,
      responsable: 'Ana Torres',
      perspectivaId: 1,
      perspectivaNombre: 'Financiera',
      perspectivaOrden: 1,
      estadoCodigo: 'PENDIENTE',
      estadoNombre: 'Pendiente',
      relacionesDestinoIds: [20, 30],
      oeNegocioId: 100,
      oeNegocio: { id: 100, codigo: 'OE-0100', nombre: 'Incrementar la rentabilidad' },
    });
  });

  it('maps a missing business objective as null', () => {
    expect(
      toObjetivoEstrategicoTi(makeObjetivoTiDto({ oe_negocio_id: null, oe_negocio: null })),
    ).toMatchObject({ oeNegocioId: null, oeNegocio: null });
  });

  it('flattens perspective objectives in order and ignores empty groups', () => {
    const resumen: ResumenObjetivosTiPlanDto = {
      plan: makePlanDto(),
      total_objetivos: 3,
      perspectivas: [
        {
          perspectiva: makePerspectivaDto(),
          objetivos: [makeObjetivoTiDto({ id: 1 }), makeObjetivoTiDto({ id: 2 })],
        },
        {
          perspectiva: makePerspectivaDto({ id: 2, nombre: 'Clientes', orden: 2 }),
          objetivos: [],
        },
        {
          perspectiva: makePerspectivaDto({ id: 3, nombre: 'Procesos', orden: 3 }),
          objetivos: [makeObjetivoTiDto({ id: 3 })],
        },
      ],
    };

    expect(toObjetivosTiDeResumen(resumen).map(({ id }) => id)).toEqual([1, 2, 3]);
  });

  it('builds a trimmed create request and omits an empty description', () => {
    expect(
      toCrearObjetivoTiRequest(5, makeForm({ descripcion: '   ', relacionesDestinoIds: [] })),
    ).toEqual({
      plan_estrategico_id: 5,
      perspectiva_bsc_id: 1,
      nombre: 'Modernizar la infraestructura',
      responsable: 'Ana Torres',
      relaciones_destino_ids: [],
      oe_negocio_id: 100,
    });
  });

  it('builds a complete update request without a plan id and keeps an empty description', () => {
    expect(toActualizarObjetivoTiRequest(makeForm({ descripcion: '   ' }))).toEqual({
      perspectiva_bsc_id: 1,
      nombre: 'Modernizar la infraestructura',
      descripcion: '',
      responsable: 'Ana Torres',
      relaciones_destino_ids: [20, 30],
      oe_negocio_id: 100,
    });
  });
});
