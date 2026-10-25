import {
  ActualizarStockProductoTerminadoRequestDto,
  CategoriaDto,
  IndicadoresProductoTerminadoDto,
  PageDto,
  PresentacionDto,
  ProductoPresentacionDto,
} from '../interfaces/producto-presentacion-dto.interface';
import {
  CategoriaOption,
  EditarStockForm,
  PresentacionOption,
  ProductoPresentacion,
  ProductoPresentacionesPagina,
  ResumenProductosTerminados,
} from '../interfaces/producto-presentacion.interface';

export function toProductoPresentacion(dto: ProductoPresentacionDto): ProductoPresentacion {
  const productoTerminado = dto.producto_terminado;
  return {
    id: dto.id,
    sku: dto.sku,
    productoNombre: dto.producto.nombre,
    productoDescripcion: dto.producto.descripcion,
    categoriaId: dto.producto.categoria.id,
    categoriaNombre: dto.producto.categoria.nombre,
    presentacionId: dto.presentacion.id,
    presentacionCantidad: dto.presentacion.cantidad,
    presentacionUnidadMedida: dto.presentacion.unidad_medida,
    estado: dto.estado,
    stockActual: productoTerminado?.stock_actual ?? 0,
    stockMinimo: productoTerminado?.stock_minimo ?? 0,
    stockMaximo: productoTerminado?.stock_maximo ?? null,
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

export function toResumenProductosTerminados(
  dto: IndicadoresProductoTerminadoDto,
): ResumenProductosTerminados {
  return {
    total: dto.total,
    normal: dto.normal,
    alto: dto.alto,
    bajo: dto.bajo,
    agotados: dto.agotado,
  };
}

export function toCategoriaOption(dto: CategoriaDto): CategoriaOption {
  return { id: dto.id, nombre: dto.nombre };
}

export function toPresentacionOption(dto: PresentacionDto): PresentacionOption {
  return { id: dto.id, cantidad: dto.cantidad, unidadMedida: dto.unidad_medida };
}

// "500 gr", "1 kg" — mismo formato que ya usa el modulo de catalogo.
export function etiquetaPresentacion(cantidad: number, unidadMedida: string): string {
  return `${cantidad} ${unidadMedida}`;
}

// Ambos campos van siempre (son requeridos en la UI, ver
// editar-stock.validaciones.ts) — el backend acepta mandar solo uno, pero
// esta UI no deja guardar con ninguno vacio.
export function toActualizarStockRequest(
  form: EditarStockForm,
): ActualizarStockProductoTerminadoRequestDto {
  return {
    stock_minimo: Number(form.stockMinimo),
    stock_maximo: Number(form.stockMaximo),
  };
}
