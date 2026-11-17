export type EstadoPedidoPreparar = 'en_espera_inventario' | 'en_preparacion' | 'pendiente_entrega';

// 3 estados (OFT0-262): completo = todos los items con stock suficiente,
// sin_stock = ninguno alcanza, parcial = cualquier otro caso.
export type DisponibilidadPedidoPreparar = 'completo' | 'parcial' | 'sin_stock';

export interface PedidoPreparar {
  id: number;
  codigo: string;
  estado: EstadoPedidoPreparar;
  fechaCreacion: string;
  clienteNombre: string;
  // Conteo de lineas distintas (no las unidades totales) — ver "unidades"
  // para la suma de cantidades, mismo criterio que el backend.
  cantidadProductos: number;
  cantidadUnidades: number;
  disponibilidad: DisponibilidadPedidoPreparar;
}

export interface PedidosPorPrepararPagina {
  pedidos: PedidoPreparar[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export interface ResumenPedidosPorPreparar {
  enEsperaInventario: number;
  enPreparacion: number;
  pendienteEntrega: number;
}

export interface ItemPedidoPreparar {
  id: number;
  productoPresentacionId: number;
  sku: string;
  producto: string;
  presentacion: string;
  cantidad: number;
  stockDisponible: number;
}

/** Lo que manda el front al confirmar la preparacion (PATCH pendiente-entrega). */
export interface ItemCantidadPreparada {
  productoPresentacionId: number;
  cantidadPreparada: number;
}

export interface PagoPedidoPreparar {
  metodoPago: string;
  monto: number;
  numeroOperacion: string | null;
  fechaPago: string;
}

export interface PedidoPrepararDetalle {
  id: number;
  codigo: string;
  estado: EstadoPedidoPreparar;
  fechaCreacion: string;
  clienteNombre: string;
  // Derivados de items (conteo de lineas y suma de cantidades) para el
  // encabezado del modal de detalle, mismo criterio que la fila del listado.
  cantidadProductos: number;
  cantidadUnidades: number;
  disponibilidad: DisponibilidadPedidoPreparar;
  items: ItemPedidoPreparar[];
  pago: PagoPedidoPreparar | null;
}
