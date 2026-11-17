import {
  DespachoPedidoDetalleDto,
  DespachoPedidoResumenDto,
} from '../interfaces/despacho-pedido-dto.interface';

// Datos de prueba con la forma real de /api/v1/despacho/pedidos.
export function resumenDto(
  overrides: Partial<DespachoPedidoResumenDto> = {},
): DespachoPedidoResumenDto {
  return {
    id: 7,
    codigo: 'PED-000007',
    cliente: { id: 'uuid-1', nombre: 'Supermercados Andina' },
    metodo_pago: 'culqi',
    total: '165.60',
    tipo_entrega: 'delivery',
    estado: 'pendiente_entrega',
    origen: 'portal',
    productos: 2,
    unidades: 34,
    fecha_entrega: null,
    created_at: '2026-11-02T10:05:00.000Z',
    ...overrides,
  };
}

export function detalleDto(
  overrides: Partial<DespachoPedidoDetalleDto> = {},
): DespachoPedidoDetalleDto {
  return {
    id: 7,
    codigo: 'PED-000007',
    cliente: { id: 'uuid-1', nombre: 'Supermercados Andina' },
    origen: 'portal',
    estado: 'pendiente_entrega',
    tipo_entrega: 'delivery',
    direccion_entrega: 'Av. Los Girasoles 123',
    total: '165.60',
    fecha_entrega: null,
    created_at: '2026-11-02T10:05:00.000Z',
    updated_at: '2026-11-02T10:05:00.000Z',
    items: [
      {
        id: 1,
        producto_presentacion_id: 10,
        sku: 'FR-P1-PR1',
        producto: 'Chifles salados',
        presentacion: '250 gr',
        cantidad: 30,
        precio_unitario: '5.00',
        precio_aplicado: '4.20',
        subtotal: '126.00',
      },
      {
        id: 2,
        producto_presentacion_id: 11,
        sku: 'FR-P2-PR1',
        producto: 'Canchita serrana',
        presentacion: '1 kg',
        cantidad: 4,
        precio_unitario: '9.90',
        precio_aplicado: '9.90',
        subtotal: '39.60',
      },
    ],
    ...overrides,
  };
}
