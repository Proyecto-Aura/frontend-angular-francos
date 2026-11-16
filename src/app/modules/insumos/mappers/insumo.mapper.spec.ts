import { InsumoDto } from '../interfaces/insumo-dto.interface';
import { InsumoForm } from '../interfaces/insumo.interface';
import {
  toActualizarInsumoRequest,
  toCrearInsumoRequest,
  toInsumo,
  toInsumosPagina,
  toResumenInsumos,
} from './insumo.mapper';

function makeInsumoForm(overrides: Partial<InsumoForm> = {}): InsumoForm {
  return {
    nombre: 'Harina especial',
    descripcion: '',
    tipo: 'materia_prima',
    unidadMedida: 'kg',
    stockMinimo: '10',
    stockMaximo: '100',
    ...overrides,
  };
}

function makeInsumoDto(overrides: Partial<InsumoDto> = {}): InsumoDto {
  return {
    id: 1,
    sku: 'FR-INS-1',
    nombre: 'Harina de trigo',
    descripcion: null,
    unidad_medida: 'kg',
    stock_actual: 250,
    stock_minimo: 50,
    stock_maximo: 400,
    tipo: 'materia_prima',
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('insumoMapper', () => {
  it('maps an insumo DTO from snake_case to the view model', () => {
    expect(toInsumo(makeInsumoDto({ estado: false, descripcion: 'Harina 000' }))).toEqual({
      id: 1,
      sku: 'FR-INS-1',
      nombre: 'Harina de trigo',
      descripcion: 'Harina 000',
      unidadMedida: 'kg',
      stockActual: 250,
      stockMinimo: 50,
      stockMaximo: 400,
      tipo: 'materia_prima',
      estado: false,
    });
  });

  it('maps every page item without filtering and copies pagination metadata', () => {
    const result = toInsumosPagina({
      data: [makeInsumoDto(), makeInsumoDto({ id: 8, sku: 'FR-INS-8', estado: false })],
      meta: { total: 12, page: 2, limit: 10, total_pages: 2 },
    });

    expect(result.insumos).toHaveLength(2);
    expect(result.insumos[1]).toMatchObject({ id: 8, sku: 'FR-INS-8', estado: false });
    expect(result).toMatchObject({ total: 12, pagina: 2, totalPaginas: 2 });
  });

  it('maps indicadores DTO, renaming agotado to agotados', () => {
    expect(toResumenInsumos({ total: 8, normal: 3, alto: 1, bajo: 2, agotado: 2 })).toEqual({
      total: 8,
      normal: 3,
      alto: 1,
      bajo: 2,
      agotados: 2,
    });
  });

  it('builds a create request without stock_actual, omitting descripcion when empty', () => {
    expect(toCrearInsumoRequest(makeInsumoForm())).toEqual({
      nombre: 'Harina especial',
      tipo: 'materia_prima',
      unidad_medida: 'kg',
      stock_minimo: 10,
      stock_maximo: 100,
    });
  });

  it('includes descripcion in the create request when provided', () => {
    expect(toCrearInsumoRequest(makeInsumoForm({ descripcion: '  Harina 000  ' }))).toEqual({
      nombre: 'Harina especial',
      descripcion: 'Harina 000',
      tipo: 'materia_prima',
      unidad_medida: 'kg',
      stock_minimo: 10,
      stock_maximo: 100,
    });
  });

  it('builds an update request without stock_actual, omitting descripcion when empty', () => {
    expect(toActualizarInsumoRequest(makeInsumoForm())).toEqual({
      nombre: 'Harina especial',
      tipo: 'materia_prima',
      unidad_medida: 'kg',
      stock_minimo: 10,
      stock_maximo: 100,
    });
  });

  it('includes descripcion in the update request when provided', () => {
    expect(toActualizarInsumoRequest(makeInsumoForm({ descripcion: '  Harina 000  ' }))).toEqual({
      nombre: 'Harina especial',
      descripcion: 'Harina 000',
      tipo: 'materia_prima',
      unidad_medida: 'kg',
      stock_minimo: 10,
      stock_maximo: 100,
    });
  });
});
