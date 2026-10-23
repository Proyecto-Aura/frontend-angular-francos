import { LoteInsumoDto } from '../interfaces/lote-insumo-dto.interface';
import { LoteInsumoForm } from '../interfaces/lote-insumo.interface';
import {
  construirCodigoLote,
  siguienteSecuencialLote,
  toCrearLoteInsumoRequest,
  toLoteInsumo,
  toLotesInsumoPagina,
} from './lote-insumo.mapper';

function makeLoteDto(overrides: Partial<LoteInsumoDto> = {}): LoteInsumoDto {
  return {
    id: 1,
    insumo_id: 9,
    codigo_lote: 'FR-LT-006-261017-INS9',
    fecha_ingreso: '2026-10-17',
    fecha_vencimiento: '2026-12-01',
    cantidad_inicial: 250,
    cantidad_actual: 250,
    estado: 'activo',
    activo: true,
    created_at: '2026-10-17T00:00:00.000Z',
    updated_at: '2026-10-17T00:00:00.000Z',
    ...overrides,
  };
}

function makeLoteForm(overrides: Partial<LoteInsumoForm> = {}): LoteInsumoForm {
  return {
    insumoId: '9',
    codigoLote: 'FR-LT-006-261017-INS9',
    fechaIngreso: '2026-10-17',
    fechaVencimiento: '2026-12-01',
    cantidadInicial: '250',
    ...overrides,
  };
}

describe('loteInsumoMapper', () => {
  it('maps a lote DTO from snake_case to the view model', () => {
    expect(toLoteInsumo(makeLoteDto({ estado: 'vencido', activo: false }))).toEqual({
      id: 1,
      insumoId: 9,
      codigoLote: 'FR-LT-006-261017-INS9',
      fechaIngreso: '2026-10-17',
      fechaVencimiento: '2026-12-01',
      cantidadInicial: 250,
      cantidadActual: 250,
      estado: 'vencido',
      activo: false,
    });
  });

  it('maps every page item without filtering and copies pagination metadata', () => {
    const result = toLotesInsumoPagina({
      data: [makeLoteDto(), makeLoteDto({ id: 2, codigo_lote: 'FR-LT-007-261018-INS9' })],
      meta: { total: 12, page: 2, limit: 10, total_pages: 2 },
    });

    expect(result.lotes).toHaveLength(2);
    expect(result.lotes[1]).toMatchObject({ id: 2, codigoLote: 'FR-LT-007-261018-INS9' });
    expect(result).toMatchObject({ total: 12, pagina: 2, totalPaginas: 2 });
  });

  it('builds a create request, parsing insumoId and cantidadInicial to number', () => {
    expect(toCrearLoteInsumoRequest(makeLoteForm())).toEqual({
      insumo_id: 9,
      codigo_lote: 'FR-LT-006-261017-INS9',
      fecha_ingreso: '2026-10-17',
      fecha_vencimiento: '2026-12-01',
      cantidad_inicial: 250,
    });
  });

  it('omits fecha_vencimiento from the request when empty (insumos tipo empaque, que no vencen)', () => {
    const request = toCrearLoteInsumoRequest(makeLoteForm({ fechaVencimiento: '' }));

    expect(request).not.toHaveProperty('fecha_vencimiento');
    expect(request).toEqual({
      insumo_id: 9,
      codigo_lote: 'FR-LT-006-261017-INS9',
      fecha_ingreso: '2026-10-17',
      cantidad_inicial: 250,
    });
  });

  it('builds the codigo_lote as FR-LT-[seq]-[YYMMDD]-INS{insumoId}, padding the sequence to 3 digits', () => {
    expect(construirCodigoLote(6, 9, new Date(2026, 9, 17))).toBe('FR-LT-006-261017-INS9');
  });

  it('pads sequences above 9 and below 100 to 3 digits', () => {
    expect(construirCodigoLote(42, 1, new Date(2026, 0, 5))).toBe('FR-LT-042-260105-INS1');
  });

  it('does not truncate a 3+ digit sequence', () => {
    expect(construirCodigoLote(1234, 1, new Date(2026, 0, 5))).toBe('FR-LT-1234-260105-INS1');
  });

  it('computes the next sequence as the highest used sequence plus one, not a row count', () => {
    expect(siguienteSecuencialLote(['FR-LT-001-260101-INS9', 'FR-LT-002-260102-INS9'])).toBe(3);
  });

  it('uses the max used sequence even with gaps, so a deleted lower lote does not cause a collision', () => {
    // Caso real: se borro por fuera de la app el lote 001, solo queda el
    // 002 — el proximo tiene que ser 003, no "1 fila + 1 = 002" (que
    // chocaria con el codigo que ya existe).
    expect(siguienteSecuencialLote(['FR-LT-002-260102-INS9'])).toBe(3);
  });

  it('returns 1 when the insumo has no lotes yet', () => {
    expect(siguienteSecuencialLote([])).toBe(1);
  });

  it('ignores codigos that do not follow the FR-LT pattern (datos legados/semilla)', () => {
    expect(siguienteSecuencialLote(['LOTE-2026-001', 'FR-LT-002-260102-INS9'])).toBe(3);
  });

  it('does not let an unrelated pattern alone produce a sequence (datos legados sin match)', () => {
    expect(siguienteSecuencialLote(['LOTE-2026-001'])).toBe(1);
  });
});
