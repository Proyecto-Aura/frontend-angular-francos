import { PlanEstrategicoDto } from '../../plan-estrategico/interfaces/plan-estrategico-dto.interface';
import {
  ObjetivoEstrategicoDto,
  PerspectivaBscDto,
  ResumenObjetivosPlanDto,
} from '../interfaces/objetivo-estrategico-dto.interface';
import { ObjetivoEstrategicoForm } from '../interfaces/objetivo-estrategico.interface';
import {
  toActualizarObjetivoRequest,
  toCrearObjetivoRequest,
  toObjetivoEstrategico,
  toObjetivosDeResumen,
  toPerspectivaBsc,
} from './objetivo-estrategico.mapper';

function makePerspectivaDto(overrides: Partial<PerspectivaBscDto> = {}): PerspectivaBscDto {
  return {
    id: 1,
    nombre: 'Financiera',
    descripcion: 'Resultados financieros',
    orden: 1,
    ...overrides,
  };
}

function makeObjetivoDto(overrides: Partial<ObjetivoEstrategicoDto> = {}): ObjetivoEstrategicoDto {
  return {
    id: 10,
    codigo: 'OE-0010',
    plan_estrategico_id: 5,
    perspectiva_bsc_id: 1,
    responsable: 'Ana Torres',
    nombre: 'Incrementar la rentabilidad',
    descripcion: null,
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    perspectiva_bsc: makePerspectivaDto(),
    estado_objetivo: { codigo: 'PENDIENTE', nombre: 'Pendiente' },
    relaciones_destino_ids: [20, 30],
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

function makeForm(overrides: Partial<ObjetivoEstrategicoForm> = {}): ObjetivoEstrategicoForm {
  return {
    nombre: '  Incrementar la rentabilidad  ',
    descripcion: '  Descripción del objetivo  ',
    responsable: '  Ana Torres  ',
    perspectivaId: 1,
    relacionesDestinoIds: [20, 30],
    ...overrides,
  };
}

describe('objetivoEstrategicoMapper', () => {
  it('maps an objective DTO from snake_case to the view model', () => {
    expect(toObjetivoEstrategico(makeObjetivoDto())).toEqual({
      id: 10,
      codigo: 'OE-0010',
      planId: 5,
      nombre: 'Incrementar la rentabilidad',
      descripcion: null,
      responsable: 'Ana Torres',
      perspectivaId: 1,
      perspectivaNombre: 'Financiera',
      perspectivaOrden: 1,
      estadoCodigo: 'PENDIENTE',
      estadoNombre: 'Pendiente',
      relacionesDestinoIds: [20, 30],
    });
  });

  it('flattens perspective objectives while preserving their order', () => {
    const resumen: ResumenObjetivosPlanDto = {
      plan: makePlanDto(),
      total_objetivos: 3,
      perspectivas: [
        {
          perspectiva: makePerspectivaDto(),
          objetivos: [makeObjetivoDto({ id: 1 }), makeObjetivoDto({ id: 2 })],
        },
        {
          perspectiva: makePerspectivaDto({ id: 2, nombre: 'Clientes', orden: 2 }),
          objetivos: [makeObjetivoDto({ id: 3 })],
        },
      ],
    };

    expect(toObjetivosDeResumen(resumen).map((objetivo) => objetivo.id)).toEqual([1, 2, 3]);
  });

  it('maps a BSC perspective', () => {
    expect(toPerspectivaBsc(makePerspectivaDto())).toEqual({
      id: 1,
      nombre: 'Financiera',
      orden: 1,
    });
  });

  it('builds a trimmed create request and omits an empty description', () => {
    expect(
      toCrearObjetivoRequest(5, makeForm({ descripcion: '   ', relacionesDestinoIds: [] })),
    ).toEqual({
      plan_estrategico_id: 5,
      perspectiva_bsc_id: 1,
      nombre: 'Incrementar la rentabilidad',
      responsable: 'Ana Torres',
      relaciones_destino_ids: [],
    });
  });

  it('keeps an empty description and the complete relationship set in an update request', () => {
    expect(toActualizarObjetivoRequest(makeForm({ descripcion: '   ' }))).toEqual({
      perspectiva_bsc_id: 1,
      nombre: 'Incrementar la rentabilidad',
      descripcion: '',
      responsable: 'Ana Torres',
      relaciones_destino_ids: [20, 30],
    });
  });
});
