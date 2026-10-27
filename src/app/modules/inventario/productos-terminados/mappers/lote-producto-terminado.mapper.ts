import {
  LoteProductoTerminadoDto,
  LotesProductoTerminadoPageDto,
} from '../interfaces/lote-producto-terminado-dto.interface';
import {
  LoteProductoTerminado,
  LotesProductoTerminadoPagina,
} from '../interfaces/lote-producto-terminado.interface';

export function toLoteProductoTerminado(dto: LoteProductoTerminadoDto): LoteProductoTerminado {
  return {
    id: dto.id,
    productoTerminadoId: dto.producto_terminado_id,
    sku: dto.sku,
    productoId: dto.producto_id,
    productoNombre: dto.producto_nombre,
    categoriaId: dto.categoria_id,
    categoriaNombre: dto.categoria_nombre,
    presentacionId: dto.presentacion_id,
    presentacionCantidad: dto.presentacion_cantidad,
    presentacionUnidadMedida: dto.presentacion_unidad_medida,
    codigoLote: dto.codigo_lote,
    fechaProduccion: dto.fecha_produccion,
    fechaVencimiento: dto.fecha_vencimiento,
    cantidadInicial: dto.cantidad_inicial,
    cantidadActual: dto.cantidad_actual,
    estado: dto.estado,
    activo: dto.activo,
  };
}

export function toLotesProductoTerminadoPagina(
  pageDto: LotesProductoTerminadoPageDto,
): LotesProductoTerminadoPagina {
  return {
    lotes: pageDto.data.map(toLoteProductoTerminado),
    total: pageDto.meta.total,
    pagina: pageDto.meta.page,
    totalPaginas: pageDto.meta.total_pages,
  };
}
