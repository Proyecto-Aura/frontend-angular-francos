import { BadgeTone } from '../../../../shared/ds/badge/badge';
import {
  IndicadoresPedidosPorPrepararDto,
  PedidoPrepararDetalleDto,
  PedidoPrepararResumenDto,
  PedidosPorPrepararPageDto,
} from '../interfaces/pedido-preparar-dto.interface';
import {
  DisponibilidadPedidoPreparar,
  EstadoPedidoPreparar,
  PedidoPreparar,
  PedidoPrepararDetalle,
  PedidosPorPrepararPagina,
  ResumenPedidosPorPreparar,
} from '../interfaces/pedido-preparar.interface';

export const ESTADO_PEDIDO_PREPARAR_LABEL: Record<EstadoPedidoPreparar, string> = {
  en_espera_inventario: 'En espera de inventario',
  en_preparacion: 'En preparación',
  pendiente_entrega: 'Pendiente a entrega',
};

export const ESTADO_PEDIDO_PREPARAR_TONE: Record<EstadoPedidoPreparar, BadgeTone> = {
  en_espera_inventario: 'warning',
  en_preparacion: 'info',
  pendiente_entrega: 'success',
};

export function etiquetaEstadoPedidoPreparar(estado: EstadoPedidoPreparar): string {
  return ESTADO_PEDIDO_PREPARAR_LABEL[estado];
}

export function tonoEstadoPedidoPreparar(estado: EstadoPedidoPreparar): BadgeTone {
  return ESTADO_PEDIDO_PREPARAR_TONE[estado];
}

const DISPONIBILIDAD_LABEL: Record<DisponibilidadPedidoPreparar, string> = {
  completo: 'Stock completo',
  insuficiente: 'Stock insuficiente',
};

export function etiquetaDisponibilidadPedidoPreparar(
  disponibilidad: DisponibilidadPedidoPreparar,
): string {
  return DISPONIBILIDAD_LABEL[disponibilidad];
}

export function toPedidoPreparar(dto: PedidoPrepararResumenDto): PedidoPreparar {
  return {
    id: dto.id,
    codigo: dto.codigo,
    estado: dto.estado,
    fechaCreacion: dto.created_at,
    clienteNombre: dto.cliente.nombre,
    cantidadProductos: dto.productos,
    cantidadUnidades: dto.unidades,
  };
}

export function toPedidosPorPrepararPagina(
  pageDto: PedidosPorPrepararPageDto,
): PedidosPorPrepararPagina {
  return {
    pedidos: pageDto.data.map(toPedidoPreparar),
    total: pageDto.meta.total,
    pagina: pageDto.meta.page,
    totalPaginas: pageDto.meta.total_pages,
  };
}

export function toResumenPedidosPorPreparar(
  dto: IndicadoresPedidosPorPrepararDto,
): ResumenPedidosPorPreparar {
  return {
    enEsperaInventario: dto.en_espera_inventario,
    enPreparacion: dto.en_preparacion,
    pendienteEntrega: dto.pendiente_entrega,
  };
}

export function toPedidoPrepararDetalle(dto: PedidoPrepararDetalleDto): PedidoPrepararDetalle {
  return {
    id: dto.id,
    codigo: dto.codigo,
    estado: dto.estado,
    fechaCreacion: dto.created_at,
    clienteNombre: dto.cliente.nombre,
    cantidadProductos: dto.items.length,
    cantidadUnidades: dto.items.reduce((suma, i) => suma + i.cantidad, 0),
    disponibilidad: dto.disponibilidad,
    items: dto.items.map((i) => ({
      id: i.id,
      productoPresentacionId: i.producto_presentacion_id,
      sku: i.sku,
      producto: i.producto,
      presentacion: i.presentacion,
      cantidad: i.cantidad,
      stockDisponible: i.stock_disponible,
    })),
    pago: dto.pago
      ? {
          metodoPago: dto.pago.metodo_pago,
          // Decimal de Prisma serializado como string (confirmado por el
          // backend) — se convierte una sola vez aca para que el resto del
          // front trabaje con number, como en todo el modulo.
          monto: Number(dto.pago.monto),
          numeroOperacion: dto.pago.numero_operacion,
          fechaPago: dto.pago.fecha_pago,
        }
      : null,
  };
}

// Siguiente estado al que puede avanzar un pedido desde esta vista de
// inventario (null = no hay transicion desde aca: "pendiente_entrega" ya
// queda a la espera de que despacho lo recoja, fuera de este modulo) — ver
// PATCH .../en-preparacion y PATCH .../pendiente-entrega (confirmado por el
// backend).
export function siguienteEstadoPedidoPreparar(
  estado: EstadoPedidoPreparar,
): EstadoPedidoPreparar | null {
  if (estado === 'en_espera_inventario') return 'en_preparacion';
  if (estado === 'en_preparacion') return 'pendiente_entrega';
  return null;
}

export function etiquetaAccionSiguienteEstado(estado: EstadoPedidoPreparar): string | null {
  const siguiente = siguienteEstadoPedidoPreparar(estado);
  if (siguiente === 'en_preparacion') return 'Iniciar preparación';
  if (siguiente === 'pendiente_entrega') return 'Marcar pendiente de entrega';
  return null;
}
