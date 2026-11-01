// Espejo del contrato real de /api/v1/inventario/pedidos (OFT0-260,
// confirmado por el backend) — mismo PedidoPresenter que ya usa /pedidos
// (ventas, ver ../../../ventas/mis-pedidos/interfaces/pedido-dto.interface.ts),
// por eso el shape es casi identico, pero expuesto via un controller aparte
// (InventarioPedidosController, roles admin/inventario) que solo deja ver
// los 3 estados que le importan a este operario.
export type EstadoPedidoPrepararDto = 'en_espera_inventario' | 'en_preparacion' | 'pendiente_entrega';

export type DisponibilidadPedidoPrepararDto = 'completo' | 'insuficiente';

/** Fila de GET /inventario/pedidos. */
export interface PedidoPrepararResumenDto {
  id: number;
  codigo: string;
  cliente: { id: string; nombre: string };
  metodo_pago: string | null;
  // Decimal de Prisma serializado como string (confirmado por el backend) —
  // no se usa en esta vista (el mockup no muestra totales en la tabla),
  // declarado solo para reflejar el contrato real.
  total: string;
  tipo_entrega: string;
  estado: EstadoPedidoPrepararDto;
  origen: string;
  productos: number;
  unidades: number;
  fecha_entrega: string | null;
  created_at: string;
}

export interface PedidosPorPrepararPageDto {
  data: PedidoPrepararResumenDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

/** GET /inventario/pedidos/indicadores. */
export interface IndicadoresPedidosPorPrepararDto {
  en_espera_inventario: number;
  en_preparacion: number;
  pendiente_entrega: number;
}

export interface PedidoPrepararItemDto {
  id: number;
  producto_presentacion_id: number;
  sku: string;
  producto: string;
  presentacion: string;
  cantidad: number;
  // Decimales serializados como string — no usados en este front (el
  // detalle solo muestra producto/presentacion/sku/cantidad, el monto total
  // ya viene aparte en "pago").
  precio_unitario: string;
  precio_aplicado: string;
  subtotal: string;
  // ProductoTerminado.stock_actual de esa presentacion, sin sumar lotes
  // (confirmado por el backend).
  stock_disponible: number;
}

/**
 * Body de PATCH /inventario/pedidos/:id/pendiente-entrega (confirmado por el
 * backend): deben venir TODOS los items del pedido, incluso los que no
 * cambiaron de cantidad — un item faltante o de mas devuelve 400. Si alguna
 * linea no tiene stock suficiente, 409 y no se crea nada (ni movimientos ni
 * cambio de estado).
 */
export interface ItemCantidadPreparadaDto {
  producto_presentacion_id: number;
  cantidad_preparada: number;
}

export interface PedidoPrepararPagoDto {
  metodo_pago: string;
  monto: string;
  numero_operacion: string | null;
  fecha_pago: string;
  comprobante: string | null;
}

/**
 * GET /inventario/pedidos/:id — y tambien lo que devuelven los PATCH de
 * transicion de estado (confirmado por el backend: mismo shape exacto, sin
 * hace falta volver a pedir el detalle despues de avanzar el estado).
 */
export interface PedidoPrepararDetalleDto {
  id: number;
  codigo: string;
  cliente: { id: string; nombre: string };
  origen: string;
  estado: EstadoPedidoPrepararDto;
  tipo_entrega: string;
  direccion_entrega: string | null;
  total: string;
  fecha_entrega: string | null;
  created_at: string;
  updated_at: string;
  items: PedidoPrepararItemDto[];
  // "completo" si TODOS los items tienen stock_disponible >= cantidad
  // pedida (confirmado por el backend).
  disponibilidad: DisponibilidadPedidoPrepararDto;
  pago: PedidoPrepararPagoDto | null;
}
