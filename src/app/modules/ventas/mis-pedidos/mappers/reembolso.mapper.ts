import { metodoPagoLabel } from '../interfaces/pedido.interface';
import { ReembolsoDetalleDto, ReembolsoResumenDto } from '../interfaces/reembolso-dto.interface';
import {
  FiltrosReembolsos,
  ReembolsoDetalle,
  ReembolsoFila,
} from '../interfaces/reembolso.interface';

export function toReembolsoFila(dto: ReembolsoResumenDto): ReembolsoFila {
  return {
    id: dto.id,
    codigo: dto.codigo,
    pedido: dto.pedido.codigo,
    cliente: dto.cliente.nombre,
    metodo: dto.metodo_pago,
    metodoLabel: metodoPagoLabel(dto.metodo_pago),
    monto: dto.monto,
    estado: dto.estado,
    fecha: new Date(dto.fecha_solicitud),
  };
}

export function toReembolsoDetalle(dto: ReembolsoDetalleDto): ReembolsoDetalle {
  return {
    ...toReembolsoFila(dto),
    motivo: dto.motivo_cliente,
    evidencia: dto.evidencia,
    motivoRechazo: dto.motivo_rechazo,
  };
}

/** Un solo día de solicitud: desde y hasta son la misma fecha. */
export function toListarReembolsosParams(
  filtros: FiltrosReembolsos,
  page: number,
  limit: number,
): Record<string, string | number> {
  const q = filtros.q.trim();
  return {
    page,
    limit,
    ...(q ? { q } : {}),
    ...(filtros.estado ? { estado: filtros.estado } : {}),
    ...(filtros.fecha ? { fecha_desde: filtros.fecha, fecha_hasta: filtros.fecha } : {}),
  };
}
