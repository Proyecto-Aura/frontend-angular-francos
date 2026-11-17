import {
  MovimientoProductoTerminadoDto,
  MovimientosProductoTerminadoPageDto,
} from '../interfaces/movimiento-producto-terminado-dto.interface';
import {
  MovimientoProductoTerminado,
  MovimientosProductoTerminadoPagina,
} from '../interfaces/movimiento-producto-terminado.interface';

export function toMovimientoProductoTerminado(
  dto: MovimientoProductoTerminadoDto,
): MovimientoProductoTerminado {
  return {
    id: dto.id,
    codigo: dto.codigo,
    loteProductoTerminadoId: dto.lote_producto_terminado_id,
    codigoLote: dto.codigo_lote,
    productoTerminadoId: dto.producto_terminado_id,
    sku: dto.sku,
    productoNombre: dto.producto_nombre,
    categoriaNombre: dto.categoria_nombre,
    presentacionCantidad: dto.presentacion_cantidad,
    presentacionUnidadMedida: dto.presentacion_unidad_medida,
    tipo: dto.tipo,
    cantidad: dto.cantidad,
    stockAnterior: dto.stock_anterior,
    stockResultante: dto.stock_resultante,
    razon: dto.razon,
    fecha: dto.fecha,
  };
}

export function toMovimientosProductoTerminadoPagina(
  pageDto: MovimientosProductoTerminadoPageDto,
): MovimientosProductoTerminadoPagina {
  return {
    movimientos: pageDto.data.map(toMovimientoProductoTerminado),
    total: pageDto.meta.total,
    pagina: pageDto.meta.page,
    totalPaginas: pageDto.meta.total_pages,
  };
}
