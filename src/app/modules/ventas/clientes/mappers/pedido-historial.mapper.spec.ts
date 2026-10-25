import { PedidoResumenDto } from '../../mis-pedidos/interfaces/pedido-dto.interface';
import { masReciente, toPedidoHistorial } from './pedido-historial.mapper';

function makePedidoDto(overrides: Partial<PedidoResumenDto> = {}): PedidoResumenDto {
  return {
    id: 1,
    codigo: 'PED-000001',
    cliente: { id: 'c1', nombre: 'Ana Vega Torres' },
    metodo_pago: 'efectivo',
    total: 124.8,
    tipo_entrega: 'delivery',
    estado: 'entregado',
    origen: 'manual',
    created_at: '2026-09-09T15:00:00.000Z',
    ...overrides,
  };
}

describe('toPedidoHistorial', () => {
  it('maps an order of the API to a row of the history', () => {
    expect(toPedidoHistorial(makePedidoDto())).toMatchObject({
      id: 1,
      codigo: 'PED-000001',
      fecha: '09/09/2026',
      tipoEntrega: 'Delivery',
      total: 'S/ 124.80',
      estado: 'Entregado',
      tono: 'success',
    });
  });

  it('shows the date in Lima time, not in UTC', () => {
    // 02:00 UTC del día 10 son las 21:00 del día 9 en Lima.
    const pedido = toPedidoHistorial(makePedidoDto({ created_at: '2026-09-10T02:00:00.000Z' }));

    expect(pedido.fecha).toBe('09/09/2026');
  });

  it('labels the store pickup', () => {
    expect(toPedidoHistorial(makePedidoDto({ tipo_entrega: 'recojo_tienda' })).tipoEntrega).toBe(
      'Recojo en tienda',
    );
  });
});

describe('masReciente', () => {
  it('sorts from the newest order to the oldest', () => {
    const antiguo = toPedidoHistorial(makePedidoDto({ id: 1, created_at: '2026-09-01T15:00:00Z' }));
    const reciente = toPedidoHistorial(
      makePedidoDto({ id: 2, created_at: '2026-09-20T15:00:00Z' }),
    );

    expect([antiguo, reciente].sort(masReciente).map((p) => p.id)).toEqual([2, 1]);
  });
});
