// Espejo del contrato real de /api/v1/despacho/pedidos (HU-A-023, OFT0-409):
// DespachoPedidosController, roles admin/despacho. Es el mismo PedidoPresenter
// que usan ventas e inventario, pero este listado solo deja ver los tres
// estados que le importan al operador de despacho (RN6).
export type EstadoDespachoDto = 'pendiente_entrega' | 'en_camino' | 'entregado';

/** Fila de GET /despacho/pedidos. */
export interface DespachoPedidoResumenDto {
  id: number;
  codigo: string;
  cliente: { id: string; nombre: string };
  metodo_pago: string | null;
  // Decimal de Prisma serializado como string — esta vista no muestra totales.
  total: string;
  tipo_entrega: string;
  estado: EstadoDespachoDto;
  origen: string;
  productos: number;
  unidades: number;
  // Se llena cuando despacho marca el pedido como entregado (RF-A098).
  fecha_entrega: string | null;
  created_at: string;
}

export interface DespachoPedidosPageDto {
  data: DespachoPedidoResumenDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface DespachoPedidoItemDto {
  id: number;
  producto_presentacion_id: number;
  sku: string;
  producto: string;
  presentacion: string;
  cantidad: number;
  precio_unitario: string;
  precio_aplicado: string;
  subtotal: string;
}

/**
 * GET /despacho/pedidos/:id — y también lo que devuelven los dos PATCH de
 * transición (en-camino y entregado): el mismo shape, así que no hace falta
 * volver a pedir el detalle después de cambiar el estado.
 */
export interface DespachoPedidoDetalleDto {
  id: number;
  codigo: string;
  cliente: { id: string; nombre: string };
  origen: string;
  estado: EstadoDespachoDto;
  tipo_entrega: string;
  direccion_entrega: string | null;
  total: string;
  fecha_entrega: string | null;
  created_at: string;
  updated_at: string;
  items: DespachoPedidoItemDto[];
}
