import { BadgeTone } from '../../../shared/ds/badge/badge';
import {
  DespachoPedidoDetalleDto,
  DespachoPedidoResumenDto,
  DespachoPedidosPageDto,
} from '../interfaces/despacho-pedido-dto.interface';
import {
  DespachoPedido,
  DespachoPedidoDetalle,
  DespachoPedidosPagina,
  EstadoDespacho,
} from '../interfaces/despacho-pedido.interface';

export const ESTADO_DESPACHO_LABEL: Record<EstadoDespacho, string> = {
  pendiente_entrega: 'Pendiente a entregar',
  en_camino: 'En camino',
  entregado: 'Entregado',
};

export const ESTADO_DESPACHO_TONE: Record<EstadoDespacho, BadgeTone> = {
  pendiente_entrega: 'warning',
  en_camino: 'info',
  entregado: 'success',
};

export function etiquetaEstadoDespacho(estado: EstadoDespacho): string {
  return ESTADO_DESPACHO_LABEL[estado];
}

export function tonoEstadoDespacho(estado: EstadoDespacho): BadgeTone {
  return ESTADO_DESPACHO_TONE[estado];
}

export function etiquetaTipoEntrega(tipo: string): string {
  return tipo === 'recojo_tienda' ? 'Recojo en tienda' : 'Delivery';
}

export function toDespachoPedido(dto: DespachoPedidoResumenDto): DespachoPedido {
  return {
    id: dto.id,
    codigo: dto.codigo,
    estado: dto.estado,
    fechaCreacion: dto.created_at,
    clienteNombre: dto.cliente.nombre,
    tipoEntrega: dto.tipo_entrega,
    cantidadProductos: dto.productos,
    cantidadUnidades: dto.unidades,
    fechaEntrega: dto.fecha_entrega,
  };
}

export function toDespachoPedidosPagina(pageDto: DespachoPedidosPageDto): DespachoPedidosPagina {
  return {
    pedidos: pageDto.data.map(toDespachoPedido),
    total: pageDto.meta.total,
    pagina: pageDto.meta.page,
    totalPaginas: pageDto.meta.total_pages,
  };
}

export function toDespachoPedidoDetalle(dto: DespachoPedidoDetalleDto): DespachoPedidoDetalle {
  return {
    id: dto.id,
    codigo: dto.codigo,
    estado: dto.estado,
    fechaCreacion: dto.created_at,
    clienteNombre: dto.cliente.nombre,
    tipoEntrega: dto.tipo_entrega,
    direccionEntrega: dto.direccion_entrega,
    cantidadProductos: dto.items.length,
    cantidadUnidades: dto.items.reduce((suma, i) => suma + i.cantidad, 0),
    fechaEntrega: dto.fecha_entrega,
    items: dto.items.map((i) => ({
      id: i.id,
      sku: i.sku,
      producto: i.producto,
      presentacion: i.presentacion,
      cantidad: i.cantidad,
    })),
  };
}
