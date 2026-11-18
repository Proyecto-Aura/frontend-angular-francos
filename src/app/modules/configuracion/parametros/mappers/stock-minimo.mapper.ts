import {
  InsumoStockDto,
  PaginaDto,
  ProductoPresentacionStockDto,
} from '../interfaces/stock-minimo-dto.interface';
import { ItemStockMinimo, PaginaStockMinimo } from '../interfaces/stock-minimo.interface';

const UNIDAD_INSUMO: Record<string, string> = { kg: 'kg', litros: 'litros', unidad: 'und' };
const TIPO_INSUMO: Record<string, string> = { materia_prima: 'Materia prima', empaque: 'Empaque' };

const numeroOCero = (valor: number | string | null | undefined): number => Number(valor ?? 0);
const numeroONull = (valor: number | string | null | undefined): number | null =>
  valor === null || valor === undefined ? null : Number(valor);

export function toItemProducto(dto: ProductoPresentacionStockDto): ItemStockMinimo {
  const stock = dto.producto_terminado;
  return {
    tipo: 'productos',
    id: dto.id,
    sku: dto.sku,
    nombre: dto.producto.nombre,
    detalle: `${dto.presentacion.cantidad} ${dto.presentacion.unidad_medida}`,
    unidad: 'und',
    stockActual: numeroOCero(stock?.stock_actual),
    stockMinimo: numeroOCero(stock?.stock_minimo),
    stockMaximo: numeroONull(stock?.stock_maximo),
    activo: dto.estado,
  };
}

export function toItemInsumo(dto: InsumoStockDto): ItemStockMinimo {
  return {
    tipo: 'insumos',
    id: dto.id,
    sku: dto.sku,
    nombre: dto.nombre,
    detalle: TIPO_INSUMO[dto.tipo] ?? dto.tipo,
    unidad: UNIDAD_INSUMO[dto.unidad_medida] ?? dto.unidad_medida,
    stockActual: numeroOCero(dto.stock_actual),
    stockMinimo: numeroOCero(dto.stock_minimo),
    stockMaximo: numeroONull(dto.stock_maximo),
    activo: dto.estado,
  };
}

export function toPaginaStockMinimo<T>(
  pagina: PaginaDto<T>,
  aItem: (dto: T) => ItemStockMinimo,
): PaginaStockMinimo {
  return {
    items: pagina.data.map(aItem),
    total: pagina.meta.total,
    pagina: pagina.meta.page,
    totalPaginas: pagina.meta.total_pages,
  };
}
