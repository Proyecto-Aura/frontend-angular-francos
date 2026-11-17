// Estados que ve el operador de despacho (RF-A094). Los anteriores
// (confirmado, en espera, en preparación) son de ventas e inventario.
export type EstadoDespacho = 'pendiente_entrega' | 'en_camino' | 'entregado';

export type TipoEntregaDespacho = 'delivery' | 'recojo_tienda';

export interface DespachoPedido {
  id: number;
  codigo: string;
  estado: EstadoDespacho;
  fechaCreacion: string;
  clienteNombre: string;
  tipoEntrega: string;
  // Conteo de líneas distintas, no unidades (mismo criterio que el backend).
  cantidadProductos: number;
  cantidadUnidades: number;
  // null hasta que despacho marca el pedido como entregado (RF-A098).
  fechaEntrega: string | null;
}

export interface DespachoPedidosPagina {
  pedidos: DespachoPedido[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export interface DespachoItemPedido {
  id: number;
  sku: string;
  producto: string;
  presentacion: string;
  cantidad: number;
}

export interface DespachoPedidoDetalle {
  id: number;
  codigo: string;
  estado: EstadoDespacho;
  fechaCreacion: string;
  clienteNombre: string;
  tipoEntrega: string;
  // Solo en delivery; en recojo en tienda no hay dirección.
  direccionEntrega: string | null;
  cantidadProductos: number;
  cantidadUnidades: number;
  fechaEntrega: string | null;
  items: DespachoItemPedido[];
}

/** Cantidad de pedidos por estado, para las tarjetas de resumen. */
export interface ResumenDespacho {
  pendienteEntrega: number;
  enCamino: number;
  entregado: number;
}
