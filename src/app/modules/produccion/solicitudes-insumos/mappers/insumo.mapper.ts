import { InsumoDto, InsumosPageDto } from '../interfaces/insumo-dto.interface';
import { Insumo, InsumosPagina } from '../interfaces/insumo.interface';

export function toInsumo(dto: InsumoDto): Insumo {
  return {
    id: dto.id,
    sku: dto.sku,
    nombre: dto.nombre,
    unidadMedida: dto.unidad_medida,
    stockActual: dto.stock_actual,
    stockMinimo: dto.stock_minimo,
  };
}

export function toInsumosPagina(pageDto: InsumosPageDto): InsumosPagina {
  return {
    insumos: pageDto.data.map(toInsumo),
    total: pageDto.meta.total,
    pagina: pageDto.meta.page,
    totalPaginas: pageDto.meta.total_pages,
  };
}
