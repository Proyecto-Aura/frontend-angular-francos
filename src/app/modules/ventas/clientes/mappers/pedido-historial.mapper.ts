import { PedidoResumenDto } from '../../mis-pedidos/interfaces/pedido-dto.interface';
import {
  estadoLabel,
  estadoTone,
  money,
  tipoEntregaLabel,
} from '../../mis-pedidos/interfaces/pedido.interface';
import { PedidoHistorial } from '../interfaces/pedido-historial.interface';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Fila de GET /pedidos -> pedido del historial del cliente. */
export function toPedidoHistorial(dto: PedidoResumenDto): PedidoHistorial {
  const creado = new Date(dto.created_at);

  return {
    id: dto.id,
    codigo: dto.codigo,
    fecha: FORMATO_FECHA.format(creado),
    creado,
    tipoEntrega: tipoEntregaLabel(dto.tipo_entrega),
    total: money(dto.total),
    estado: estadoLabel(dto.estado),
    tono: estadoTone(dto.estado),
  };
}

/** Orden del historial: del pedido más reciente al más antiguo. */
export function masReciente(a: PedidoHistorial, b: PedidoHistorial): number {
  return b.creado.getTime() - a.creado.getTime();
}
