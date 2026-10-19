// Formas exactas de la API de pedidos (/pedidos) y de las listas que usa el
// registro manual (/clientes, /personas). Ver Swagger: /api/docs → Pedidos.
export type { ApiErrorDto, PageDto } from '../../catalogo/interfaces/producto-dto.interface';

export type EstadoPedidoDto =
  | 'confirmado'
  | 'en_espera_inventario'
  | 'en_preparacion'
  | 'pendiente_entrega'
  | 'en_camino'
  | 'entregado'
  | 'cancelado';
export type OrigenPedidoDto = 'portal' | 'manual';
export type TipoEntregaDto = 'recojo_tienda' | 'delivery';
export type MetodoPagoDto = 'efectivo' | 'culqi';

/** Fila de GET /pedidos (RF-A030). */
export interface PedidoResumenDto {
  id: number;
  codigo: string;
  cliente: { id: string; nombre: string };
  metodo_pago: MetodoPagoDto | null;
  total: number;
  tipo_entrega: TipoEntregaDto;
  estado: EstadoPedidoDto;
  origen: OrigenPedidoDto;
  created_at: string;
}

export interface PedidoItemDto {
  id: number;
  producto_presentacion_id: number;
  sku: string;
  producto: string;
  presentacion: string;
  cantidad: number;
  precio_unitario: number;
  precio_aplicado: number;
  subtotal: number;
}

export interface PagoDto {
  metodo_pago: MetodoPagoDto;
  monto: number;
  numero_operacion: string | null;
  fecha_pago: string;
  /** La boleta o factura la genera otra HU; por ahora siempre llega vacía. */
  comprobante: string | null;
}

/** Respuesta de GET /pedidos/:id y de POST /pedidos (RF-A031). */
export interface PedidoDetalleDto {
  id: number;
  codigo: string;
  cliente: { id: string; nombre: string };
  origen: OrigenPedidoDto;
  estado: EstadoPedidoDto;
  tipo_entrega: TipoEntregaDto;
  direccion_entrega: string | null;
  total: number;
  created_at: string;
  updated_at: string;
  items: PedidoItemDto[];
  pago: PagoDto | null;
}

/** Cuerpo de POST /pedidos (RF-A032). */
/** Cuerpo de PATCH /pedidos/:id/estado (HU-A-010, RF-A038). */
export interface ActualizarEstadoPedidoRequest {
  estado: EstadoPedidoDto;
}

export interface CrearPedidoRequest {
  cliente_id: string;
  items: { producto_presentacion_id: number; cantidad: number }[];
  tipo_entrega: TipoEntregaDto;
  direccion_entrega?: string;
  metodo_pago: MetodoPagoDto;
  culqi_token?: string;
}

export interface ClienteDto {
  id: string;
  persona_id: string;
  tipo_cliente: 'persona_natural' | 'empresa';
  razon_social: string | null;
  categoria_cliente: string;
  estado: boolean;
}

export interface PersonaDto {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  tipo_documento: string;
  numero_documento: string;
  direccion: string | null;
  estado: boolean;
}
