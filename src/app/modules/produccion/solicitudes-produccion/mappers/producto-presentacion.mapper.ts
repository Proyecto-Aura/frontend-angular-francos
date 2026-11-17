import {
  PageDto,
  ProductoPresentacionDto,
} from '../interfaces/producto-presentacion-dto.interface';
import {
  ProductoPresentacion,
  ProductoPresentacionesPagina,
} from '../interfaces/producto-presentacion.interface';

export function toProductoPresentacion(dto: ProductoPresentacionDto): ProductoPresentacion {
  return {
    productoTerminadoId: dto.producto_terminado?.id ?? null,
    stockActual: dto.producto_terminado?.stock_actual ?? null,
    sku: dto.sku,
    productoNombre: dto.producto.nombre,
    presentacionCantidad: dto.presentacion.cantidad,
    presentacionUnidadMedida: dto.presentacion.unidad_medida,
  };
}

export function toProductoPresentacionesPagina(
  pageDto: PageDto<ProductoPresentacionDto>,
): ProductoPresentacionesPagina {
  return {
    productos: pageDto.data.map(toProductoPresentacion),
    total: pageDto.meta.total,
    pagina: pageDto.meta.page,
    totalPaginas: pageDto.meta.total_pages,
  };
}
