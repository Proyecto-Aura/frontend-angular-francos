import { detalleDto, resumenDto } from '../testing/despacho-data';
import {
  etiquetaEstadoDespacho,
  etiquetaTipoEntrega,
  toDespachoPedido,
  toDespachoPedidoDetalle,
  toDespachoPedidosPagina,
  tonoEstadoDespacho,
} from './despacho-pedido.mapper';

describe('despacho-pedido.mapper (HU-A-023)', () => {
  it('labels and colors the three dispatch states', () => {
    expect(etiquetaEstadoDespacho('pendiente_entrega')).toBe('Pendiente a entregar');
    expect(etiquetaEstadoDespacho('en_camino')).toBe('En camino');
    expect(etiquetaEstadoDespacho('entregado')).toBe('Entregado');
    expect(tonoEstadoDespacho('pendiente_entrega')).toBe('warning');
    expect(tonoEstadoDespacho('en_camino')).toBe('info');
    expect(tonoEstadoDespacho('entregado')).toBe('success');
  });

  it('names the delivery type', () => {
    expect(etiquetaTipoEntrega('delivery')).toBe('Delivery');
    expect(etiquetaTipoEntrega('recojo_tienda')).toBe('Recojo en tienda');
  });

  it('maps a list row', () => {
    expect(toDespachoPedido(resumenDto({ fecha_entrega: '2026-11-03T15:00:00.000Z' }))).toEqual({
      id: 7,
      codigo: 'PED-000007',
      estado: 'pendiente_entrega',
      fechaCreacion: '2026-11-02T10:05:00.000Z',
      clienteNombre: 'Supermercados Andina',
      tipoEntrega: 'delivery',
      cantidadProductos: 2,
      cantidadUnidades: 34,
      fechaEntrega: '2026-11-03T15:00:00.000Z',
    });
  });

  it('maps a page with its totals', () => {
    const pagina = toDespachoPedidosPagina({
      data: [resumenDto(), resumenDto({ id: 8, codigo: 'PED-000008' })],
      meta: { total: 12, page: 2, limit: 2, total_pages: 6 },
    });

    expect(pagina.pedidos.map((p) => p.codigo)).toEqual(['PED-000007', 'PED-000008']);
    expect(pagina).toMatchObject({ total: 12, pagina: 2, totalPaginas: 6 });
  });

  it('maps the detail and derives the product and unit counts from its lines', () => {
    const detalle = toDespachoPedidoDetalle(detalleDto());

    expect(detalle).toMatchObject({
      id: 7,
      estado: 'pendiente_entrega',
      clienteNombre: 'Supermercados Andina',
      direccionEntrega: 'Av. Los Girasoles 123',
      cantidadProductos: 2,
      cantidadUnidades: 34,
      fechaEntrega: null,
    });
    expect(detalle.items[0]).toEqual({
      id: 1,
      sku: 'FR-P1-PR1',
      producto: 'Chifles salados',
      presentacion: '250 gr',
      cantidad: 30,
    });
  });
});
