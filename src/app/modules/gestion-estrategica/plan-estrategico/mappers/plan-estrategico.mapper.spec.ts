import { PlanEstrategicoDto } from '../interfaces/plan-estrategico-dto.interface';
import { PlanEstrategicoForm } from '../interfaces/plan-estrategico.interface';
import {
  toActualizarPlanRequest,
  toCrearPlanRequest,
  toPlanEstrategico,
  toPlanesEstrategicosPagina,
} from './plan-estrategico.mapper';

function makePlanDto(overrides: Partial<PlanEstrategicoDto> = {}): PlanEstrategicoDto {
  return {
    id: 1,
    codigo: 'PE-0001',
    nombre: 'Plan 2025 - 2027',
    descripcion: 'Descripción del plan',
    anio_inicio: 2025,
    anio_fin: 2027,
    estado_plan_id: 2,
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    estado_plan: { codigo: 'ACTIVO', nombre: 'Activo' },
    ...overrides,
  };
}

describe('planEstrategicoMapper', () => {
  it('maps a plan DTO from snake_case to the view model', () => {
    expect(toPlanEstrategico(makePlanDto({ estado: false }))).toEqual({
      id: 1,
      codigo: 'PE-0001',
      nombre: 'Plan 2025 - 2027',
      descripcion: 'Descripción del plan',
      anioInicio: 2025,
      anioFin: 2027,
      estadoCodigo: 'ACTIVO',
      estadoNombre: 'Activo',
      activo: false,
    });
  });

  it('maps every page item without filtering and copies pagination metadata', () => {
    const result = toPlanesEstrategicosPagina({
      data: [makePlanDto(), makePlanDto({ id: 2, codigo: 'PE-0002', estado: false })],
      meta: { total: 12, page: 2, limit: 10, total_pages: 2 },
    });

    expect(result.planes).toHaveLength(2);
    expect(result.planes[1]).toMatchObject({ id: 2, codigo: 'PE-0002', activo: false });
    expect(result).toMatchObject({ total: 12, pagina: 2, totalPaginas: 2 });
  });

  it('builds a create request with trimmed values and omits an empty description', () => {
    const form: PlanEstrategicoForm = {
      nombre: '  Plan institucional  ',
      descripcion: '   ',
      anioInicio: '2028',
      anioFin: '2030',
    };

    expect(toCrearPlanRequest(form)).toEqual({
      nombre: 'Plan institucional',
      anio_inicio: 2028,
      anio_fin: 2030,
    });
  });

  it('keeps an empty description in an update request', () => {
    const form: PlanEstrategicoForm = {
      nombre: '  Plan actualizado  ',
      descripcion: '   ',
      anioInicio: '2031',
      anioFin: '2034',
    };

    expect(toActualizarPlanRequest(form)).toEqual({
      nombre: 'Plan actualizado',
      descripcion: '',
      anio_inicio: 2031,
      anio_fin: 2034,
    });
  });
});
