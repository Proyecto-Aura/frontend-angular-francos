import { LoteProductoTerminadoDto } from '../interfaces/lote-producto-terminado-dto.interface';
import { LoteProductoTerminadoForm } from '../interfaces/lote-producto-terminado.interface';
import {
  construirCodigoLote,
  siguienteSecuencialLote,
  toCrearLoteProductoTerminadoRequest,
  toLoteProductoTerminado,
  toLotesProductoTerminadoPagina,
} from './lote-producto-terminado.mapper';

function makeLoteDto(overrides: Partial<LoteProductoTerminadoDto> = {}): LoteProductoTerminadoDto {
  return {
    id: 1,
    producto_terminado_id: 25,
    sku: 'FR-P26-PR3',
    producto_nombre: 'Chifles clasicos',
    presentacion_cantidad: 100,
    presentacion_unidad_medida: 'gr',
    codigo_lote: 'FR-LT-001-261101-P26-PR3',
    fecha_produccion: '2026-11-01',
    fecha_vencimiento: '2026-12-01',
    cantidad_inicial: 100,
    cantidad_actual: 100,
    estado: 'activo',
    activo: true,
    ...overrides,
  };
}

function makeLoteForm(
  overrides: Partial<LoteProductoTerminadoForm> = {},
): LoteProductoTerminadoForm {
  return {
    productoTerminadoId: '25',
    codigoLote: 'FR-LT-001-261101-P26-PR3',
    fechaProduccion: '2026-11-01',
    fechaVencimiento: '2026-12-01',
    cantidadInicial: '100',
    ...overrides,
  };
}

describe('lote-producto-terminado.mapper (Produccion)', () => {
  it('maps a lote DTO from snake_case to the view model', () => {
    expect(toLoteProductoTerminado(makeLoteDto({ estado: 'vencido', activo: false }))).toEqual({
      id: 1,
      productoTerminadoId: 25,
      sku: 'FR-P26-PR3',
      productoNombre: 'Chifles clasicos',
      presentacionCantidad: 100,
      presentacionUnidadMedida: 'gr',
      codigoLote: 'FR-LT-001-261101-P26-PR3',
      fechaProduccion: '2026-11-01',
      fechaVencimiento: '2026-12-01',
      cantidadInicial: 100,
      cantidadActual: 100,
      estado: 'vencido',
      activo: false,
    });
  });

  it('maps every page item and copies pagination metadata', () => {
    const result = toLotesProductoTerminadoPagina({
      data: [makeLoteDto(), makeLoteDto({ id: 2, codigo_lote: 'FR-LT-002-261101-P26-PR3' })],
      meta: { total: 12, page: 2, limit: 10, total_pages: 2 },
    });

    expect(result.lotes).toHaveLength(2);
    expect(result.lotes[1]).toMatchObject({ id: 2, codigoLote: 'FR-LT-002-261101-P26-PR3' });
    expect(result).toMatchObject({ total: 12, pagina: 2, totalPaginas: 2 });
  });

  it('builds a create request, parsing productoTerminadoId y cantidadInicial a number', () => {
    expect(toCrearLoteProductoTerminadoRequest(makeLoteForm())).toEqual({
      producto_terminado_id: 25,
      codigo_lote: 'FR-LT-001-261101-P26-PR3',
      fecha_produccion: '2026-11-01',
      fecha_vencimiento: '2026-12-01',
      cantidad_inicial: 100,
    });
  });

  it('omits fecha_vencimiento from the request cuando no se cargo', () => {
    const request = toCrearLoteProductoTerminadoRequest(makeLoteForm({ fechaVencimiento: '' }));

    expect(request).not.toHaveProperty('fecha_vencimiento');
    expect(request).toEqual({
      producto_terminado_id: 25,
      codigo_lote: 'FR-LT-001-261101-P26-PR3',
      fecha_produccion: '2026-11-01',
      cantidad_inicial: 100,
    });
  });

  it('builds the codigo_lote using el SKU (sin el prefijo "FR-" repetido), no el id interno', () => {
    expect(construirCodigoLote(1, 'FR-P26-PR3', new Date(2026, 10, 1))).toBe(
      'FR-LT-001-261101-P26-PR3',
    );
  });

  it('pads sequences above 9 and below 100 to 3 digits', () => {
    expect(construirCodigoLote(42, 'FR-P1-PR1', new Date(2026, 0, 5))).toBe(
      'FR-LT-042-260105-P1-PR1',
    );
  });

  it('does not truncate a 3+ digit sequence', () => {
    expect(construirCodigoLote(1234, 'FR-P1-PR1', new Date(2026, 0, 5))).toBe(
      'FR-LT-1234-260105-P1-PR1',
    );
  });

  it('recorta el prefijo "FR-" sin importar mayusculas/minusculas', () => {
    expect(construirCodigoLote(1, 'fr-p26-pr3', new Date(2026, 10, 1))).toBe(
      'FR-LT-001-261101-p26-pr3',
    );
  });

  const hoy = new Date(2026, 10, 1); // 2026-11-01
  const hoyIso = '2026-11-01';

  function loteDeHoy(codigoLote: string) {
    return { codigoLote, fechaProduccion: hoyIso };
  }

  it('computes the next sequence as the highest used sequence plus one, not a row count', () => {
    expect(
      siguienteSecuencialLote(
        [loteDeHoy('FR-LT-001-261101-P26-PR3'), loteDeHoy('FR-LT-002-261101-P26-PR3')],
        hoy,
      ),
    ).toBe(3);
  });

  it('uses the max used sequence even with gaps', () => {
    expect(siguienteSecuencialLote([loteDeHoy('FR-LT-002-261101-P26-PR3')], hoy)).toBe(3);
  });

  it('returns 1 when the producto has no lotes yet', () => {
    expect(siguienteSecuencialLote([], hoy)).toBe(1);
  });

  it('ignores codigos that do not follow the FR-LT pattern (datos legados/semilla)', () => {
    expect(
      siguienteSecuencialLote(
        [loteDeHoy('LOTE-2026-001'), loteDeHoy('FR-LT-002-261101-P26-PR3')],
        hoy,
      ),
    ).toBe(3);
  });

  it('resets the sequence by day: ignora lotes de otros dias al calcular el maximo', () => {
    expect(
      siguienteSecuencialLote(
        [
          { codigoLote: 'FR-LT-040-260101-P26-PR3', fechaProduccion: '2026-01-01' },
          loteDeHoy('FR-LT-001-261101-P26-PR3'),
        ],
        hoy,
      ),
    ).toBe(2);
  });

  it('ignores lotes de otro dia incluso cuando fecha_produccion viene como datetime completo', () => {
    expect(
      siguienteSecuencialLote(
        [{ codigoLote: 'FR-LT-005-261101-P26-PR3', fechaProduccion: '2026-11-01T00:00:00.000Z' }],
        hoy,
      ),
    ).toBe(6);
  });
});
